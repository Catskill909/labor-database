# Labor Arts & Culture Database — Project Planning

**Client:** Chris Garlock & Harold Phillips / Labor Heritage Foundation
**Date:** February 23, 2026
**Status:** CSVs received for History, Quotes, Music. Films WordPress export pending. Client confirmed: wants extensible platform for future categories (plays, poetry, etc.). Images confirmed needed (at minimum for films — movie posters). Architecture explained to client and approved.

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

### Pending
4. **Labor Films** — WordPress site at https://laborfilms.com (export pending from client)
   - RSS feed audited: https://laborfilms.com/feed/
   - WordPress content, not a structured DB — fields vary per entry
   - Data will need parsing/cleanup during import

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
  1. `/app/data` — SQLite database
  2. `/app/uploads` — uploaded images (movie posters, etc.)
- Same `CODE vs DATA` separation — git push updates code, admin import syncs data
- Same backup/restore workflow
- Subdomain via A record on Paul's domain, pointed to Coolify

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
- **Backup/restore** — JSON export/import, same as landmarks

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

### Phase 1: Foundation — Data Import & Core Platform
- [ ] New repo + project scaffolding (clone landmarks pattern)
- [ ] Prisma schema with unified Entry model + EntryImage model + Category registry
- [ ] CSV import scripts for History, Quotes, Music
- [ ] WordPress import script for Films (parse RSS/export)
- [ ] Express API: CRUD endpoints for entries (generic, category-filtered)
- [ ] Image upload API (multer + sharp, same as landmarks)
- [ ] Admin panel with category tabs
- [ ] Admin auth (same pattern as landmarks)
- [ ] Basic search per category

### Phase 2: Unified Search & Public UI
- [ ] Public-facing landing page with category navigation
- [ ] **Unified search bar** — one query, results grouped by category
- [ ] Individual browse views per category with type-specific filters:
  - History: Month/Day/Year dropdowns
  - Quotes: Author, keyword
  - Music: Artist, genre, title
  - Films: Director, year, genre/tags
- [ ] Card-based grid layout with category-appropriate card designs
- [ ] **Submission wizard** — step 1: pick type, step 2: dynamic form, step 3: contact info
- [ ] Review queue in admin (same isPublished pattern as landmarks)

### Phase 3: "On This Day" — The Killer Feature
- [ ] **Landing page "On This Day" view** — today's date across all categories:
  - History entries matching today's month + day
  - Quotes, songs, films tied to today's date
- [ ] "On This Day" for any arbitrary date (date picker)
- [ ] Shareable URL per date (e.g., `/on-this-day/03-05` for March 5)

### Phase 4: Timeline, Tags & Cross-Linking
- [ ] **Timeline view** — browse by decade or year across all categories
- [ ] **Tag system** — shared tags across all categories for cross-filtering
- [ ] **Auto-linking** — surface connections across categories by date + keyword matching
- [ ] Visual timeline component

### Phase 5+: New Categories (Plays, Poetry, etc.)
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
