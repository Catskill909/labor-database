# HANDOFF — Labor Arts & Culture Database

**Purpose:** pick-up point for a new chat window, session, or assistant.
Read this first, then `CLAUDE.md` for the hard project rules.

**Last updated:** 8 September 2026
**Branch:** `main` · **Production:** https://labor-database.supersoul.top
**Scope:** this repo only. The Digital Asset Manager / "Labor Heritage Media
Archive" (`lhf-tools.supersoul.top`) is a **separate project, tracked elsewhere.**

---

## 🔴 START HERE — deployment storage migration is the open work

**Before changing anything under Coolify → Persistent Storage on this app, read
the private ops runbook.** It is deliberately **not in this repo** — this
repository is public and the runbook contains infrastructure specifics that are
nobody's business but ours.

**Location:** `cooify-volume-fix.md`, in the *digital-asset-manager* working
copy (`~/Desktop/digital-asset-manager/`). It holds the cause, the per-app
checklist, a completed worked example and the running log.

**Do not summarise its contents into this file, `CLAUDE.md`, or any other
tracked document.** Point at it; do not copy from it.

### 🐞 Fixed here, 26 August 2026 — the backup ZIP was not lossless

The importer dropped `createdAt` / `updatedAt`, stamping every restored entry
with the date of the import. Not cosmetic: `createdAt` is the **default browse
order**, backs the **Newest / Oldest** sort options, and supplies
`date_published` / `date_modified` in the **JSON Feed**. The export always
included both fields; the importer discarded them.

The field mapping now lives in `server/backup-import.ts`, and
`server/backup-import.test.ts` derives the expected columns **from
`prisma/schema.prisma`** — so a column added to `Entry` and forgotten in the
importer fails `npm test` naming the column, rather than surfacing after a real
restore. Verified by removing a field and watching it fail.

**Existing backup ZIPs are fine.** The data was always in them.

---

## ✅ Current state: search fix is LIVE (25 Aug 2026, ~22:30 UTC)

Deployed at `d961c54`. Verified in production:

- Chris's exact searches all return the film: "Misère", "misère", "MISÈRE",
  and **"Misère au Borinage"** (his alternate-title case)
- `farmers'` and `farmers’` return identical results
- `Cesar Chavez` returns **35** (was 32 — the four "César" entries are now reachable)
- `Buñuel` returns 3
- No regressions: Haymarket 12, July 1877 4, 1930s 100, 1886 20
- Punctuation-only queries return 0, not everything
- July 12 shows `matchedYears: [1917, 1933]`, no Drake/Gaynor/Moby

### ⚠️ IMPORTANT — that deploy needed an infrastructure workaround

`prisma migrate deploy` could not obtain its exclusive lock until a deployment
change was made by hand. **The migration is applied, so day-to-day deploys are
fine — but any future schema change hits the same wall** until the work in
BUG-6 is done.

**The specifics are in the private runbook, not here.** See BUG-6 below.

**The entrypoint now fails loudly** (`exit 1`) if a migration fails — so a
future failure takes the site *down* rather than serving errors silently. That
is deliberate, and it is why BUG-6 is worth finishing.

---

## 🔴 BUG-6 · Deployment storage — tracked in the private runbook

**Details deliberately not recorded here.** This repository is public. The
cause, the affected resources, the migration procedure, the verification and the
rollback are all in `cooify-volume-fix.md` in the *digital-asset-manager*
working copy, which is not in any repository.

**What belongs in this file:** it is open, it is the next infrastructure job on
this app, it is not urgent, and nothing about it is a client-facing problem.

**Ruled out earlier — do not re-investigate:** migration history drift / P3005
(`migrate status` reports up to date); migration file missing from the image
(committed, not gitignored, not dockerignored); container-handover lock
contention (33s gap plus a 12×5s retry, both still failed).

### Also worth doing

- **Make `/api/health` touch the Entry table.** It runs a raw `SELECT 1`, so it
  reported healthy through the entire 25 Aug outage. This is why nothing caught it.
- **Add a SIGTERM handler** for clean shutdown and WAL checkpoint.

### INCIDENT — 25 Aug 2026, ~19:30–19:48 UTC (~18 min)

