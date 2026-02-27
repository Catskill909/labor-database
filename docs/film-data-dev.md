# Film Data Development Notes

## Source Data: WordPress XML Export

**File:** `docs/laborfilms.wordpress.com.2026-02-25.000.xml`
- Format: WordPress eXtended RSS (WXR) 1.2
- Source site: laborfilms.com (Chris Garlock / Labor Heritage Foundation)
- Export date: February 25, 2026
- File size: 6.8 MB / 123,845 lines

### Entry Counts
| Type | Count |
|------|-------|
| Published films | 2,247 |
| Pending/draft films | 5 |
| Image attachments | 243 |
| **Total items** | **2,490** |

### 11 Authors
- biglabornews (Chris Garlock, cgarlock@laborheritage.org) — primary
- lookbacklabor, andrew765, info4db353274e3, iwwggrandson, juliakann, jckozlowski, londonlabourfilmfest, siddawson, others

---

## Data Structure

### Key Finding: NO Custom Fields
All metadata is **embedded as formatted HTML** in `content:encoded`. There are no WordPress custom fields for director, duration, country, etc. Everything must be parsed from the HTML.

### HTML Content Pattern
```html
<em>95m; US</em>                              ← duration; country
<a href="..."><img src="..." /></a>           ← poster image
<em>Director: Robert Townsend</em>            ← director
<em>Starring: André Braugher, Charles S. Dutton</em>  ← cast
Synopsis text here...                          ← description
[youtube http://www.youtube.com/watch?v=ID]   ← trailer (shortcode format)
```

### Variations Found
- Director line: `Director: Name` OR `Directed by Name` OR `Directors: Name & Name`
- Cast line: `Starring: Names` OR `Cast: Names`
- Duration: `95m; US` OR `90 min; US/UK` OR missing entirely
- YouTube: `[youtube URL]` shortcode OR `<iframe src="youtube.com/embed/ID">` in postmeta
- Some entries are film festival listings, not individual films (no director/duration)
- Some entries use Gutenberg block markup (`<!-- wp:image -->`)

### Title Format
Titles include year: `"Salt of the Earth (1954)"` — parse year from `/(\\d{4})\\s*$/`

### WordPress Categories (92 unique)
**Genre categories** (→ `metadata.genre`):
Documentary, Drama, Comedy, Musical, Animation, Short films, Experimental, Horror, Thriller, Romance, Sci-Fi, Action/Crime, TV

**Topic/tag categories** (→ `tags` field):
Women, Strikes/Strikebreaking/Lockouts, Blacks, Working Class, Immigrants/Immigration, Communism/Socialism, Labor History, Organizing, Industrial/Mine/Manufacturing, Transportation, Agriculture/Farm/Food, Education, Health Care, War, Environmental, etc.

**Special categories:**
- A: Highly Recommended Labor Films
- A: Labor Film Festivals / (Inactive)
- Available Online, Netflix Watch Instantly, Streaming Online
- Global Labor Film Festival 2013-2026

---

## Field Mapping: WordPress → Our Entry Model

| WordPress Source | Entry Field | Notes |
|-----------------|-------------|-------|
| `<title>` minus `(YYYY)` | `title` | Clean film name |
| Year regex from title | `year` | Integer, may be null |
| Director from `<em>` | `creator` | Primary creator |
| Synopsis text | `description` | HTML stripped |
| laborfilms.com permalink | `sourceUrl` | Original post URL |
| Genre + topic categories | `tags` | All comma-separated |
| Always "film" | `category` | — |
| `wp:status === "publish"` | `isPublished` | true |

**metadata JSON:**
```json
{
  "duration": "95m",
  "country": "US",
  "cast": "André Braugher, Charles S. Dutton",
  "genre": "Drama",
  "youtubeId": "I8f6g40OARc",
  "posterUrl": "http://laborfilms.com/wp-content/uploads/2011/10/saltoftheearth.jpg"
}
```

---

## Image Strategy

### Source Images
- ~243 unique images hosted at `laborfilms.com/wp-content/uploads/YYYY/MM/`
- Both `http://` and `https://` URLs found
- Some URLs have `?w=202` resize params — strip to get full-size
- WordPress CDN may have purged some old images (expect 404s)

### Local Storage
- Download to `uploads/entries/` (same directory as other entry images)
- Generate 400px-wide thumbnails with Sharp (existing pattern: `thumb_` prefix)
- Create `EntryImage` records linking to each film entry
- Naming: `{entryId}_{timestamp}_{safeName}` + `thumb_{filename}`

