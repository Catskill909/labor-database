# Client Feedback Audit & Solutions — Working Doc

**Date:** 2026-08-25 (audit) · updated 2026-08-25 (phases 1–2 shipped)
**Source:** Client email re: Labor Arts & Culture Database
**Status:** Audit complete — every issue traced to root cause in code/data.

**Progress:**
- **Phase 1 — done** (commit `fd64f35`): 2c search race condition, 3a heading rename, 3b history-years-only matching.
- **Phase 2 — done**: 2a accent/punctuation-insensitive search, via folded shadow columns.
- **Next:** 2b alternate titles (rides on 2a), then the 3b quote-year data audit, then the bigger features (1a, 1b, 1c) — several of which are gated on client answers below.

---

> **This document is the analysis** — root causes, evidence, effort estimates.
> For the current working state (what is done, what is next, what is blocked, and
> the tracked bugs BUG-1/2/3), see [HANDOFF.md](HANDOFF.md).

## Quick Verdict Table

| # | Issue | Type | Root cause found? | Fix difficulty |
|---|-------|------|-------------------|----------------|
| 1 | Public corrections/updates to existing entries | Feature request | n/a — doesn't exist yet | Medium (1–2 days) |
| 2 | Adding new tags as DB evolves | Feature request | Tags hardcoded in 2 files | Medium (2–3 days, includes fixing comma trap) |
| 3 | Bulk import from Labor Quotes site | Feature request | Import pipeline already exists | Small–Medium (mostly a scraping/mapping script) |
| 4 | Accented search fails ("Misère") | **Bug** | ✅ SQLite `LIKE` is case-sensitive for non-ASCII | ✅ **FIXED** |
| 5 | Search results appear then disappear | **Bug** | ✅ Race condition — no debounce/abort on main search | ✅ **FIXED** |
| 6 | "From the Era" headings confusing | Copy change | ✅ Two strings in one file | ✅ **FIXED** |
| 7 | Drake/Moby on July 12 | **Data + design flaw** | ✅ Verified — quote entries dated 2016–2023 trigger year-matching | ✅ Code fixed; data audit outstanding |

---

## 1. Submissions & Maintenance

### 1a. Expand "Add" to support corrections/updates to existing entries

**Current state:** The public `SubmissionWizard` (`src/components/SubmissionWizard.tsx`)
POSTs to `POST /api/entries` (`server/index.ts` ~line 1311), which creates a **new**
entry with `isPublished: false` for admin review. There is **no mechanism** for the
public to suggest an edit to an existing entry — only admins can edit (via
`EditEntryModal` in the admin dashboard).

**Proposed solution — "Suggest a correction" flow:**
1. **Schema:** new `SubmittedEdit` model referencing `entryId`, with the proposed
   field values, submitter contact fields (admin-only, same as today), and a
   `status` field (`pending` / `approved` / `rejected`).
2. **API:**
   - `POST /api/entries/:id/edits` — public, rate-limited
   - `GET /api/admin/edits`, `PATCH /api/admin/edits/:id` (approve applies the diff
     to the Entry), `DELETE /api/admin/edits/:id`
3. **UI:**
   - "Suggest a correction" button on the public entry detail view, opening a form
     pre-filled with the current entry data
   - "Pending Corrections" tab in Admin Dashboard with a before/after diff view
4. Reuses the existing moderation pattern (submitter fields stripped from public
   API, admin approval gate).

**Effort:** ~12–16 hours. Requires a schema migration (**backup first per CLAUDE.md rule 5**).

### 1b. Adding new tags as the database evolves

**Current state:** Tags are **not admin-manageable**. The 34-term canonical
vocabulary is hardcoded in **two places** that must be kept in sync:
- `server/tags.ts` (`TAG_GROUPS`, plus `TAG_NORMALIZATION` and auto-tag `TAG_RULES`)
- `src/components/TagSelector.tsx` (duplicated `TAG_GROUPS` array)

Adding a tag today = code change in both files + deploy.

**Also relevant:** `Entry.tags` is a comma-separated string. CLAUDE.md documents a
known trap: any tag containing a comma will silently corrupt tag parsing. Any tag
system work should address this at the same time.

