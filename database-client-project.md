# Labor Arts & Culture Database — Project Planning

**Client:** Chris Garlock & Harold Phillips / Labor Heritage Foundation
**Date:** February 23, 2026
**Status:** Phase 7 COMPLETE. All pre-launch security fixes applied (health check, CORS, auth, rate limiting, bundle optimization). App running locally with 5,954 entries. Pushed to GitHub. Ready for Coolify deployment at `https://labor-database.supersoul.top`.
**Repo:** https://github.com/Catskill909/labor-database
**Production URL:** https://labor-database.supersoul.top
**Next:** Deploy to Coolify (setup checklist below), then timeline/tags/cross-linking, new content types (plays, poetry).

---

## Vision

A **master Labor Arts & Culture database** — a single, extensible platform that unifies multiple content types (history, quotes, music, films, and future categories like plays and poetry) under one searchable roof. Built to grow.

The client produces the **Labor Radio Podcast Daily** and uses these databases every day for show prep. The core value: search "Lawrence" and get the 1912 strike, related songs, relevant quotes, and related films all in one place.

---

## Data Sources

### Received (CSV from Wix)
1. **Labor History** — CSV received
2. **Labor Quotes** — CSV received
3. **Labor Music** — CSV received

### Received (WordPress XML)
4. **Labor Films** — WordPress site at https://laborfilms.com
   - WordPress XML export received Feb 25, 2026 (6.8 MB, 2,247 published films)
   - 2,192 imported; 1,292 enriched via TMDB API with structured metadata + posters
   - See [docs/film-data-dev.md](docs/film-data-dev.md) for full import/enrichment notes

### Future (Client wants architecture to support these)
5. **Labor Plays** — not yet started
6. **Labor Poetry** — not yet started
7. **Other categories TBD**

---

## Current State of Existing Data (Audited Feb 2026)

### Labor History Database (Wix)
| Field | Type | Notes |
|-------|------|-------|
| Date (Month/Day/Year) | Date components | Separate month, day, year fields |
| Description | Long text | The historical event narrative |
| Submitted By (Name) | String | Optional |
| Submitted By (Email) | String | Optional |

- **UI**: Search bar + Month/Day/Year dropdown filters + card grid
- **Public submissions**: Yes, via modal form with date picker

### Labor Quotes Database (Wix)
| Field | Type | Notes |
|-------|------|-------|
| Quote | Long text | The actual quote |
| Author | String | Person who said it |
| Description/detail | String | Context about the quote |
| Date(s) | String | When the quote was said/relevant |
| Submitted By (Name) | String | Optional |
| Submitted By (Email) | String | Optional |

- **UI**: Search bar + card grid (no date filtering)
- **Public submissions**: Yes, via modal form

### Labor Music Database (Wix)
| Field | Type | Notes |
|-------|------|-------|
| Song Title | String | |
| Song Writer | String | |
| Song Performer | String | Sometimes different from writer |
| Location URL | String | YouTube links, etc. |
| Genre | String | |
| Run Time | String | |
| Date Written | String | |
| Keywords/Lyrics | Long text | Lyrics snippet or keyword tags |
| Submitted By (Name) | String | Optional |
| Submitted By (Email) | String | Optional |

- **UI**: Search by Title/Artist/Lyrics/Genre + card grid
- **Cards**: Title, performer, artist, "View Location" and "View Lyrics" buttons
- **Public submissions**: Yes, via modal form

### Labor Films Database (WordPress — laborfilms.com)
| Field | Type | Notes |
|-------|------|-------|
| Title | String | Film name |
| Director(s) | String | Sometimes multiple |
| Writer(s) | String | Not always present |
| Cast/Stars | String | Not always present |
| Year | String | Release year |
| Runtime | String | e.g., "100 min", "2h 9m" — inconsistent format |
| Country | String | Not always present |
| Synopsis | Long text | Variable length, sometimes with blockquotes |
| Tags/Categories | String[] | Rich tagging: genre (Documentary, Drama, SciFi), subject (Working Class, Organizing, Women), industry (Manufacturing, Construction), era |
| Trailer URL | String | YouTube embeds in content |

- **Source**: WordPress posts with HTML content — NOT structured database fields
- **Key challenge**: Data is embedded in prose HTML, not clean columns. Will need parsing.
- **Rich tagging**: WordPress categories provide excellent subject/genre classification
- **Public submissions**: Unknown — need to check WordPress site

---

## Architecture: Unified Platform, Admin-Managed Categories