### Display
- **Card grid**: Show thumbnail (portrait poster, ~400px wide)
- **Detail modal**: Show full-size image
- **Fallback**: Film icon from lucide-react if no image available

---

## YouTube Embed Strategy

### URL Formats in Data
1. Shortcode: `[youtube http://www.youtube.com/watch?v=ID&w=420&h=315]`
2. oEmbed iframe: `<iframe src="https://www.youtube.com/embed/ID">`
3. Vimeo (rare): `http://www.vimeo.com/18617196`

### Extraction Regex
```
/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
```

### Display Package: `react-player`
- Supports YouTube + Vimeo
- `light={true}` mode: shows thumbnail poster, only loads iframe on click (performance)
- Responsive via `width="100%"` inside `aspect-video` wrapper
- 14M weekly downloads, well-maintained

---

## Import Scripts

### `scripts/import-films.ts`
1. Parse XML with `fast-xml-parser`
2. Filter to published posts only
3. Parse each `content:encoded` with `cheerio`
4. Extract: title, year, director, cast, duration, country, poster URL, YouTube ID, synopsis
5. Classify WordPress categories into genre vs topic tags
6. Dedup by (title, category='film')
7. Create Entry records with metadata JSON

### `scripts/download-film-images.ts`
1. Query film entries with posterUrl in metadata
2. Download images (5 concurrent, handle 404s)
3. Process with Sharp: original + 400px thumbnail
4. Create EntryImage records
5. Idempotent — skip entries already having images

---

## New Dependencies
| Package | Purpose | Size |
|---------|---------|------|
| `fast-xml-parser` | Parse WordPress XML | ~45KB |
| `cheerio` | Extract metadata from HTML content | ~350KB |
| `react-player` | YouTube/Vimeo embed in film modal | ~150KB (lazy) |
| `react-dropzone` | Drag-and-drop image upload UI | ~25KB |

---

## Edge Cases & Data Quality
- **Film festivals**: Some entries are festival listings, not individual films — no director/duration. Still import as valid film entries.
- **Missing year**: A few titles don't have `(YYYY)` — year will be null
- **Missing director**: Some entries (especially festivals) have no `Director:` line
- **Multiple directors**: `Directors: Name & Name` — store as-is in creator
- **Broken image URLs**: Some WordPress images may 404 — download script handles gracefully
- **Non-YouTube videos**: Some entries reference Vimeo — react-player handles both
- **Duplicate categories**: Some films have both "Documentary" and "Drama" — store all in genre
- **Contact info in content**: Some entries end with email/phone — will end up in description (acceptable)
- **HTML remnants**: Gutenberg block comments may survive — strip `<!-- wp:... -->` during parsing

---

## Upload Component Design (ImageDropzone)

Material design drag-and-drop:
```
+--------------------------------------------+
|                                            |
|  +--------------------------------------+  |
|  |                                      |  |
|  |    [Cloud Upload Icon]               |  |
|  |    Drag & drop images here           |  |
|  |    or click to browse                |  |
|  |                                      |  |
|  |    JPEG, PNG, WebP • Max 10MB        |  |
|  |                                      |  |
|  +--------------------------------------+  |
|  (dashed border, blue highlight on drag)   |
|                                            |
|  [thumb1] [thumb2] [thumb3]    ← previews |
|    [×]      [×]      [×]      ← remove   |
|                                            |
+--------------------------------------------+
```

Used in: SubmissionWizard (film form) + AdminDashboard (edit entry)

---

## Size Limits
| Setting | Current | New | Why |
|---------|---------|-----|-----|
| Upload file size | 5MB | 10MB | Film poster images can be large |
| Thumbnail width | 400px | 400px | No change — works for portrait posters |
| Thumbnail quality | 80% JPEG | 80% JPEG | No change |
| Max files per upload | 10 | 10 | No change |

---

## Phase 3b: TMDB Auto-Populate & Form Consistency

### Problem Statement
1. **Form mismatch**: The public "Add Labor Films" form (SubmissionWizard) has film-specific fields (Director, Cast, Runtime, Country, Genre, Synopsis, Trailer URL, Poster Image) but the admin "Edit Entry" modal is generic (Title, Description, Creator, Month/Day/Year, Tags, Source URL). Editing a film in admin loses all film-specific data.
2. **Manual data entry is tedious**: Users must manually type all film metadata — director, cast, runtime, country, genre, synopsis. Most of this data already exists in public film databases.
3. **Tags field missing from public form**: The SubmissionWizard film form has no way to add tags (topic categories like "Women", "Strikes", "Working Class").