**Proposed solution — admin-managed tags:**
1. **Schema:** new `Tag` table (`name`, `group`, `sortOrder`, `isActive`), seeded
   from the current 34 canonical tags.
2. **API:** CRUD under `/api/admin/tags`; public `GET /api/tags` reads from DB
   instead of the constant.
3. **UI:** "Manage Tags" panel in Admin Dashboard; `TagSelector` fetches from
   `/api/tags` (removes the duplicated hardcoded list).
4. **Recommended in same pass:** migrate `Entry.tags` from comma-string to either a
   many-to-many relation or JSON array — closes the comma trap before any future
   LCSH mapping.

**Effort:** ~16–20 hours including migration. (A minimal version — DB-backed tag
list, keep string storage — is ~8–10 hours, but leaves the comma trap open.)

### 1c. Bulk import from the Labor Quotes site (with permission)

**Yes — practical, and most of the machinery already exists:**
- `POST /api/admin/import` accepts a JSON array (or `{entries, categories}`),
  smart-merges by `title + category` (updates existing, creates new), runs in a
  transaction, and applies `cleanEntryText()` HTML-entity sanitization.
- `POST /api/admin/import-zip` handles full backups with images.
- Precedent exists: `scripts/import-quotes.ts`, `import-history.ts`,
  `import-films.ts` (WordPress WXR XML) — a Labor Quotes scraper would follow the
  same pattern.

**Proposed workflow:**
1. Confirm written permission + the site's structure (WordPress? static HTML?).
   If WordPress, request an XML export — we already parse WXR for films.
2. Write `scripts/import-labor-quotes.ts` mapping source fields →
   `{category: "quote", title, description, creator, year/month/day, tags, sourceUrl}`.
3. Output JSON, review a sample, then import via Admin Dashboard → Import
   (works against production without a deploy — this is a DATA operation).