Everything lives in **one database, one search, one platform**. The unified Entry table means search, "On This Day", and cross-linking work across all categories automatically. Adding a new category (e.g., Plays, Poetry) is a lightweight dev task — we add the form and any category-specific display logic in a single session, push to main, Coolify deploys. No architectural changes needed.

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│                     ADMIN PANEL                          │
│  Manages categories, entries, review queue                │
│  New categories added via quick dev cycle                 │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────┐
│                  MASTER SEARCH                           │
│         One search bar — all categories                  │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────────┐
        ▼              ▼                  ▼
   ┌─────────┐   ┌──────────┐      ┌──────────┐
   │ History  │   │  Quotes  │      │  Music   │  Films, Plays, Poetry ...
   └─────────┘   └──────────┘      └──────────┘
        │              │                  │
        └──────────────┼──────────────────┘
                       ▼
              ┌────────────────┐
              │  "On This Day" │
              │   Timeline     │
              │   Cross-links  │
              └────────────────┘
```

### Tech Stack (Identical to Labor Landmarks)
| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React + Vite + Tailwind CSS | Same stack |
| Backend | Express.js + tsx | Same stack |
| Database | SQLite + Prisma ORM | Same stack |
| Deployment | Docker → Coolify (auto-deploy from `main`) | Same workflow |
| Port | 3001 | Separate Coolify app, same port pattern |
| Admin Auth | Bearer token (ADMIN_PASSWORD env var) | Same pattern |
| Data Sync | Admin JSON backup/import | Same pattern |

### Deployment (Mirrors Landmarks Exactly)
- Separate git repo, separate Coolify app on Paul's Coolify instance
- Same Dockerfile pattern (multi-stage build: Vite frontend + Express server)
- **TWO persistent volumes** (same as landmarks):
  1. `/app/data` — SQLite database (WITHOUT THIS, ALL DATA WIPED EVERY DEPLOY)
  2. `/app/uploads` — uploaded images/posters (WITHOUT THIS, ALL IMAGES LOST EVERY DEPLOY)
- Same `CODE vs DATA` separation — git push updates code, admin import syncs data
- Same backup/restore workflow
- Subdomain via A record on Paul's domain, pointed to Coolify

### Coolify Setup (Step-by-Step)
1. Create new Coolify app → point to `https://github.com/Catskill909/labor-database`, branch `main`
2. Configuration → Persistent Storage → add TWO volumes:
   - Name: `labor_db_data` → Mount: `/app/data`
   - Name: `labor_db_uploads` → Mount: `/app/uploads`
   - **Both volumes MUST have different names** — Coolify silently fails on name collision
3. Configuration → Environment Variables:
   - `ADMIN_PASSWORD` = (strong password) — **REQUIRED** — protects admin dashboard & API
   - `TMDB_API_KEY` = (TMDB bearer token) — optional, for film search/enrichment
   - `GENIUS_API_KEY` = (Genius client access token) — optional, for music search/enrichment
   - `CORS_ORIGIN` = `https://labor-database.supersoul.top` — recommended, restricts CORS to production domain
   - Do NOT set `DATABASE_URL`, `PORT`, or `NODE_ENV` — these are pre-configured in Dockerfile
4. Configuration → Network → Exposed Port: `3001`
5. Configure health check: `GET /api/health` on port `3001`
6. Deploy
7. After first deploy: go to `/admin` → Import → upload JSON backup from local dev
8. Verify: visit `https://labor-database.supersoul.top` — public site loads
9. Verify: visit `https://labor-database.supersoul.top/admin` — admin login works

### Container Startup
On every deploy/restart:
1. Checks for existing database at `/app/data/dev.db` — logs WARNING if missing (means volume not mounted)
2. Runs `prisma migrate deploy` — applies pending migrations
3. Runs `prisma/seed.ts` — seeds default categories (idempotent, skips if categories exist)
4. Starts Express server via `tsx server/index.ts` on port 3001

### Security Hardening (All Resolved — Phase 7)
| Issue | Resolution |
|-------|------------|
| Health check | `GET /api/health` — DB connectivity check, returns 200/503 |
| CORS | Restricted via `CORS_ORIGIN` env var (`https://labor-database.supersoul.top`). Unset = allow all (dev). |
| Image upload auth | `POST /api/entries/:id/images` protected by `adminAuth` + `uploadLimiter`. Public dropzone hidden. |
| TMDB poster auth | `POST /api/tmdb/download-poster` protected by `adminAuth` + `uploadLimiter` |
| Rate limiting | `express-rate-limit`: general (100/min), auth (5/min), uploads (10/min), search (30/min) |
| Bundle optimization | EntryDetail, SubmissionWizard, AdminDashboard lazy-loaded via `React.lazy()` |
| Admin localhost bypass | Removed — login required everywhere. Server allows all if `ADMIN_PASSWORD` unset (dev). |

