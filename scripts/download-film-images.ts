/**
 * Download film poster images from WordPress and store locally.
 *
 * Reads film entries from the database, downloads poster images
 * from the posterUrl in metadata, processes with Sharp (original + thumbnail),
 * and creates EntryImage records.
 *
 * Idempotent: skips entries that already have images.
 * Run after import-films.ts.
 */
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const uploadsDir = path.join(__dirname, '../uploads/entries');
const MAX_CONCURRENT = 5;

async function downloadImage(url: string): Promise<Buffer | null> {
    try {
        // Try HTTPS first, then HTTP
        let fetchUrl = url.replace(/^http:/, 'https:');
        let res = await fetch(fetchUrl, { signal: AbortSignal.timeout(15000) });

        // If HTTPS fails, try HTTP
        if (!res.ok && fetchUrl !== url) {
            res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        }

        if (!res.ok) {
            return null;
        }

        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch {
        return null;
    }
}

function sanitizeFilename(url: string): string {
    const basename = path.basename(new URL(url).pathname);
    return basename.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
}

async function processAndSave(entryId: number, imageBuffer: Buffer, originalUrl: string): Promise<string | null> {
    try {
        const safeName = sanitizeFilename(originalUrl);
        const timestamp = Date.now();
        const filename = `${entryId}_${timestamp}_${safeName}`;
        const thumbFilename = `thumb_${filename}`;

        // Ensure it's a valid image and convert to JPEG
        const originalPath = path.join(uploadsDir, filename);
        const thumbPath = path.join(uploadsDir, thumbFilename);

        // Save original (re-encoded to strip metadata, normalize format)
        await sharp(imageBuffer)
            .jpeg({ quality: 90 })
            .toFile(originalPath);

        // Generate thumbnail: 400px wide
        await sharp(imageBuffer)
            .resize(400, null, { withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(thumbPath);

        return filename;
    } catch {
        return null;
    }
}

async function main() {
    // Ensure uploads directory exists
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Get all film entries with posterUrl in metadata
    const films = await prisma.entry.findMany({
        where: { category: 'film', isPublished: true },
        include: { images: true },
        orderBy: { id: 'asc' },
    });

    console.log(`Found ${films.length} film entries`);

    // Filter to those with posterUrl and no existing images
    const toDownload: Array<{ id: number; posterUrl: string }> = [];
    for (const film of films) {
        if (film.images.length > 0) continue; // Already has images
        if (!film.metadata) continue;

        try {
            const meta = JSON.parse(film.metadata);
            if (meta.posterUrl && meta.posterUrl.startsWith('http')) {
                toDownload.push({ id: film.id, posterUrl: meta.posterUrl });
            }
        } catch { /* skip bad JSON */ }
    }

    console.log(`${toDownload.length} entries need image download (${films.length - toDownload.length} already have images or no URL)`);

    let downloaded = 0;
    let failed = 0;
    let processed = 0;

    // Process in batches of MAX_CONCURRENT
    for (let i = 0; i < toDownload.length; i += MAX_CONCURRENT) {
        const batch = toDownload.slice(i, i + MAX_CONCURRENT);
        const results = await Promise.allSettled(
            batch.map(async ({ id, posterUrl }) => {
                const buffer = await downloadImage(posterUrl);
                if (!buffer) {
                    failed++;
                    return;
                }

                const filename = await processAndSave(id, buffer, posterUrl);
                if (!filename) {
                    failed++;
                    return;
                }

                // Create EntryImage record
                await prisma.entryImage.create({
                    data: {
                        entryId: id,
                        filename,
                        caption: null,
                        sortOrder: 0,
                    },
                });

                downloaded++;
            })
        );

        processed += batch.length;

        // Check for unexpected errors
        for (const result of results) {
            if (result.status === 'rejected') {
                console.error('Batch error:', result.reason);
            }
        }

        if (processed % 25 === 0 || processed === toDownload.length) {
            console.log(`  Progress: ${processed}/${toDownload.length} (${downloaded} downloaded, ${failed} failed)`);
        }
    }

    console.log(`\nDownload complete:`);
    console.log(`  Downloaded: ${downloaded}`);
    console.log(`  Failed:     ${failed}`);
    console.log(`  Total:      ${toDownload.length}`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