Search fix deployed; `migrate deploy` failed on the shared-file lock; the
entrypoint started the server anyway; every Entry endpoint returned 500 while
`/api/health` stayed green. Reverted, then re-deployed successfully once the
competing apps were stopped. No data lost.

**Why it was not caught:** the migration was verified against a copy of the
*local* database, which has clean history and no competing process. Production's
actual conditions were never tested.


## The client's actual asks

From Chris Garlock (Executive Director, LHF), email 25 Aug 2026, "LHF database
and media database follow-up questions". **Work from his wording, not paraphrase.**

| # | Chris's ask | Status |
|---|---|---|
| B1 | Searches **case-insensitive** + recognise **alternate/translated titles** | ✅ **LIVE** 25 Aug |
| B2 | Results **appear briefly then disappear** | ✅ **LIVE** (`fd64f35`) |
| C1 | Rename "Films/Music From the Era" → **"Related Films/Music"** | ✅ **LIVE** (`fd64f35`) |
| C2 | Clarify how selections are generated; limit them to entries **"meaningfully connected to the day's history"** | ✅ **LIVE** 8 Sep (`dae2902`) — now tag-ranked, not year-matched. Still owes him the answer that the music was never from another source |
| A1 | Expand "Add" so users can submit **corrections/updates** to existing entries | ⚠️ **Answered differently.** Chris approved the full flow; we are recommending against building it yet. A **Contact & Corrections** menu item shipped 8 Sep instead — see below |
| A2 | How can we **add new tags** as the database evolves? | Not started — **the blocker is that the 34 terms are hardcoded in two files**, so nobody can add one without a deploy. See `new-client-dev.md` §4 |
| A3 | **Bulk-import** from the Labor Quotes site | Re-measured against production 8 Sep: **554 new**, 147 already held. Review pack sent to Chris. Blocked on his live-vs-review-queue answer |

### B1 is fully satisfied — verified against his exact searches

Chris searched **"Misère"** and **"Misère au Borinage"**; both returned nothing
because SQLite's `LIKE` case-folds only ASCII, so `È` never matched `è`.

Both queries now return the film. The alternate title works because this film
carries it in the title string — `Misery in the Borinage (MISÈRE AU BORINAGE)
[1933]` — and the folded search columns make every word in it searchable.
**195 of 2,192 films** carry a parenthetical alternate title and are now
searchable by it.

**Do not record alternate titles as an outstanding gap.** A dedicated
`alternateTitles` field (TASK-2b below) is an *enhancement* for films whose
alternate title is not in the title string — not part of what Chris asked for.

### C2 — SHIPPED 8 September 2026 (`dae2902`)

Chris confirmed the rule in September: *"Let's use shared subject tags rather
than matching by year… it would be useful to retain the ability for an
administrator to pin or override a particular pairing later, but that needn't
hold up the initial tag-based system."*

**Built and verified in production.** Related Films/Music are now ranked by
shared subject tags weighted by tag rarity, capped at 5 films and 4 music.

**Why ranking rather than a plain shared-tag filter:** measured across all 366
days, "shares at least one tag with the day's history" returns an average of
**781 films per day**, max 1,686 — 77% of the catalogue. With 34 terms over
~5,950 entries, sharing a tag is close to existing. Tag frequency is heavily
skewed (`Working Class` on 825 entries, `Domestic Workers` on 38), so each shared
tag contributes `1/frequency`. Year survives only as a tiebreak.

A per-tag diversity cap was considered and **rejected on evidence**: 0 of 353
days had a single tag explaining every film shown, so it would have added
complexity for a problem that does not occur.

**Measured before/after, all 365 days:**

| | Before | After |
|---|---:|---:|
| Films shown, total | 4,888 | 1,765 |
| Music shown, total | 484 | **1,394** |
| Days with no music | 156 | **14** |

Music nearly tripled because the old `take: 20` was *shared across both
categories* — on busy days films consumed every slot.

**The demonstration to show Chris is 25 March** (Triangle Shirtwaist Fire).
Before: *Fame is the Spur*, *Captain Boycott*, *Hungry Hill* — 1947 films, no
connection. After: garment-industry films, and in the music panel *The Triangle
Fire*, *The Triangle Shirtwaist Fire Song*, *Ballad of the Triangle Shirtwaist
Fire* and *Bread and Roses*.