### Solution: TMDB API Integration + Form Alignment

Use **The Movie Database (TMDB)** API to auto-populate film data from a title search. User types a film name → sees search results with poster thumbnails → picks one → all fields fill in automatically. User can then edit/override any field before submitting.

---

### TMDB API Overview

**Base URL**: `https://api.themoviedb.org/3`
**Auth**: API key (free registration at themoviedb.org) — passed as Bearer token or `api_key` query param
**Rate limits**: ~50 req/s per IP, no daily cap
**License**: Free for non-commercial use with attribution

#### Endpoints We Need

| Endpoint | Purpose | Key Fields |
|----------|---------|------------|
| `GET /search/movie?query=...` | Search by title | `id`, `title`, `release_date`, `overview`, `poster_path`, `genre_ids` |
| `GET /movie/{id}?append_to_response=credits,videos` | Full details + cast/crew + trailers in ONE call | `runtime`, `genres[]`, `production_countries[]`, `credits.cast[]`, `credits.crew[]`, `videos.results[]` |
| `https://image.tmdb.org/t/p/w500/{poster_path}` | Poster image CDN | Direct URL, multiple sizes (w92, w154, w185, w342, w500, w780, original) |

#### TMDB → Our Fields Mapping

| TMDB Field | Our Field | Type | Notes |
|-----------|-----------|------|-------|
| `title` | `title` | Single | — |
| `release_date` (YYYY-MM-DD) | `year` | Single | Parse year only |
| `overview` | `description` | Single | Synopsis text |
| `credits.crew` where `job === "Director"` | `creator` | Multi (comma) | May have multiple directors |
| `credits.crew` where `job === "Screenplay"` or `"Writer"` | `metadata.writers` | Multi (comma) | New field |
| `credits.cast` (top 8-10) | `metadata.cast` | Multi (comma) | Names comma-separated |
| `runtime` (minutes) | `metadata.duration` | Single | Store as `"95m"` format |
| `production_countries[].iso_3166_1` | `metadata.country` | Multi (comma) | e.g. "US, UK" |
| `genres[].name` | `metadata.genre` | Multi (comma) | e.g. "Documentary, Drama" |
| `videos.results` where `type === "Trailer"` + `site === "YouTube"` | `metadata.youtubeId` | Single | First YouTube trailer |
| `poster_path` | Poster image | Single | Download from TMDB CDN |
| (user-supplied) | `tags` | Multi (comma) | Labor topic tags — NOT from TMDB |
| (user-supplied) | `sourceUrl` | Single | Trailer URL or external link |

---

### Field Audit: Multi-Value vs Single-Value

Fields that accept **multiple comma-separated items**:

| Field | Example | Where Stored |
|-------|---------|-------------|
| **Cast** | `"André Braugher, Charles S. Dutton, Mario Van Peebles"` | `metadata.cast` |
| **Directors** | `"Joel Coen, Ethan Coen"` | `creator` |
| **Writers** | `"Dalton Trumbo, Michael Wilson"` | `metadata.writers` |
| **Genre** | `"Documentary, Drama"` | `metadata.genre` |
| **Country** | `"US, UK, Canada"` | `metadata.country` |
| **Tags** | `"Women, Strikes, Working Class, Immigrants"` | `tags` |

Fields that are **single values**:

| Field | Example | Where Stored |
|-------|---------|-------------|
| **Title** | `"Salt of the Earth"` | `title` |
| **Year** | `1954` | `year` |
| **Runtime** | `"95m"` | `metadata.duration` |
| **Synopsis** | (text block) | `description` |
| **YouTube ID** | `"dQw4w9WgXcQ"` | `metadata.youtubeId` |
| **Trailer URL** | `"https://youtube.com/watch?v=..."` | `sourceUrl` |
| **Poster** | (uploaded image) | `EntryImage` record |

---

### Architecture

#### Server-Side Proxy (keeps TMDB API key secret)

Two new endpoints in `server/index.ts`:

```
GET /api/tmdb/search?query=salt+of+the+earth
→ Returns: [{ tmdbId, title, year, overview, posterUrl }]

GET /api/tmdb/movie/:tmdbId
→ Returns: { title, year, overview, runtime, country, genres,
             directors, writers, cast, youtubeTrailerId, posterUrl }
```

The server fetches from TMDB, transforms the response to our field names, and returns a clean object. The frontend never sees the TMDB API key.

