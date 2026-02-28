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
| Deployment | Docker → Coolify (auto-deploy from `main`) |

Same architecture as the [Labor Landmarks Map](https://github.com/Catskill909/labor-map).

## Project Structure

```
├── server/index.ts          # Express API (CRUD, auth, search, TMDB proxy, backup)
├── src/
│   ├── App.tsx              # Main React app
│   └── components/
│       ├── EntryGrid.tsx    # Category-specific card layouts (film posters, etc.)
│       ├── EntryDetail.tsx  # Modal detail view (film: 2-col poster+metadata layout)
│       ├── FilterBar.tsx    # Category-specific filter controls
│       ├── TmdbSearch.tsx   # TMDB typeahead search component
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
├── database-client-project.md  # Full project planning doc & roadmap
└── CLAUDE.md                # AI coding session guardrails
```

## Data

All content lives in a unified `Entry` table with category-specific metadata stored as JSON:

| Category | Entries | Source | Enrichment |
|----------|---------|--------|------------|
| History  | 1,411   | Wix CSV export | — |
| Quotes   | 1,916   | Wix CSV export | — |
| Music    | 435     | Wix CSV export | — |
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
   - `TMDB_API_KEY=<your-tmdb-bearer-token>` (optional)
4. Set exposed port to `3001`
5. Deploy — Coolify auto-deploys on push to `main`
6. Verify: visit `https://your-domain` — should see the app
7. Verify: visit `https://your-domain/admin` — should prompt for password

### Container Startup Sequence

On every deploy, the container runs:
1. `prisma migrate deploy` — applies any pending database migrations
2. `prisma/seed.ts` — seeds default categories (idempotent — skips if categories exist)
3. `tsx server/index.ts` — starts the Express server on port 3001

If no database exists at `/app/data/dev.db`, the container logs a **WARNING** about missing persistent volume.

### Production Data Migration

After first Coolify deploy (empty database):
1. Go to `/admin`, log in with your `ADMIN_PASSWORD`
2. Use Import to upload a JSON backup (exported from local dev via Admin → Backup)
3. For images: either import pre-enriched data with poster URLs, or upload the `uploads/entries/` directory contents to the production volume

### CODE vs DATA

- **Code changes** → `git push` → Coolify auto-deploys (database untouched)
- **Data changes** → Admin panel (add/edit/delete entries, JSON backup/restore)
- Always ask: "Is this a CODE problem or a DATA problem?"

### Known Pre-Launch Issues

These should be addressed before going fully public:
- **No health check endpoint** — no `/api/health` route exists; Coolify health checks will fail if enabled
- **CORS wide open** — `app.use(cors())` allows all origins; restrict to production domain
- **Image upload has no auth** — `POST /api/entries/:id/images` is public; needs `adminAuth` middleware
- **No rate limiting** — public submission, search, and upload endpoints have no rate limits
- **Large JS bundles** — `react-player` produces ~1.5MB of chunks (dash.all.min + hls); consider lazy loading

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
- **JSON backup & restore**

In local dev, admin auth is skipped if no `ADMIN_PASSWORD` is set.

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/entries` | GET | List entries (filter by `category`, `search`, `month`, `day`, `year`, `creator`, `genre`) |
| `/api/entries/filter-options` | GET | Distinct filter values for dropdowns (genres, years) |
| `/api/entries/:id` | GET | Single entry with full image URLs |
| `/api/entries` | POST | Public submission (unpublished) |
| `/api/on-this-day` | GET | Entries for a date, grouped by category (`?month=&day=`) |
| `/api/on-this-day/calendar` | GET | Calendar dot data for a month (`?month=`) |
| `/api/categories` | GET | List active categories |
| `/api/tmdb/search` | GET | Search TMDB by title (server-side proxy) |
| `/api/tmdb/movie/:tmdbId` | GET | Full TMDB movie details + credits + videos |
| `/api/tmdb/download-poster` | POST | Download TMDB poster and attach to entry |
| `/api/admin/entries` | GET | Admin: list with submitter info + pagination |
| `/api/admin/entries` | POST | Admin: create entry (published, no submitter info) |
| `/api/admin/entries/:id` | PUT | Admin: update entry |
| `/api/admin/entries/:id/publish` | PATCH | Admin: toggle publish status |
| `/api/admin/entries/:id` | DELETE | Admin: delete entry |
| `/api/admin/backup` | GET | Admin: JSON export of all data |
| `/api/admin/import` | POST | Admin: JSON import with smart merge |

## Features

- **On This Day** — Landing tab shows today's labor history, quotes, and year-matched films/music. Calendar picker, date navigation (arrows/keyboard), sectioned card grid
- **Unified Search** — One search bar across all categories. Search "Lawrence" and get the 1912 strike, songs, quotes, and films
- **Category Browse** — Filter by History, Quotes, Music, Films with category-specific filter bars
- **Public Submissions** — 3-step wizard (pick category → category-specific form → contact info). Double-click protected with spinner
- **Admin Dashboard** — Stats cards, preview modal, category-specific edit forms, submitter info, custom tooltips, table layout
- **Film Enrichment** — TMDB API integration for posters, cast, trailers. YouTube embed via react-player

## Documentation

- [**database-client-project.md**](database-client-project.md) — Full project planning doc: vision, architecture, schema, phased roadmap, client Q&A, session work logs
- [**CLAUDE.md**](CLAUDE.md) — AI coding session guardrails and pre-push checklist
- [**docs/film-data-dev.md**](docs/film-data-dev.md) — Film import, TMDB integration, and enrichment notes
- [**docs/on-this-day-dev.md**](docs/on-this-day-dev.md) — Phase 4 planning, design decisions, calendar package research

## License

Private project for Labor Heritage Foundation. Film data provided by [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
