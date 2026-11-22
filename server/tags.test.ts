import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CURATION_TAGS, UNCAPPED_TAGS, PODCAST_ONLY_GROUPS, TAG_GROUPS, CANONICAL_TAGS,
  mergeTagsWithExisting, normalizeTags,
} from './tags.js';
// The picker's list lives in src/ (browser code). Loaded at run time so the server's
// TypeScript build (rootDir: server) doesn't pull a browser file into its output.
const { TAG_GROUPS: PICKER_GROUPS } = (await import(
  new URL('../src/tag-groups.ts', import.meta.url).href
)) as { TAG_GROUPS: { name: string; tags: string[]; podcastOnly?: boolean }[] };

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

// The class: the admin picker keeps its own copy of the tag list. A tag renamed or
// added on one side only either can't be picked or is dropped by the bulk
// normalize. Every group, every tag, same order.
test('admin picker tag groups match the server taxonomy exactly', () => {
  const pickerName = (server: string) => (server === 'Social Dimension' ? 'Social' : server);
  assert.deepEqual(
    PICKER_GROUPS.map(g => g.name),
    Object.keys(TAG_GROUPS).map(pickerName),
  );
  for (const [name, tags] of Object.entries(TAG_GROUPS)) {
    const picker = PICKER_GROUPS.find(g => g.name === pickerName(name));
    assert.deepEqual(picker?.tags, [...tags], name);
    assert.equal(!!picker?.podcastOnly, (PODCAST_ONLY_GROUPS as readonly string[]).includes(name), `${name} podcastOnly`);
  }
});

// Renamed 19 Nov 2026: shows tagged with the old names keep them, under the new name.
test('old Union/Org names become the spelled-out ones on normalize', () => {
  assert.equal(normalizeTags('IW, Eastern US'), 'Eastern US, Ironworkers');
  assert.equal(normalizeTags('History Assn, Canada'), 'Canada, History Associations');
});
