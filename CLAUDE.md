# CLAUDE.md - Project Guardrails for Labor Arts & Culture Database

> **Starting a new session?** Read [HANDOFF.md](HANDOFF.md) first — current state,
> open bugs (BUG-1/2/3), next tasks, and what is blocked on the client.
> This file is the permanent rules; HANDOFF.md is the moving state.
>
> 🔴 **Deployment storage configuration is the open infrastructure work on this
> app.** The runbook is `cooify-volume-fix.md` in the *digital-asset-manager*
> working copy — **deliberately not in any repository**, because this one is
> public and it contains infrastructure specifics.
>
> **Read it before changing anything under Coolify → Persistent Storage.**
> **Do not copy its contents into this file or any other tracked document.**

## Critical Rules (Read Before Every Session)

### 1. TypeScript Strict Mode is ON
- `server/tsconfig.json` has `"strict": true` — this means `noImplicitAny` is enforced
- **NEVER** remove type annotations without replacing them with correct types
- **NEVER** use `typeof prisma` as the type for `$transaction` callbacks
- For Prisma transaction callbacks, use `Prisma.TransactionClient`:
  ```ts
  import { PrismaClient, Prisma } from '@prisma/client';
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => { ... });
  ```

### 2. Always Verify Build Before Committing
- Run `npx tsc --noEmit` to check for TypeScript errors before any commit or push
- The Coolify deployment runs `tsc -b && vite build` — if tsc fails, the entire deploy fails
- Local VSCode may not show errors that the full `tsc -b` build catches (different tsconfig scopes)

### 3. CODE Problems vs DATA Problems
- **CODE problems** → fix via git push, **then press Deploy in Coolify**.
  *Corrected 26 August 2026: no application on this server has auto-deploy
  enabled — verified across every resource. A push on its own changes nothing
  that is running.*
- **DATA problems** → fix via Admin Dashboard Import/Export (production DB is separate)
- Always ask: "Is this a CODE problem or a DATA problem?"

### 4. Dockerfile & Coolify Deployment
- Do NOT put secrets (like `ADMIN_PASSWORD`) in `ARG` or `ENV` — use Coolify environment variables instead
- **CRITICAL: Coolify MUST have TWO persistent storage volumes configured:**
  - `/app/data` — SQLite database. Without this, ALL entries are wiped on every deploy.
  - `/app/uploads` — Uploaded images. Without this, all images are lost on every deploy.
- Verify in Coolify: Configuration → Persistent Storage → must show 2 volumes with different names
- **Required Coolify environment variables:**
  - `ADMIN_PASSWORD` — required, protects admin dashboard and all `/api/admin/*` endpoints
  - `TMDB_API_KEY` — optional, enables TMDB film search/enrichment in submission forms
  - `GENIUS_API_KEY` — optional, enables Genius music search/lyrics/YouTube enrichment in submission forms
  - `GOOGLE_AI_API_KEY` — optional, enables AI research assistant (Gemini 2.0 Flash) in admin panel
  - `CORS_ORIGIN` — optional, restricts CORS to specified origin (e.g. `https://your-domain.com`). If unset, allows all origins.
- **Pre-set in Dockerfile (do NOT override unless intentional):**
  - `DATABASE_URL=file:/app/data/dev.db`
  - `PORT=3001`
  - `NODE_ENV=production`
- **Container startup sequence:** `prisma migrate deploy` → `seed.ts` (idempotent) → `tsx server/index.ts`
- **Health check endpoint:** `GET /api/health` returns `{"status":"ok"}` (200) or `{"status":"error"}` (503)
- **Port:** expose container port `3001` in Coolify

### 5. MANDATORY: Backup Before Any DB/Schema Work
- **This is a strict project rule. No exceptions.**
- Before ANY of the following, create a local backup:
  - Running Prisma migrations (`prisma migrate dev`, `prisma migrate deploy`)
  - Modifying `schema.prisma`
  - Running import scripts (`npm run import:*`)
  - Running enrichment scripts (`npm run enrich:films`)
  - Running tag normalization or auto-tagging
  - Deploying code that changes database schema
  - Any manual SQLite operations
