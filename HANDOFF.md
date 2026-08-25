# HANDOFF — Labor Arts & Culture Database

**Purpose:** pick-up point for a new chat window, session, or assistant.
Read this first, then `CLAUDE.md` for the hard project rules.

**Last updated:** 25 August 2026
**Branch:** `main` · **Production:** https://labor-database.supersoul.top
**Scope:** this repo only. The Digital Asset Manager / "Labor Heritage Media
Archive" (`lhf-tools.supersoul.top`) is a **separate project, tracked elsewhere.**

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

### ⚠️ IMPORTANT — this only worked because two apps were stopped

`radio.supersoul.top` and `icecast.supersoul.top` were stopped for this deploy so
`prisma migrate deploy` could get its exclusive lock. **The moment radio is
running again, the next migration will fail exactly as before.**

**The migration itself is now applied, so day-to-day deploys are fine.** But any
*future schema change* needs either the same stop-deploy-start dance, or the
permanent fix below.

**The entrypoint now fails loudly** (`exit 1`) if a migration fails — so a future
failure takes the site *down* rather than serving errors silently. That is
deliberate, but it means the volume isolation below is now important, not
optional.

---

## 🔴 BUG-6 · Three apps share one host directory · **do this before the next migration**

`radio.supersoul.top` uses `DATABASE_URL=file:/app/data/dev.db` — **the same file
as labor-database.** Confirmed via `lsof` (two node processes, same inode
4456477) and `docker inspect`.

Three containers bind-mount the host path `/app/data` instead of isolated named
volumes — labor-database, radio, icecast. They also share `/app/uploads`.
Labor Landmarks does it correctly with a named volume
(`skswcso44gcoc0c0soggsskg-labor-landmarks-data`).

This is a data-integrity issue, not just a deploy problem: two apps writing one
SQLite file, each Prisma schema unaware of the other's tables. The foreign files
in the data directory (`stations.db`, `playlists/`, `audiofiles/`) are radio's.

### The fix — isolate labor-database onto its own volume

**Do not change Coolify storage settings before moving the data** — a wrong move
points the app at an empty database.

1. Fresh Full Backup (admin → Export) **and** a host copy:
   `cp -a /app/data/dev.db* /root/labor-db-backup-$(date +%F)/`
2. `sqlite3 /app/data/dev.db ".tables"` to see what actually lives in the file.
3. Create a named volume in Coolify mirroring the Labor Landmarks pattern, and
   copy `dev.db` into it **before** first start. Same for `/app/uploads`.
4. Redeploy. Radio keeps the original file untouched.
5. Verify entry count, search, and images.

**Ruled out earlier — do not re-investigate:** migration history drift/P3005
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
| A1 | Expand "Add" so users can submit **corrections/updates** to existing entries | Not started |
| A2 | How can we **add new tags** as the database evolves? | Not started |
| A3 | **Bulk-import** from the Labor Quotes site | Not started |
| B1 | Searches **case-insensitive** + recognise **alternate/translated titles** | ✅ Fixed, awaiting deploy |
| B2 | Results **appear briefly then disappear** | ✅ Fixed, awaiting deploy |
| C1 | Rename "Films/Music From the Era" → **"Related Films/Music"** | ✅ Fixed, awaiting deploy |
| C2 | Clarify how selections are generated; limit them to entries **"meaningfully connected to the day's history"** | ⚠️ **Partially done — see below** |

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

### TASK-A1 · Public "suggest a correction" flow · ~12–16 hrs · **unblocked**
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

**Paul**
- [ ] Deploy to Coolify, then confirm here for production verification
- [ ] Reply to Chris in the shape he asked: what's straightforward, what needs
      discussion, how you'd prioritise

**For the reply to Chris**
- Fixed and live: flickering results; accented searches (his exact "Misère"
  and "Misère au Borinage" cases); "Related Films/Music"; Drake/Gaynor/Moby gone
  from July 12
- Scale: roughly 1 entry in 7 was affected by the search bug — 864 with curly
  apostrophes, 150 with accented letters
- **Answer his question:** selections were never from another source; they came
  from his own database, matched by year
- **Ask him:** should Related Films/Music use shared tags, or curated links?
- Straightforward next: corrections flow (A1), Labor Quotes import (A3)
- Needs discussion: tag management (A2), and the C2 matching rule

**Next dev session**
- [ ] TASK-C2 once Chris confirms the matching rule
- [ ] TASK-A1 (unblocked)
- [ ] TASK-A3, folding in BUG-2

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