### Image Support
- **Confirmed needed** — at minimum for films (movie posters when no YouTube trailer exists)
- Available for any category but optional per entry — a history entry doesn't need a photo, a film can have a poster
- Same stack as landmarks: multer (uploads) + sharp (thumbnail generation)
- Images stored on disk at `/app/uploads/`, served as static files
- This adds the second persistent volume but it's a proven pattern from landmarks

### Portability
- Database is ONE file (SQLite) — can be moved to any host trivially
- Images are flat files in `/app/uploads/` — portable via simple file copy
- JSON backup/import for data portability (same as landmarks)
- Standard Docker container — runs on any Docker host, not locked to Coolify

### Agentic Coding & Handoff
- Same `CLAUDE.md` + `HANDOFF.md` pattern as landmarks repo
- Clear guardrails for AI sessions: strict TypeScript, build verification, CODE vs DATA separation
- Git repo must be self-documenting — any AI agent can pick up and contribute
- All architectural decisions documented in this file

### Database Schema (Prisma)

```prisma
model Entry {
  id          Int      @id @default(autoincrement())
  category    String   // "history", "quote", "music", "film", "play", "poetry", ...
  title       String   // Display title (event name, quote snippet, song title, film title)
  description String   // Main content body

  // Date fields (shared — every type can have a date)
  month       Int?
  day         Int?
  year        Int?

  // Attribution (shared — author, performer, director all map to "creator")
  creator     String?  // Primary creator: author, performer, director, poet, playwright

  // Extended fields as JSON (type-specific)
  // Music: { writer, performer, genre, runTime, locationUrl, lyrics }
  // Film: { director, writers, cast, runtime, country, trailerUrl }
  // Quote: { author, source }
  // Play: { playwright, company, venue }
  metadata    String?  // JSON string — parsed by frontend based on category

  // Tags for cross-linking and filtering
  tags        String?  // Comma-separated: "mining, 1930s, women, documentary"

  // External links
  sourceUrl   String?  // Original source, YouTube link, etc.

  // Submission workflow (same pattern as landmarks)
  isPublished    Boolean  @default(false)
  submitterName  String?
  submitterEmail String?
  submitterComment String?

  // Images (optional — used for film posters, etc.)
  images      EntryImage[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model EntryImage {
  id          Int      @id @default(autoincrement())
  entryId     Int
  entry       Entry    @relation(fields: [entryId], references: [id], onDelete: Cascade)
  filename    String
  caption     String?
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
}

// Registry of available categories (admin-managed)
model Category {
  id          Int      @id @default(autoincrement())
  slug        String   @unique  // "history", "music", "film", etc.
  label       String             // "Labor History", "Labor Music", etc.
  icon        String?            // Lucide icon name for UI
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)

}
```

**Why this works:**
- One table, one search query, one "On This Day" query — all categories included automatically
- Category-specific fields live in the `metadata` JSON — flexible per type without schema migrations
- Tags work across all categories for cross-linking and filtering
- Same proven deployment pattern as the Landmarks map
- Adding a new category = add a Category row + build its form + push. Quick dev cycle, not a rewrite

---

## Submission & Admin

### Admin Panel
- **Category tabs** — one tab per content type (History, Quotes, Music, Films, etc.)
- **Full CRUD** — add/edit/delete entries, same pattern as landmarks
- **Review queue** — submissions from the public start as `isPublished: false`, admin reviews and publishes
- **Category management** — activate/deactivate categories, set display order
- **Multi-format export** — Export modal: JSON, XLSX, CSV, full ZIP (data + images). Category filtering

### Public: Submission Wizard
The public "Add to Database" button uses a **wizard/stepper**:

```
Step 1: "What are you adding?"
┌─────────────────────────────────────────┐
│  ○ Historical Event                      │
│  ○ Quote                                 │  ← Auto-populated from
│  ○ Song                                  │    active categories
│  ○ Film                                  │
└─────────────────────────────────────────┘

Step 2: Category-specific form
┌─────────────────────────────────────────┐
│  [Handcrafted form for each type —      │
│   right fields, right validation]       │
└─────────────────────────────────────────┘

Step 3: Your contact info
┌─────────────────────────────────────────┐
│  Your Name:  [________]                 │
│  Your Email: [________]                 │
│  Comments:   [________]                 │
│              [Submit]                    │
└─────────────────────────────────────────┘
```