- **Local backup:** `cp prisma/dev.db backups/dev-$(date +%Y%m%d-%H%M%S).db`
- **Production backup:** Admin Dashboard → Export → Full Backup (ZIP)
- See [deployment-checklist.md](deployment-checklist.md) for full backup procedures

### 6. Prisma Patterns
- Always import both `PrismaClient` and `Prisma` from `@prisma/client` when using transactions
- Transaction client type: `Prisma.TransactionClient` (NOT `typeof prisma`)
- After schema changes: run `npx prisma generate` before building

### 7. Unified Entry Model
- ALL content types (history, quotes, music, films, plays, poetry) live in ONE `Entry` table
- Category-specific fields go in the `metadata` JSON column
- The `category` field determines the content type: "history", "quote", "music", "film", etc.
- The `Category` model is a registry of available categories — admin-managed
- Adding a new category = add a Category row + build its form + push

### 8. Submitter Contact Fields (Admin-Only)
- `submitterName`, `submitterEmail`, `submitterComment` are collected in public submission forms
- These are **never** exposed in the public API — stripped server-side
- They **are** returned by the admin API and admin backup

### 9. HTML Entity Sanitization
- Imported data (especially from WordPress) may contain HTML entities (`&amp;`, `&quot;`, etc.)
- `cleanEntryText()` in `server/index.ts` auto-decodes entities on all create/update/import operations
- If importing raw data directly to SQLite, run entity cleanup manually

### 10. Security Considerations (Resolved)
- **CORS:** Restricted via `CORS_ORIGIN` env var. If unset (dev), allows all origins.
- **Image upload (`POST /api/entries/:id/images`):** Protected by `adminAuth` + `uploadLimiter`. Public submissions cannot upload images.
- **TMDB poster download (`POST /api/tmdb/download-poster`):** Protected by `adminAuth` + `uploadLimiter`.
- **Rate limiting:** `express-rate-limit` applied globally (100/min) + specific limiters for auth (5/min), uploads (10/min), search (30/min).
- **Admin auth:** Login required everywhere (localhost bypass removed). Server-side `adminAuth` still allows all if `ADMIN_PASSWORD` unset (dev convenience).

## Architecture Quick Reference
- **Frontend:** React + Vite (builds to `dist/`)
- **Backend:** Express server at `server/index.ts`, runs via `tsx`
- **Database:** SQLite via Prisma ORM
- **Deployment:** Coolify (auto-deploys from `main` branch via Docker)
- **Port:** 3001 (standardized everywhere)
- **Repo:** https://github.com/Catskill909/labor-database

## Pre-Push Checklist
1. `npx tsc --noEmit` passes with zero errors
2. No secrets in Dockerfile ARG/ENV
3. `npm run build` succeeds locally

## Pre-Deploy Checklist (Before First Coolify Launch)
1. All items in Pre-Push Checklist pass
2. Coolify app created pointing to `main` branch
3. TWO persistent volumes configured (`/app/data` and `/app/uploads`)
4. `ADMIN_PASSWORD` set in Coolify environment variables
5. `TMDB_API_KEY` set if film enrichment needed
6. `CORS_ORIGIN` set to `https://labor-database.supersoul.top`
7. Port `3001` exposed
8. Health check configured: `GET /api/health` on port `3001`
9. First deploy: import data via Admin Dashboard (`/admin` → Import JSON backup)
10. Verify admin login works at `https://labor-database.supersoul.top/admin`

## Deployment
- **Full deployment guide:** [deployment-checklist.md](deployment-checklist.md)
- **Production URL:** https://labor-database.supersoul.top
- **DNS:** A record `labor-database.supersoul.top` → Coolify server

## Known Issues
- Large JS chunks from react-player (~992KB dash.all.min, ~521KB hls) — lazy-loaded via code splitting, only fetched when viewing entry detail with video

### Search runs on folded shadow columns — keep them in sync

`Entry` carries four derived columns — `searchTitle`, `searchCreator`,
`searchDescription`, `searchAll` — holding lowercased, diacritic-stripped,
punctuation-collapsed, space-padded copies of the entry text. All search queries
run against these, never against the raw columns.

