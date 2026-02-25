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

# Import CSV data (3,762 entries)
npm run import:all

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
| Deployment | Docker → Coolify (auto-deploy from `main`) |

Same architecture as the [Labor Landmarks Map](https://github.com/Catskill909/labor-map).

## Project Structure

```
├── server/index.ts          # Express API (CRUD, auth, search, backup)
├── src/
│   ├── App.tsx              # Main React app
│   └── components/
│       ├── EntryGrid.tsx    # Category-specific card layouts
│       ├── EntryDetail.tsx  # Modal detail view
│       ├── FilterBar.tsx    # Category-specific filter controls
│       ├── SubmissionWizard.tsx  # Public submission form
│       └── AdminDashboard.tsx   # Admin panel
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Default categories
├── scripts/
│   ├── import-history.ts    # CSV → database
│   ├── import-quotes.ts
│   └── import-music.ts
├── docs/
│   ├── csv/                 # Source CSV files from Wix export
│   └── screenshots/         # Original Wix site reference images
├── Dockerfile               # Multi-stage production build
├── docker-compose.yml       # Local Docker with persistent volumes
├── database-client-project.md  # Full project planning doc & roadmap
└── CLAUDE.md                # AI coding session guardrails
```

## Data

All content lives in a unified `Entry` table with category-specific metadata stored as JSON:

| Category | Entries | Source |
|----------|---------|--------|
| History  | 1,411   | Wix CSV export |
| Quotes   | 1,916   | Wix CSV export |
| Music    | 435     | Wix CSV export |
| Films    | TBD     | WordPress export (pending) |

Future categories (plays, poetry, etc.) can be added without schema changes.

## Scripts

```bash
npm run dev:fullstack    # Start frontend + backend
npm run build            # Production build (tsc + vite)
npm run import:history   # Import history CSV
npm run import:quotes    # Import quotes CSV
npm run import:music     # Import music CSV
npm run import:all       # Import all CSVs
npx tsc --noEmit         # Type-check before committing
```

## Deployment (Coolify)

Docker-based deployment with two persistent volumes:

| Volume | Mount | Purpose |
|--------|-------|---------|
| `labor_db_data` | `/app/data` | SQLite database — survives redeploys |
| `labor_db_uploads` | `/app/uploads` | Uploaded images — survives redeploys |

### Setup

1. Create new Coolify app pointing to this repo
2. Add persistent storage:
   - Volume 1: mount at `/app/data`
   - Volume 2: mount at `/app/uploads`
3. Set environment variable: `ADMIN_PASSWORD=<your-password>`
4. Deploy — Coolify auto-deploys on push to `main`

### CODE vs DATA

- **Code changes** → `git push` → Coolify auto-deploys
- **Data changes** → Admin panel (add/edit/delete entries, backup/restore)

The SQLite database lives on a persistent volume, so deploys update code without touching data.

## Admin Panel

Navigate to `/admin` and log in with the `ADMIN_PASSWORD`.

Features:
- Browse/edit/delete entries by category
- Review queue for public submissions
- JSON backup & restore
- Image upload for entries

In local dev, admin auth is skipped if no `ADMIN_PASSWORD` is set.

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/entries` | GET | List entries (filter by `category`, `search`, `month`, `day`, `year`, `creator`, `genre`) |
| `/api/entries/filter-options` | GET | Distinct filter values for dropdowns (genres, years) |
| `/api/entries/:id` | GET | Single entry with images |
| `/api/entries` | POST | Public submission (unpublished) |
| `/api/categories` | GET | List active categories |
| `/api/admin/entries` | GET | Admin: list with submitter info |
| `/api/admin/entries/:id` | PUT | Admin: update entry |
| `/api/admin/entries/:id` | DELETE | Admin: delete entry |
| `/api/admin/backup` | GET | Admin: JSON export of all data |
| `/api/admin/import` | POST | Admin: JSON import with smart merge |

## Documentation

- [**database-client-project.md**](database-client-project.md) — Full project planning doc: vision, architecture, schema, roadmap, client Q&A, session work logs
- [**CLAUDE.md**](CLAUDE.md) — AI coding session guardrails and pre-push checklist
- [**docs/csv/**](docs/csv/) — Original CSV exports from Wix
- [**docs/screenshots/**](docs/screenshots/) — Reference screenshots of the original Wix site

## License

Private project for Labor Heritage Foundation.
