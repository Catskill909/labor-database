/**
 * Import Labor Films from WordPress XML export into the unified Entry table.
 *
 * Source: docs/laborfilms.wordpress.com.2026-02-25.000.xml
 * Format: WordPress eXtended RSS (WXR) 1.2
 *
 * All metadata is embedded in HTML content — no custom fields.
 * Uses cheerio to parse director, cast, duration, country from <em> tags.
 *
 * Mapping:
 *   category    = "film"
 *   title       = <title> minus trailing "(YYYY)"
 *   description = Synopsis text from content (HTML stripped)
 *   year        = Extracted from title "(YYYY)"
 *   creator     = Director name
 *   metadata    = { duration, country, cast, genre, youtubeId, posterUrl }
 *   tags        = WordPress categories (topic tags)
 *   sourceUrl   = laborfilms.com permalink
 *   isPublished = true (for published posts)
 */
import { PrismaClient } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Genre categories — everything else goes to tags
const GENRE_SET = new Set([
    'Documentary', 'Drama', 'Comedy', 'Musical', 'Animation',
    'Short films', 'Experimental', 'Horror', 'Thriller',
    'Romance', 'Sci-Fi', 'Action/Crime', 'TV',
]);

function extractYear(title: string): { cleanTitle: string; year: number | null } {
    const match = title.match(/\((\d{4})\)\s*$/);
    if (match) {
        return {
            cleanTitle: title.replace(/\s*\(\d{4}\)\s*$/, '').trim(),
            year: parseInt(match[1]),
        };
    }
    return { cleanTitle: title.trim(), year: null };
}

function extractYouTubeId(text: string): string | null {
    // Shortcode: [youtube http://www.youtube.com/watch?v=ID&w=420&h=315]
    const shortcodeMatch = text.match(/\[youtube\s+(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (shortcodeMatch) return shortcodeMatch[1];

    // Embed iframe: youtube.com/embed/ID
    const embedMatch = text.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
    if (embedMatch) return embedMatch[1];

    // Direct URL: youtube.com/watch?v=ID
    const urlMatch = text.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i);
    if (urlMatch) return urlMatch[1];

    // youtu.be/ID
    const shortMatch = text.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
    if (shortMatch) return shortMatch[1];

    return null;
}

function parseFilmContent(html: string): {
    duration: string | null;
    country: string | null;
    director: string | null;
    cast: string | null;
    posterUrl: string | null;
    youtubeId: string | null;
    synopsis: string;
    synopsisHtml: string;
} {
    const $ = cheerio.load(html);

    let duration: string | null = null;
    let country: string | null = null;
    let director: string | null = null;
    let cast: string | null = null;
    let posterUrl: string | null = null;

    // Extract YouTube ID from raw HTML (before cheerio strips shortcodes)
    const youtubeId = extractYouTubeId(html);

    // Extract poster image — first <img> in content
    const firstImg = $('img').first();
    if (firstImg.length) {
        let src = firstImg.attr('src') || '';
        // Strip WordPress resize params
        src = src.replace(/\?w=\d+(&h=\d+)?/, '');
        if (src && src.startsWith('http')) {
            posterUrl = src;
        }
    }

    // Parse <em> tags for structured data
    $('em').each((_i, el) => {
        const text = $(el).text().trim();

        // Duration + Country: "95m; US" or "90 min; US/UK"
        if (!duration && /^\d+\s*m(in)?[;,]\s*/i.test(text)) {
            const parts = text.split(/[;,]\s*/);
            duration = parts[0].trim();
            if (parts[1]) country = parts[1].trim();
        }

        // Director: "Director: Name" or "Directed by Name" or "Directors: ..."
        if (!director && /^(?:director(?:s)?[:.]|directed\s+by)\s*/i.test(text)) {
            director = text.replace(/^(?:director(?:s)?[:.]|directed\s+by)\s*/i, '').trim();
        }

        // Cast: "Starring: Names" or "Cast: Names"
        if (!cast && /^(?:starring|cast)[:.]?\s*/i.test(text)) {
            cast = text.replace(/^(?:starring|cast)[:.]?\s*/i, '').trim();
        }
    });

    // Build synopsis: preserve HTML formatting but remove extracted metadata elements
    // Remove images and figures (poster already extracted)
    $('img').remove();
    $('figure').remove();

    // Remove <em> tags that contain metadata we already extracted
    $('em').each((_i, el) => {
        const text = $(el).text().trim();
        if (/^\d+\s*m(in)?[;,]\s*/i.test(text)) { $(el).remove(); return; }
        if (/^(?:director(?:s)?[:.]|directed\s+by)\s*/i.test(text)) { $(el).remove(); return; }
        if (/^(?:starring|cast)[:.]?\s*/i.test(text)) { $(el).remove(); return; }
    });

    // Remove YouTube shortcodes and WordPress block comments from raw HTML
    let synopsisHtml = $('body').html() || '';
    synopsisHtml = synopsisHtml
        .replace(/\[youtube\s+[^\]]*\]/gi, '')
        .replace(/\[vimeo\s+[^\]]*\]/gi, '')
        .replace(/<!--\s*\/?wp:[^>]*-->/g, '')
        // Remove empty <a> tags (leftover from image links)
        .replace(/<a[^>]*>\s*<\/a>/gi, '')
        // Remove inline styles
        .replace(/\s*style="[^"]*"/gi, '')
        // Remove WordPress CSS classes
        .replace(/\s*class="[^"]*"/gi, '')
        // Clean up excessive whitespace and empty tags
        .replace(/<p>\s*<\/p>/gi, '')
        .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    // Also produce a plain text version for fallback / card previews
    const synopsis = $('body').text()
        .replace(/\[youtube\s+[^\]]*\]/gi, '')
        .replace(/\[vimeo\s+[^\]]*\]/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return { duration, country, director, cast, posterUrl, youtubeId, synopsis, synopsisHtml };
}

