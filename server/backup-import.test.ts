/**
 * Tests for restoring an entry from a Full Backup ZIP.
 *
 * The bug these exist to prevent: the importer built its create payload inline
 * and omitted `createdAt` / `updatedAt`, so every restored entry was stamped
 * with the date of the import. The export had always included them - the data
 * was in every ZIP, and the importer discarded it.
 *
 * The class is not "those two columns". It is **any column the export writes
 * and the import forgets**, which is invisible until a real restore. So the
 * first test derives the expected field list from `prisma/schema.prisma`
 * instead of from a list kept here: add a column to Entry, forget the importer,
 * and this fails.
 *
 *   npx tsx --test server/backup-import.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { entryCreateData, NOT_RESTORED } from './backup-import.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA = path.join(HERE, '..', 'prisma', 'schema.prisma');

/** Scalar column names on the Entry model, read from the schema itself. */
function entryScalarFields(): string[] {
    const src = fs.readFileSync(SCHEMA, 'utf-8');
    const block = src.match(/^model Entry \{([\s\S]*?)^\}/m);
    assert.ok(block, 'could not find model Entry in schema.prisma');
    const fields: string[] = [];
    for (const raw of block[1].split('\n')) {
        const line = raw.replace(/\/\/.*$/, '').trim();
        const m = line.match(/^(\w+)\s+(\w+)(\[\])?\??/);
        if (!m) continue;
        // Relations are lists or model types, not columns we restore directly.
        if (m[3]) continue;
        if (!/^(String|Int|Boolean|DateTime|Float|BigInt|Decimal|Json|Bytes)$/.test(m[2])) continue;
        fields.push(m[1]);
    }
    return fields;
}

test('every Entry column is either restored or documented as excluded', () => {
    const restored = new Set(Object.keys(entryCreateData({})));
    const excluded = new Set(Object.keys(NOT_RESTORED));

    const missing = entryScalarFields().filter(f => !restored.has(f) && !excluded.has(f));

    assert.deepEqual(missing, [],
        `Entry columns the importer would silently drop on restore: ${missing.join(', ')}. ` +
        `Add them to entryCreateData(), or to NOT_RESTORED with the reason.`);
});

test('createdAt and updatedAt survive the round trip', () => {
    const exported = {
        title: 'Misère au Borinage', category: 'film', description: 'x',
        createdAt: '2026-03-14T09:12:00.000Z',
        updatedAt: '2026-08-01T17:45:30.000Z',
    };
    const data = entryCreateData(exported);

    assert.ok(data.createdAt instanceof Date, 'createdAt must be restored as a Date');
    assert.equal(data.createdAt.toISOString(), exported.createdAt);
    assert.equal(data.updatedAt?.toISOString(), exported.updatedAt);
});

test('an older ZIP without timestamps falls through to the schema defaults', () => {
    // Backups taken before this fix have no such fields. Passing `undefined`
    // lets Prisma apply @default(now()), which is the right answer there -
    // passing null or an Invalid Date would not be.
    const data = entryCreateData({ title: 't', category: 'history', description: 'd' });
    assert.equal(data.createdAt, undefined);
    assert.equal(data.updatedAt, undefined);
});

test('a corrupt timestamp does not become an Invalid Date', () => {
    const data = entryCreateData({ createdAt: 'not a date', updatedAt: '' });
    assert.equal(data.createdAt, undefined);
    assert.equal(data.updatedAt, undefined);
});

test('isPublished defaults to true only when the field is absent', () => {
    assert.equal(entryCreateData({}).isPublished, true);
    assert.equal(entryCreateData({ isPublished: false }).isPublished, false);
    assert.equal(entryCreateData({ isPublished: true }).isPublished, true);
});
