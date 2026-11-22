/**
 * Tag taxonomy consistency check.
 *
 * The 35 terms are hardcoded in three places, and two of the failure modes are
 * silent — they surface weeks later as tags quietly missing from entries:
 *
 *   1. `server/tags.ts` TAG_GROUPS          — the canonical list
 *   2. `server/tags.ts` TAG_NORMALIZATION   — must map each tag to ITSELF, or
 *      `normalizeTags()` drops it, and the bulk normalize action then strips it
 *      from every entry carrying it
 *   3. `src/tag-groups.ts`                  — the picker's copy (TagSelector.tsx);
 *      drift here means a tag exists but nobody can select it
 *
 * Run after touching the taxonomy:  npm run check:tags
 * Exits non-zero on any problem, so it can gate a commit.
 */

import { TAG_GROUPS, normalizeTags } from '../server/tags.js';
import { TAG_GROUPS as PICKER_GROUPS } from '../src/tag-groups.js';

const canonical: string[] = Object.values(TAG_GROUPS).flat();

// A canonical tag must survive its own round trip through normalizeTags.
const dropped = canonical.filter(t => normalizeTags(t) !== t);

// The picker keeps its own copy (plain data since 22 Nov 2026; also checked tag for
// tag, in order, by server/tags.test.ts).
const uiTags = new Set(PICKER_GROUPS.flatMap(g => g.tags));

const missingFromUi = canonical.filter(t => !uiTags.has(t));
const extraInUi = [...uiTags].filter(t => !canonical.includes(t));
const withComma = canonical.filter(t => t.includes(','));

console.log(`canonical tags            : ${canonical.length}`);
console.log(`tags in the picker        : ${uiTags.size}`);
console.log(`dropped by normalizeTags  : ${dropped.length} ${dropped.length ? JSON.stringify(dropped) : ''}`);
console.log(`canonical but not in UI   : ${missingFromUi.length} ${missingFromUi.length ? JSON.stringify(missingFromUi) : ''}`);
console.log(`in UI but not canonical   : ${extraInUi.length} ${extraInUi.length ? JSON.stringify(extraInUi) : ''}`);
// `Entry.tags` is a comma-separated string, so a tag containing a comma would
// split into two wrong tags on read. See the comma-trap note in CLAUDE.md.
console.log(`tags containing a comma   : ${withComma.length} ${withComma.length ? JSON.stringify(withComma) : ''}`);

const problems = dropped.length + missingFromUi.length + extraInUi.length + withComma.length;
if (problems) {
    console.error(`\nFAIL — ${problems} problem(s) above.`);
    process.exit(1);
}
console.log('\nOK — taxonomy consistent across all three places.');