**Where it lives:** `server/related-entries.ts` (pure ranking module, 14 tests in
`server/related-entries.test.ts`), wired into `/api/on-this-day` in
`server/index.ts`. `OnThisDayView.tsx` reads `related` and renders the shared
tags on each card — the client's complaint was never that picks were wrong but
that there was no way to tell why anything was there.

**Two things fixed during the pre-push audit:**
1. **Performance.** The first cut pulled all 2,172 published films/songs *with
   joined images* per request to return nine. Now it ranks on minimal fields and
   hydrates only the winners: **82ms → 26ms**.
2. **`month=abc` returned 200, not 400.** Pre-existing: `parseInt('abc')` is NaN
   and every comparison against NaN is false, so a bare range check passes.
   Swept — the same slip existed in `/api/on-this-day/calendar`. Both now use
   `Number.isInteger`. No other endpoint validates a `parseInt` this way.

**Still owed to Chris, unsent:** the music was **never** from another source.
Every selection came from the LHF database itself; Genius and TMDB are used only
when adding entries. Drake was in his own database, matched by release year.

**Deferred by Chris's own words:** admin pin/override — Phase 4 in
`new-client-dev.md`.

---

## Next up

> **The current plan lives in `new-client-dev.md`** (local-only, gitignored) —
> phases, effort, and what each one is blocked on. Chris answered C2, A2 and A3
> in September; that doc works from his wording. What follows is the older list,
> kept for the items that doc does not cover.

### ✅ TASK-C2 · Related Films/Music · **DONE, LIVE 8 Sep (`dae2902`)**
See the C2 section above. Pin/override deferred to Phase 4 by Chris's own wording.

### TASK-A1 · Corrections · **Chris approved the full flow. We are not building it yet.**

**His September wording:** *"Let's put a small 'Suggest a correction' link on each
individual entry and show the current information in an editable form. The
before-and-after comparison and approval queue will make review much easier.
Could the same link also accommodate suggested additions or updates to an entry?"*

**Decision, 8 Sep 2026 (Paul):** push back, and ship a cheap first step instead.

**Why.** The full version needs a `SubmittedEdit` table, a public route and an
admin before/after review screen — ~12–16 hrs, the largest item on the list, more
than related films and the quotes import combined. And it is the only item where
demand is unmeasured, because there is currently no way to submit a correction at
all. It also commits LHF to working a moderation queue indefinitely.

**A per-entry link was considered and rejected.** A "something wrong here?" prompt
on 5,955 records implies the data is unreliable, and only films and music have
anything at the foot of the detail modal — quotes and history, **3,327 entries,
over half the database**, would carry it on an otherwise bare panel.

**✅ SHIPPED 8 Sep instead — Phase 2b, `src/components/ContactModal.tsx`.**
A **Contact & Corrections** item in the hamburger menu, beside About and Privacy.
Opens a modal explaining what is welcome (a correction, something missing, a dead
link, a question) and a **"Write to us"** button that opens the user's mail client
pre-addressed to `info@laborheritage.org` with a template asking which entry, what
is wrong, and whether they have a source.

**The template is the point.** Entries have no individual URLs yet, so a reporter
cannot paste a link — without prompting, reports arrive as "the miners film is
wrong". **TASK-5 (shareable entry links) removes that limitation**; when it lands,
swap the template's first question for "paste the link".

**His sub-question is already answered:** suggested *additions* need nothing new —
the existing "Add" button routes public submissions to his review queue.

**Revisit the full flow** only if corrections arrive in real numbers, at which
point it can be designed around what people actually report.

### TASK-A3 · Bulk import from Labor Quotes · ~6–9 hrs

**Re-measured against production, 8 Sep 2026:** **554 genuinely new**, 123 exact
matches, 24 near matches. (The 595 figure was against a local DB copy.)

**⚠️ Read the truncation trap in CLAUDE.md before importing.** 1,220 quote
titles are cut at 123 chars, the importer dedupes on `title`, and **89 quotes
would silently duplicate** if imported blind. Repair the titles from their own
descriptions first and dedupe during preparation.

