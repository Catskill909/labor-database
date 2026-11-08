import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unwrapQuote, quoteForDisplay } from './quote-text.js';

/** What a page that adds “ ” would show. */
const shown = (text: string) => {
    const q = quoteForDisplay(text);
    return q.addMarks ? `“${q.text}”` : q.text;
};

test('never two sets of marks: every stored shape shows exactly one', () => {
    const cases: [string, string][] = [
        ['Always aim high', '“Always aim high”'],
        ['"Always aim high"', '“Always aim high”'],
        ['“Always aim high”', '“Always aim high”'],
        ['“Always aim high"', '“Always aim high”'],
        ['  "Always aim high"  ', '“Always aim high”'],
        ['""Always aim high""', '""Always aim high""'], // marks inside: shown as stored, nothing added
    ];
    for (const [stored, expected] of cases) assert.equal(shown(stored), expected, stored);
});

test('text that only starts with a quotation is shown as stored, nothing added', () => {
    for (const stored of [
        '"The capitalist class hounded him like a wild beast." (referring to Martin Irons)',
        '“Poetic justice has been meted out.” October 29 is celebrated…',
        '"A fair day\'s pay for a fair day\'s work".',
    ]) {
        assert.deepEqual(quoteForDisplay(stored), { text: stored, addMarks: false }, stored);
    }
});

test('two quotations in one text are not merged into one', () => {
    assert.equal(unwrapQuote('"Organize" and "agitate"'), null);
});

test('apostrophes and single quote marks are left alone', () => {
    assert.equal(shown("The workers' hall"), '“The workers\' hall”');
    assert.equal(shown("'Tis the season"), '“\'Tis the season”');
    assert.equal(unwrapQuote("'quoted'"), null);
});

test('empty or one-character text is not unwrapped', () => {
    assert.equal(unwrapQuote('""'), null);
    assert.equal(unwrapQuote('"'), null);
    assert.equal(unwrapQuote(''), null);
});

test('stray marks seen in the stored data: closing only, ″ and a backwards ” opener', () => {
    assert.equal(shown('Labour was the first price.”'), '“Labour was the first price.”');
    assert.equal(shown('We think too much and feel too little."'), '“We think too much and feel too little.”');
    assert.equal(shown('″We know that these decisions matter.″'), '“We know that these decisions matter.”');
    assert.equal(shown('”We have micro rebellions at all times.”'), '“We have micro rebellions at all times.”');
    // A closing mark that ends an inner quotation is real text: shown as stored.
    assert.equal(shown('He called it "the best deal"'), 'He called it "the best deal"');
});