4. Dedup against existing ~quotes is automatic via title+category merge, but expect
   some near-duplicate cleanup (punctuation/attribution variants won't merge).

**Effort:** ~4–8 hours depending on source format. **Backup before import** (rule 5).

---

## 2. Search Issues

### 2a. "Misère" search fails — case sensitivity with accents ✅ SHIPPED

**Root cause:** Search ran raw SQL `LIKE` against SQLite. SQLite's `LIKE` is
case-insensitive **only for ASCII A–Z**. For accented characters, `è` (U+00E8) ≠
`È` (U+00C8). The stored title is *"Misery in the Borinage (MISÈRE AU BORINAGE)
[1933]"* — uppercase `È` — so lowercase "Misère" never matched.

**The class was larger than the reported instance.** Measured against the live
local DB before the fix:

| Fold needed | Entries affected |
|---|---|
| Accented Latin letters (title/creator) | 150 |
| Curly apostrophe `’` (title/description) | **864** |
| Any non-ASCII (title/creator) | 1,428 |

The curly-apostrophe population is ~6× the accent population and breaks far more
ordinary searches — `don't` could never match a stored `don’t`, and
`workers' rights` missed `workers’ rights`. Same root cause, same fix. Roughly
1 entry in 7 was affected in some way.

**Two further instances of the same bug** were found and fixed in the same pass:
the public `creator` filter and the **admin** entry search, which is a
near-duplicate copy of the public search builder. All three used raw `LIKE`.

**What shipped — folded shadow columns:**
1. `server/search-text.ts` — `normalizeSearchText()`: NFD-decompose → strip
   combining marks → lowercase → collapse every non-alphanumeric to a space.
   Letters/digits of all scripts are preserved (`\p{L}`/`\p{N}`), so CJK and
   Cyrillic titles stay searchable; only punctuation is dropped.
2. Four columns on `Entry` — `searchTitle`, `searchCreator`, `searchDescription`,
   `searchAll` — holding folded, space-padded copies. The three narrow columns
   exist purely to preserve the existing result ranking (exact title > title >
   creator > description); `searchAll` alone drives the `WHERE`.
3. The query is folded identically, so both sides meet in the same character
   space and plain `LIKE` works again. This also replaced the 15-deep nested
   `REPLACE()` the SQL used to run per field per row.
4. `syncSearchText()` recomputes the columns on every server write —
   create, admin update, JSON import, ZIP import, tag normalize, auto-tag.

**Two traps found while implementing, both avoided:**
- *Partial updates.* The admin `PUT` and both import paths treat an omitted
  field as "leave unchanged". Deriving the columns from the request body would
  have silently blanked whatever the caller didn't send. `syncSearchText()`
  therefore reads the **persisted row** rather than the payload.
- *Punctuation-only queries.* A query like `"???"` folds to an empty string,
  and the resulting `'% %'` pattern would have matched **every row**. Both
  search paths now short-circuit to zero results.

**Deployment note — this migration is not self-sufficient.** `prisma migrate
deploy` adds the columns as NULL on all ~5,950 production rows, and search
matches nothing until they are populated. `docker-entrypoint.sh` therefore runs
`scripts/backfill-search-text.ts --missing-only` after migration (a no-op on
later boots), and the Dockerfile now copies `scripts/` into the runtime image,
which it previously did not. Verified by simulating the deploy against a copy of
the production-shaped DB.

**Known limitation:** the seven standalone scripts in `scripts/` each construct
their own `PrismaClient` and bypass `syncSearchText()`. After running any of
them, run `npm run backfill:search` (full rebuild). This is documented in
CLAUDE.md rather than papered over.

**Verified:**
- `misère`, `MISÈRE`, `Misère`, `misere`, `MISERE` all return the film.
- `farmers' national alliance` and `farmers’ national alliance` return the same result.
- `Cesar Chavez` now returns 35 entries where it previously returned 31 — the 4
  entries spelled `César` were unreachable before.
- Date, decade and year searches (`July 1877`, `1930s`, `1886`) unchanged.
- `npm test` — 9 tests in `server/search-text.test.ts` covering the class
  (both fold directions, both apostrophe styles, the full diacritic set,
  non-Latin preservation, punctuation-only input, field coverage, padding).

### 2b. Alternate / translated titles

**Current state:** Schema has a single `title` field; no alternate-title field
exists. Some entries embed alternates in the title string ("(aka Freedom for Us)").

**Proposed solution:** Add `alternateTitles` to the film `metadata` JSON (already
category-specific). **Now largely free on the search side:** `metadata` is folded
into `searchAll`, so anything written there is immediately findable, accent- and
punctuation-insensitively, with no further search work. Remaining work is the
admin form field and a TMDB enrichment hook (`original_title`,
`alternative_titles` endpoint).

**Effort:** ~3–4 hours (down from 4–6 — the search half is already done).

### 2c. Results appear briefly then disappear (BUG, root cause confirmed)

**Root cause:** Race condition. The header search input (`src/components/Header.tsx`
~line 135) updates state on **every keystroke** with **no debounce**, and the fetch
effect in `src/App.tsx` (~lines 73–96) has **no AbortController or staleness
guard** — `setEntries(data)` unconditionally overwrites state. When an earlier,
slower request ("Mi") resolves after a later one ("Misère"), stale results replace
fresh ones — exactly the "appear then disappear" symptom. (Other inputs in the app
— FilterBar, MusicSearch, TmdbSearch — are debounced; only the main search isn't.)

**Proposed solution (both, they're complementary):**
1. Debounce the header search input ~300ms (pattern already exists in
   `FilterBar.tsx`'s `DebouncedInput`).
2. Add an `AbortController` in the App.tsx fetch effect — abort the in-flight
   request on re-run so stale responses can never land.

**Effort:** ~2–3 hours including testing. No schema changes, no data risk.

---

## 3. Home Page ("On This Day")

### 3a. Rename "Films/Music From the Era" → "Related Films/Related Music"

**Current state:** Both headings live in `src/components/OnThisDayView.tsx`
(~lines 347 and 367), with subtitles like "Released in 1933".

**Proposed solution:** Trivial string change. **Caveat:** with the current
matching logic (see 3b) the content is *not* actually "related" — it's
year-coincident. Recommend doing 3a and 3b together so the new heading is honest.

**Effort:** minutes for the rename alone.

### 3b. Drake / Gloria Gaynor / Moby on July 12 (ROOT CAUSE CONFIRMED IN DATA)

**How selections are generated:** `GET /api/on-this-day` (`server/index.ts`
~lines 672–693):
1. Fetch history + quote entries matching the month/day.
2. Collect the **years** of those entries.
3. Return **every published film/song whose release year is in that set** (up to
   20). No tag, topic, or curated relationship — year coincidence only. All
   selections come from the LHF database itself (Entry table), **not** an external
   source — Genius/TMDB are only used in submission/enrichment flows.

**Verified against the live local DB:** July 12 has quote entries with years
2016, 2017, 2018 … 2023 — one per year, which strongly suggests those years are
"date featured on the site" rather than the quote's actual historical date. The
year set therefore includes **2016**, and all three reported songs are in the DB
with year 2016:

| ID | Title | Creator | Year |
|----|-------|---------|------|
| 3330 | Faithful | Drake | 2016 |
| 3381 | I Will Survive | Demi Lovato | 2016 |
| 3510 | Trump Is on Your Side | Moby and the Homeland Choir | 2016 |

So the mechanism is exactly as the client suspected: a modern-dated quote drags in
every modern song from the same year.

**Proposed solution (two parts):**
1. **Code:** derive the year set from **history entries only** (exclude quotes),
   or better: require the film/song to share ≥1 tag with the day's history entries
   in addition to (or instead of) year matching. Longer-term option: a curated
   `relatedEntryIds` link for manual pairing.
2. **Data:** audit quote entries whose year looks like a "featured on" date
   (the sequential 2016–2023 pattern on a single day is the tell). Decide whether
   quote years should be the quote's historical date or cleared. This is a DATA
   problem → fix via admin/export-import, not a deploy.

**Effort:** code fix ~3–6 hours depending on option chosen; data audit separate
(scriptable: flag days where quote years form recent sequential runs).

---

## Sequencing

1. ~~**Quick wins:** 2c race-condition fix + debounce; 3a heading rename; 3b
   history-years-only matching.~~ ✅ **Done** — commit `fd64f35`.
2. ~~**Search quality:** 2a folded search columns + backfill.~~ ✅ **Done.**
3. **Next up — 2b alternate titles.** Cheap now that 2a has landed; no schema
   migration needed (rides in the film `metadata` JSON).
4. **Data work (no deploy):** quote-date cleanup — *needs a decision, not more
   investigation* (see Client Questions 3 and Data Findings A/B); 1c Labor Quotes
   import — *unblocked on platform (Weebly), still needs the site URL*.
5. **Bigger features:** 1a correction-suggestion flow — **unblocked**, Q4 answered
   (name + email collected); 1b admin-managed tags, folding in the comma-trap fix.

**Note on ordering:** 1b (admin-managed tags) should stay last of the features,
but it must come **before** any LCSH mapping — see the comma-trap warning in
CLAUDE.md. Real Library of Congress subject headings contain commas, and
`Entry.tags` is still a comma-separated string.

## Client Questions — Status

**1. Labor Quotes site platform — ANSWERED: Weebly.**
This rules out the WordPress path. Weebly has no structured content export
equivalent to WXR, so the options are, in order of preference:
- **A Weebly blog RSS/Atom feed**, if the quotes are published as blog posts —
  structured, and the cleanest source. Feeds are often capped to recent posts,
  so check depth before relying on it.
- **HTML scraping** of the site's archive pages — the likely fallback.
- **Whatever export the site owner can produce** from their own admin.

*Still needed from the client: the site URL, and confirmation they own/control
the account.* Effort estimate holds at ~4–8 hours, leaning toward the top of
that range if scraping is required.

**2. "Related Films/Music" matching — partially answered by shipping.**
History-years-only matching is live and resolves the reported symptom. Open only
if they want to go further (tag-gated matching or curated links).

**3. Quote dates — ANSWERED BY THE DATA. No longer a question of fact.**

Every quote year in the database falls in **2014–2026**, the site's publishing
era. Not one of the 1,747 dated quotes carries a historical year. The July 12
entries make it unambiguous — Wendell Phillips (d. 1884) is dated 2016, Eddie
Cantor (d. 1964) 2017, Woody Guthrie (d. 1967) 2019, Boris Karloff (d. 1969)
2023. These are "date featured", definitively.

The source CSV confirms it: the `DATES` column holds a single `YYYY.MM.DD`
featured date, and `scripts/import-quotes.ts` maps it to month/day/year.

**This means the month/day is the featured date too** — so the quote section of
On This Day currently shows *"quotes we published on this calendar date in past
years"*, not *"quotes connected to this date in labor history."* That may be
exactly what LHF wants (it is their quote-of-the-day archive, and the pairings
may have been editorially chosen), or it may be the same confusion the client
flagged for films/music. **This is the real question to put to them** — it is a
design decision, not a data fact.

What remains is a decision, not an investigation:
- **(a) Leave as is.** Harmless to matching now that On This Day ignores quote
  years, but the year is still wrong if it is displayed anywhere as the quote's date.
- **(b) Move the featured date out of `year`** into `metadata.featuredDate`,
  leaving `year` null unless someone researches the real date. Most honest;
  preserves the archive; keeps the quote-of-the-day pairing intact.
- **(c) Clear the years outright.** Simplest, loses the archive information.

Recommend **(b)**.

**4. Public correction submitter details — ANSWERED: name and email will be
collected**, same as new submissions. No further input needed; 1a can be
specified as designed.

---

## Data Findings from the Quote-Date Investigation (25 Aug 2026)

Three concrete issues surfaced while resolving question 3. All are **DATA**
problems (plus one script bug); none are urgent, none are fixed yet.

### A. The quote importer's date parser fails silently on malformed input

`parseDateField()` in `scripts/import-quotes.ts` splits on `.` and calls
`parseInt` on the first part with no validation. A source date in `M/D/YYYY`
format therefore yields `year = 5` from `"5/6/2025"` rather than being rejected.

**Damage is small and bounded — 7 rows have a malformed source date, of which 4
carry real damage:**

| ID | Source value | Stored result | Effect |
|----|--------------|---------------|--------|
| 1599 | `5/6/2025` | year 5, no month/day | wrong year; invisible in On This Day |
| 2020 | `5/29/2025` | year 5, no month/day | wrong year; invisible in On This Day |
| 3143 | `12/17/2024` | year 12, no month/day | wrong year; invisible in On This Day |
| 2983 | `2022.04/14` | year 2022, month 4, **no day** | missing from On This Day |
| 1840 | `2021.05.14: 2017.05.15` | first date parsed correctly | second date lost only |
| 2616 | `2014.11.21.2014` | parsed correctly | none |

**Swept for the class:** no other importer shares the pattern —
`import-films.ts` uses a validated regex, `import-music.ts` a regex match, and
`import-history.ts` reads separate Month/Day/Year columns. A full-database scan
for implausible years (`< 1500` or `> 2027`) returns only these 3 quote rows.
The two odd history years, **1170** and **1381**, are genuine — the papyrus
strike and the Peasants' Revolt.

**Fix:** make `parseDateField()` reject anything not matching
`^\d{4}\.\d{1,2}\.\d{1,2}$` and report skipped rows rather than guessing,
then correct the 4 damaged rows via the Admin Dashboard.

### B. 398 On This Day appearances are missing — importer keeps only the first date

374 quotes have **multiple** featured dates in the source (`2021.05.25;
2019.05.27; 2016.11.09`), and the importer takes only the first. 555 dates are
dropped. Of those, **296 quotes have an extra date on a different calendar day**,
costing **398 quote/day appearances** that On This Day should be showing and is not.

This is not a bug so much as a schema limit: `Entry` holds one month/day/year.
Supporting it properly means a repeating-dates field (e.g. `metadata.featuredDates`
array) plus an On This Day query that checks it — which pairs naturally with
option **(b)** in question 3 above.

### C. 169 quotes have no year at all

Expected (the source `DATES` field was blank) and harmless. Noted for completeness.

## Reminders Before Implementation

- **Backup before any schema/migration/import work** (CLAUDE.md rule 5):
  `cp prisma/dev.db backups/dev-$(date +%Y%m%d-%H%M%S).db` + production Full Backup ZIP.
- `npx tsc --noEmit` must pass before any push (strict mode; deploy runs `tsc -b`).
- `npm test` must pass (search folding tests).
- Data fixes (quote years, imports) go through Admin Dashboard, not git.
- **After running anything in `scripts/`**, run `npm run backfill:search` — those
  scripts use their own PrismaClient and do not maintain the search columns.
