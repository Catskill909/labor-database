# CLAUDE.md - Project Guardrails for Labor Arts & Culture Database

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
- **CODE problems** → fix via git push → Coolify auto-deploys
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
