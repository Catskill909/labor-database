/**
 * Backfill / rebuild the Entry search shadow columns.
 *
 * Two modes:
 *   --missing-only   Only rows where searchAll IS NULL. Cheap, and safe to run
 *                    on every boot. This is what the container entrypoint uses:
 *                    after the add_search_shadow_columns migration every existing
 *                    row has NULL search columns, and search matches nothing until
 *                    they are populated.
 *   (no flag)        Rebuild every row. Use after an import or maintenance script
 *                    in scripts/ writes entries through its own PrismaClient —
 *                    those bypass the server's syncSearchText().
 *
 * Idempotent either way: values are derived from each row's current text.
 *
 *   npm run backfill:search
 *   npm run backfill:search -- --missing-only
 */
import { PrismaClient } from '@prisma/client';
import { buildSearchFields } from '../server/search-text.js';

const prisma = new PrismaClient();
const BATCH_SIZE = 500;
const missingOnly = process.argv.includes('--missing-only');

const SELECT = { id: true, title: true, creator: true, description: true, tags: true, metadata: true } as const;

async function writeBatch(rows: { id: number; title: string; creator: string | null; description: string; tags: string | null; metadata: string | null }[]) {
    await prisma.$transaction(
        rows.map(row => prisma.entry.update({ where: { id: row.id }, data: buildSearchFields(row) }))
    );
}

async function backfillMissing(): Promise<number> {
    // No cursor needed: once a row is written it no longer matches searchAll: null,
    // so each query naturally returns the next unprocessed batch.
    let processed = 0;
    for (;;) {
        const rows = await prisma.entry.findMany({
            where: { searchAll: null },
            take: BATCH_SIZE,
            select: SELECT,
        });
        if (rows.length === 0) break;
        await writeBatch(rows);
        processed += rows.length;
        console.log(`  ${processed} rebuilt`);
    }
    return processed;
}

async function rebuildAll(total: number): Promise<number> {
    let processed = 0;
    let cursor: number | undefined;
    for (;;) {
        const rows = await prisma.entry.findMany({
            take: BATCH_SIZE,
            ...(cursor !== undefined ? { skip: 1, cursor: { id: cursor } } : {}),
            orderBy: { id: 'asc' },
            select: SELECT,
        });
        if (rows.length === 0) break;
        await writeBatch(rows);
        processed += rows.length;
        cursor = rows[rows.length - 1].id;
        console.log(`  ${processed}/${total}`);
    }
    return processed;
}

async function main() {
    if (missingOnly) {
        const pending = await prisma.entry.count({ where: { searchAll: null } });
        if (pending === 0) {
            console.log('Search columns already populated — nothing to do.');
            return;
        }
        console.log(`Populating search columns for ${pending} entries missing them...`);
        const done = await backfillMissing();
        console.log(`Done — ${done} entries indexed.`);
        return;
    }

    const total = await prisma.entry.count();
    console.log(`Rebuilding search columns for ${total} entries...`);
    const done = await rebuildAll(total);
    console.log(`Done — ${done} entries rebuilt.`);
}

main()
    .catch(err => {
        console.error('Backfill failed:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
