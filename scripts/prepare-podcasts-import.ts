/**
 * Build the Labor Radio/Podcast import from the LRPN directory form.
 *
 *   npx tsx scripts/prepare-podcasts-import.ts [--refresh]
 *
 * Reads   client-data/podcasts/lrpn-form.csv   (sheet export; holds contact data)
 *         client-data/podcasts/logos/          (logos LHF sent)
 * Writes  client-data/podcasts/lookups.json    (feed + Apple results, cached;
 *                                               --refresh fetches them again)
 *         client-data/podcasts/podcasts-import.zip  (Full Backup format: restore
 *                                               via Admin → Import → ZIP)
 *         client-data/podcasts/report.txt      (what to check by hand; no contact data)
 *
 * All of client-data/ is gitignored: the CSV and the ZIP carry contact names,
 * emails and phone numbers, and this repository is public.
 *
 * Pure with respect to the database: it never opens one. The ZIP restore
 * matches on category + title, and the podcast category starts empty, so the
 * restore can only insert.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { XMLParser } from 'fast-xml-parser';
import sharp from 'sharp';
import archiver from 'archiver';
import { cleanPodcastMeta, cleanPodcastPrivate, safeHttpUrl } from '../server/podcast-meta.js';
import type { PodcastMeta, PodcastPrivate, PodcastBadgeKey } from '../server/podcast-meta.js';

const DIR = 'client-data/podcasts';
const LOGO_DIR = join(DIR, 'logos');
const LOGO_SIZE = 1000;
const USER_AGENT = 'LaborDatabase-FeedCheck/1.0 (+https://labor-database.supersoul.top)';

/** Show name (as in the form, trimmed) → logo file. Checked by eye, not guessed. */
const LOGO_FILES: Record<string, string | null> = {
    'AAUP Presents': 'AAUP Presents (2026).png',
    'Alberta Worker Podcast': 'Alberta Worker (2026).png',
    'America Works': 'AmericaWorks-NEW.jpg',
    'America’s Work Force Union Podcast': "America's Workforce Radio-Red.jpg",
    'Belabored': 'Belabored.jpg',
    'Blue Collar News': 'Blue Collar News.jpg',
    'Concrete Gang': 'Concrete Gang.jpg',
    'El Cafecito del Día': 'El Cafecito Del Dia 2024.jpg',
    'El Desvio': 'El Desvio.jpg',
    'Green and Red Podcast': 'Green and Red.jpg',
    'Grocery Nerds Podcast': 'Grocery Nerds.jpg',
    'Heartland Labor Forum': 'Heartland Labor Forum Logo new.jpg',
    'IATSE 891 Presents: Apple Box Talks': 'Apple Box Talks.png',
    'KGNU Labor Exchange': 'Labor Exchange v3.jpg',
    'Labor Express Radio': 'Labor Express Radio.jpg',
    'Labor Force Podcast': 'Labor Force.jpg',
    'The Labor Heritage Power Hour': 'Labor Heritage Power Hour logo-updated with new LHF logo.png',
    'Labor History Today': 'Labor History Today v3.png',
    'Labor Jawn': 'Labor Jawn.jpg',
    'Labor Radio Podcast Daily': 'Labor-Radio-Podcast-DAILY-logo.png',
    'LabourStart': 'LabourStart.jpg',
    'Maryland Labor History': 'Maryland Labor History.webp',
    'My Labor Radio': 'My Labor Radio2.png',
    'Next Generation Carriers': 'Next Generation Carriers.jpg',
    'On the Line: Stories of BC Workers': 'OnTheLine.jpg',
    'On This Day in Working Class History': 'On This Day in Working Class History.jpg',
    'The Power Half-Hour': 'Power At Work 2024.jpg',
    'Project Labor': 'Project Labor.jpg',
    'Roswell Hub': 'RoswellHub.jpg',
    'SAG-AFTRA': 'SAG-AFTRA Podcast.jpg',
    'Shift Change: The IAM Union Podcast': 'Shift Change (IAM).webp',
    'Solidarity Breakfast': 'Solidarity Breakfast Logo.png',
    'Solidarity Works': 'Solidarity Works Logo.jpg',
    'Stick Together': 'Stick Together.jpg',
    'The BCTGM Voices Project': 'bctgm voices logo.png',
    'The Labor Notes Podcast': 'Labor Notes Podcast.png',
    'The Labor Radio Podcast Weekly': 'Labor Radio-Podcast Weekly.png',
    'The Labor Show w/JDoc & Krausey': 'The Labor Show with JDoc & Krausey.jpg',
    'The Radical Songbook': 'The Radical Songbook.jpg',
    'The State of Working America Podcast': 'State of Working America Logo.jpg',
    'The Wealthy Ironworker': 'The Wealthy Ironworker Podcast.jpg',
    'The Worker Experience': 'The Worker Experience.jpg',
    'Unite and Win: A Guide to Workplace Organizing': 'Unite & Win.jpg',
    'Work Stoppage Podcast': 'Work Stoppage.jpg',
    'Workers Beat Extra': 'Workers Beat Extra.jpg',
    'Workers Rising': null,          // none sent: artwork from the feed, if any
    'Working Class History': 'Working Class History Logo.jpg',
    'Working History': null,         // none sent: artwork from the feed
    'Working To Live In Southwest Washington': 'Working To Live In Southwest Washington.jpg',
    'WorkWeek': 'Work Week Radio Logo.jpg',
};

