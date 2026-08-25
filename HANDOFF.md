# HANDOFF — Labor Arts & Culture Database

**Purpose:** pick-up point for a new chat window, session, or assistant.
Read this first, then `CLAUDE.md` for the hard project rules.

**Last updated:** 25 August 2026
**Branch:** `main` · **Production:** https://labor-database.supersoul.top
**Scope:** this repo only. The Digital Asset Manager / "Labor Heritage Media
Archive" (`lhf-tools.supersoul.top`) is a **separate project, tracked elsewhere.**

---

## ⚠️ Current state: search fix REVERTED after a production outage

**Production is healthy.** `main` is at `6093f7a`, a revert of the search change.
Phase 1 fixes (search race condition, Related Films/Music rename, history-only
era matching) are still live and verified.

**Do not redeploy the search fix until BUG-4 and BUG-5 below are resolved.**

### INCIDENT — 25 Aug 2026, ~19:30–19:48 UTC (~18 min)

**Symptom:** every page loaded then went blank. All Entry API endpoints returned
500. `/api/health` stayed green throughout, so monitoring showed nothing wrong.

**Error:** `no such column: searchTitle` (Prisma P2010)

**Cause:** commit `784a6ef` shipped code expecting four new columns. On the
production container `prisma migrate deploy` did **not** apply the migration, so
the columns never existed. Every Entry query failed. Health checks kept passing
because that endpoint runs raw `SELECT 1`, which touches no Entry columns.

**Resolution:** reverted the code (`6093f7a`) and redeployed. Service restored.
No data was lost — the migration is additive and never ran.

**Why it was not caught:** the migration was verified against a *copy of the
local database*, which has clean migration history. Production's migration state
was never checked. A green local test said nothing about whether production
would accept the migration.

---

## 🔴 BUG-4 · A failed migration does not stop the deploy · **CRITICAL — fix first**

`docker-entrypoint.sh` swallows migration failure and starts the server anyway:

```sh
npx prisma migrate deploy || { ...retry... || echo "Migration failed again - starting server anyway (may have issues)" }
```

**This is what turned a failed migration into an 18-minute outage.** Without it,
the container would have refused to start and Coolify would have kept the
previous version running — users would have seen nothing at all.

**Fix:** exit non-zero when `migrate deploy` fails, so the deploy fails loudly
instead of serving 500s. Consider also making `/api/health` touch the Entry table
so a schema mismatch shows up as unhealthy rather than green.

**This is the highest-value fix in the repo right now** — it is the difference
between a failed deploy and a broken site, for every future migration.

## 🔴 BUG-5 · `migrate deploy` silently failed to apply the migration · **blocks the search fix**

The migration `20260825184951_add_search_shadow_columns` was never applied on
production, so the code shipped expecting columns that did not exist.

### Ruled out (verified 25 Aug — do not re-investigate)

- **Migration history drift / P3005.** `npx prisma migrate status` on the
  production container returns **"Database schema is up to date!"**. History is
  healthy. This was the initial theory and it was **wrong**.
- **File missing from the commit.** `git show 784a6ef -- prisma/migrations`
  confirms the migration.sql was committed.
- **Excluded from the image.** Not in `.gitignore`, not in `.dockerignore`;
  the Dockerfile copies `prisma/` wholesale.

### Leading hypothesis — NOT yet confirmed

**SQLite lock contention during a rolling deploy.** Coolify may start the new
container while the old one still holds `/app/data/dev.db` open in WAL mode.
`prisma migrate deploy` would then fail with "database is locked", retry once
after 3s while the old container is *still* running, fail again, and — because
of BUG-4 — start the server anyway.

Supporting evidence: commit `0c1289e` ("improve migration error handling in
entrypoint script") already added retry logic for exactly this failure mode,
which suggests it has bitten before.

**If confirmed, the fix is ordering, not Prisma:** ensure the old container
releases the database before migrating (stop-then-start rather than rolling), or
retry with a longer backoff, or run migrations as a separate pre-deploy step.

### To confirm — one thing needed

The deploy log for commit `59aa29b` (25 Aug, 19:29:16 UTC). In Coolify →
Deployments, click the **⌄ chevron** on that row and read the lines after
`Running database migrations...`. That names the actual error.

**Do not attempt another fix before reading it.** Two theories have already been
proposed from inference; one was wrong and it cost an outage.

### Before re-attempting the search fix
1. Fix BUG-4 so a failed migration stops the deploy.
2. Get the migration log; diagnose BUG-5; repair production migration history.
3. Take a fresh production Full Backup.
4. Deploy and watch for `Checking search index... 5955 entries indexed`.
5. If anything is wrong, revert is one push — the change is self-contained.

The search fix itself is sound: 9/9 tests pass, verified end-to-end against
5,955 real entries. **The code was never the problem — the deploy process was.**

---

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
