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
- **Pre-set in Dockerfile (do NOT override unless intentional):**
  - `DATABASE_URL=file:/app/data/dev.db`
  - `PORT=3001`
  - `NODE_ENV=production`
- **Container startup sequence:** `prisma migrate deploy` → `seed.ts` (idempotent) → `tsx server/index.ts`
- **No health check endpoint exists yet** — add one before enabling Coolify health checks
- **Port:** expose container port `3001` in Coolify

### 5. Prisma Patterns
- Always import both `PrismaClient` and `Prisma` from `@prisma/client` when using transactions
- Transaction client type: `Prisma.TransactionClient` (NOT `typeof prisma`)
- After schema changes: run `npx prisma generate` before building

### 6. Unified Entry Model
- ALL content types (history, quotes, music, films, plays, poetry) live in ONE `Entry` table
- Category-specific fields go in the `metadata` JSON column
- The `category` field determines the content type: "history", "quote", "music", "film", etc.
- The `Category` model is a registry of available categories — admin-managed
- Adding a new category = add a Category row + build its form + push

### 7. Submitter Contact Fields (Admin-Only)
- `submitterName`, `submitterEmail`, `submitterComment` are collected in public submission forms
- These are **never** exposed in the public API — stripped server-side
- They **are** returned by the admin API and admin backup

### 8. HTML Entity Sanitization
- Imported data (especially from WordPress) may contain HTML entities (`&amp;`, `&quot;`, etc.)
- `cleanEntryText()` in `server/index.ts` auto-decodes entities on all create/update/import operations
- If importing raw data directly to SQLite, run entity cleanup manually

### 9. Security Considerations
- **CORS:** Currently wide-open (`app.use(cors())`) — restrict to production domain before launch
- **Image upload (`POST /api/entries/:id/images`):** Currently has NO auth — anyone can upload. Needs `adminAuth` middleware
- **TMDB poster download (`POST /api/tmdb/download-poster`):** Public endpoint, could fill disk — consider adding auth
- **No rate limiting:** No rate limiting on any endpoint — add before public launch
- **Admin auth on localhost:** Frontend skips login on localhost (`App.tsx:240`) — server-side auth still enforced, but admin UI shell is visible without credentials

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
6. Port `3001` exposed
7. First deploy: import data via Admin Dashboard (`/admin` → Import JSON backup)
8. Verify admin login works at `https://your-domain/admin`

## Known Issues (Pre-Launch)
- No `/api/health` endpoint for Coolify health checks
- CORS allows all origins — needs domain restriction
- Image upload endpoint missing auth middleware
- No rate limiting on public endpoints
- Large JS chunks from react-player (~992KB dash.all.min, ~521KB hls) — consider lazy loading