**Why:** SQLite's `LIKE` case-folds only ASCII A–Z. Matching raw columns meant
"misère" could not find a stored "MISÈRE", and "don't" could not find "don’t" —
about 1 entry in 7 was affected. See `server/search-text.ts`.

**Rules:**
- Any write that touches `title`, `creator`, `description`, `tags` or `metadata`
  must be followed by `syncSearchText([ids])` in `server/index.ts`. It reads the
  **persisted row**, not the request body — admin updates and imports are partial,
  so a body-derived value would blank out whatever the caller didn't send.
- **Scripts in `scripts/` bypass this** (each builds its own `PrismaClient`).
  After running any import/enrichment script, run `npm run backfill:search`.
- New search code must fold the query with `normalizeSearchText()` and must
  reject queries that fold to empty — a `'% %'` pattern matches every row.
- `npm test` covers the folding contract (`server/search-text.test.ts`).

**Deployment:** the migration adds these columns as NULL, so search returns
nothing until they're populated. `docker-entrypoint.sh` runs
`scripts/backfill-search-text.ts --missing-only` after `migrate deploy`
(no-op once populated), and the Dockerfile copies `scripts/` into the runtime
image for that reason — don't remove it.

### Small data corrections go through the Admin UI, not through code

**A handful of record edits is a DATA job, done by hand in the admin edit
interface. Do not write a script or build an import payload for it.**

**Why:** writing the script, reviewing it, and checking what it touched costs
more than making the edits — and it carries risk the manual path does not. An
import payload that matches the wrong row **overwrites** a good record silently
(see the import section below); an admin edit changes exactly the record on
screen, and you see the before and after. `PUT /api/admin/entries/:id` calls
`syncSearchText()`, so hand-editing keeps the folded search columns correct.
There is no technical advantage to automating it.

**Where the line sits:** automation pays for itself on hundreds of rows, where
hand-editing would be error-prone and slow. Below that, the manual path wins.
The 20 Sep work is the worked example — 544 new quotes were imported from a
prepared payload; the 12 text corrections that came with them are being done by
hand.

**Also:** inserts and edits are not equally risky. Inserting a bad row is
recoverable — delete it. Overwriting a good row destroys the original. Treat any
bulk operation that *updates* existing records as the dangerous one, and prefer
the manual path for it even at slightly larger counts.

### The JSON import died at 5 seconds — fixed 20 Sep 2026, know why

`POST /api/admin/import` failed in production with **P2028**: *"the timeout for
this transaction was 5000 ms, however 5013 ms passed"*. Thirteen milliseconds
over. A 544-entry quote import; nothing was written, because the transaction
rolled back cleanly.

**Cause:** the handler ran `findFirst({ title, category })` **once per incoming
row** to decide insert-vs-update. `Entry` has **no index on `title` or
`category`** — only the `id` primary key — so every one of those was a full
table scan. 544 rows × ~1,900 stored quotes, inside a single interactive
transaction whose timeout was Prisma's undeclared 5-second default.

**Fix:** build the dedup index with ONE query into a `Map`, and set the
transaction timeout explicitly to 120s. Measured: **1.61s → 0.244s** for the same
544 rows.

**Rules:**
- **Never add a per-row query inside that transaction.** There is still no index
  on `title`/`category`, so any `findFirst`/`findUnique` on them is a table scan.
  If you need another lookup, preload it into a `Map` the same way.
- Newly created rows are **registered in the Map** so a repeated title inside one
  payload updates rather than duplicating — the behaviour the per-row `findFirst`
  gave for free. Keep that, or a payload with two identical titles inserts twice.
- **`skippedCount` is dead code** — declared, never incremented. The `skipped`
  number in the response is always 0. Do not trust it.
- **A title collision UPDATES, it does not skip.** This is the sharp edge of the
  whole endpoint: an unintended match silently overwrites a stored row's
  description, creator, metadata, tags and year. Match at *preparation* time
  against a fresh export, and refuse to import on any collision.
- The endpoint validates **nothing** else. No check that title/description are
  non-empty, that `category` exists, or that month/day/year are sane. Prisma
  rejects wrong *types*; `year: 5` and `month: 13` are valid integers and go
  straight in. That is how BUG-1 happened.
