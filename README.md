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

Docker-based deployment with two persistent volumes:

| Volume | Mount | Purpose |
|--------|-------|---------|
| `labor_db_data` | `/app/data` | SQLite database — survives redeploys |
| `labor_db_uploads` | `/app/uploads` | Uploaded images (~153 MB posters) — survives redeploys |

### Setup

1. Create new Coolify app pointing to this repo
2. Add persistent storage:
   - Volume 1: mount at `/app/data`
   - Volume 2: mount at `/app/uploads`
3. Set environment variables:
   - `ADMIN_PASSWORD=<your-password>`
   - `TMDB_API_KEY=<your-tmdb-bearer-token>` (for TMDB search in submission/admin forms)
4. Deploy — Coolify auto-deploys on push to `main`

### Production Data Migration

After first Coolify deploy:
1. Run import scripts on production OR use admin JSON backup/import
2. Run `npm run enrich:films` on production (or import pre-enriched backup)
3. Upload `uploads/entries/` poster images to production volume

### CODE vs DATA

- **Code changes** → `git push` → Coolify auto-deploys
- **Data changes** → Admin panel (add/edit/delete entries, backup/restore)

The SQLite database lives on a persistent volume, so deploys update code without touching data.

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