**Review pack sent to Chris:** `labor-quotes-review-2026-09-08.zip` — 554 new
(keep-by-default), 24 near matches (12 are fuller on the source site than ours),
plain README. Awaiting his answer on live vs review queue.

### TASK-A3 · Bulk import from Labor Quotes · ~4–8 hrs
**URL: https://laborquotes.weebly.com/c.html** (it was in Chris's email).
Weebly has no structured export like WordPress WXR. In order of preference:
1. **Blog RSS/Atom feed** if quotes are posts — cleanest; check how far back it goes.
2. **HTML scraping** of archive pages — likely fallback.
3. Any export the site owner can produce.

Import machinery exists: `POST /api/admin/import` smart-merges by title+category
in a transaction. Precedent: `scripts/import-quotes.ts`. **Back up before
importing** (rule 5). Fold BUG-2 (below) into this work.

### TASK-A2 · Admin-managed tags · ~16–20 hrs
**Must land before any LCSH subject-heading mapping.** Real Library of Congress
headings contain commas (`Labor unions, American`) and `Entry.tags` is a
comma-separated string — storing LCSH strings would split every row into the
wrong tags, silently. Move tags to a relation or JSON column in the same pass.
See the comma-trap section in CLAUDE.md.

### TASK-2b · Dedicated alternate-titles field · ~3–4 hrs · **enhancement, not an ask**
For films whose alternate title is *not* embedded in the title. Add
`alternateTitles` to film `metadata` — **the search half is already free**, since
`metadata` folds into `searchAll`. Remaining work: admin form field + TMDB
enrichment (`original_title`, `alternative_titles`).

### CLEANUP · Consolidate the duplicated search builders · ~2–3 hrs
The public and admin search handlers in `server/index.ts` are near-duplicate
~100-line copies — that duplication is *how the accent bug lived in two places*.
Both are fixed, but a small `SEARCH_COLUMN` map is now duplicated across them.
Worth consolidating before the next search change.

---

## Known issues — deliberately deprioritised

**Chris never raised quotes.** Everything below is our own discovery. Do not put
it in a client email; do not let it displace the asks above.

### BUG-1 · 4 quote entries with corrupt dates · **CLOSED — won't fix**
An import parser accepted malformed source dates (`5/6/2025` → `year 5`).
**Real impact: 3 quotes don't appear in On This Day, out of 1,916.** 173 quotes
already have no date and never appear. Not worth a code change.

Also: the quote edit form has **no date fields** (they are wrapped in
`isHistory &&` in `AdminDashboard.tsx`), so this cannot be fixed through the
admin UI by anyone. Reopen only if quote dates become important.

### BUG-2 · The import date parser fails silently · **LOW — bundle with TASK-A3**
Root cause of BUG-1. `parseDateField()` in `scripts/import-quotes.ts` splits on
`.` and calls `parseInt` without validation. **Fix:** reject anything not
matching `^\d{4}\.\d{1,2}\.\d{1,2}$` and report skipped rows.

**Swept — no other importer shares the pattern.** `import-films.ts` uses a
validated regex, `import-music.ts` a regex match, `import-history.ts` reads
separate columns. A full-database scan for implausible years returns only the 3
quote rows. History's **1170** and **1381** are genuine (the papyrus strike; the
Peasants' Revolt) — do not "fix" them.

### BUG-3 · 398 missing On This Day appearances · **BLOCKED / low**
374 quotes have multiple featured dates in the source; the importer keeps only
the first. 296 have an extra date on a different calendar day, costing 398
quote/day appearances. Needs a repeating-dates field. **Only worth doing if
quote/calendar pairing survives the C2 conversation.**

### Context: quote dates are publication dates, not historical dates
Every quote year is 2014–2026, the site's publishing era; zero are historical.
Proof: on July 12, Wendell Phillips (d. **1884**) is dated 2016, Woody Guthrie
(d. 1967) 2019, Boris Karloff (d. 1969) 2023. The month/day is the featured date
too — so On This Day's quote section is really *"quotes published on this
calendar date in past years."* Worth mentioning to Chris only if C2 opens up the
wider question of what should relate to a day.

---

## Action items

**Paul — open items as of end of 25 Aug**

