/**
 * Tests for link previews on shared entry pages.
 *
 * Entry text is public-submittable and goes into the page's <head>. The class
 * of bug to prevent is any of it escaping into markup — so instead of one
 * hostile title, every text field gets every hostile string, and the output is
 * checked structurally: the block holds only the tags we write, and each value
 * reads back exactly as the entry had it.
 *
 *   npx tsx --test server/share-meta.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    buildEntryShareMeta, injectShareMeta, escapeHtml, clip,
    SHARE_META_START, SHARE_META_END, DEFAULT_SHARE_IMAGE, type ShareableEntry,
} from './share-meta.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = fs.readFileSync(path.join(here, '../index.html'), 'utf8');
const BASE = 'https://labor-database.example.org';

const HOSTILE = [
    '"><script>alert(1)</script>',
    "' onmouseover='alert(1)",
    '</title><script>alert(1)</script>',
    '<!-- share-meta:end --><script>x</script>',
    '&lt;already escaped&gt; & raw &',
    'line\nbreak\ttab',
    '<img src=x onerror=alert(1)>',
];

function entry(over: Partial<ShareableEntry> = {}): ShareableEntry {
    return {
        id: 12, category: 'film', title: 'Salt of the Earth', creator: 'Herbert J. Biberman',
        description: 'Miners strike in New Mexico.', year: 1954, images: [{ filename: 'poster.jpg' }], ...over,
    };
}

function unescapeHtml(text: string): string {
    return text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** The injected block, between the markers. */
function block(html: string): string {
    const start = html.indexOf(SHARE_META_START) + SHARE_META_START.length;
    return html.slice(start, html.indexOf(SHARE_META_END, start));
}

test('index.html carries the share-meta markers, in order', () => {
    const start = INDEX_HTML.indexOf(SHARE_META_START);
    const end = INDEX_HTML.indexOf(SHARE_META_END);
    assert.ok(start !== -1 && end > start);
    assert.equal(INDEX_HTML.split(SHARE_META_START).length, 2, 'exactly one start marker');
});

test('hostile text in any field cannot add markup to the page', () => {
    for (const bad of HOSTILE) {
        for (const field of ['title', 'creator', 'description'] as const) {
            for (const category of ['film', 'music', 'quote', 'history']) {
                const html = injectShareMeta(INDEX_HTML, buildEntryShareMeta(entry({ [field]: bad, category }), BASE));
                const b = block(html);
                // Only our own tags: every '<' starts <title>, </title>, <meta or <link.
                const tags = b.match(/<[^>]*>/g) ?? [];
                for (const t of tags) assert.match(t, /^<(\/?title|meta |link )/, `${field}/${category}: ${t}`);
                assert.equal(b.split('<').length - 1, tags.length, `${field}/${category}: stray '<'`);
                assert.ok(!b.includes('<script'), `${field}/${category}`);
                // The rest of the page is untouched: one end marker, one </head>.
                assert.equal(html.split(SHARE_META_END).length, 2, `${field}/${category}: end marker`);
                assert.equal(html.split('</head>').length, 2);
            }
        }
    }
});

test('values read back exactly as the entry had them', () => {
    const tricky = 'Bread & Roses: "We want bread" — it\'s <ours>';
    const meta = buildEntryShareMeta(entry({ category: 'music', title: tricky, year: null }), BASE);
    const b = block(injectShareMeta(INDEX_HTML, meta));
    const og = /property="og:title" content="([^"]*)"/.exec(b);
    assert.ok(og);
    assert.equal(unescapeHtml(og[1]), tricky);
});

test('picture and page URL use the configured address, never a guess', () => {
    const withBase = buildEntryShareMeta(entry(), BASE);
    assert.equal(withBase.url, `${BASE}/entry/12-salt-of-the-earth`);
    assert.equal(withBase.image, `${BASE}/uploads/entries/poster.jpg`);

    const noBase = buildEntryShareMeta(entry(), null);
    assert.equal(noBase.url, undefined);
    assert.equal(noBase.image, undefined);
    const b = block(injectShareMeta(INDEX_HTML, noBase));
    assert.ok(!b.includes('og:url') && !b.includes('og:image') && !b.includes('canonical'));
});

test('an odd image filename cannot break out of the URL', () => {
    const meta = buildEntryShareMeta(entry({ images: [{ filename: 'a" onerror="x.jpg' }] }), BASE);
    assert.ok(!meta.image!.includes('"'));
});

test('every entry has og:image; without its own picture it uses the logo in a small card', () => {
    // Facebook warns when og:image is missing — this covers every category.
    for (const category of ['film', 'music', 'quote', 'history']) {
        const withPic = block(injectShareMeta(INDEX_HTML, buildEntryShareMeta(entry({ category }), BASE)));
        assert.match(withPic, /og:image" content="https:\/\/labor-database\.example\.org\/uploads\/entries\/poster\.jpg"/, category);
        assert.match(withPic, /twitter:card" content="summary_large_image"/, category);

        const noPic = block(injectShareMeta(INDEX_HTML, buildEntryShareMeta(entry({ category, images: [] }), BASE)));
        assert.match(noPic, /og:image" content="https:\/\/labor-database\.example\.org\/laborheritage\.png"/, category);
        assert.match(noPic, /twitter:card" content="summary"/, category);
    }
});

test('the default picture exists in public/', () => {
    assert.ok(fs.existsSync(path.join(here, '../public', DEFAULT_SHARE_IMAGE)));
});

test('titles per category', () => {
    assert.equal(buildEntryShareMeta(entry(), BASE).title, 'Salt of the Earth (1954)');
    assert.equal(buildEntryShareMeta(entry({ category: 'quote', creator: 'Mother Jones' }), BASE).title, 'Quote by Mother Jones');
    assert.equal(buildEntryShareMeta(entry({ category: 'quote', creator: null }), BASE).title, 'Labor quote');
    assert.equal(buildEntryShareMeta(entry({ category: 'history', title: '', year: null }), BASE).title, 'Labor history');
});

test('long descriptions are cut at a word with an ellipsis', () => {
    const text = 'word '.repeat(100);
    const out = clip(text, 200);
    assert.ok(out.length <= 200, String(out.length));
    assert.ok(out.endsWith('…'));
    assert.ok(!out.includes('  '));
    assert.equal(clip('short\n\ntext', 200), 'short text');
});

test('injectShareMeta refuses a page without markers', () => {
    assert.throws(() => injectShareMeta('<html><head><title>x</title></head></html>', buildEntryShareMeta(entry(), BASE)));
});

test('escapeHtml covers all five special characters', () => {
    assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});