**Environment variable**: `TMDB_API_KEY` — set in `.env` locally, in Coolify env vars for production.

#### Frontend: TmdbSearch Component

Reusable typeahead component used in both SubmissionWizard and admin EditEntryModal:

```
+------------------------------------------------+
| 🔍 Search TMDB: [salt of the earth        ] ↻  |
| ┌────────────────────────────────────────────┐ |
| │ [poster] Salt of the Earth (1954)          │ |
| │          Drama · 94m · US/Mexico           │ |
| │ [poster] Salt of the Earth (2014)          │ |
| │          Documentary · 110m · US           │ |
| │ [poster] Salt (2010)                       │ |
| │          Action · 100m · US                │ |
| └────────────────────────────────────────────┘ |
+------------------------------------------------+
```

**Behavior**:
1. User types film name (debounced 400ms) → `GET /api/tmdb/search?query=...`
2. Dropdown shows results with poster thumbnail, title, year, genre, runtime
3. User clicks a result → `GET /api/tmdb/movie/:tmdbId` → all form fields populate
4. User can edit/override any field before submitting
5. Poster image from TMDB CDN can optionally be downloaded and attached

#### Poster Image Flow

When user selects a TMDB result:
- Display TMDB poster as preview in the form (via CDN URL)
- On submit, server downloads the poster from TMDB CDN, processes with Sharp (original + thumbnail), creates `EntryImage` record
- This avoids hotlinking TMDB images in production (per their terms)
- Alternative: user can still drag-and-drop their own poster image to override

---

### Form Alignment Plan

Both the **public SubmissionWizard** and **admin EditEntryModal** need identical film fields:

| Field | Input Type | Placeholder | Multi-value? |
|-------|-----------|-------------|-------------|
| TMDB Search | Typeahead | "Search film database..." | — |
| Title | Text | "Film Title" | No |
| Director(s) | Text | "Director(s)" | Comma-separated |
| Writer(s) | Text | "Writer(s)" | Comma-separated |
| Cast | Text | "Cast / Starring" | Comma-separated |
| Runtime | Text | "Runtime (e.g. 95m)" | No |
| Country | Text | "Country" | Comma-separated |
| Year | Number | "Year" | No |
| Genre | Text | "Genre (e.g. Documentary, Drama)" | Comma-separated |
| Synopsis | Textarea | "Synopsis" | No |
| Trailer URL | Text | "Trailer URL (YouTube, Vimeo)" | No |
| Tags | Text | "Tags (e.g. Women, Strikes, Working Class)" | Comma-separated |
| Poster Image | ImageDropzone | Drag & drop | No |

**Admin EditEntryModal changes**:
- Detect `category === 'film'` → show film-specific fields instead of generic form
- Parse existing `metadata` JSON to pre-fill film fields (cast, duration, country, genre, writers, youtubeId)
- Include TMDB search button to re-populate from TMDB
- Include tags field (currently missing from admin edit)
- Save: merge film fields back into `metadata` JSON before PUT

**SubmissionWizard changes**:
- Add TMDB search typeahead at top of film form
- Add Writers field (new)
- Add Tags field (currently missing)
- Rest of form stays the same

---

### Implementation Steps

#### Step 1: Environment & Server Endpoints
- Add `TMDB_API_KEY` to `.env` and `.env.example`
- Add `GET /api/tmdb/search` endpoint (proxy search, transform results)
- Add `GET /api/tmdb/movie/:id` endpoint (proxy details+credits+videos, transform)
- Add poster download helper (TMDB CDN → Sharp → EntryImage)

#### Step 2: TmdbSearch Component
- `src/components/TmdbSearch.tsx` — reusable typeahead
- Debounced input (400ms)
- Dropdown with poster thumbnails, title, year, genre badges
- `onSelect` callback returns full movie data object
- Loading spinner during search
- "No results" state

#### Step 3: Update SubmissionWizard Film Form
- Add TmdbSearch at top of film form step
- Add Writers field
- Add Tags field
- Wire `onSelect` to populate all form fields
- Show TMDB poster preview, allow override with ImageDropzone

#### Step 4: Update Admin EditEntryModal
- Add category-aware form (film fields when `category === 'film'`)
- Parse metadata JSON to pre-fill film-specific fields
- Add TmdbSearch for re-populating data
- Add Tags field
- Save: construct metadata JSON from individual fields

