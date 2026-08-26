# HANDOFF — Labor Arts & Culture Database

**Purpose:** pick-up point for a new chat window, session, or assistant.
Read this first, then `CLAUDE.md` for the hard project rules.

**Last updated:** 25 August 2026
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
| C2 | Clarify how selections are generated; limit them to entries **"meaningfully connected to the day's history"** | ⚠️ **Half done** — Drake/Moby gone, but still year-matching, not topical. Also owes him an answer: the music was never from another source |
| A1 | Expand "Add" so users can submit **corrections/updates** to existing entries | ⏸ Awaiting his answer on placement + form type |
| A2 | How can we **add new tags** as the database evolves? | Not started |
| A3 | **Bulk-import** from the Labor Quotes site | Not started — URL is laborquotes.weebly.com/c.html |

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

### C2 is the one genuinely unfinished ask

Chris wrote:

> "Music From the Era also appears to be **pulling songs from another source**…
> Can you clarify how those selections are generated and whether they can be
> limited to entries in the LHF database that are **meaningfully connected to the
> day's history**?"

**Two things to handle:**

1. **Correct his assumption — he asked directly.** Nothing comes from another
   source. Every selection is from the LHF database itself; Genius and TMDB are
   used only when adding entries. Drake was in *his own database*, matched by
   year coincidence.

2. **"Meaningfully connected" is not met yet.** What shipped derives the year set
   from **history entries only** (previously quotes too, whose years are
   publication dates in 2014–2026 — that is how Drake, Gloria Gaynor and Moby
   reached July 12). That removes the embarrassing cases, but a 1933 film beside
   a 1933 event is still *year coincidence*, not topical connection.

   **Proposal to put to him:** require a shared tag with the day's history
   entries — the 34-term taxonomy already exists — with year as a fallback or
   secondary signal. Alternative: curated `relatedEntryIds` for manual pairing.
   Confirm which he wants before building.

---

## Next up

### TASK-C2 · Meaningful Related Films/Music · ~4–6 hrs · **highest value**
The only client ask still genuinely open. Needs Chris to confirm tag-based vs
curated. See above.

### TASK-A1 · Public "suggest a correction" flow · ~12–16 hrs · **awaiting client decision**

**Two questions went to Chris (25 Aug) — do not build before he answers:**

1. **Placement.** Recommended: a quiet "Suggest a correction" link at the bottom
   of the entry detail modal (`EntryDetail.tsx`), so the entry being corrected is
   already in context. Alternative is a top-bar button, which would need an entry
   picker first — more steps, and corrections can land on the wrong record.
   *Note:* only films (2,192/2,192) and music (425/436) have a `sourceUrl` line at
   the bottom of that modal. **Quotes (1,916) and history (1,411) have none**, so
   for over half the database the correction link would stand alone there.
2. **Form type.** Recommended: pre-filled editable fields (category-aware, same
   shape as `SubmissionWizard`) with a before/after diff in admin. Alternative is
   a freeform "what's wrong?" box — simpler to build, but every fix is retyped by
   hand.

Paul's answer on submitter details is settled: **name and email are collected**,
same as new submissions.
Confirmed: name and email will be collected, same as new submissions. New
`SubmittedEdit` model, public POST, admin approve/reject with before/after diff.
Reuses the existing moderation pattern. Schema migration — **back up first**.

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

- [ ] **Send the reply to Chris** — full draft ready in
      [chris-reply-draft.md](chris-reply-draft.md). Not sent yet.
- [ ] **Fix 2 — [labor-database-volume-isolation.md](labor-database-volume-isolation.md)**
      — planned for the night of 25 Aug or 26 Aug. Gives this app its own named
      volume so no future app can ever collide. ~15–30 min downtime; do it rested.
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

**Next dev session**
- [ ] TASK-C2 once Chris confirms the matching rule — highest value
- [ ] TASK-A1 once he answers placement + form type
- [ ] TASK-A3, folding in BUG-2
- [ ] BUG-6 (volume isolation) **before any future schema change**

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
