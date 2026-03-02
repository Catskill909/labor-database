# Labor Arts & Culture Database

A unified, searchable platform for labor history, quotes, music, films, and future content types. Built for the [Labor Heritage Foundation](https://www.laborheritage.org/) to support daily production of the **Labor Radio Podcast**.

**Search "Lawrence" and get the 1912 strike, related songs, relevant quotes, and related films — all in one place.**

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client + create database
npx prisma generate
npx prisma migrate deploy
npx prisma db seed

# Import CSV data (3,762 entries) + WordPress films (2,192 entries)
npm run import:all
npm run import:films

# Enrich films with TMDB data (posters, cast, trailers)
npm run enrich:films

# Start dev server
./dev.sh
# → http://localhost:3001
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Backend | Express 5 + tsx |
| Database | SQLite + Prisma ORM |
| Film Data | TMDB API (server-side proxy) |
| Music Data | Genius API + YouTube search |
| Deployment | Docker → Coolify (auto-deploy from `main`) |

Same architecture as the [Labor Landmarks Map](https://github.com/Catskill909/labor-map).

## Project Structure

```
├── server/index.ts          # Express API (CRUD, auth, search, TMDB proxy, Genius, export, tags)
├── server/tags.ts           # Tag taxonomy, normalization map, auto-tag keyword engine
├── src/
│   ├── App.tsx              # Main React app
│   └── components/
│       ├── EntryGrid.tsx    # Category-specific card layouts (film posters, etc.)
│       ├── EntryDetail.tsx  # Modal detail view (film: 2-col poster+metadata layout)
│       ├── FilterBar.tsx    # Category-specific filters + tag multi-select dropdown
│       ├── TmdbSearch.tsx   # TMDB typeahead search component
│       ├── MusicSearch.tsx  # Genius API typeahead search component
│       ├── ExportModal.tsx  # Multi-format export modal (JSON, XLSX, CSV, ZIP)
│       ├── ImportModal.tsx  # ZIP/JSON import modal with format selection
│       ├── ImageDropzone.tsx # Drag-and-drop image upload
│       ├── SubmissionWizard.tsx  # Submission wizard (public + admin mode)
│       └── AdminDashboard.tsx   # Admin dashboard (stats, table, preview/edit/submitter modals)
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Default categories
├── scripts/
│   ├── import-history.ts    # CSV → database
│   ├── import-quotes.ts
│   ├── import-music.ts
│   ├── import-films.ts      # WordPress XML → database
│   ├── enrich-films-tmdb.ts # TMDB enrichment (posters, cast, trailers)
│   └── download-film-images.ts  # WordPress poster download
├── docs/
│   ├── csv/                 # Source CSV files from Wix export
│   ├── film-data-dev.md     # Film import & TMDB integration notes
│   └── screenshots/         # Original Wix site reference images
├── Dockerfile               # Multi-stage production build
├── docker-compose.yml       # Local Docker with persistent volumes
├── deployment-checklist.md     # Coolify production deployment guide & backup procedures
├── database-client-project.md  # Full project planning doc & roadmap
└── CLAUDE.md                # AI coding session guardrails
```

## Data

All content lives in a unified `Entry` table with category-specific metadata stored as JSON:

| Category | Entries | Source | Enrichment |
|----------|---------|--------|------------|
| History  | 1,411   | Wix CSV export | — |
| Quotes   | 1,916   | Wix CSV export | — |
| Music    | 435     | Wix CSV export | Genius API (100 enriched with songwriter/year) + YouTube URLs (349/435) |
| Films    | 2,192   | WordPress XML export | TMDB API (1,292 enriched, 1,255 with posters) |

Future categories (plays, poetry, etc.) can be added without schema changes.

## Scripts

```bash
npm run dev:fullstack    # Start frontend + backend
npm run build            # Production build (tsc + vite)
npm run import:history   # Import history CSV
npm run import:quotes    # Import quotes CSV
npm run import:music     # Import music CSV
npm run import:films     # Import films from WordPress XML
npm run import:all       # Import all CSVs (history, quotes, music)
npm run enrich:films     # Enrich films with TMDB data + download posters
npm run download:film-images  # Download poster images from WordPress
npx tsc --noEmit         # Type-check before committing
```

### TMDB Enrichment

The `enrich:films` script searches TMDB for each film entry and populates:
- Director, writers, cast, runtime, country, genre
- YouTube trailer IDs
- Poster images (downloaded + thumbnailed via Sharp)
- Original descriptions preserved as curator notes

```bash
npm run enrich:films              # Full run (~10 min for 2,192 films)
npm run enrich:films -- --dry-run # Preview matches without writing
npm run enrich:films -- --limit 50 # Test with subset
npm run enrich:films -- --no-posters # Skip poster downloads
```

Idempotent — safe to re-run (skips entries already enriched with `tmdbId`).

## Deployment (Coolify)

Docker-based deployment with two persistent volumes. **Without both volumes, ALL DATA AND IMAGES ARE LOST on every deploy.**

### Persistent Volumes (CRITICAL)

| Volume | Mount Path | Purpose | Without it... |
|--------|-----------|---------|---------------|
| `labor_db_data` | `/app/data` | SQLite database | ALL entries wiped every deploy |
| `labor_db_uploads` | `/app/uploads` | Uploaded images (~153 MB posters) | All images lost every deploy |

### Environment Variables

| Variable | Required | Set Where | Notes |
|----------|----------|-----------|-------|
| `ADMIN_PASSWORD` | **Yes** | Coolify env vars | Protects `/admin` dashboard and all `/api/admin/*` endpoints |
| `TMDB_API_KEY` | No | Coolify env vars | Enables TMDB film search/enrichment in forms |
| `GENIUS_API_KEY` | No | Coolify env vars | Enables Genius music search (songwriter, lyrics, year auto-fill) |
| `CORS_ORIGIN` | No | Coolify env vars | Restricts CORS to specified origin (e.g. `https://labor-database.supersoul.top`). If unset, allows all origins |
| `DATABASE_URL` | No | Pre-set in Dockerfile | Default: `file:/app/data/dev.db` — do NOT override |
| `PORT` | No | Pre-set in Dockerfile | Default: `3001` — do NOT override |
| `NODE_ENV` | No | Pre-set in Dockerfile | Default: `production` |

**Never put secrets in the Dockerfile `ARG` or `ENV`** — always use Coolify environment variables.

### Setup Checklist

1. Create new Coolify app pointing to this repo (`main` branch)
2. **Add TWO persistent storage volumes** (Configuration → Persistent Storage):
   - Volume 1: name `labor_db_data`, mount at `/app/data`
   - Volume 2: name `labor_db_uploads`, mount at `/app/uploads`
   - **Verify both volumes have DIFFERENT names** (Coolify silently fails if names collide)
3. Set environment variables:
   - `ADMIN_PASSWORD=<strong-password>`
   - `TMDB_API_KEY=<your-tmdb-bearer-token>` (optional — film search)
   - `GENIUS_API_KEY=<your-genius-client-access-token>` (optional — music search)
   - `CORS_ORIGIN=https://labor-database.supersoul.top` (recommended — restricts CORS)
4. Set exposed port to `3001`
5. Configure health check: `GET /api/health` on port `3001`
6. Deploy — Coolify auto-deploys on push to `main`
7. Verify: visit `https://labor-database.supersoul.top` — should see the app
8. Verify: visit `https://labor-database.supersoul.top/admin` — should prompt for password

### Container Startup Sequence

On every deploy, the container runs:
1. `prisma migrate deploy` — applies any pending database migrations
2. `prisma/seed.ts` — seeds default categories (idempotent — skips if categories exist)
3. `tsx server/index.ts` — starts the Express server on port 3001

If no database exists at `/app/data/dev.db`, the container logs a **WARNING** about missing persistent volume.

### Production Data Migration

After first Coolify deploy (empty database):
1. **LOCAL:** Admin → Export → Full Backup (ZIP) — downloads all data + images in one package
2. **PRODUCTION:** Admin → Import → Upload that ZIP — restores entries + images
3. Verify entry counts + images display correctly

One file out, one file in. See [deployment-checklist.md](deployment-checklist.md) for full details.

### CODE vs DATA

- **Code changes** → `git push` → Coolify auto-deploys (database untouched)
- **Data changes** → Admin panel (add/edit/delete entries, JSON backup/restore)
- Always ask: "Is this a CODE problem or a DATA problem?"

### Security Hardening (Completed)

All pre-launch security issues have been resolved:
- **Health check** — `GET /api/health` verifies DB connectivity (200 OK / 503 error)
- **CORS** — Restricted via `CORS_ORIGIN` env var; unset allows all (dev convenience)
- **Image upload auth** — `POST /api/entries/:id/images` protected by `adminAuth` + rate limiting. Public submissions cannot upload images.
- **TMDB poster auth** — `POST /api/tmdb/download-poster` protected by `adminAuth` + rate limiting
- **Rate limiting** — `express-rate-limit` applied: general (100/min), auth (5/min), uploads (10/min), search (30/min)
- **Admin auth** — Login required everywhere (localhost bypass removed). Server allows all if `ADMIN_PASSWORD` unset (dev).
- **Bundle optimization** — EntryDetail, SubmissionWizard, AdminDashboard lazy-loaded via `React.lazy()`. react-player chunks only loaded on demand.

## Admin Panel

Navigate to `/admin` and log in with the `ADMIN_PASSWORD`.

Features:
- **Dashboard** — Labor Landmarks-style UI with stats cards (Published / Review Queue), segmented category tabs, table layout with column headers
- **Stats cards as filters** — click Published or Review Queue cards to filter entries by status (ring highlight when active)
- **Preview modal** — eye icon opens a read-only detail view (reuses public EntryDetail component for all categories)
- **Category-specific edit forms** — edit fields match the submission wizard per category (Quote: Author/Source/Quote, Music: Title/Performer/Songwriter/URL/Genre/RunTime/Lyrics, Film: all TMDB fields, History: Title/Date/Description)
- **Admin entry creation** — "Add to Database" button opens the submission wizard in admin mode (skips contact info step)
- **Submitter info** — purple icon appears only on user-submitted entries, shows name/email/comment in modal
- **Image management** — view existing images, upload new ones, delete with hover-to-remove
- **Custom tooltips** — instant-appearing styled tooltips on all action buttons
- **Multi-format export** — Export modal: Full Backup (JSON + images ZIP), Data Only (JSON), Spreadsheet (XLSX with one sheet per category), CSV. Category filter for targeted exports
- **Import modal** — Import modal with format selection (Full Backup ZIP or Data Only JSON), merge warning, guided file upload
- **Reset DB** — Destructive reset with type-to-confirm ("RESET") safety dialog, itemized deletion preview (entry count, images, records)
- **Music search** — Genius API typeahead in music forms (submission wizard + edit modal), auto-fills songwriter, lyrics, year, and YouTube URL

In local dev, admin login is always required but any password works if `ADMIN_PASSWORD` is not set.

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check — returns `{"status":"ok"}` (200) or `{"status":"error"}` (503) |
| `/api/entries` | GET | List entries (filter by `category`, `search`, `month`, `day`, `year`, `creator`, `genre`, `tag`) |
| `/api/entries/filter-options` | GET | Distinct filter values for dropdowns (genres, years) |
| `/api/entries/:id` | GET | Single entry with full image URLs |
| `/api/entries` | POST | Public submission (unpublished) |
| `/api/on-this-day` | GET | Entries for a date, grouped by category (`?month=&day=&tag=`) |
| `/api/on-this-day/calendar` | GET | Calendar dot data for a month (`?month=`) |
| `/api/categories` | GET | List active categories |
| `/api/tmdb/search` | GET | Search TMDB by title (server-side proxy) |
| `/api/tmdb/movie/:tmdbId` | GET | Full TMDB movie details + credits + videos |
| `/api/tmdb/download-poster` | POST | Download TMDB poster and attach to entry (admin auth required) |
| `/api/music/search` | GET | Search Genius for songs (`?query=`) |
| `/api/music/details/:geniusId` | GET | Fetch lyrics, songwriter, year, YouTube URL from Genius |
| `/api/admin/entries` | GET | Admin: list with submitter info + pagination |
| `/api/admin/entries` | POST | Admin: create entry (published, no submitter info) |
| `/api/admin/entries/:id` | PUT | Admin: update entry |
| `/api/admin/entries/:id/publish` | PATCH | Admin: toggle publish status |
| `/api/admin/entries/:id` | DELETE | Admin: delete entry |
| `/api/admin/export` | GET | Admin: multi-format export (`?format=json\|xlsx\|csv\|full&category=`) |
| `/api/admin/import` | POST | Admin: JSON import with smart merge |
| `/api/admin/import-zip` | POST | Admin: ZIP import (data + images) with ID remapping |
| `/api/admin/reset` | DELETE | Admin: wipe all entries + images (type-to-confirm in UI) |
| `/api/tags` | GET | Tag list with counts, grouped by theme/industry/social (`?category=`) |
| `/api/admin/tags/normalize` | POST | Admin: normalize tags to canonical taxonomy |
| `/api/admin/tags/auto-tag` | POST | Admin: auto-tag entries via keyword matching (`{dryRun: true}` for preview) |
| `/api/admin/tags/stats` | GET | Admin: tag coverage statistics by category |

## Features

- **On This Day** — Landing tab shows today's labor history, quotes, and year-matched films/music. Calendar picker, date navigation (arrows/keyboard), sectioned card grid
- **Unified Search** — One search bar across all categories. Search "Lawrence" and get the 1912 strike, songs, quotes, and films
- **Category Browse** — Filter by History, Quotes, Music, Films with category-specific filter bars
- **Public Submissions** — 3-step wizard (pick category → category-specific form → contact info). Double-click protected with spinner
- **Admin Dashboard** — Stats cards, preview modal, category-specific edit forms, submitter info, custom tooltips, table layout
- **Film Enrichment** — TMDB API integration for posters, cast, trailers. YouTube embed via react-player
- **Music Search** — Genius API integration for songwriter credits, lyrics, year. YouTube URL auto-discovery
- **Multi-Format Export** — Export modal with JSON, XLSX (spreadsheet), CSV, and full ZIP (data + images) formats. Category filtering
- **Tag System** — 34 canonical tags in 3 groups (Theme, Industry, Social Dimension) based on Library of Congress labor subject headings. Tag filter dropdown in browse and On This Day views (AND logic). Clickable tag pills navigate to filtered browse. Admin tag autocomplete in edit forms

## Documentation

- [**deployment-checklist.md**](deployment-checklist.md) — Coolify production deployment guide, backup procedures, data migration, environment variables
- [**database-client-project.md**](database-client-project.md) — Full project planning doc: vision, architecture, schema, phased roadmap, client Q&A, session work logs
- [**CLAUDE.md**](CLAUDE.md) — AI coding session guardrails and pre-push checklist
- [**docs/film-data-dev.md**](docs/film-data-dev.md) — Film import, TMDB integration, and enrichment notes
- [**docs/on-this-day-dev.md**](docs/on-this-day-dev.md) — Phase 4 planning, design decisions, calendar package research
- [**audio-data-update.md**](audio-data-update.md) — Music enrichment planning (Genius API + YouTube search)
- [**export-data.dev.md**](export-data.dev.md) — Export feature brainstorming (formats, migration strategy)

## License

Private project for Labor Heritage Foundation. Film data provided by [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
