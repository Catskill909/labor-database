import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURATION_TAGS, TAG_GROUPS, mergeTagsWithExisting } from './tags.js';

const split = (s: string | null) => (s ?? '').split(',').map(t => t.trim()).filter(Boolean);

test('every Curation tag is excluded from the cap', () => {
  assert.deepEqual([...CURATION_TAGS].sort(), [...TAG_GROUPS['Curation']].sort());
});

// The class: any curation tag on an entry must not cost it a subject-tag slot.
for (const curation of TAG_GROUPS['Curation']) {
  test(`auto-tag still fills 5 subject slots when "${curation}" is present`, () => {
    const existing = ['Mining', 'Organizing', 'Child Labor', 'Immigration', curation].join(', ');
    const merged = split(mergeTagsWithExisting(existing, ['Healthcare', 'Construction']));
    assert.ok(merged.includes(curation));
    assert.ok(merged.includes('Healthcare'), 'fifth subject tag was blocked by a curation tag');
    assert.ok(!merged.includes('Construction'), 'cap of 5 subject tags not enforced');
    assert.equal(merged.filter(t => !CURATION_TAGS.has(t)).length, 5);
  });
}

test('cap still holds with no curation tags', () => {
  const existing = 'Mining, Organizing, Child Labor, Immigration, Healthcare';
  assert.equal(split(mergeTagsWithExisting(existing, ['Construction'])).length, 5);
});