#### Step 5: Server-Side Poster Download
- When creating/updating a film entry with a TMDB poster URL in metadata
- Download poster, process with Sharp, create EntryImage
- Can be triggered from the entry creation endpoint or a separate endpoint

---

### TMDB Attribution Requirement

TMDB requires attribution when using their data. Add to footer or about section:
> "This product uses the TMDB API but is not endorsed or certified by TMDB."
> Plus the TMDB logo (available at https://www.themoviedb.org/about/logos-attribution)

---

### New Dependencies

None — uses native `fetch()` on the server for TMDB API calls. No new npm packages needed.

---

### Current Film Metadata Shape (from WordPress import)

Actual metadata JSON stored in the database today:
```json
{
  "duration": "95m",
  "country": "US",
  "cast": "André Braugher, Charles S. Dutton & Mario Van Peebles",
  "genre": "Drama",
  "posterUrl": "http://laborfilms.com/wp-content/uploads/...",
  "youtubeId": "abc123",
  "descriptionHtml": "<p>Full HTML synopsis...</p>"
}
```

After TMDB integration, new entries will also include:
```json
{
  "duration": "95m",
  "country": "US",
  "cast": "André Braugher, Charles S. Dutton, Mario Van Peebles",
  "writers": "Dalton Trumbo, Michael Wilson",
  "genre": "Drama",
  "youtubeId": "abc123",
  "tmdbId": 12345,
  "tmdbPosterPath": "/he609rnU3tiwBjRklKNa4n2jQSd.jpg",
  "descriptionHtml": "<p>Synopsis...</p>"
}
```

Backward-compatible — existing entries without `writers` or `tmdbId` still work fine.

---

## Phase 3b Results: TMDB Batch Enrichment (Feb 26, 2026)

### Enrichment Script: `scripts/enrich-films-tmdb.ts`

Ran against all 2,192 film entries. For each film:
1. Search TMDB by title (+ year if available)
2. Fuzzy title matching with year bonus scoring
3. Fetch full details (credits + videos in one API call)
4. Update entry: creator (director), year, description (TMDB overview), metadata
5. Preserve original description as `metadata.comment` (curator notes)
6. Download poster + generate 400px thumbnail via Sharp

### Results

| Metric | Count |
|--------|-------|
| Total processed | 2,192 |
| Exact matches (score >= 0.9) | 1,198 (55%) |
| Fuzzy matches (0.5-0.9) | 89 (4%) |
| No match | 900 (41%) |
| Errors | 0 |
| Posters downloaded | 1,093 |

### Post-Enrichment Database Stats

| Metric | Before | After |
|--------|--------|-------|
| Films with poster images | 160 | **1,255** |
| Films with director | 1,230 | **1,695** |
| Films with YouTube trailer | 336 | **678** |
| Films with curator notes | 0 | **1,298** |
| Films with TMDB ID | 0 | **1,292** |
| Poster image storage | 21 MB | **153 MB** |

### No-Match Analysis

The 900 unmatched entries are predominantly:
- **Film festivals & organizations** (DC Labor FilmFest, Women Make Movies, Rochester Labor Film Series, etc.)
- **Obscure documentaries** not in TMDB's database
- **Titles with foreign language** in brackets (e.g., "The Axe (Le Couperet) [2005]")
- **Non-film entries** (YouTube clips, PBS series segments, "Highly Recommended INDEX")
- **Placeholder entries** (e.g., "Film title needed here", "Got Labor Film? Suggest it here!")

These entries retain their original WordPress-imported data unchanged.

### CLI Flags

```bash
npm run enrich:films              # Full run (~10 min)
npm run enrich:films -- --dry-run # Preview only
npm run enrich:films -- --limit 50 # Test subset
npm run enrich:films -- --no-posters # Skip poster downloads
```

Idempotent — skips entries with existing `metadata.tmdbId`.

### Enriched Metadata Shape

```json
{
  "tmdbId": "23620",
  "cast": "Rosaura Revueltas, Juan Chacón, Henrietta Williams, ...",
  "writers": "Michael Biberman, Michael Wilson",
  "duration": "94m",
  "country": "US",
  "genre": "Drama",
  "youtubeId": "dQw4w9WgXcQ",
  "posterUrl": "https://image.tmdb.org/t/p/w500/poster.jpg",
  "comment": "Original WordPress description preserved here...",
  "descriptionHtml": "<p>Original HTML content...</p>"
}
```

### TMDB Attribution

Per TMDB terms, the footer includes:
> "This product uses the TMDB API but is not endorsed or certified by TMDB."
