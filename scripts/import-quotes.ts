/**
 * Import Labor Quotes CSV into the unified Entry table.
 *
 * CSV columns:
 * "QUOTE","Description/Detail","AUTHOR","DATES","Title","ID","Created Date","Updated Date","Owner","Submitter","Submitter Email"
 *
 * Mapping:
 *   category    = "quote"
 *   title       = first 120 chars of QUOTE (the quote IS the main content)
 *   description = QUOTE field (full text)
 *   creator     = AUTHOR
 *   year        = parsed from DATES (format: "YYYY.MM.DD" or "YYYY.MM.DD; YYYY.MM.DD")
 *   metadata    = { source: Description/Detail }
 *   isPublished = true
 */
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function parseDateField(dateStr: string): { month: number | null; day: number | null; year: number | null } {
    if (!dateStr) return { month: null, day: null, year: null };

    // Take the first date if multiple separated by ";"
    const first = dateStr.split(';')[0].trim();

    // Format: YYYY.MM.DD
    const parts = first.split('.');
    if (parts.length >= 1) {
        const year = parseInt(parts[0]) || null;
        const month = parts.length >= 2 ? (parseInt(parts[1]) || null) : null;
        const day = parts.length >= 3 ? (parseInt(parts[2]) || null) : null;
        return { month, day, year };
    }

    return { month: null, day: null, year: null };
}

async function main() {
    const csvPath = path.join(__dirname, '../Quotes.csv');
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

    console.log(`Parsed ${records.length} quote records from CSV`);

    let added = 0;
    let skipped = 0;

    for (const row of records) {
        const quote = (row['QUOTE'] || '').trim();
        if (!quote) {
            skipped++;
            continue;
        }

        const author = (row['AUTHOR'] || '').trim() || null;
        const detail = (row['Description/Detail'] || '').trim() || null;
        const dateStr = (row['DATES'] || '').trim();
        const { month, day, year } = parseDateField(dateStr);

        const title = quote.length > 120 ? quote.substring(0, 120) + '...' : quote;

        const submitterName = (row['Submitter'] || '').trim() || null;
        const submitterEmail = (row['Submitter Email'] || '').trim() || null;

        // Build metadata
        const metadata: Record<string, string> = {};
        if (detail) metadata.source = detail;
        if (dateStr) metadata.dateRaw = dateStr;

        // Dedup check
        const existing = await prisma.entry.findFirst({
            where: { title, category: 'quote' }
        });

        if (existing) {
            skipped++;
            continue;
        }

        await prisma.entry.create({
            data: {
                category: 'quote',
                title,
                description: quote,
                month,
                day,
                year,
                creator: author,
                metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
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
