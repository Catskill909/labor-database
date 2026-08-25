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

**Root cause NOT found.** Three theories were proposed; all three were wrong.
Migrations fail with a *persistent* "database is locked". See BUG-5 for what has
been ruled out and the safe next steps. **The site is healthy; this is not urgent.**

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

## 🔴 BUG-5 · `migrate deploy` always fails: "database is locked" · UNRESOLVED

**Site is healthy and stable. This blocks the search fix only. NOT urgent.**

Migrations have been failing on **every deploy**, silently, for a long time. The
entrypoint caught the failure and started the server anyway, so it never showed
until a deploy actually depended on a migration (the 25 Aug outage).

```
Running database migrations...
Error: SQLite database error
database is locked
   0: sql_schema_connector::sql_migration_persistence::initialize
   1: schema_core::state::ApplyMigrations
```

Prisma fails while initialising `_prisma_migrations`, before applying anything.

### Ruled out — with evidence. Do NOT re-investigate.

- **Migration history drift / P3005.** `npx prisma migrate status` on production
  reports "Database schema is up to date!". History is healthy. *(Theory 1 — wrong.)*
- **Migration file missing from the image.** Committed in `784a6ef`; not
  gitignored; not in `.dockerignore`; the Dockerfile copies `prisma/` wholesale.
- **Container-handover lock contention.** The 20:19 deploy shows `Removing old
  containers` at 20:19:04 and `New container started` at 20:19:37 — **33 seconds
  apart**, far beyond Docker's 10s stop grace period, and the migration still
  failed. A 12×5s (~60s) retry was deployed and failed all 12 attempts.
  **The lock is permanent, not transient.** *(Theory 2 — wrong.)*

### Live evidence — `ls -la /app/data/` (25 Aug)

```
drwxr-xr-x  3 root root     4096 Dec 29  2025 audiofiles
-rw-r--r--  1 root root  9064448 Aug 24 02:41 dev.db
-rw-r--r--  1 root root    32768 Aug 25 02:41 dev.db-shm
-rw-r--r--  1 root root   230752 Aug 25 02:41 dev.db-wal
-rw-r--r--  1 root root        0 Mar  7 15:30 migrate.lock
drwxr-xr-x  2 root root     4096 Dec 28  2025 playlists
-rw-r--r--  1 root root    86016 Feb 23  2026 sqlite.db
-rw-r--r--  1 root root   110592 Jan 15  2026 stations.db
```

**Two open leads:**

1. **The volume holds another application's data.** `audiofiles/`, `playlists/`,
   `stations.db`, `sqlite.db` are not from this project. If another Coolify app
   mounts the same host directory and holds an open SQLite connection, that could
   explain a permanent lock. **Check which apps mount this volume.**
2. **Stale write-ahead log.** `dev.db-wal` is 230KB dated Aug 25 02:41 while
   `dev.db` is dated Aug 24 — never checkpointed.

`migrate.lock` (0 bytes, Mar 7) is left over from an earlier entrypoint that used
`flock` (the Dockerfile still installs `util-linux` for it). Probably inert, but
it shows this has been fought before.

### ⚠️ DO NOT delete dev.db-wal or dev.db-shm

The WAL holds committed data not yet folded into the main database file.
Deleting it can **lose data**. If a checkpoint is needed, do it properly —
`PRAGMA wal_checkpoint(TRUNCATE)` on a cleanly-opened database, **after a fresh
Full Backup**, with the app stopped.

### Next diagnostic steps — fresh session, not at the end of a long day

1. **Take a fresh production Full Backup first.**
2. Find what else mounts `/app/data` (Coolify → other apps → Persistent Storage).
   A second container on the same volume is the most likely answer.
3. With the app **stopped**, try `npx prisma migrate deploy` from a one-off
   container. If it succeeds while stopped, the lock is a live connection, and
   the fix is to migrate while stopped (or move off SQLite for concurrent access).
4. Only then consider whether the WAL needs checkpointing.

## BUG-4 · A failed migration does not stop the deploy · fix written, then reverted

`docker-entrypoint.sh` starts the server even when `migrate deploy` fails:

```sh
npx prisma migrate deploy || { ...retry... || echo "Migration failed again - starting server anyway (may have issues)" }
```

**That is what turned a failed migration into an 18-minute outage** — the server
came up against a schema it did not match and served 500s from every endpoint
touching `Entry`, while `/api/health` stayed green because it only runs a raw
`SELECT 1`.

Commit `9528797` added a 12×5s retry and made failure `exit 1`. It was reverted
in `3af9615`: with the lock being *permanent*, refusing to start meant the site
stayed **down** instead of up.

**The fail-loudly half is still correct** and should be restored **after** BUG-5
is genuinely fixed — not before, or every deploy takes the site down.

### Also worth doing

- **Make `/api/health` touch the Entry table**, so a schema mismatch reports
  unhealthy instead of green. This is why nothing caught the outage.
- **Add a SIGTERM handler** to the server for clean shutdown and WAL checkpoint.

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
