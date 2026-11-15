import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CURATION_TAGS, UNCAPPED_TAGS, PODCAST_ONLY_GROUPS, TAG_GROUPS, CANONICAL_TAGS,
  mergeTagsWithExisting, normalizeTags,
} from './tags.js';

const split = (s: string | null) => (s ?? '').split(',').map(t => t.trim()).filter(Boolean);

test('every Curation tag is excluded from the cap', () => {
  assert.deepEqual([...CURATION_TAGS].sort(), [...TAG_GROUPS['Curation']].sort());
});

// The class: a canonical tag whose name an older clean-up rule drops or maps
// elsewhere (e.g. 'Africa': null, a legacy film tag) must still survive, or the
// bulk normalize strips it from every entry. Covers every canonical tag, so a
// future tag with a clashing name fails here too.
for (const tag of CANONICAL_TAGS) {
  test(`canonical tag "${tag}" survives normalizeTags`, () => {
    assert.equal(normalizeTags(tag), tag);
  });
}

test('a show tagged Africa keeps it through normalize, alongside other kinds', () => {
  assert.equal(normalizeTags('Africa, AFT, Organizing'), 'AFT, Africa, Organizing');
});

test('Union/Org and Region tags are all uncapped; subject tags are not', () => {
  for (const g of PODCAST_ONLY_GROUPS) for (const t of TAG_GROUPS[g]) assert.ok(UNCAPPED_TAGS.has(t), t);
  for (const t of TAG_GROUPS['Theme']) assert.ok(!UNCAPPED_TAGS.has(t), t);
});

// The class for podcasts: no Union/Org or Region tag may cost a show a subject slot.
for (const g of PODCAST_ONLY_GROUPS) {
  for (const t of TAG_GROUPS[g]) {
    test(`auto-tag still fills 5 subject slots when ${g} "${t}" is present`, () => {
      const existing = ['Mining', 'Organizing', 'Child Labor', 'Immigration', t].join(', ');
      const merged = split(mergeTagsWithExisting(existing, ['Healthcare', 'Construction']));
      assert.ok(merged.includes(t));
      assert.ok(merged.includes('Healthcare'), `fifth subject tag was blocked by "${t}"`);
      assert.ok(!merged.includes('Construction'), 'cap of 5 subject tags not enforced');
    });
  }
}

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
