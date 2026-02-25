/**
 * Import Labor History CSV into the unified Entry table.
 *
 * CSV columns:
 * "Title","ID","Created Date","Updated Date","Owner","Month","Day","Year","FULL DATE","HISTORY","Submitter Name","Submitter Email"
 *
 * Mapping:
 *   category   = "history"
 *   title      = HISTORY field (first 120 chars) — the history field IS the description
 *   description = HISTORY field (full text)
 *   month/day/year = from CSV Month/Day/Year columns
 *   creator    = null (history entries don't have a "creator")
 *   submitterName/submitterEmail = from CSV if present
 *   isPublished = true (already public on Wix)
 */
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
    const csvPath = path.join(__dirname, '../docs/csv/Labor+History.csv');
    if (!fs.existsSync(csvPath)) {
        console.error(`CSV file not found: ${csvPath}`);
        process.exit(1);
    }

    const raw = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(raw, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        bom: true,
    });

    console.log(`Parsed ${records.length} history records from CSV`);

    let added = 0;
    let skipped = 0;

    for (const row of records) {
        const history = (row['HISTORY'] || '').trim();
        if (!history) {
            skipped++;
            continue;
        }

        const month = parseInt(row['Month']) || null;
        const day = parseInt(row['Day']) || null;
        const year = parseInt(row['Year']) || null;

        // Title = first ~120 chars of the description
        const title = history.length > 120 ? history.substring(0, 120) + '...' : history;

        const submitterName = (row['Submitter Name'] || '').trim() || null;
        const submitterEmail = (row['Submitter Email'] || '').trim() || null;

        // Dedup check: same title + category
        const existing = await prisma.entry.findFirst({
            where: { title, category: 'history' }
        });

        if (existing) {
            skipped++;
            continue;
        }

        await prisma.entry.create({
            data: {
                category: 'history',
                title,
                description: history,
                month,
                day,
                year,
                creator: null,
                metadata: null,
                tags: null,
                sourceUrl: null,
                isPublished: true,
                submitterName,
                submitterEmail,
            }
        });
        added++;
    }

    console.log(`Import complete: ${added} added, ${skipped} skipped`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