Step 1 reads from the Category table (so new categories appear automatically). Each category's form is purpose-built — right fields, right labels, right validation for that content type. Submissions go into the review queue.

### Adding a New Category (e.g., "Labor Plays")
When the client wants a new content type:
1. Client tells us: "We want Labor Plays — fields are: title, playwright, theater company, year, synopsis"
2. We build the form, admin tab, and any display logic
3. Push to main → Coolify deploys
4. Done — typically a single dev session

This is faster and more reliable than a dynamic form generator, and produces better UX since each form is tailored to its content type.

---

## Feature Roadmap

### Phase 1: Foundation — Data Import & Core Platform ✅ COMPLETE
- [x] New repo + project scaffolding (clone landmarks pattern)
- [x] Prisma schema with unified Entry model + EntryImage model + Category registry
- [x] CSV import scripts for History, Quotes, Music
- [x] Express API: CRUD endpoints for entries (generic, category-filtered)
- [x] Image upload API (multer + sharp, same as landmarks)
- [x] Admin panel with category tabs
- [x] Admin auth (same pattern as landmarks)
- [x] Basic search per category (case-insensitive via raw SQL LIKE)
- [x] Public-facing UI with category navigation
- [x] Unified search bar — cross-category search
- [x] Category-specific card designs (History, Quote, Music, Generic)
- [x] Submission wizard (3-step: pick category → category form → contact info)
- [x] Pushed to GitHub: https://github.com/Catskill909/labor-database

### Phase 2: Enhanced Search & Filters ✅ COMPLETE
- [x] Category-specific filter bar (FilterBar component):
  - History: Month/Day/Year dropdowns
  - Quotes: Author text filter (debounced)
  - Music: Artist text filter + Genre dropdown (populated from actual data — 39 genres)
  - Films: Director text filter + Year input
- [x] Filters combine with text search and reset on category change
- [x] New API endpoint: `GET /api/entries/filter-options` for dropdown data
- [x] New API params: `creator` (case-insensitive LIKE), `genre` (metadata search)
- [x] Admin review queue polished: Pending Review / Published / All Status toggle buttons with count
- [x] Unpublished entries sorted to top in admin view

### Phase 3: Films Import, Display & TMDB Enrichment ✅ COMPLETE
- [x] WordPress XML export received from client (2,247 published films)
- [x] Import script: `scripts/import-films.ts` — parses WordPress XML with `fast-xml-parser` + `cheerio`, extracts title, year, director, cast, duration, country, genre, YouTube ID, poster URL from embedded HTML
- [x] 2,192 film entries imported into unified Entry table
- [x] Film-specific card design: poster thumbnails with gradient overlay, title/director/year, genre badges, YouTube play indicator, responsive grid (2-5 columns)
- [x] Film detail modal: wider layout (max-w-4xl), two-column poster + metadata, YouTube trailer embed via `react-player`, credits table, curator notes section, tags
- [x] WordPress poster image download script: `scripts/download-film-images.ts` — 160 posters downloaded
- [x] TMDB API integration (Phase 3b):
  - Server-side proxy endpoints: `GET /api/tmdb/search`, `GET /api/tmdb/movie/:id`, `POST /api/tmdb/download-poster`
  - `TmdbSearch.tsx` — reusable typeahead component with debounced search, poster thumbnails, two-step select
  - Public film form: TMDB auto-populate, Writers field, Tags field, Comments field, poster preview + download
  - Admin edit modal: category-aware (film shows TMDB search + all film-specific fields), metadata JSON parse/save
  - Comments field added to both public and admin forms (stored as `metadata.comment`)
- [x] TMDB batch enrichment: `scripts/enrich-films-tmdb.ts` — processed all 2,192 films:
  - 1,292 films enriched with structured TMDB data (director, cast, writers, runtime, country, genre, trailer)
  - 1,255 films now have poster images (up from 160)
  - 678 films have YouTube trailer IDs (up from 336)
  - 1,298 films have original descriptions preserved as curator notes
  - Idempotent with `--dry-run`, `--limit N`, `--no-posters` flags