- The **ZIP restore** (`/api/admin/import-zip`) is a different path and was never
  exposed — it already batches at 50 entries per transaction. `syncSearchText`
  uses the *array* form of `$transaction`, which has no interactive timeout.

**No regression test exists.** Catching this automatically needs a seeded-DB
fixture and a payload large enough to matter; the current tests are pure
functions with no database. The guard is structural: the lookup is now O(1) per
row instead of O(n), so it cannot scale back into a timeout.

### Quote titles are truncated — the importer dedupes on the truncated field

**1,220 of ~1,918 quote entries have a `title` cut to 120 characters with `...`
appended**, by an importer that predates this note. Discovered 8 Sep 2026.

**Nothing is visible and nothing was lost.** `description` holds the full quote;
every UI surface for quotes renders `description` (`OnThisDayView.tsx`,
`EntryGrid.tsx`, `EntryDetail.tsx` — the detail modal uses `creator` as its
heading); search runs on folded `searchAll`, built from description.

**The trap is `POST /api/admin/import`**, which dedupes with
`findFirst({ title, category })` — an exact match on the truncated field. An
incoming quote carrying its full text cannot match a stored `...` title, so the
importer creates a second copy. Measured against the Labor Quotes scrape: of 123
quotes already held, only 34 would match — **89 silent duplicates.**

**Rules:**
- **Never rely on the import endpoint's dedup for quotes.** Match during
  preparation, against a fresh export, folded with `normalizeSearchText()`.
- **Repair the titles from their own `description` before any quote import.**
- The same applies to any category whose title was truncated on the way in —
  check the length distribution before importing, not after.
- **Rows imported on/after 20 Sep 2026 carry the FULL quote as `title`** and are
  not affected. The 1,220 truncated titles are all older rows. Do not "fix" new
  rows to match the old shape.

### Related Films & Music ranks on tags — it is not a filter

`GET /api/on-this-day` selects related films and music by **shared subject tags
with the day's history, ranked by tag rarity** (`server/related-entries.ts`),
capped at 5 films and 4 music. Shipped 8 Sep 2026, replacing year matching.

**Why ranking, not filtering:** with 34 terms over ~5,950 entries, "shares a tag"
is close to "exists" — measured across all 366 days it returns ~781 films per day
and up to 1,686. Each shared tag contributes `1/frequency`, so rare tags dominate.
Year is a tiebreak only.

**Rules:**
- The scoring is a **pure function** — keep it that way, and keep its tests
  (`server/related-entries.test.ts`) passing. They pin the ordering contract:
  rarity beats commonness, year never outranks a topical signal, caps hold per
  category.
- **Caps are per category.** The previous code used one `take: 20` across both,
  which starved music on busy days — 156 of 365 days showed no music at all.
- **Tag frequency is cached for 60 seconds.** A tag edit can take up to a minute
  to affect related content. This is deliberate; do not remove the cache without
  measuring — it is what keeps the landing page off a full tag scan per request.
- **Rank on minimal fields, hydrate only the winners.** Selecting whole rows with
  their images before ranking pulls ~2,100 entries and ~1,200 image rows to
  return nine (82ms vs 26ms).
- **When tags move to a table** (the comma-trap work below), `buildTagFrequency`
  and `splitTags` both read the comma-separated string and must move with them.
- A day whose history entries carry **no** tags falls back to the old year rule
  (12 such days currently). Keep the fallback, or those days show an empty panel.

### Adding a tag takes TWO edits — and they must not drift apart

The taxonomy (35 terms) is hardcoded in **two** places, and both must be updated:

1. `server/tags.ts` → `TAG_GROUPS` — the canonical list
2. `src/components/TagSelector.tsx` — its own duplicate copy, for the picker

**You do NOT need to touch `TAG_NORMALIZATION`.** A loop right below it
(`server/tags.ts`, "Tags that are already canonical") registers every canonical
tag as mapping to itself, and `normalizeTags()` also retries case-insensitively.
Only add an entry there for a genuine *alias* — a legacy WordPress slug, say —
not for the tag's own name.

**The real risk is drift between #1 and #2.** A tag in `TAG_GROUPS` but missing
from the picker exists but cannot be selected; the reverse offers a tag that
`normalizeTags()` will strip. Neither errors.

