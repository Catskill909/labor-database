/**
 * Tests for shareable entry links.
 *
 * The contract: whatever the title, `entryPath()` produces a link that
 * `parseEntryRef()` reads back to the same id — and only the number decides
 * which entry opens. Titles repeat and get edited, so a link with stale words
 * must still find its entry.
 *
 *   npx tsx --test server/entry-link.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entryPath, parseEntryRef, slugify, ENTRY_PATH_PREFIX } from './entry-link.js';

test('slugify folds accents, apostrophes and punctuation into plain words', () => {
    assert.equal(slugify('Take This Job and Shove It'), 'take-this-job-and-shove-it');
    assert.equal(slugify('Misère'), 'misere');
    assert.equal(slugify('Don’t Mourn — Organize!'), 'dont-mourn-organize');
    assert.equal(slugify('  "Bread & Roses" (1912)  '), 'bread-roses-1912');
    // Numbers keep their digits together; a comma between words still breaks.
    assert.equal(slugify('10,000 Black Men Named George'), '10000-black-men-named-george');
    assert.equal(slugify('1,000,000 Strong, United'), '1000000-strong-united');
});

test('slugify gives an empty string when nothing is left', () => {
    for (const text of ['', '   ', '!!!', '工人', '—']) assert.equal(slugify(text), '', text);
});

test('slugify cuts long titles at a word, never mid-word or on a hyphen', () => {
    const long = 'On this day the workers of the Lawrence textile mills walked out together in the bitter cold';
    const slug = slugify(long);
    assert.ok(slug.length <= 60, slug);
    assert.ok(!slug.endsWith('-'), slug);
    assert.ok(long.toLowerCase().startsWith(slug.replace(/-/g, ' ')), slug);
    // One unbroken word longer than the limit is hard-cut, not dropped.
    assert.equal(slugify('a'.repeat(80)).length, 60);
});

test('every link reads back to its own id, whatever the title', () => {
    const titles = [
        'Salt of the Earth', '', '工人之歌', '123 Main Street', '-', '1-2-3',
        'a'.repeat(300), 'Quote: "We want bread, and roses too"', 'Joe Hill\nlyrics\t',
    ];
    for (const [i, title] of titles.entries()) {
        for (const category of ['film', 'music', 'history', 'quote']) {
            const id = i * 1000 + 7;
            const path = entryPath({ id, category, title, creator: title });
            assert.ok(path.startsWith(ENTRY_PATH_PREFIX), path);
            assert.match(path, /^\/entry\/\d+(-[a-z0-9]+(-[a-z0-9]+)*)?$/, `${category}: ${path}`);
            assert.equal(parseEntryRef(path.slice(ENTRY_PATH_PREFIX.length)), id, path);
        }
    }
});

test('a title with digits never changes the id that is read back', () => {
    // "1-2-3" must not make /entry/5-1-2-3 read as anything but 5.
    assert.equal(entryPath({ id: 5, category: 'music', title: '1-2-3' }), '/entry/5-1-2-3');
    assert.equal(parseEntryRef('5-1-2-3'), 5);
});

test('quotes are named by author; others by title', () => {
    assert.equal(
        entryPath({ id: 9, category: 'quote', title: 'Pray for the dead and fight like hell for the living', creator: 'Mother Jones' }),
        '/entry/9-mother-jones',
    );
    assert.equal(entryPath({ id: 9, category: 'quote', title: 'Some words', creator: '' }), '/entry/9-some-words');
    assert.equal(entryPath({ id: 4, category: 'film', title: 'Matewan', creator: 'John Sayles' }), '/entry/4-matewan');
});

test('stale or missing words still find the entry', () => {
    for (const ref of ['42', '42-matewan', '42-old-title-before-edit', '42-', '42-%E5%B7%A5']) {
        assert.equal(parseEntryRef(ref), 42, ref);
    }
});

test('anything that is not a leading positive number is rejected', () => {
    for (const ref of [undefined, null, '', 'abc', 'matewan-42', '42abc', '0', '0-x', '-42', '007', ' 42', '4.2', '99999999999']) {
        assert.equal(parseEntryRef(ref), null, String(ref));
    }
});
