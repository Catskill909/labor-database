/**
 * Tests for Related Films & Music ranking.
 *
 * The failure these exist to prevent is not one bad pairing — it is the whole
 * class of "the panel fills up with entries that share only a near-universal
 * tag". Measured on the real data, a plain shares-a-tag filter returns ~781
 * films a day; the ranking is the only thing standing between the client and
 * that. So the cases below pin the *ordering contract*: rarity beats commonness,
 * more shared tags beat fewer, year never outranks a topical signal, and the
 * caps actually cap.
 *
 *   npx tsx --test server/related-entries.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitTags, buildTagFrequency, rankRelated, RELATED_LIMITS } from './related-entries.js';

type E = { id: number; category: string; tags: string | null; year: number | null };
const film = (id: number, tags: string | null, year: number | null = null): E =>
    ({ id, category: 'film', tags, year });

/** Frequencies mirroring the real skew: one near-universal tag, one rare one. */
const FREQ = new Map<string, number>([
    ['Working Class', 825],
    ['Organizing', 1032],
    ['Domestic Workers', 38],
    ['Environment', 49],
]);

const rank = (candidates: E[], dayTags: string[], matchedYears: number[] = [], excludeIds: number[] = []) =>
    rankRelated({
        candidates,
        dayTags: new Set(dayTags),
        tagFrequency: FREQ,
        matchedYears,
        excludeIds: new Set(excludeIds),
    });

test('splitTags trims, drops empties, and survives null', () => {
    assert.deepEqual(splitTags('Mining, Strikes & Lockouts'), ['Mining', 'Strikes & Lockouts']);
    assert.deepEqual(splitTags(' Mining ,, Organizing '), ['Mining', 'Organizing']);
    assert.deepEqual(splitTags(null), []);
    assert.deepEqual(splitTags(''), []);
});

test('buildTagFrequency counts each occurrence across the corpus', () => {
    const freq = buildTagFrequency([
        { tags: 'Mining, Organizing' },
        { tags: 'Mining' },
        { tags: null },
        { tags: '' },
    ]);
    assert.equal(freq.get('Mining'), 2);
    assert.equal(freq.get('Organizing'), 1);
});

test('a rare shared tag outranks a near-universal one', () => {
    // This is the entire point. "Working Class" sits on 825 entries and means
    // almost nothing; "Domestic Workers" on 38 and means a great deal.
    const out = rank([film(1, 'Working Class'), film(2, 'Domestic Workers')],
        ['Working Class', 'Domestic Workers']);
    assert.deepEqual(out.film.map(r => r.entry.id), [2, 1]);
});

test('more shared tags outrank fewer', () => {
    const out = rank([film(1, 'Working Class'), film(2, 'Working Class, Organizing')],
        ['Working Class', 'Organizing']);
    assert.deepEqual(out.film.map(r => r.entry.id), [2, 1]);
});

test('one rare tag can outrank several common ones', () => {
    // 1/38 = 0.0263 beats 1/825 + 1/1032 = 0.0022. Rarity is not a tiebreak
    // between equal-sized overlaps — it dominates the score, by design.
    const out = rank([film(1, 'Working Class, Organizing'), film(2, 'Domestic Workers')],
        ['Working Class', 'Organizing', 'Domestic Workers']);
    assert.deepEqual(out.film.map(r => r.entry.id), [2, 1]);
});

test('entries sharing no tag with the day are excluded entirely', () => {
    const out = rank([film(1, 'Environment'), film(2, 'Working Class')], ['Working Class']);
    assert.deepEqual(out.film.map(r => r.entry.id), [2]);
});

test('year never outranks a topical signal — it only breaks ties', () => {
    // id 1 matches the day's year but shares a common tag; id 2 shares a rare
    // tag and no year. The rare tag must win, or we have rebuilt year matching.
    const out = rank([film(1, 'Working Class', 1933), film(2, 'Domestic Workers', 1970)],
        ['Working Class', 'Domestic Workers'], [1933]);
    assert.deepEqual(out.film.map(r => r.entry.id), [2, 1]);
});

test('year does break a tie between equally-scored entries', () => {
    const out = rank([film(1, 'Domestic Workers', 1970), film(2, 'Domestic Workers', 1933)],
        ['Domestic Workers'], [1933]);
    assert.deepEqual(out.film.map(r => r.entry.id), [2, 1]);
});

test('genuine ties fall back to oldest first, and a null year sorts last', () => {
    const out = rank([film(1, 'Domestic Workers', null), film(2, 'Domestic Workers', 1990), film(3, 'Domestic Workers', 1950)],
        ['Domestic Workers']);
    assert.deepEqual(out.film.map(r => r.entry.id), [3, 2, 1]);
});

test('each category is capped independently, so films cannot crowd out music', () => {
    // The bug in the previous implementation: one `take: 20` shared across both
    // categories, so on a busy day films consumed every slot and music showed
    // nothing. 118 of 365 days had no music at all.
    const many: E[] = [];
    for (let i = 1; i <= 30; i++) many.push({ id: i, category: 'film', tags: 'Domestic Workers', year: i });
    for (let i = 31; i <= 60; i++) many.push({ id: i, category: 'music', tags: 'Domestic Workers', year: i });
    const out = rank(many, ['Domestic Workers']);
    assert.equal(out.film.length, RELATED_LIMITS.film);
    assert.equal(out.music.length, RELATED_LIMITS.music);
});

test('entries already shown in the day\'s own sections are not repeated below', () => {
    const out = rank([film(1, 'Domestic Workers'), film(2, 'Domestic Workers')],
        ['Domestic Workers'], [], [1]);
    assert.deepEqual(out.film.map(r => r.entry.id), [2]);
});

test('a day whose history carries no tags yields nothing, so the caller can fall back', () => {
    const out = rank([film(1, 'Working Class')], []);
    assert.deepEqual(out, {});
});

test('matchedTags are returned so the UI can show why a pairing appeared', () => {
    const out = rank([film(1, 'Domestic Workers, Environment, Organizing')],
        ['Domestic Workers', 'Environment']);
    assert.deepEqual(out.film[0].matchedTags, ['Domestic Workers', 'Environment']);
});

test('categories outside the limits map are never returned', () => {
    // Only film and music belong in this panel; a quote sharing a tag must not
    // leak into it just because it was in the candidate list.
    const out = rank([{ id: 1, category: 'quote', tags: 'Domestic Workers', year: null }],
        ['Domestic Workers']);
    assert.deepEqual(out, {});
});
