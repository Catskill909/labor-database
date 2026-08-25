# Client Feedback Audit & Solutions — Working Doc

**Date:** 2026-08-25
**Source:** Client email re: Labor Arts & Culture Database
**Status:** Audit complete — every issue traced to root cause in code/data. Solutions proposed below, none implemented yet.

---

## Quick Verdict Table

| # | Issue | Type | Root cause found? | Fix difficulty |
|---|-------|------|-------------------|----------------|
| 1 | Public corrections/updates to existing entries | Feature request | n/a — doesn't exist yet | Medium (1–2 days) |
| 2 | Adding new tags as DB evolves | Feature request | Tags hardcoded in 2 files | Medium (2–3 days, includes fixing comma trap) |
| 3 | Bulk import from Labor Quotes site | Feature request | Import pipeline already exists | Small–Medium (mostly a scraping/mapping script) |
| 4 | Accented search fails ("Misère") | **Bug** | ✅ SQLite `LIKE` is case-sensitive for non-ASCII | Small–Medium |
| 5 | Search results appear then disappear | **Bug** | ✅ Race condition — no debounce/abort on main search | Small |
| 6 | "From the Era" headings confusing | Copy change | ✅ Two strings in one file | Trivial |
| 7 | Drake/Moby on July 12 | **Data + design flaw** | ✅ Verified — quote entries dated 2016–2023 trigger year-matching | Small code fix + data decision |

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

### 2a. "Misère" search fails — case sensitivity with accents (BUG, root cause confirmed)

**Root cause:** Search runs raw SQL `LIKE` against SQLite (`server/index.ts`
~lines 906–1060). SQLite's `LIKE` is case-insensitive **only for ASCII A–Z**. For
accented characters, `è` (U+00E8) ≠ `È` (U+00C8). The stored title is
*"Misery in the Borinage (MISÈRE AU BORINAGE) [1933]"* — uppercase `È` — so
lowercase "Misère" never matches, while all-caps "MISÈRE" matches exactly. This
affects **every accented character in the database**, not just this film.
There is no diacritic normalization anywhere in the codebase.

**Proposed solution (recommended: normalized shadow column):**
1. Add a `searchText` column to `Entry`: lowercased + diacritics stripped
   (Unicode NFD → remove combining marks) concatenation of title/creator/
   description/tags, maintained on every create/update/import (same hook points
   as `cleanEntryText()`).
2. Normalize the incoming query the same way and `LIKE` against `searchText`.
3. Backfill migration for all ~5,950 existing rows.
4. This makes search both case-insensitive **and accent-insensitive**
   ("misere" finds "MISÈRE") with no SQLite extension needed.

Alternatives considered: SQLite ICU extension (deployment complexity in Docker),
FTS5 with a custom tokenizer (bigger lift; a good future upgrade), normalizing
only at query time (insufficient — stored text also needs folding).

**Effort:** ~6–10 hours incl. migration + backfill. **Backup first** (rule 5).

### 2b. Alternate / translated titles

**Current state:** Schema has a single `title` field; no alternate-title field
exists. Some entries embed alternates in the title string ("(aka Freedom for Us)").

**Proposed solution:** Add `alternateTitles` to the film `metadata` JSON (already
category-specific) and include it in the `searchText` column from 2a. The `LIKE`
against metadata already exists, so anything stored there is findable once
case/accent folding is fixed. TMDB enrichment can auto-populate original +
translated titles (`original_title`, `alternative_titles` endpoint).

**Effort:** ~4–6 hours (metadata field + admin form field + TMDB enrichment hook).

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

## Suggested Sequencing

1. **Quick wins (one small deploy):** 2c race-condition fix + debounce; 3a heading
   rename; 3b code fix (history-years-only or tag-gated matching).
2. **Search quality:** 2a normalized `searchText` column (+ backfill migration),
   then 2b alternate titles riding on it.
3. **Data work (no deploy):** 3b quote-year audit; 1c Labor Quotes import script.
4. **Bigger features:** 1a correction-suggestion flow; 1b admin-managed tags
   (folding in the comma-trap fix).

## Open Questions for the Client

1. Labor Quotes site: what platform is it (WordPress?), and can they provide an
   export rather than us scraping?
2. For "Related Films/Music": prefer tag-based matching, curated links, or
   history-years-only as the first step?
3. Quote dates: are the 2016–2023 years on quotes intentional ("date featured") or
   should they reflect the quote's historical date? This decides the data cleanup.
4. Should public correction suggestions require the submitter's name/email (as new
   submissions do today)?

## Reminders Before Implementation

- **Backup before any schema/migration/import work** (CLAUDE.md rule 5):
  `cp prisma/dev.db backups/dev-$(date +%Y%m%d-%H%M%S).db` + production Full Backup ZIP.
- `npx tsc --noEmit` must pass before any push (strict mode; deploy runs `tsc -b`).
- Data fixes (quote years, imports) go through Admin Dashboard, not git.
