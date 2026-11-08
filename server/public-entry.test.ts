import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRIVATE_ENTRY_FIELDS, toPublicEntry } from './public-entry.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Column names of the Entry model, read from schema.prisma. */
function entryColumns(): string[] {
    const schema = fs.readFileSync(path.join(here, '../prisma/schema.prisma'), 'utf8');
    const model = schema.match(/model Entry \{([\s\S]*?)\n\}/);
    assert.ok(model, 'Entry model not found in schema.prisma');
    return model[1]
        .split('\n')
        .map(line => line.trim().match(/^([a-zA-Z]\w*)\s+\S/))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map(m => m[1]);
}

test('every submitter*/private* column in the schema is on the private list', () => {
    const privateLooking = entryColumns().filter(c => /^(submitter|private)/.test(c));
    assert.ok(privateLooking.length >= 4, 'schema parse found too few columns');
    for (const column of privateLooking) {
        assert.ok(
            (PRIVATE_ENTRY_FIELDS as readonly string[]).includes(column),
            `Entry.${column} looks private but is missing from PRIVATE_ENTRY_FIELDS — it would be sent publicly`,
        );
    }
});

test('every private field name is a real Entry column (no typos)', () => {
    const columns = entryColumns();
    for (const field of PRIVATE_ENTRY_FIELDS) {
        assert.ok(columns.includes(field), `${field} is not an Entry column`);
    }
});

test('toPublicEntry removes every private field and keeps the rest', () => {
    const entry = {
        id: 1, category: 'podcast', title: 'Show', metadata: '{"location":"DC"}',
        submitterName: 'A', submitterEmail: 'a@example.org', submitterComment: 'hi',
        privateMetadata: '{"contactPhone":"555"}',
    };
    const out = toPublicEntry(entry);
    for (const field of PRIVATE_ENTRY_FIELDS) assert.ok(!(field in out), `${field} leaked`);
    assert.deepEqual(out, { id: 1, category: 'podcast', title: 'Show', metadata: '{"location":"DC"}' });
    assert.equal(entry.submitterEmail, 'a@example.org', 'input must not be mutated');
});

test('no public route destructures private fields by hand any more', () => {
    // The old pattern listed the fields inline at each endpoint, so a new
    // private column had to be added in four places. Keep it in one.
    const src = fs.readFileSync(path.join(here, 'index.ts'), 'utf8');
    assert.ok(!/submitterName:\s*_\w+/.test(src), 'inline strip found — use toPublicEntry()');
});