- [x] Infinite scroll + fade-in animations on public site and admin dashboard
- [x] `react-player` for YouTube/Vimeo embeds, `react-dropzone` for image uploads, `ImageDropzone` component
- [x] Form alignment & admin polish (Phase 3c):
  - All form fields have visible labels above inputs (not just placeholders that disappear when populated)
  - Admin edit modal: image management — view current images, upload new ones, hover-to-delete with spinner
  - Admin edit modal: category shown as read-only subheader (not an editable dropdown — prevents accidental category changes that would lose metadata)
  - Admin edit modal: removed TMDB search (would overwrite existing curated data)
  - Public submission wizard: film form labels match admin form for consistency
  - Server: admin API uses `x-forwarded-proto`/`x-forwarded-host` for correct image URLs behind Coolify reverse proxy
  - Server: single entry endpoint now returns full image URLs (was returning raw filenames)

### Phase 4: "On This Day" — The Killer Feature ✅ COMPLETE
- [x] "On This Day" is the first tab (replaces "All") — loads today's content on landing
- [x] API endpoints: `GET /api/on-this-day?month=&day=` (grouped by category), `GET /api/on-this-day/calendar?month=` (calendar dot indicators)
- [x] Date navigation: prev/next day arrows, "Today" button, keyboard shortcuts (←/→/t/Esc)
- [x] Calendar picker: `react-day-picker` + `date-fns`, dark-themed, blue dots on days with entries
- [x] Sectioned card grid: Labor History, Labor Quotes (date-matched), Films & Music (year-matched "From the Era")
- [x] Section headers with icon, title, count, and subtitle
- [x] History cards: year badge top-left aligned, 12-line clamp with "More..." indicator, full text in modal
- [x] Quote cards: italic pull-quote style, 12-line clamp with "More...", author attribution
- [x] Film cards: poster thumbnails (2:3 aspect), genre badges, gradient overlay
- [x] Music cards: compact row with icon, title, performer
- [x] Year-matching: films & music from years that match the day's history/quote entries
- [x] Smart search: typing in search bar auto-switches from On This Day to browse view
- [x] Empty state: friendly CTA to submit an entry for dates with no content
- [x] Category tabs: History, Quotes, Music, Films still accessible for full browse with filters
- [x] See [docs/on-this-day-dev.md](docs/on-this-day-dev.md) for full planning & design notes

### Phase 5: Admin Dashboard & Submissions ✅ COMPLETE
- [x] **Admin dashboard redesign** — Labor Landmarks-inspired styling: red icon badge header, stats cards (Published/Review Queue as clickable filters with ring highlight), segmented pill category tabs, table layout with column headers (Entry/Category/Status/Actions)
- [x] **Preview modal** — Eye icon per entry opens read-only EntryDetail component (reuses public detail views for all categories)
- [x] **Category-specific edit forms** — EditEntryModal matches SubmissionWizard fields per category:
  - Quote: Author, Source (book/speech/article), Quote text, Tags, Source URL
  - Music: Song Title, Performer, Songwriter, URL, Genre/RunTime/Year grid, Keywords/Lyrics, Tags
  - Film: Title, Director(s), Writer(s), Cast, Runtime/Country/Year, Genre, Synopsis, Comments, Trailer URL, Tags
  - History: Title, Month/Day/Year, Description, Tags, Source URL
- [x] **Admin entry creation** — SubmissionWizard with `isAdmin` prop (skips contact step, posts to admin API)
- [x] **Submission improvements** — Double-click protection with spinner, disabled Back/X/backdrop during submission
- [x] **Submitter info** — Purple UserRound icon only appears on user-submitted entries (spacer preserves alignment), modal shows name/email(mailto)/comment
- [x] **Custom tooltips** — CSS `[data-tooltip]::after` pseudo-element, instant 100ms fade+scale, styled dark zinc background with border/shadow (no library)
- [x] **Edit icon fix** — Changed from Plus to Edit2 pencil icon
- [x] **sourceUrl display fixes** — Smart link text (`laborfilms.wordpress.com` → "View on Labor Film Database"), hides redundant YouTube text links when embedded player shown
- [x] **Contact info section** — Restyled SubmissionWizard Step 3 with "YOUR CONTACT INFO" header, red subtitle, side-by-side name/email
- [x] **Category form tweaks** — Removed Date from quotes, reordered music fields (Title/Performer first), made film fields flexible with helper text

