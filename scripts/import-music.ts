/**
 * Import Labor Music CSV into the unified Entry table.
 *
 * CSV columns:
 * "ID","Created Date","Updated Date","Owner","Song Title","Performer","Runtime","Location",
 * "Snippet(s) of relevant lyrics","Songwriter ","date written","genre",
 * "Keywords (type of worker, labor issues, etc)","Submitter Name","Submitter Email"
 *
 * Mapping:
 *   category    = "music"
 *   title       = Song Title
 *   description = Snippet(s) of relevant lyrics (or Song Title if no lyrics)
 *   creator     = Performer (primary creator for display)
 *   metadata    = { writer, performer, genre, runTime, locationUrl, lyrics }
 *   tags        = Keywords column
 *   sourceUrl   = Location (YouTube URL, etc.)
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

async function main() {
    const csvPath = path.join(__dirname, '../Labor+Music.csv');
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

    console.log(`Parsed ${records.length} music records from CSV`);

    let added = 0;
    let skipped = 0;

    for (const row of records) {
        const songTitle = (row['Song Title'] || '').trim();
        if (!songTitle) {
            skipped++;
            continue;
        }

        const performer = (row['Performer'] || '').trim() || null;
        const songwriter = (row['Songwriter '] || row['Songwriter'] || '').trim() || null;
        const runtime = (row['Runtime'] || '').trim() || null;
        // Only treat as URL if it's actually a link (not "Labor History Today collection...")
        const rawLocation = (row['Location'] || '').trim();
        const location = rawLocation.startsWith('http') ? rawLocation : null;
        const lyrics = (row['Snippet(s) of relevant lyrics'] || '').trim() || null;
        const dateWritten = (row['date written'] || '').trim() || null;
        const genre = (row['genre'] || '').trim() || null;
        const keywords = (row['Keywords (type of worker, labor issues, etc)'] || '').trim() || null;

        const submitterName = (row['Submitter Name'] || '').trim() || null;
        const submitterEmail = (row['Submitter Email'] || '').trim() || null;

        // Build metadata JSON
        const metadata: Record<string, string> = {};
        if (songwriter) metadata.writer = songwriter;
        if (performer) metadata.performer = performer;
        if (genre) metadata.genre = genre;
        if (runtime) metadata.runTime = runtime;
        if (location) metadata.locationUrl = location;
        if (lyrics) metadata.lyrics = lyrics;
        if (dateWritten) metadata.dateWritten = dateWritten;

        // Parse year from dateWritten if possible
        let year: number | null = null;
        if (dateWritten) {
            const yearMatch = dateWritten.match(/\d{4}/);
            if (yearMatch) year = parseInt(yearMatch[0]);
        }

        // Description: use lyrics if available, otherwise just the song title
        const description = lyrics || songTitle;

        // Dedup check
        const existing = await prisma.entry.findFirst({
            where: { title: songTitle, category: 'music' }
        });

        if (existing) {
            skipped++;
            continue;
        }

        await prisma.entry.create({
            data: {
                category: 'music',
                title: songTitle,
                description,
                month: null,
                day: null,
                year,
                creator: performer,
                metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
                tags: keywords,
                sourceUrl: location,
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