/** "Network Founder" — Harold's request, 4 Nov 2026. */
const FOUNDER_SHOWS = new Set(['The Labor Heritage Power Hour', 'Labor History Today']);

/**
 * Corrections to what the form gave (§4 of podcast-dev.md). `rss: null` means
 * the show has no audio feed. Anything listed here is also listed in the report.
 */
const FIXES: Record<string, { rss?: string | null; website?: string | null; listen?: PodcastMeta['listenLinks']; extra?: { label: string; url: string }[] }> = {
    'El Cafecito del Día': { rss: 'https://feed.podbean.com/elcafecito/feed.xml' },
    'El Desvio': { rss: 'https://feed.podbean.com/eldesvio/feed.xml' },
    'Shift Change: The IAM Union Podcast': { rss: null, website: 'https://iam4.me/podcast' },
    'The Labor Show w/JDoc & Krausey': { rss: null },
    'The Radical Songbook': {
        rss: null,
        website: 'https://piratebutteradio.com',
        extra: [{ label: 'Show archive (Zeno)', url: 'https://zeno.fm/podcast/the-radical-songbook/' }],
    },
    'Roswell Hub': { rss: null, website: null, listen: { youtube: 'https://www.youtube.com/@ROSWELLHUB' } },
    'Workers Rising': {
        rss: null,
        website: 'https://eastsidefreedomlibrary.org/podcasts/',
        listen: { youtube: 'https://www.youtube.com/channel/UCS3roxDdorMZztQ9ceOyifw' },
    },
};

type Row = Record<string, string>;

interface FeedCheck { ok: boolean; status?: number; error?: string; title?: string; episodes?: number; latest?: string; image?: string }
interface AppleMatch { url: string; name: string; how: 'feed' | 'name'; feedUrl?: string }
interface Lookups { feeds: Record<string, FeedCheck>; apple: Record<string, AppleMatch | null> }

const col = (row: Row, start: string) => {
    const key = Object.keys(row).find(k => k.trim().startsWith(start));
    if (!key) throw new Error(`Column "${start}" not found in the CSV`);
    return (row[key] ?? '').trim();
};

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const feedKey = (u: string) => u.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');

async function fetchText(url: string, timeoutMs = 20000): Promise<{ status: number; text: string }> {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: '*/*' }, signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
    return { status: res.status, text: await res.text() };
}

