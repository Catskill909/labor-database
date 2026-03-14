# Labor Arts & Culture Database

A unified, searchable platform for labor history, quotes, music, films, and future content types. Built for the [Labor Heritage Foundation](https://www.laborheritage.org/) to support daily production of the **Labor Radio Podcast**.

**Search "Lawrence" and get the 1912 strike, related songs, relevant quotes, and related films — all in one place.**

**Live at https://labor-database.supersoul.top**

---

## Deploy to Any Server (Coolify)

This app is fully portable. Coolify deploys from git, the Docker container handles everything else. If you have a backup ZIP, you can stand up a complete instance in minutes.

### 1. Create the App

In Coolify: **New Application → Git Repository**
- Repository: `https://github.com/Catskill909/labor-database`
- Branch: `main`
- Build Pack: **Dockerfile** (auto-detected)
- Enable auto-deploy on push

### 2. Add Two Persistent Volumes

Without these, data is wiped on every deploy.

| Volume Name | Mount Path | What It Stores |
|-------------|-----------|----------------|
| `labor_db_data` | `/app/data` | SQLite database |
| `labor_db_uploads` | `/app/uploads` | Uploaded images & posters |

In Coolify: **Configuration → Persistent Storage → Add** each volume.

### 3. Set Environment Variables

In Coolify: **Configuration → Environment Variables**

| Variable | Required | Purpose |
|----------|----------|---------|
| `ADMIN_PASSWORD` | **Yes** | Protects the admin dashboard |
| `CORS_ORIGIN` | Recommended | Your domain (e.g. `https://your-domain.com`). Unset = allow all |
| `TMDB_API_KEY` | No | Film search + poster auto-fill |
| `GENIUS_API_KEY` | No | Music search + songwriter/lyrics auto-fill |
| `GOOGLE_AI_API_KEY` | No | AI research assistant (Gemini) |

That's it. `DATABASE_URL`, `PORT`, and `NODE_ENV` are pre-set in the Dockerfile — don't override them.

### 4. Deploy & Import Data

Hit **Deploy**. The container automatically runs migrations and seeds categories.

To import your data:
1. Go to `https://your-domain.com/admin`
2. Log in with your `ADMIN_PASSWORD`
3. **Import → Upload your backup ZIP**

Done. All entries and images are restored.

### Backup & Portability

- **Export:** Admin → Export → Full Backup (ZIP) — includes all data + images
- **Import:** Admin → Import → Upload ZIP — restores everything
- **Move to new server:** Export ZIP from old instance, deploy fresh, import ZIP

The backup ZIP is the single artifact needed to recreate the entire database anywhere.

---

## Local Development

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

# Start dev server → http://localhost:3001
./dev.sh
```

In local dev, admin login is required but any password works when `ADMIN_PASSWORD` is not set.

---

## Features

- **On This Day** — Landing page shows today's labor history, quotes, and year-matched films/music with calendar navigation
- **Unified Search** — One search bar across all categories
- **Category Browse** — History, Quotes, Music, Films with category-specific filters and sorting
- **Public Submissions** — 3-step wizard for community contributions (admin review queue)
- **Admin Dashboard** — Stats, preview/edit modals, publish workflow, image management
- **Film Enrichment** — TMDB API for posters, cast, trailers with YouTube embeds
- **Music Search** — Genius API for songwriter credits, LRCLIB for lyrics, YouTube auto-discovery
- **Tag System** — 35 canonical tags based on Library of Congress labor subject headings
- **AI Research** — Gemini-powered research assistant with confidence indicators (admin-only)
- **Multi-Format Export** — JSON, XLSX, CSV, and full ZIP (data + images)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Backend | Express 5 + tsx |
| Database | SQLite + Prisma ORM |
| Film Data | TMDB API (server-side proxy) |
| Music Data | Genius API + LRCLIB API + YouTube search |
| AI Research | Google Gemini 2.0 Flash |
| Deployment | Docker → Coolify (auto-deploy from `main`) |

Same architecture as the [Labor Landmarks Map](https://github.com/Catskill909/labor-map).

---

## Reference

### Project Structure

```
├── server/index.ts          # Express API (CRUD, auth, search, TMDB proxy, Genius, export, tags)
├── server/tags.ts           # Tag taxonomy, normalization, auto-tag keyword engine
├── src/
│   ├── App.tsx              # Main React app
│   └── components/          # React components (EntryGrid, EntryDetail, FilterBar, AdminDashboard, etc.)
├── prisma/
│   ├── schema.prisma        # Database schema (unified Entry model)
│   └── seed.ts              # Default categories
├── scripts/                 # Import & enrichment scripts
├── Dockerfile               # Multi-stage production build
├── docker-entrypoint.sh     # Startup: migrate → seed → serve
└── CLAUDE.md                # AI coding session guardrails
```

### Data Model

All content lives in a unified `Entry` table with category-specific metadata stored as JSON. Future categories (plays, poetry, etc.) can be added without schema changes.

| Category | Entries | Source | Enrichment |
|----------|---------|--------|------------|
| History  | 1,411   | Wix CSV export | — |
| Quotes   | 1,916   | Wix CSV export | — |
| Music    | 435     | Wix CSV export | Genius API + YouTube URLs |
| Films    | 2,192   | WordPress XML export | TMDB API (posters, cast, trailers) |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check (200/503) |
| `/api/entries` | GET | List/search/filter entries |
| `/api/entries/:id` | GET | Single entry detail |
| `/api/entries` | POST | Public submission (goes to review queue) |
| `/api/on-this-day` | GET | Entries for a date, grouped by category |
| `/api/categories` | GET | List active categories |
| `/api/tags` | GET | Tag list with counts |
| `/api/tmdb/search` | GET | TMDB film search |
| `/api/music/search` | GET | Genius music search |
| `/api/admin/*` | Various | Admin CRUD, export, import, AI research (auth required) |

### Scripts

```bash
npm run dev:fullstack        # Start frontend + backend
npm run build                # Production build (tsc + vite)
npm run import:all           # Import all CSVs (history, quotes, music)
npm run import:films         # Import films from WordPress XML
npm run enrich:films         # Enrich films with TMDB data + posters
npx tsc --noEmit             # Type-check before committing
```

### Container Startup

On every deploy, `docker-entrypoint.sh` runs:
1. `prisma migrate deploy` — applies pending migrations (idempotent)
2. `prisma/seed.ts` — seeds default categories (idempotent)
3. `tsx server/index.ts` — starts Express on port 3001

### Security

- **Admin auth** — all `/api/admin/*` endpoints require `ADMIN_PASSWORD`
- **CORS** — restricted via `CORS_ORIGIN` env var
- **Rate limiting** — general (100/min), auth (5/min), uploads (10/min), search (30/min)
- **Health check** — `GET /api/health` for monitoring

### Troubleshooting

| Problem | Fix |
|---------|-----|
| "No existing database found" | Persistent volume not mounted |
| Site shows no data | Import your backup ZIP via Admin |
| Images not showing | `labor_db_uploads` volume not mounted |
| Admin login not working | `ADMIN_PASSWORD` not set in env vars |
| Build fails | Run `npx tsc --noEmit` locally first |

### Documentation

- [deployment-checklist.md](deployment-checklist.md) — Detailed Coolify setup & backup procedures
- [database-client-project.md](database-client-project.md) — Project planning & roadmap
- [CLAUDE.md](CLAUDE.md) — AI coding session guardrails

## License

Private project for Labor Heritage Foundation. Film data provided by [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