### Phase 6a: Music Search & Data Export ✅ COMPLETE
- [x] **Genius API integration** — typeahead search in music forms (submission wizard + admin edit modal), auto-fills songwriter, lyrics, year from Genius database
- [x] **YouTube URL auto-discovery** — `youtube-sr` finds matching YouTube video for selected song
- [x] **MusicSearch component** — debounced search dropdown with album art thumbnails, loading states, "Fetching lyrics & YouTube video" indicator
- [x] **Bulk music enrichment** — 100 entries enriched with songwriter/year via Genius API, 349/435 entries now have YouTube URLs
- [x] **Multi-format export modal** — replaces old Backup button with full Export modal:
  - Full Backup (JSON + all uploaded images as ZIP)
  - Data Only (JSON with `_meta` schema header, re-importable)
  - Spreadsheet (XLSX with one sheet per category, category-specific columns, styled headers)
  - CSV (single file per category, or ZIP of all categories)
  - Category filter dropdown for targeted exports
  - Spinner/progress feedback during export generation
- [x] **`ExportModal.tsx`** — clean dark-themed modal matching existing UI patterns
- [x] **`/api/admin/export` endpoint** — unified server endpoint supporting all 4 formats with streaming response (no memory buffering)
- [x] **Packages added**: `genius-lyrics-api`, `youtube-sr`, `exceljs`, `archiver`

### Phase 7: Pre-Launch Security Hardening ✅ COMPLETE
- [x] **Health check endpoint** — `GET /api/health` with DB connectivity check (200/503)
- [x] **CORS restriction** — `CORS_ORIGIN` env var restricts to production domain
- [x] **Image upload auth** — `adminAuth` + `uploadLimiter` on `POST /api/entries/:id/images`. Image dropzone hidden from public users.
- [x] **TMDB poster auth** — `adminAuth` + `uploadLimiter` on `POST /api/tmdb/download-poster`
- [x] **Rate limiting** — `express-rate-limit`: general (100/min), auth (5/min), uploads (10/min), search (30/min)
- [x] **Localhost admin bypass removed** — login required everywhere
- [x] **Bundle optimization** — `React.lazy()` for EntryDetail, SubmissionWizard, AdminDashboard. react-player chunks loaded on demand only.

### Phase 8: Timeline, Tags & Cross-Linking
- [ ] **Timeline view** — browse by decade or year across all categories
- [ ] **Tag system** — shared tags across all categories for cross-filtering
- [ ] **Auto-linking** — surface connections across categories by date + keyword matching
- [ ] Visual timeline component

### Phase 9+: New Categories (Plays, Poetry, etc.)
As the client requests new content types:
- [ ] Build category-specific submission form and admin edit form
- [ ] Add admin tab and any unique display logic (e.g., embedded video for plays)
- [ ] Write import script if initial data exists
- [ ] Push to main → Coolify deploys
Each new category is a quick dev cycle, not an architecture change.

---

## Growth Strategy: How to Build & Expand the Data

