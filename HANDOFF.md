# HANDOFF — Labor Arts & Culture Database

**Purpose:** pick-up point for a new chat window, a new session, or a different
assistant. Read this first, then `CLAUDE.md` for the hard project rules.

**Last updated:** 25 August 2026
**Branch:** `main` (Coolify auto-deploys from it)
**Production:** https://labor-database.supersoul.top

---

## How to use this file

- **Start here.** It says what is done, what is next, and what is blocked.
- `client-feedback-audit.md` is the deep analysis — root causes, evidence,
  effort estimates. This file is the *working state*; that one is the *reasoning*.
- **Keep this file updated** as items move. It is the thing that survives a lost
  chat window.
- Numbered items (BUG-1, TASK-2c…) are stable IDs — use them in commits and
  when talking to the client so nothing gets lost in renaming.

---

## Current state

Work is driven by an August 2026 client email from the Labor Heritage Foundation
(Chris Garlock, Harold Phillips). Seven issues were audited; every one was traced
to a root cause. Two phases have shipped.

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Search race condition, "Related Films/Music" rename, On This Day history-years-only matching | ✅ Shipped — `fd64f35` |
| 2 | Accent/punctuation-insensitive search (folded shadow columns) | ✅ Shipped — `784a6ef` |
| 3 | Alternate/translated titles | ⏳ Next, unblocked |
| 4 | Data cleanup + Labor Quotes import | ⏸ Needs client input |
| 5 | Public corrections, admin-managed tags | ⏸ Not started |

---

## OPEN BUGS — scheduled, none urgent

### BUG-1 · Four quote entries have corrupt dates · **DATA fix** · ~5 min
**Owner: LHF (content edit) or Paul — admin dashboard, no deploy.**

`parseDateField()` in `scripts/import-quotes.ts` accepted malformed source dates
and produced garbage rather than rejecting them. Correct values are known — the
original string is preserved in each row's `metadata.dateRaw`.

| Entry ID | Stored now | Should be |
|---|---|---|
| 1599 | year 5, no month/day | 6 May 2025 |
| 2020 | year 5, no month/day | 29 May 2025 |
| 3143 | year 12, no month/day | 17 Dec 2024 |
| 2983 | Apr 2022, no day | 14 Apr 2022 |

**Why it matters:** three of these have no month/day at all, so they never appear
in On This Day. Fixing the day is worth doing *regardless* of how the quote-year
question (Q3 below) is resolved.

**Do not** fix this with a deploy — production has its own database (CLAUDE.md
rule 3). Edit in the Admin Dashboard.

### BUG-2 · The import date parser fails silently · **CODE fix** · ~1 hr
**Owner: next dev session. Bundle with TASK-1c.**

Root cause of BUG-1. `parseDateField()` splits on `.` and calls `parseInt` with
no validation, so `"5/6/2025"` yields `year = 5` instead of being rejected.

**Fix:** reject anything not matching `^\d{4}\.\d{1,2}\.\d{1,2}$`, and report
skipped rows instead of guessing.

**Swept for the class — no other importer shares the pattern.** `import-films.ts`
uses a validated regex, `import-music.ts` a regex match, `import-history.ts` reads
separate Month/Day/Year columns. A full-database scan for implausible years
(`< 1500` or `> 2027`) returns only the 3 quote rows above. The odd history years
**1170** and **1381** are genuine (the papyrus strike; the Peasants' Revolt) —
do not "fix" them.

Low urgency: the script only runs during manual imports. Natural time to do it is
alongside TASK-1c, which touches the same area.

### BUG-3 · 398 On This Day appearances are missing · **SCHEMA + DATA** · ~6–8 hrs
**Owner: blocked — do not start until client answers Q3.**

374 quotes have multiple featured dates in the source
(`2021.05.25; 2019.05.27; 2016.11.09`); the importer keeps only the first.
555 dates are dropped, of which **296 quotes have an extra date on a different
calendar day**, costing **398 quote/day appearances** that On This Day should
show and does not.

Not really a bug — a schema limit. `Entry` holds one month/day/year. Fixing it
means a repeating-dates field (e.g. `metadata.featuredDates`) plus an On This Day
query that reads it.

**Why it is blocked:** if the client says the quote/calendar pairing is not what
they want (Q3), this work is wasted. Get the answer first.

---

## OPEN QUESTIONS FOR THE CLIENT

| # | Question | Status | Blocks |
|---|----------|--------|--------|
| Q1 | Labor Quotes site platform | ✅ **Weebly.** Still need the **site URL** | TASK-1c |
| Q2 | Related Films/Music matching strategy | Partially resolved by shipping history-years-only. Open only if they want tag-based or curated links | — |
| Q3 | Quote dates | ✅ **Resolved as fact** — see below. One design question remains | BUG-3, data cleanup |
| Q4 | Corrections require name/email? | ✅ **Yes, both collected** | TASK-1a (now unblocked) |

### Q3 detail — the fact is settled, the design question is not

Quote years are **"date featured", never historical.** Every quote year in the
database falls in 2014–2026, the site's publishing era; zero of the 1,747 dated
quotes carry a historical year. Proof: on July 12, Wendell Phillips (d. **1884**)
is dated 2016, Eddie Cantor (d. 1964) 2017, Woody Guthrie (d. 1967) 2019,
Boris Karloff (d. 1969) 2023. The source CSV holds one `YYYY.MM.DD` featured date.

**The remaining question is a design decision, not a fact:** the *month/day* is
the featured date too, so On This Day's quote section actually shows *"quotes we
published on this calendar date in past years"* — not *"quotes connected to this
date in labor history."* That may be exactly what LHF wants (it is their
quote-of-the-day archive, and pairings may have been chosen deliberately), or it
may be the same confusion they flagged for films and music. **Ask them.**

