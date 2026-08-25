/**
 * Tests for search text folding.
 *
 * The bug these exist to prevent: SQLite's LIKE case-folds only ASCII A–Z, so
 * searching "misère" never matched a stored "MISÈRE", and "don't" never matched
 * a stored "don’t". The class is *any* character that needs folding — not the
 * one film that was reported. Each case below pairs a query spelling with a
 * stored spelling and asserts they meet in the same folded space.
 *
 *   npx tsx --test server/search-text.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSearchText, buildSearchFields } from './search-text.js';

/** True if a folded query term matches a folded stored value as a whole word. */
function wholeWordMatch(stored: string, query: string): boolean {
    const haystack = ` ${normalizeSearchText(stored)} `;
    const needle = ` ${normalizeSearchText(query)} `;
    return haystack.includes(needle);
}

test('accented text is findable by every case and accent spelling', () => {
    const stored = 'Misery in the Borinage (MISÈRE AU BORINAGE) [1933]';
    for (const query of ['misère', 'MISÈRE', 'Misère', 'misere', 'MISERE']) {
        assert.ok(wholeWordMatch(stored, query), `"${query}" should match stored title`);
    }
});

test('folding is symmetric — accented query finds unaccented text and vice versa', () => {
    assert.ok(wholeWordMatch('Cesar Chavez', 'César'));
    assert.ok(wholeWordMatch('César Chávez', 'Cesar'));
});

test('curly and straight punctuation are interchangeable', () => {
    assert.ok(wholeWordMatch('Colored Farmers’ National Alliance', "farmers'"));
    assert.ok(wholeWordMatch("Colored Farmers' National Alliance", 'farmers’'));
    assert.equal(normalizeSearchText('don’t'), normalizeSearchText("don't"));
});

test('dashes and symbols collapse to word separators', () => {
    assert.equal(normalizeSearchText('Ken Loach — Bread & Roses'), 'ken loach bread roses');
    assert.equal(normalizeSearchText('Strikes  &&  Lockouts'), 'strikes lockouts');
});

test('covers the diacritics present across the database, not just è', () => {
    assert.equal(normalizeSearchText('àáâãäå èéêë ìíîï òóôõö ùúûü ñ ç'), 'aaaaaa eeee iiii ooooo uuuu n c');
});

test('non-Latin scripts survive folding and stay searchable', () => {
    // Only punctuation is stripped — letters of any script are preserved, so a
    // CJK or Cyrillic title does not become an empty, unsearchable string.
    assert.equal(normalizeSearchText('罷工'), '罷工');
    assert.equal(normalizeSearchText('Забастовка'), 'забастовка');
});

test('punctuation-only input folds to empty', () => {
    // The search handlers rely on this to reject such queries; without that
    // guard the resulting '% %' pattern would match every row.
    for (const junk of ['???', '—', '  ', '"\'()[]', '!!!']) {
        assert.equal(normalizeSearchText(junk), '', `${JSON.stringify(junk)} should fold away`);
    }
});

test('searchAll spans every searchable field and stays space-padded', () => {
    const fields = buildSearchFields({
        title: 'MISÈRE AU BORINAGE',
        creator: 'Joris Ivens',
        description: 'A documentary about miners.',
        tags: 'Mining, Strikes & Lockouts',
        metadata: '{"country":"Belgium"}',
    });
    for (const term of ['misere', 'joris', 'miners', 'lockouts', 'belgium']) {
        assert.ok(fields.searchAll.includes(` ${term} `), `searchAll should contain "${term}"`);
    }
    // Padding is what lets '% word %' match terms at the string boundaries.
    assert.ok(fields.searchTitle.startsWith(' ') && fields.searchTitle.endsWith(' '));
    assert.equal(fields.searchTitle, ' misere au borinage ');
});

test('missing fields do not produce undefined or ragged padding', () => {
    const fields = buildSearchFields({ title: 'Solidarity Forever' });
    assert.equal(fields.searchCreator, '  ');
    assert.equal(fields.searchAll, ' solidarity forever ');
    assert.ok(!fields.searchAll.includes('undefined'));
});