interface WPItem {
    title: string;
    link: string;
    'dc:creator': string;
    'content:encoded': string;
    'wp:post_id': number;
    'wp:status': string;
    'wp:post_type': string;
    'wp:post_name': string;
    category?: Array<{ '#text': string; '@_domain': string; '@_nicename': string }> | { '#text': string; '@_domain': string; '@_nicename': string };
    'wp:postmeta'?: Array<{ 'wp:meta_key': string; 'wp:meta_value': string | number }> | { 'wp:meta_key': string; 'wp:meta_value': string | number };
}

async function main() {
    const xmlPath = path.join(__dirname, '../docs/laborfilms.wordpress.com.2026-02-25.000.xml');
    if (!fs.existsSync(xmlPath)) {
        console.error(`XML file not found: ${xmlPath}`);
        process.exit(1);
    }

    console.log('Reading XML file...');
    const xml = fs.readFileSync(xmlPath, 'utf-8');

    console.log('Parsing XML...');
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        isArray: (name) => name === 'item' || name === 'category' || name === 'wp:postmeta',
        processEntities: true,
        htmlEntities: true,
    });
    const result = parser.parse(xml);
    const items: WPItem[] = result.rss.channel.item || [];

    console.log(`Found ${items.length} total items in XML`);

    // Filter to published posts only (not attachments)
    const films = items.filter(item =>
        item['wp:post_type'] === 'post' && item['wp:status'] === 'publish'
    );
    console.log(`Found ${films.length} published film posts`);

    // Also build attachment map for potential featured images
    const attachments = new Map<number, string>();
    for (const item of items) {
        if (item['wp:post_type'] === 'attachment' && item.link) {
            attachments.set(item['wp:post_id'], item.link);
        }
    }
    console.log(`Found ${attachments.size} image attachments`);

    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of films) {
        try {
            const rawTitle = String(item.title || '').trim();
            if (!rawTitle) {
                skipped++;
                continue;
            }

            const { cleanTitle, year } = extractYear(rawTitle);
            const content = String(item['content:encoded'] || '');
            const { duration, country, director, cast, posterUrl, youtubeId, synopsis, synopsisHtml } = parseFilmContent(content);

            // Extract categories and split into genre vs topic tags
            const genres: string[] = [];
            const tags: string[] = [];
            const cats = item.category;
            if (cats) {
                const catArray = Array.isArray(cats) ? cats : [cats];
                for (const cat of catArray) {
                    const name = String(cat['#text'] || '').trim();
                    if (!name) continue;
                    // Skip WordPress admin labels
                    if (name.startsWith('A: ')) continue;
                    if (GENRE_SET.has(name)) {
                        genres.push(name);
                    } else {
                        tags.push(name);
                    }
                }
            }

            // Check for YouTube in postmeta oembed data if not found in content
            let finalYoutubeId = youtubeId;
            if (!finalYoutubeId && item['wp:postmeta']) {
                const metas = Array.isArray(item['wp:postmeta']) ? item['wp:postmeta'] : [item['wp:postmeta']];
                for (const meta of metas) {
                    if (String(meta['wp:meta_key']).startsWith('_oembed_') && !String(meta['wp:meta_key']).startsWith('_oembed_time_')) {
                        const val = String(meta['wp:meta_value'] || '');
                        const id = extractYouTubeId(val);
                        if (id) {
                            finalYoutubeId = id;
                            break;
                        }
                    }
                }
            }

            // Build metadata JSON
            const metadata: Record<string, string> = {};
            if (duration) metadata.duration = duration;
            if (country) metadata.country = country;
            if (cast) metadata.cast = cast;
            if (genres.length > 0) metadata.genre = genres.join(', ');
            if (finalYoutubeId) metadata.youtubeId = finalYoutubeId;
            if (posterUrl) metadata.posterUrl = posterUrl;
            if (synopsisHtml) metadata.descriptionHtml = synopsisHtml;

            const sourceUrl = item.link || null;
            const description = synopsis || cleanTitle;

            // Dedup check
            const existing = await prisma.entry.findFirst({
                where: { title: cleanTitle, category: 'film' }
            });

            if (existing) {
                skipped++;
                continue;
            }

            await prisma.entry.create({
                data: {
                    category: 'film',
                    title: cleanTitle,
                    description,
                    month: null,
                    day: null,
                    year,
                    creator: director,
                    metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
                    tags: tags.length > 0 ? tags.join(', ') : null,
                    sourceUrl,
                    isPublished: true,
                }
            });
            added++;

            if (added % 100 === 0) {
                console.log(`  Progress: ${added} added, ${skipped} skipped...`);
            }
        } catch (err) {
            errors++;
            console.error(`Error importing "${item.title}":`, err);
        }
    }

    console.log(`\nImport complete:`);
    console.log(`  Added:   ${added}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors:  ${errors}`);
    console.log(`  Total:   ${added + skipped + errors}`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
