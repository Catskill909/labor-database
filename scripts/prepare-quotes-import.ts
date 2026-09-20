/**
 * Prepare the Labor Quotes import payload from Chris's edited CSV.
 *
 * This script is PURE: it reads a CSV and an export of what is already stored,
 * and writes JSON. It never opens the database. Every decision that could lose
 * or overwrite data is made here, where it can be inspected, rather than at
 * import time — because `POST /api/admin/import` validates nothing and, on a
 * title collision, *overwrites* the stored row rather than skipping it.
 *
 * Usage:
 *   npx tsx scripts/prepare-quotes-import.ts <edited.csv> <existing-quotes.json> <outdir>
 *
 * `existing-quotes.json` must be a FRESH export of the target database — local
 * for a rehearsal, production for the real run. Matching against a stale copy
 * is how duplicates get created.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeSearchText } from '../server/search-text.js';

// ---------------------------------------------------------------------------
// Row-level repairs, kept explicit rather than inferred by regex.
// ---------------------------------------------------------------------------

/**
 * Three rows carry a SECOND quote and its attribution inside the
 * "Role / publication" column — a scrape that merged two source records. The
 * role is truncated at the point the foreign text begins. Verified by eye
 * against the CSV; a regex here would be guessing.
 */
const ROLE_REPAIRS: Record<string, string> = {
    '59': 'President, American Postal Workers Union, 1997',
    '218': 'to the striking mill workers in Lawrence, Massachusetts, 1912',
    '314': 'President Boston Metro Area Local APWU',
};

/**
 * Excel rendered some dates as `Nov-04` / `3-Nov-07`, and others arrived as
 * M/D/YYYY. Only the YEAR is taken (see `yearOnly` note below), so each entry
 * here is the year the source date falls in.
 */
const YEAR_FIXUPS: Record<string, number> = {
    '18': 1995, '95': 2004, '100': 2007, '128': 2005, '150': 2009,
    '250': 2015, '251': 2011, '490': 2004, '491': 2004, '499': 2011,
    '501': 2011, '502': 2011, '503': 2011,
};

/**
 * Held back for a human decision — NOT imported.
 *
 * Each is a quote wholly contained in another row of the same file, so
 * importing both would show the same words twice. Which version is the
 * canonical one is an editorial call, not a mechanical one.
 */
const HELD_BACK: Record<string, string> = {
    '139': 'Debs — shorter variant of #140 ("with the ranks" vs "with the ranks, not from the ranks")',
    '175': 'Flynn — this row is #173 and #174 concatenated; importing all three triples the text',
    '315': 'Lepore — final sentence of #316, which carries the full passage',
};

// ---------------------------------------------------------------------------

interface CsvRow { [k: string]: string }