- [ ] **Send the reply to Chris** — current draft is `chris-reply-september.md`
      (local-only). Covers all four of his September points; one open question in
      it (quotes: live or review queue?) blocks Phase 2.
      The older `chris-reply-draft.md` (25 Aug) is superseded.
- [x] ~~**Fix 2 — volume isolation**~~ — **decision 8 Sep: skipped.** The
      colliding apps are stopped, new apps get their own `/app/data`, and the
      app moves to the client's server eventually — where export → import lands
      on a clean private volume by construction. Doing it now is ~30 min of
      downtime on work that gets thrown away. **Replaced by a pre-deploy check**
      (`new-client-dev.md` §5): back up, then run the server-wide
      `docker ps … | grep '/app/data->'` and confirm labor-database is the only
      line. **Verified clear on 8 Sep** before the C2 deploy — only
      `og4ccgs…` (labor-database) appeared.
- [ ] Hand [radio-icecast-fixes.md](radio-icecast-fixes.md) to whoever works on
      those apps next.

**Decisions already made — do not re-litigate**

- **Radio and icecast are STOPPED and staying stopped** for now. Nobody uses
  them, and leaving them off keeps the client app clear until they are isolated
  properly. Their sites are currently down, deliberately.
- Billing for 25 Aug: **2.0 hrs**, reduced rate (progressive non-profit).
- The 25 Aug outage is **not** being raised with the client.

**For the reply to Chris — three things**

*Report as done:*
- Search flickering fixed; accented search fixed — **his exact "Misère" and
  "Misère au Borinage" both work now**; "Related Films/Music" renamed;
  Drake/Gaynor/Moby gone from July 12
- Scale worth mentioning: roughly 1 entry in 7 was affected by the search bug —
  864 with curly apostrophes, 150 with accented letters

*Answer his direct question:*
- The music was **never** from another source. Every selection came from the LHF
  database itself; Genius/TMDB are only used when adding entries. Drake was in his
  own database, matched by release year.

*Ask him:*
- **C2** — should Related Films/Music match on **shared tags** (the 34-term
  taxonomy already exists) rather than year? Or curated manual links?
- **A1** — corrections: where should the entry point live, and should the form
  pre-fill editable fields or take a freeform note? (Draft wording in the session
  notes; recommend in-entry link + pre-filled fields, and mention that corrections
  go to a review queue, nothing changes live without his approval.)

*Do not raise:* the 25 Aug outage (18 min, resolved, no data lost, nothing for
him to action) or the quote-date findings (he never asked; affects 3 entries).

**Next dev session** — see `new-client-dev.md` for the full phase plan
- [x] ~~TASK-C2~~ — **shipped 8 Sep**
- [ ] Phase 1b · tag the 304 untagged songs (music is 30% tagged; auto-tag
      endpoint exists at `server/index.ts`, `POST /api/admin/tags/auto-tag`).
      **Writes to the database — back up first.**
- [ ] Phase 2 · Labor Quotes import — blocked on Chris: live or review queue?
- [x] ~~Phase 2b · Contact item in the site menu~~ — **shipped 8 Sep**
- [ ] Phase 5 · shareable entry links — `react-router` is already wired up
- [ ] Phase 3 · custom tags in the edit interface
- [ ] Phase 4 · admin pin/override for related pairs

---

## Key commands

```bash
npm run dev:fullstack        # both servers
npm run build                # tsc -b && vite build — MUST pass before push
npm test                     # search folding tests (9)
npm run backfill:search      # rebuild search columns — REQUIRED after any scripts/ run
cp prisma/dev.db backups/dev-$(date +%Y%m%d-%H%M%S).db   # rule 5, before any DB work
```

## Gotchas that bite

- **Search runs on folded shadow columns.** Any write touching title/creator/
  description/tags/metadata must call `syncSearchText()`. Scripts in `scripts/`
  bypass it — run `npm run backfill:search` after them. Details in CLAUDE.md.
- **CODE vs DATA.** Production has its own database. Data fixes go through the
  Admin Dashboard; a deploy will not touch them.
- **Back up before any schema/migration/import work** (rule 5). Non-negotiable.
- **`Entry.tags` is a comma-separated string** — safe only because no current tag
  contains a comma. See TASK-A2.