async function checkFeed(url: string): Promise<FeedCheck> {
    try {
        const { status, text } = await fetchText(url);
        if (status >= 400) return { ok: false, status, error: `HTTP ${status}` };
        const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@' }).parse(text);
        const channel = xml?.rss?.channel;
        const atom = xml?.feed;
        if (channel) {
            const items = [channel.item ?? []].flat();
            const dates = items.map((i: Record<string, unknown>) => Date.parse(String(i.pubDate ?? ''))).filter(n => !Number.isNaN(n));
            return {
                ok: items.length > 0, status,
                title: String(channel.title ?? ''),
                episodes: items.length,
                latest: dates.length ? new Date(Math.max(...dates)).toISOString().slice(0, 10) : undefined,
                image: channel['itunes:image']?.['@href'] ?? channel.image?.url,
                error: items.length ? undefined : 'feed has no episodes',
            };
        }
        if (atom) {
            const entries = [atom.entry ?? []].flat();
            return { ok: false, status, title: String(atom.title ?? ''), episodes: entries.length, error: 'Atom/video feed, not a podcast feed' };
        }
        return { ok: false, status, error: 'not an RSS feed (web page?)' };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
}

async function findApple(name: string, rss: string | null): Promise<AppleMatch | null> {
    const url = `https://itunes.apple.com/search?media=podcast&entity=podcast&limit=15&term=${encodeURIComponent(name)}`;
    const { status, text } = await fetchText(url);
    if (status !== 200) throw new Error(`Apple search HTTP ${status}`);
    const results = (JSON.parse(text).results ?? []) as { collectionName: string; collectionViewUrl: string; feedUrl?: string }[];
    const clean = (u: string) => u.split('?')[0];
    if (rss) {
        const byFeed = results.find(r => r.feedUrl && feedKey(r.feedUrl) === feedKey(rss));
        if (byFeed) return { url: clean(byFeed.collectionViewUrl), name: byFeed.collectionName, how: 'feed', feedUrl: byFeed.feedUrl };
    }
    const byName = results.find(r => fold(r.collectionName) === fold(name));
    return byName ? { url: clean(byName.collectionViewUrl), name: byName.collectionName, how: 'name', feedUrl: byName.feedUrl } : null;
}

/** Hosting-page URLs that are really listening-app pages. */
function classifyPage(url: string | null): { website: string | null; listen: PodcastMeta['listenLinks'] } {
    if (!url) return { website: null, listen: {} };
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host === 'podcasts.apple.com') return { website: null, listen: { apple: url } };
    if (host === 'open.spotify.com' || host === 'creators.spotify.com') return { website: null, listen: { spotify: url } };
    if (host === 'youtube.com' || host === 'm.youtube.com') return { website: null, listen: { youtube: url } };
    // A Podbean or SoundCloud show page is a listening page: show it once, as a
    // listen button, not again as "Show website".
    if (host === 'soundcloud.com') return { website: null, listen: { soundcloud: url } };
    if (host.endsWith('podbean.com')) return { website: null, listen: { podbean: url } };
    return { website: url, listen: {} };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
    const refresh = process.argv.includes('--refresh');
    const rows: Row[] = parse(readFileSync(join(DIR, 'lrpn-form.csv'), 'utf8'), { columns: true, skip_empty_lines: true, bom: true });
    const report: string[] = [];
    const say = (s: string) => { report.push(s); console.log(s); };

    // ---- validate names and logos -------------------------------------------------
    const names = rows.map(r => col(r, 'Program Name'));
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length) throw new Error(`Duplicate show names: ${dupes.join(', ')}`);
    const unmapped = names.filter(n => !(n in LOGO_FILES));
    if (unmapped.length) throw new Error(`No logo decision for: ${unmapped.join(', ')} — add them to LOGO_FILES`);
    for (const [name, file] of Object.entries(LOGO_FILES)) {
        if (!names.includes(name)) throw new Error(`LOGO_FILES lists "${name}", which is not in the CSV`);
        if (file && !existsSync(join(LOGO_DIR, file))) throw new Error(`Logo file missing: ${file}`);
    }

    // ---- online lookups (cached) -------------------------------------------------
    const cachePath = join(DIR, 'lookups.json');
    const lookups: Lookups = !refresh && existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : { feeds: {}, apple: {} };
    const rssFor = (row: Row): string | null => {
        const name = col(row, 'Program Name');
        const fix = FIXES[name];
        if (fix && 'rss' in fix) return fix.rss ?? null;
        return safeHttpUrl(col(row, 'RSS Feed URL'));
    };

    for (const row of rows) {
        const name = col(row, 'Program Name');
        const rss = rssFor(row);
        if (rss && !(rss in lookups.feeds)) {
            process.stdout.write(`feed  ${name} … `);
            lookups.feeds[rss] = await checkFeed(rss);
            console.log(lookups.feeds[rss].ok ? `ok (${lookups.feeds[rss].episodes} eps)` : lookups.feeds[rss].error);
            writeFileSync(cachePath, JSON.stringify(lookups, null, 2));
        }
        if (!(name in lookups.apple)) {
            process.stdout.write(`apple ${name} … `);
            try {
                lookups.apple[name] = await findApple(name, rss);
                console.log(lookups.apple[name] ? `${lookups.apple[name]!.how} match` : 'none');
            } catch (err) {
                console.log(`skipped (${err instanceof Error ? err.message : err}) — rerun later`);
            }
            writeFileSync(cachePath, JSON.stringify(lookups, null, 2));
            await sleep(3500); // Apple allows ~20 searches a minute
        }
    }

    // ---- build entries -----------------------------------------------------------
    mkdirSync(join(DIR, 'build/images'), { recursive: true });
    const entries: Record<string, unknown>[] = [];
    let fakeId = 900000;

    for (const row of rows) {
        const name = col(row, 'Program Name');
        const id = ++fakeId;
        const fix = FIXES[name] ?? {};
        const rss = rssFor(row);
        const feed = rss ? lookups.feeds[rss] : undefined;
        const page = classifyPage(safeHttpUrl(col(row, 'Your Show')));
        const website = 'website' in fix ? (fix.website ?? null) : page.website;

        const listenLinks: PodcastMeta['listenLinks'] = { ...page.listen, ...fix.listen };
        const apple = lookups.apple[name];
        if (apple && !listenLinks.apple) listenLinks.apple = apple.url;

        const level = col(row, 'LRPN ENGAGEMENT');
        const badges: PodcastBadgeKey[] = [];
        if (FOUNDER_SHOWS.has(name)) badges.push('founder');
        if (/^Network Builder/i.test(level)) badges.push('builder');
        if (/^Network Steward/i.test(level)) badges.push('steward');

        const active = col(row, 'Is your program currently active');
        const status = /hiatus|ended/i.test(active) ? 'hiatus' : 'active';

        const meta = cleanPodcastMeta({
            rssUrl: rss ?? undefined,
            location: col(row, 'Location').replace(/\s*\.\s*$/, ''),
            frequency: col(row, 'How Often'),
            status,
            badges,
            listenLinks,
            extraLinks: fix.extra,
        } as PodcastMeta);

        const priv: PodcastPrivate = cleanPodcastPrivate({
            contactName: col(row, 'Primary Contact Name'),
            contactEmail: col(row, 'Primary Contact Email'),
            contactPhone: col(row, 'Primary Contact Phone'),
            contactRole: col(row, 'Primary Contact’s Role'),
            lrpnLevel: level,
            activities: col(row, 'Which LRPN Activities'),
            formSubmittedAt: col(row, 'Timestamp'),
            notes: [
                `Independent production acknowledged: ${col(row, 'Independent Production')}`,
                `Accuracy confirmed: ${col(row, 'Accuracy and Authorization')}`,
                `Form answer, active?: ${active}`,
            ].join('\n'),
        });

        // Logo: LHF's file, else the feed's artwork.
        let logoBuffer: Buffer | null = null;
        let logoSource = '';
        const file = LOGO_FILES[name];
        if (file) {
            logoBuffer = readFileSync(join(LOGO_DIR, file));
            logoSource = 'LHF file';
        } else if (feed?.image) {
            try {
                const res = await fetch(feed.image, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20000) });
                if (res.ok) { logoBuffer = Buffer.from(await res.arrayBuffer()); logoSource = 'from feed'; }
            } catch { /* reported below as "no logo" */ }
        }
        const images: { filename: string; caption: null; sortOrder: number }[] = [];
        if (logoBuffer) {
            const filename = `${id}_logo.jpg`;
            const img = sharp(logoBuffer).flatten({ background: '#000000' }).resize(LOGO_SIZE, LOGO_SIZE, { fit: 'cover', withoutEnlargement: true });
            await img.clone().jpeg({ quality: 88 }).toFile(join(DIR, 'build/images', filename));
            await img.clone().resize(400, null, { withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(join(DIR, 'build/images', `thumb_${filename}`));
            images.push({ filename, caption: null, sortOrder: 0 });
        }

        entries.push({
            id,
            category: 'podcast',
            title: name,
            description: col(row, 'Program Description'),
            creator: col(row, 'Host(s) and/or Producer(s)') || null,
            month: null, day: null, year: null,
            tags: null,
            sourceUrl: website,
            metadata: JSON.stringify(meta),
            privateMetadata: Object.keys(priv).length ? JSON.stringify(priv) : null,
            isPublished: true,
            images,
        });

        // Report line — public facts only, never contact details.
        const flags: string[] = [];
        if (!rss) flags.push('no audio feed');
        else if (!feed?.ok) flags.push(`feed problem: ${feed?.error ?? 'not checked'}`);
        if (FIXES[name]) flags.push('corrected by hand (FIXES)');
        if (!apple) flags.push('no Apple match');
        else if (apple.how === 'name') flags.push(`Apple matched by name only ("${apple.name}") — check`);
        if (!logoBuffer) flags.push('NO LOGO');
        else if (logoSource !== 'LHF file') flags.push(`logo ${logoSource}`);
        if (status === 'hiatus') flags.push(`On Hiatus (form: "${active}")`);
        say(`${flags.length ? '⚠' : '✓'} ${name}${feed?.latest ? ` — latest episode ${feed.latest}` : ''}${flags.length ? `\n    ${flags.join('\n    ')}` : ''}`);
    }

    // ---- write ZIP ---------------------------------------------------------------
    const backup = {
        categories: [{ slug: 'podcast', label: 'Labor Radio/Podcast', icon: 'podcast', sortOrder: 4, isActive: true }],
        entries,
    };
    const zipPath = join(DIR, 'podcasts-import.zip');
    await new Promise<void>((resolve, reject) => {
        const out = createWriteStream(zipPath);
        const zip = archiver('zip', { zlib: { level: 9 } });
        out.on('close', () => resolve());
        zip.on('error', reject);
        zip.pipe(out);
        zip.append(JSON.stringify(backup, null, 2), { name: 'backup.json' });
        zip.directory(join(DIR, 'build/images'), 'images');
        void zip.finalize();
    });

    const withFeed = entries.filter(e => JSON.parse(e.metadata as string).rssUrl).length;
    const okFeeds = rows.map(rssFor).filter((u): u is string => !!u && !!lookups.feeds[u]?.ok).length;
    say(`\n${entries.length} shows · ${entries.filter(e => (e.images as unknown[]).length).length} with logos · ${withFeed} with a feed (${okFeeds} working) · ${Object.values(lookups.apple).filter(Boolean).length} Apple links`);
    say(`ZIP: ${zipPath}`);
    writeFileSync(join(DIR, 'report.txt'), report.join('\n') + '\n');
}

main().catch(err => { console.error(err); process.exit(1); });
