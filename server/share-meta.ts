/**
 * Link previews for shared entry links.
 *
 * Facebook, Bluesky, iMessage, Slack and email clients read a page's
 * Open Graph tags without running JavaScript, so the React app can't set them.
 * For `/entry/:ref` the server swaps the block between the share-meta markers
 * in `index.html` for tags describing that entry.
 *
 * Everything that goes into the page comes from entry text, which the public
 * can submit. It is all escaped here, in one place — the same class of hole as
 * the Media Archive's search-highlight script injection (fixed 2026-11-04).
 */
import { entryPath } from './entry-link.js';

export const SITE_NAME = 'LHF Labor Arts & Culture Database';

export const SHARE_META_START = '<!-- share-meta:start -->';
export const SHARE_META_END = '<!-- share-meta:end -->';

const DESCRIPTION_LENGTH = 200;
const TITLE_LENGTH = 100;

export interface ShareMeta {
    title: string;
    description: string;
    /** Absolute URL of this page. Omitted when the site's address is unknown. */
    url?: string;
    /** Absolute URL of a picture. */
    image?: string;
}

export interface ShareableEntry {
    id: number;
    category: string;
    title: string;
    creator: string | null;
    description: string;
    year: number | null;
    images: { filename: string }[];
}

/** Escape text for an HTML attribute value or element body. */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Collapse whitespace and cut to `max` characters at a word, adding "…". */
export function clip(text: string, max: number): string {
    const flat = text.replace(/\s+/g, ' ').trim();
    if (flat.length <= max) return flat;
    const cut = flat.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

function entryTitle(entry: ShareableEntry): string {
    const title = entry.title?.trim() ?? '';
    const creator = entry.creator?.trim() ?? '';
    const withYear = (t: string) => (entry.year ? `${t} (${entry.year})` : t);
    switch (entry.category) {
        case 'quote':
            return creator ? `Quote by ${creator}` : 'Labor quote';
        case 'film':
        case 'music':
            return withYear(clip(title, TITLE_LENGTH));
        default:
            return withYear(clip(title || 'Labor history', TITLE_LENGTH));
    }
}

/**
 * Preview tags for one entry. `baseUrl` is the site's public address
 * (PUBLIC_BASE_URL, no trailing slash). Without it there is no way to write the
 * absolute URLs previews need, so the page and picture URLs are left out
 * rather than guessed from request headers, which a client controls.
 */
export function buildEntryShareMeta(entry: ShareableEntry, baseUrl: string | null): ShareMeta {
    const meta: ShareMeta = {
        title: entryTitle(entry),
        description: clip(entry.description || entry.title || '', DESCRIPTION_LENGTH),
    };
    if (baseUrl) {
        meta.url = `${baseUrl}${entryPath(entry)}`;
        const first = entry.images[0];
        if (first) meta.image = `${baseUrl}/uploads/entries/${encodeURIComponent(first.filename)}`;
    }
    return meta;
}

function renderShareMeta(meta: ShareMeta): string {
    const tag = (attr: 'name' | 'property', key: string, value: string) =>
        `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`;
    const lines = [
        `<title>${escapeHtml(`${meta.title} | ${SITE_NAME}`)}</title>`,
        tag('name', 'description', meta.description),
        tag('property', 'og:site_name', SITE_NAME),
        tag('property', 'og:type', 'article'),
        tag('property', 'og:title', meta.title),
        tag('property', 'og:description', meta.description),
        tag('name', 'twitter:card', meta.image ? 'summary_large_image' : 'summary'),
    ];
    if (meta.url) {
        lines.push(tag('property', 'og:url', meta.url));
        lines.push(`<link rel="canonical" href="${escapeHtml(meta.url)}" />`);
    }
    if (meta.image) lines.push(tag('property', 'og:image', meta.image));
    return lines.join('\n    ');
}

/**
 * Replace the share-meta block of `index.html` with tags for `meta`.
 * Throws if the markers are missing: that means `index.html` was edited
 * without them, and silently serving generic previews would hide it.
 */
export function injectShareMeta(html: string, meta: ShareMeta): string {
    const start = html.indexOf(SHARE_META_START);
    const end = html.indexOf(SHARE_META_END);
    if (start === -1 || end === -1 || end < start) {
        throw new Error('index.html is missing the share-meta markers');
    }
    return (
        html.slice(0, start + SHARE_META_START.length) +
        '\n    ' + renderShareMeta(meta) + '\n    ' +
        html.slice(end)
    );
}