**Check after any taxonomy change:**

```bash
npm run check:tags
```

It verifies the two lists match, that every canonical tag survives its own round
trip through `normalizeTags()`, and that no tag contains a comma. Exits non-zero
on any problem. Verified to fail on a real break, not just to pass.

**Chris cannot add tags himself** — that is TASK-A2, and it is why the answer to
"can I do this myself?" is still no.

### Tag storage will break on any tag containing a comma

**Not a bug today. A trap with a known trigger.** Noted 9 August 2026.

`Entry.tags` is a single comma-separated string (`"Mining, Strikes & Lockouts"`)
and is split on `,`. That works **only because no canonical tag contains a
comma** — verified across all 34 terms. It is safe by luck of the current
vocabulary, not by construction, and nothing enforces it.

**The trigger is already on the table.** Real Library of Congress subject
headings routinely contain commas — inverted forms like `Labor unions, American`
are the norm. So the moment the taxonomy is mapped onto actual LCSH strings,
every stored row starts splitting into the wrong tags, silently, everywhere at
once.

**Before any LCSH mapping**, either move tags to a relation (or a JSON column),
or pick a separator that cannot appear in a heading. Do not do the mapping first
and the storage second.

Related: `tags-dev.md` justifies the string schema with "works well for the
current scale (~1000 entries)". Live count is **~5,950** and growing, so that
particular argument no longer carries the weight it did.

## Helmet & CORS Gotchas (Production vs Local)

### Why Local Works But Production Breaks

**Local dev**: Vite dev server (`npm run dev`) sends NO security headers. Everything loads.

**Production**: Express + Helmet sends restrictive security headers. Things break if not configured correctly.

### Issue 1: YouTube Embed Error 153 (Fixed March 2026)
- **Symptom:** YouTube embeds show "Video player configuration error" in production
- **Cause:** Helmet's default `Referrer-Policy: no-referrer` strips referrer info YouTube needs
- **Fix:** `referrerPolicy: { policy: 'strict-origin-when-cross-origin' }` in helmet config
- **Also:** Use `youtube-nocookie.com` for embed URLs

### Issue 2: Images Blocked — ERR_BLOCKED_BY_RESPONSE.NotSameOrigin (Fixed March 2026)
- **Symptom:** `/uploads/entries/` images fail to load with CORS error in console
- **Cause:** `express.static()` doesn't inherit Helmet's `crossOriginResourcePolicy: false` — it needs explicit headers
- **Fix:** Add `setHeaders` to static file serving:
  ```js
  app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  }));
  ```
- **Why it happens:** Browser enforces CORP (Cross-Origin Resource Policy). Without explicit `cross-origin` header, images from `/uploads` are blocked when page is served from a different origin or behind reverse proxy.

### Issue 3: Migrations Skipped on Existing DB (Fixed March 2026)
- **Symptom:** Schema changes don't apply to production after deploy
- **Cause:** `docker-entrypoint.sh` only ran migrations if DB didn't exist
- **Fix:** Always run `prisma migrate deploy` — it's idempotent (only applies pending migrations)

### Current Helmet Config (server/index.ts)
```js
app.use(helmet({
  contentSecurityPolicy: { /* YouTube, TMDB, Genius allowed */ },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },  // YouTube fix
  crossOriginResourcePolicy: false,  // Allow images cross-origin
  crossOriginEmbedderPolicy: false,  // Allow embeds
}));

// ALSO required for /uploads static files:
app.use('/uploads', express.static(..., {
  setHeaders: (res) => { res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); }
}));
```

## External API Notes

### Music Endpoint (`/api/music/details/:geniusId`)
- **Genius API** — used for song metadata (title, artist, writers, year, album art). Direct JSON API, works from any IP.
- **LRCLIB API** (`lrclib.net`) — used for lyrics. Free JSON API, no scraping required. Replaced Genius web scraping which was blocked from cloud/datacenter IPs (worked locally but failed in production).
- **youtube-sr** — used for YouTube URL discovery. Best-effort.
- If LRCLIB doesn't have lyrics for a song, the endpoint still returns all other metadata — lyrics are best-effort.