**Recommended cleanup once answered:** move the featured date to
`metadata.featuredDate` and leave `year` null unless someone researches the real
date. Preserves the archive, stops the year being wrong. (Alternatives: leave as
is; or clear years outright and lose the archive information.)

---

## NEXT UP

### TASK-2b · Alternate / translated titles · ~3–4 hrs · **unblocked, do this next**
Add `alternateTitles` to film `metadata`. **The search half is already free** —
`metadata` folds into `searchAll`, so anything written there is immediately
findable, accent- and punctuation-insensitively. Remaining work: admin form field
and a TMDB enrichment hook (`original_title`, `alternative_titles`).

### TASK-1c · Bulk import from Labor Quotes (Weebly) · ~4–8 hrs · needs site URL
Weebly has no structured export equivalent to WordPress WXR. In order of preference:
1. **Blog RSS/Atom feed**, if quotes are published as posts — cleanest. Feeds are
   often capped to recent items, so check depth before relying on it.
2. **HTML scraping** of archive pages — likely fallback.
3. Whatever export the site owner can produce from their admin.

Machinery already exists: `POST /api/admin/import` smart-merges by title+category
in a transaction. Precedent: `scripts/import-quotes.ts`, `import-films.ts`.
**Back up before importing** (rule 5). Bundle BUG-2 into this work.

### TASK-1a · Public "suggest a correction" flow · ~12–16 hrs · **unblocked**
Q4 answered — name and email are collected, same as new submissions. New
`SubmittedEdit` model, public POST, admin approve/reject with a before/after diff.
Reuses the existing moderation pattern. Schema migration — **back up first**.

### TASK-1b · Admin-managed tags · ~16–20 hrs
**Must land before any LCSH subject-heading mapping.** Real Library of Congress
headings contain commas (`Labor unions, American`) and `Entry.tags` is still a
comma-separated string — the moment LCSH strings are stored, every row splits into
the wrong tags silently. Move tags to a relation or JSON column in the same pass.
See the comma-trap section in CLAUDE.md.

### CLEANUP · Consolidate the duplicated search builders · ~2–3 hrs
The public and admin search handlers in `server/index.ts` are near-duplicate
~100-line copies. That duplication is *how the accent bug lived in two places*.
Phase 2 fixed both but now duplicates a small `SEARCH_COLUMN` map across them.
Worth consolidating before the next search change.

---

## ACTION ITEMS

### Paul
- [ ] Send the Weebly site URL (unblocks TASK-1c)
- [ ] Email wrap-up to the client — see below
- [ ] Decide: fix BUG-1 yourself, or hand it to LHF as a content task

### Client (include in the email wrap-up)
- [ ] **Q3 design question** — is the quote/calendar-date pairing intended?
- [ ] **BUG-1** — four quote entries need their dates corrected in the admin
      dashboard (IDs and correct values in the table above). This is a content
      edit, not a code fix.
- [ ] Confirm the Labor Quotes site URL and that they control the account
- [ ] Optional (Q2): do they want Related Films/Music to go beyond year matching?

### Next dev session
- [ ] TASK-2b (unblocked, cheap)
- [ ] TASK-1a (unblocked)
- [ ] BUG-2 with TASK-1c
- [ ] Hold BUG-3 until Q3 is answered

---

## Email wrap-up — points to cover

1. **Fixed and live:** search results no longer flicker/disappear; accented and
   apostrophe searches now work ("Misère" finds the film, "Cesar" finds "César");
   "From the Era" renamed to "Related Films/Music"; Drake/Gloria Gaynor/Moby no
   longer appear on July 12 — modern songs were being pulled in by quote years.
2. **Scale of the search fix:** roughly 1 entry in 7 was affected in some way —
   864 entries with curly apostrophes, 150 with accented letters.
3. **What we found in the data:** quote dates are "date featured", not historical
   (with the Wendell Phillips example — it lands well). Raise the design question.
4. **Their action:** the four quote entries needing date corrections.
5. **What we need:** the Labor Quotes site URL.

---

## Key commands

```bash
npm run dev:fullstack        # both servers
npm run build                # tsc -b && vite build — MUST pass before push
npx tsc --noEmit             # type check
npm test                     # search folding tests (9)
npm run backfill:search      # rebuild search columns — REQUIRED after any scripts/ run
cp prisma/dev.db backups/dev-$(date +%Y%m%d-%H%M%S).db   # rule 5, before any DB work
```

## Gotchas that bite

- **Search runs on folded shadow columns.** Any write touching title/creator/
  description/tags/metadata must call `syncSearchText()`. Scripts in `scripts/`
  bypass it — run `npm run backfill:search` after them. Full details in CLAUDE.md.
- **CODE vs DATA.** Production has its own database. Data fixes go through the
  Admin Dashboard; a deploy will not touch them.
- **Back up before any schema/migration/import work.** Non-negotiable (rule 5).
- **`Entry.tags` is a comma-separated string** — safe only because no current tag
  contains a comma. See TASK-1b.