### Immediate (with CSVs in hand)
1. **Import existing data** — bulk CSV import for History, Quotes, Music
2. **Parse Films** — WordPress export → structured entries with director/year/runtime extracted from HTML content
3. **Data cleanup** — normalize dates, deduplicate, fix encoding issues
4. **Publish** — all imported entries start as `isPublished: true` (they're already public on Wix)

### Ongoing Data Growth
1. **Public submissions** — wizard form on the site, same pattern as landmarks (submit → admin review → publish)
2. **Admin direct entry** — admin panel for adding entries manually
3. **Bulk import** — CSV upload in admin for batch additions (e.g., if someone provides a spreadsheet of 200 quotes)
4. **Admin backup/restore** — JSON export/import for data portability (same as landmarks)

### Adding New Categories (The "Plays" Example)
When the client wants to add "Labor Plays":
1. Client tells us: "Plays need: title, playwright, theater company, year, synopsis, ticket URL"
2. We build the form + admin tab + card display in a dev session
3. Add a Category row (slug=`play`, label=`Labor Plays`, icon=`theater`)
4. Push to main → Coolify deploys
5. Wizard automatically shows "Play" as a submission option
6. Search and "On This Day" automatically include plays — no extra work needed

### Data Quality & Enrichment
- **Tags** — admin can bulk-tag entries by theme/topic (the films WordPress data already has rich tags we can import)
- **Date normalization** — parse freeform date strings ("March 1912", "1930s") into structured month/day/year for timeline/On This Day
- **Cross-references** — once tagged, auto-suggest related entries across categories

---

## Brainstorm: Future Features & Cool Ideas

### Daily Podcast Production Tools
- **Daily Digest Email/RSS** — auto-generated "Today in Labor History" with matching quotes, songs, and films delivered every morning
- **Episode Planner** — save/bookmark entries into a "playlist" for upcoming episodes
- **Script Generator** — select a history entry + related quotes and get a formatted script snippet ready for reading on air
- **Calendar View** — month-at-a-glance showing which days have content, color-coded by density

### Content Discovery
- **Random Entry** — "I'm feeling lucky" button for inspiration
- **"Related" Sidebar** — when viewing any entry, auto-suggest related items from other categories
- **Tag/Theme Browser** — curated tags like "mining," "textile workers," "civil rights," "women in labor" — filter across all categories
- **Decade Browser** — visual decade selector with entry counts per decade

### Public Engagement
- **Embeddable "On This Day" Widget** — drop into laborradionetwork.org, newsletters, or partner sites
- **Social Sharing** — auto-generated Open Graph preview cards for Twitter/Facebook
- **Public Favorites/Bookmarks** — visitors save entries (localStorage, no login required)

### Music-Specific
- **Audio/Video Preview** — YouTube embed inline for songs and films with location URLs
- **Lyrics Display** — expandable lyrics view on song cards
- **Playlist Export** — generate a YouTube playlist from selected songs

### Film-Specific
- **Trailer Embed** — inline YouTube player for films with trailer URLs
- **Screening Calendar** — upcoming screenings or broadcast dates
- **Film Festival Tags** — flag films by festival appearances

### Advanced / Down the Road
- **Full-Text Search** — SQLite FTS5 for fast fuzzy matching across all content
- **AI-Assisted Tagging** — bulk auto-tag entries by topic/theme using LLM classification
- **Public REST API** — let other labor organizations pull data programmatically
- **Data Visualization** — charts by decade, topic, geographic distribution
- **PWA** — installable mobile app wrapper for daily reference
- **Landmarks Integration** — cross-link with the Labor Landmarks map (e.g., "Lawrence" history entry links to Lawrence landmarks)
- **Multi-tenant** — other organizations could run their own instance with custom categories

---

## Session 1 Work Log (Feb 25, 2026)

### What Was Built
Full project scaffolded from scratch, mirroring the Labor Landmarks architecture:
- **18+ files created** — package.json, Dockerfile, docker-compose.yml, Prisma schema, Express API server, React frontend with 7 components, 3 CSV import scripts, dev.sh, CLAUDE.md, all config files
- **Express API** (~500 lines) — full CRUD, admin auth, image upload, backup/import, case-insensitive search
- **React Frontend** — Header, CategoryNav, EntryGrid (with category-specific cards), EntryDetail modal, SubmissionWizard, AdminLogin, AdminDashboard
- **3 CSV import scripts** — one per data source, with BOM handling, deduplication, and data cleanup

### Data Import Results
| Category | Imported | Skipped | Notes |
|----------|----------|---------|-------|
| History  | 1,411    | 13      | 13 had no description |
| Quotes   | 1,916    | 465     | 465 had no quote text |
| Music    | 435      | 657     | 657 had no song title |
| **Total**| **3,762**| **1,135** | |

### Issues Found & Fixed During Build
1. **BOM in CSVs** — `CsvError: Invalid Opening Quote: utf8 bom` → Added `bom: true` to csv-parse options
2. **Express 5 req.params typing** — `string | string[]` type error → Cast with `as string`
3. **Case-sensitive search** — SQLite Prisma `contains` is case-sensitive → Switched to raw SQL `$queryRaw` with `LIKE`
4. **Duplicate title/description on history cards** — Title was just truncated description → Created category-specific card components (HistoryCard shows only date + description)
5. **Music "View Location" label** → Renamed to "Listen"
6. **Music buttons showing on all entries** — 358/435 entries had non-URL text ("Labor History Today collection...") as sourceUrl → Fixed import script to only store URLs starting with "http", ran cleanup on existing data
7. **Footer disappearing behind content** — Changed from `min-h-screen` to `h-screen` with `overflow-y-auto` on main content area

### Key Technical Decisions
- **Case-insensitive search**: Uses raw SQL `LIKE` queries via `prisma.$queryRaw` because SQLite's Prisma `contains` mode is case-sensitive
- **Music sourceUrl filtering**: Only values starting with "http" are stored as sourceUrl; non-URL location text is discarded
- **History cards**: No title displayed (title is just a truncated copy of description); shows date header + full description
- **Quote cards**: Italic text + author attribution; metadata.source shown as detail line

---

## Open Questions

1. ~~**CSV exports**~~ — **RECEIVED** for History, Quotes, Music.
2. **Films WordPress export** — pending from client. Instructions sent (Dashboard → Tools → Export → Posts → XML).
3. ~~**Images**~~ — **CONFIRMED**: Yes, needed at minimum for films (movie posters). Available for all categories, optional per entry.
4. ~~**Unified vs. separate tables**~~ — **EXPLAINED & APPROVED**: Harold asked why one table instead of separate relational databases. Explained metadata JSON approach (shared fields + type-specific envelope) and how cross-referencing works via tags/dates/keywords. Client satisfied with the approach.

## Client Q&A Log

### Harold's Architecture Question (Feb 24, 2026)
**Q:** "All that is going to go in a single database table? Wouldn't separate databases that are relational through the search index work better?"

**A:** Every entry has shared fields (title, description, date, creator, tags). Category-specific fields live in a `metadata` JSON field — like an envelope that's the same size but holds different contents per type. A history entry's metadata is nearly empty; a film's contains director, runtime, cast, etc. Rows aren't bloated — empty categories don't waste space.

Cross-referencing (e.g., Pittston strike ↔ Trumka quote ↔ related song) works through shared dates, tags, and full-text search — not through table joins. One table actually makes unified search and "On This Day" *easier* than separate tables, which would require searching multiple places and combining results.

**Client response:** Satisfied with explanation.

---

## Data Migration Plan

### History, Quotes, Music (CSVs — received)
1. Analyze CSV structure, field names, encoding
2. Write import scripts mapping Wix fields → Entry model
3. Parse dates into structured month/day/year
4. Import locally, verify counts and data quality
5. Deploy, import to production via admin

### Films (WordPress — pending export)
1. Export options: WordPress XML export (preferred) or RSS feed scrape
2. Parse HTML content to extract structured fields (director, year, runtime, synopsis)
3. Import WordPress tags/categories as entry tags
4. Handle variable field presence (not all films have all fields)
5. Manual cleanup pass for entries with non-standard formatting

### Future Categories
- Client provides data in any format (CSV, spreadsheet, text)
- We write a one-time import script per batch
- Ongoing additions via admin panel or public submissions

---

## Handoff Notes for Next Session

### Current State
- App runs locally on port 3001 (`./dev.sh`)
- SQLite database at `prisma/dev.db` with 5,954 entries (3,762 CSV + 2,192 films)
- "On This Day" is the landing tab — shows today's date with history, quotes, year-matched films/music
- Admin dashboard fully styled with preview, edit (category-specific), submitter info modals
- Public + admin submission wizards with category-specific forms and double-click protection
- All code pushed to https://github.com/Catskill909/labor-database
- NOT yet deployed to Coolify

### To Start Working
```bash
cd ~/Desktop/labor-database
npm run dev:fullstack   # starts server at http://localhost:3001
```

### Key Files
| File | Purpose |
|------|---------|
| `server/index.ts` | Express API (~1100 lines) — all routes, admin auth, search, On This Day, Genius, export |
| `src/App.tsx` | Main React app — layout, state, tab routing (On This Day + browse) |
| `src/components/AdminDashboard.tsx` | Admin: stats cards, segmented tabs, table layout, preview/edit/submitter modals |
| `src/components/SubmissionWizard.tsx` | Public + admin entry wizard (`isAdmin` prop skips contact step) |
| `src/components/EntryDetail.tsx` | Entry detail modal (category-aware: film, quote, music, history) |
| `src/components/OnThisDayView.tsx` | On This Day tab — date hero, calendar, sectioned card grid |
| `src/components/EntryGrid.tsx` | Category-specific card components (browse view) |
| `src/components/MusicSearch.tsx` | Genius API typeahead search for music forms |
| `src/components/ExportModal.tsx` | Multi-format export modal (JSON, XLSX, CSV, ZIP) |
| `src/components/Header.tsx` | Header with search, Add button, hamburger menu |
| `prisma/schema.prisma` | Database schema |
| `src/index.css` | Custom CSS: tooltips (`[data-tooltip]`), glass effect, animations |
| `scripts/import-*.ts` | CSV import scripts |
| `CLAUDE.md` | AI session guardrails |

### Immediate Next Steps
1. **Deploy to Coolify** — follow the "Coolify Setup (Step-by-Step)" section above. Production URL: `https://labor-database.supersoul.top`
2. **Import production data** — use Admin Dashboard → Import with JSON backup from local dev
3. **Timeline/Tags** — Phase 8: decade browser, shared tag system, auto cross-linking
4. **New content types** — Phase 9: plays, poetry (client to define fields)
5. **Week view** — browse a full week of On This Day content
6. **Share/print** — copy/share/print individual entries or daily digest