/** Minimal RFC-4180 parser: the quotes themselves contain commas and quotes. */
function parseCsv(text: string): CsvRow[] {
    const rows: string[][] = [];
    let row: string[] = [], field = '', inQuotes = false;
    const src = text.replace(/^﻿/, '');
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (inQuotes) {
            if (c === '"') {
                if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
            } else field += c;
        } else if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c !== '\r') field += c;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    const header = rows.shift()!;
    return rows
        .filter(r => r.some(v => v.trim() !== ''))
        .map(r => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

function main() {
    const [csvPath, existingPath, outDir] = process.argv.slice(2);
    if (!csvPath || !existingPath || !outDir) {
        console.error('usage: prepare-quotes-import.ts <edited.csv> <existing-quotes.json> <outdir>');
        process.exit(1);
    }
    mkdirSync(outDir, { recursive: true });

    const rows = parseCsv(readFileSync(csvPath, 'utf8'));
    const keepCol = Object.keys(rows[0]).find(k => k.startsWith('KEEP'))!;

    const existingRaw = JSON.parse(readFileSync(existingPath, 'utf8'));
    const existing: any[] = Array.isArray(existingRaw) ? existingRaw : existingRaw.entries ?? [];

    // Two indexes: description (what a reader sees) and title (what the import
    // endpoint deduplicates on, and therefore what could trigger an overwrite).
    const byDescription = new Set(existing.map(e => normalizeSearchText(e.description ?? '')));
    const titlesExact = new Set(
        existing.filter(e => e.category === 'quote').map(e => (e.title ?? '')),
    );

    const report: string[] = [];
    const log = (s = '') => { report.push(s); console.log(s); };

    log(`source rows                     ${rows.length}`);

    const dropped = rows.filter(r => r[keepCol].toUpperCase() === 'N');
    let live = rows.filter(r => r[keepCol].toUpperCase() !== 'N');
    log(`minus ${String(dropped.length).padStart(2)} marked N by Chris      ${live.length}`);

    // In-file duplicates: keep whichever copy carries more attribution detail.
    const bestByText = new Map<string, CsvRow>();
    for (const r of live) {
        const k = normalizeSearchText(r['Quote']);
        const prev = bestByText.get(k);
        const detail = (x: CsvRow) => (x['Role / publication'] + x['Attributed to'] + x['Year']).length;
        if (!prev || detail(r) > detail(prev)) bestByText.set(k, r);
    }
    const inFileDupes = live.length - bestByText.size;
    live = [...bestByText.values()];
    log(`minus ${String(inFileDupes).padStart(2)} in-file duplicates     ${live.length}`);

    const alreadyHeld = live.filter(r => byDescription.has(normalizeSearchText(r['Quote'])));
    live = live.filter(r => !byDescription.has(normalizeSearchText(r['Quote'])));
    log(`minus ${String(alreadyHeld.length).padStart(2)} already in target DB   ${live.length}`);

    const held = live.filter(r => HELD_BACK[r['#']]);
    live = live.filter(r => !HELD_BACK[r['#']]);
    log(`minus ${String(held.length).padStart(2)} held for review        ${live.length}`);

    // ---- build the payload -------------------------------------------------
    const entries = live
        .sort((a, b) => Number(a['#']) - Number(b['#']))
        .map(r => {
            const quote = r['Quote'].trim();
            const role = ROLE_REPAIRS[r['#']] ?? r['Role / publication'];
            const rawYear = r['Year'];

            let year: number | null = null;
            if (YEAR_FIXUPS[r['#']] !== undefined) year = YEAR_FIXUPS[r['#']];
            else if (/^\d{4}$/.test(rawYear)) year = Number(rawYear);

            // Guard against the BUG-1 class: a year outside this range is a
            // parse failure, not a date. Fail loudly rather than store it.
            if (year !== null && (year < 1500 || year > 2100)) {
                throw new Error(`row #${r['#']}: implausible year ${year} from ${JSON.stringify(rawYear)}`);
            }

            const metadata: Record<string, string> = {};
            if (role) metadata.source = role;
            // Keep the source's own date string even though only the year is
            // stored, so nothing the CSV knew is lost.
            if (rawYear && !/^\d{4}$/.test(rawYear)) metadata.sourceDate = rawYear;

            return {
                category: 'quote',
                // Full text, NOT truncated. The stored corpus has 1,220 titles
                // cut at 123 chars, which is what breaks the endpoint's dedup.
                // New rows carry the whole quote so they dedup correctly later.
                title: quote,
                description: quote,
                creator: r['Attributed to'].trim() || null,
                month: null,
                day: null,
                // Year only: the source dates are publication dates, and storing
                // month/day would place these in "On This Day". That is a content
                // decision, so it is deliberately not made here.
                year,
                metadata: Object.keys(metadata).length ? JSON.stringify(metadata) : null,
                tags: null,
                sourceUrl: 'https://laborquotes.weebly.com/c.html',
                isPublished: true,
            };
        });

    // ---- HARD SAFETY GATE --------------------------------------------------
    // The import endpoint UPDATES on a title+category match. Any collision here
    // would silently overwrite a stored quote, so refuse to emit the payload.
    const collisions = entries.filter(e => titlesExact.has(e.title));
    const selfDupes = entries.length - new Set(entries.map(e => e.title)).size;

    log();
    log(`title collisions with stored quotes  ${collisions.length}   <-- must be 0`);
    log(`duplicate titles within payload      ${selfDupes}   <-- must be 0`);
    const blank = entries.filter(e => !e.title.trim() || !e.description.trim()).length;
    log(`blank title/description              ${blank}   <-- must be 0`);

    if (collisions.length || selfDupes || blank) {
        log();
        log('REFUSING TO WRITE PAYLOAD — a collision would overwrite an existing row.');
        collisions.slice(0, 10).forEach(c => log(`  collides: ${c.title.slice(0, 90)}`));
        process.exit(2);
    }

    log();
    log(`==> ${entries.length} entries ready to import`);
    log(`    with year: ${entries.filter(e => e.year !== null).length}`);
    log(`    with source: ${entries.filter(e => e.metadata).length}`);

    writeFileSync(join(outDir, 'quotes-import.json'), JSON.stringify({ entries }, null, 2));
    writeFileSync(
        join(outDir, 'held-back-for-review.json'),
        JSON.stringify(
            {
                subsetQuotes: held.map(r => ({ row: r['#'], reason: HELD_BACK[r['#']], quote: r['Quote'], attributedTo: r['Attributed to'] })),
                alreadyHeld: alreadyHeld.map(r => ({ row: r['#'], quote: r['Quote'], attributedTo: r['Attributed to'] })),
                droppedByChris: dropped.map(r => ({ row: r['#'], quote: r['Quote'], attributedTo: r['Attributed to'] })),
            },
            null, 2,
        ),
    );
    writeFileSync(join(outDir, 'report.txt'), report.join('\n') + '\n');
    log();
    log(`written to ${outDir}/`);
}

main();
