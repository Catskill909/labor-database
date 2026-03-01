# Export & Data Portability — Brainstorming Doc

## Current State

### What We Have
- **JSON backup**: `GET /api/admin/backup` — downloads full database as `labor_database_backup_YYYY-MM-DD.json`
  - Includes all entries (with images metadata) + categories
  - Used for local → production migration (import via Admin Dashboard)
- **JSON import**: `POST /api/admin/import` — smart merge (upserts by title+category)
- **SQLite file**: `prisma/dev.db` — can be copied directly for full snapshot

### What's Missing
- No spreadsheet export (Chris & Harold may want to review/edit in Excel/Google Sheets)
- No human-readable documentation export (printable catalog)
- No per-category export (e.g., just music entries)
- No export that includes image files (just metadata references)
- No "agentic coding ready" structured format for AI-assisted workflows
- No versioned/diffable format for tracking changes over time

---

## Proposed Export Formats

### 1. Enhanced JSON (Current + Improvements)

**What**: Improve the existing JSON backup with flattened metadata and category filtering.

```
GET /api/admin/export?format=json
GET /api/admin/export?format=json&category=music
```

**Enhancements over current backup:**
- Option to flatten metadata JSON into top-level fields (e.g., `performer`, `songwriter` instead of nested `metadata.performer`)
- Per-category filtering
- Include export metadata header (date, entry count, schema version)
- Optionally strip submitter PII for public/sharing exports

**Example flattened music entry:**
```json
{
  "id": 42,
  "category": "music",
  "title": "Solidarity Forever",
  "creator": "Pete Seeger",
  "year": 1915,
  "performer": "Pete Seeger",
  "songwriter": "Ralph Chaplin",
  "genre": "Folk/Labor",
  "lyrics": "When the union's inspiration...",
  "sourceUrl": "https://youtube.com/watch?v=...",
  "tags": "union, classic, folk"
}
```

**Packages**: None needed (already have JSON export)

---

### 2. Spreadsheet Export (CSV / XLSX)

**What**: Export as Excel workbook or CSV files for non-technical review and editing.

**Use Cases:**
- Chris & Harold review entries in Excel/Google Sheets
- Bulk corrections (fix typos, add missing dates) then re-import
- Share with Labor Heritage Foundation board
- Print filtered lists

**Structure Options:**

**Option A: One sheet per category**
- Sheet "Music" — columns: Title, Performer, Songwriter, Year, Genre, Lyrics (truncated), YouTube URL, Tags
- Sheet "Films" — columns: Title, Director, Writers, Cast, Year, Runtime, Country, Genre, Synopsis, Tags
- Sheet "History" — columns: Title, Month, Day, Year, Description, Source URL, Tags
- Sheet "Quotes" — columns: Title (quote text), Author, Source, Month, Day, Tags

**Option B: Single sheet, all categories**
- Universal columns: ID, Category, Title, Creator, Year, Month, Day, Description, Tags, Source URL
- Category-specific columns appended: Performer, Songwriter, Director, Cast, etc.
- Lots of empty cells but simpler for filtering

**Recommendation:** Option A (one sheet per category) — cleaner, each sheet has relevant columns only.

**npm Packages:**
| Package | Stars | Size | Notes |
|---------|-------|------|-------|
| `exceljs` | 14k | 2.5MB | Full XLSX read/write, streaming, styling. Most popular. |
| `xlsx` (SheetJS) | 35k | 1.3MB | Very popular but Community Edition has limits. |
| `json2csv` | 2.8k | tiny | CSV only, simple transform |
| `csv-stringify` | 1.6k | tiny | CSV only, streaming |

**Recommendation:** `exceljs` — supports multi-sheet workbooks, column formatting, header styling. Worth the dependency for a proper export.

**Endpoint:**
```
GET /api/admin/export?format=xlsx
GET /api/admin/export?format=csv&category=music
```

---

### 3. Documentation / Catalog Export (Markdown or HTML)

**What**: A human-readable, printable document cataloging the entire collection with context.

**Use Cases:**
- "Here's what we have" document for the Labor Heritage Foundation
- Printable reference for events/exhibitions
- README-style documentation that travels with the data

**Structure:**
```markdown
# Labor Arts & Culture Database — Catalog
Generated: March 1, 2026 | 5,954 entries across 4 categories

## Summary
| Category | Entries | With Year | With Source URL |
|----------|---------|-----------|----------------|
| History  | 1,411   | 100%      | 45%            |
| Quotes   | 1,916   | 91%       | 12%            |
| Music    | 435     | 14%       | 82%            |
| Films    | 2,192   | 80%       | 65%            |

## Labor Music (435 entries)
### Solidarity Forever — Pete Seeger (1915)
Written by Ralph Chaplin | Folk/Labor
[YouTube](https://...)
> When the union's inspiration through the workers' blood shall run...

### Bread and Roses — R.J. Phillips Band
...
```

**Packages:**
- For Markdown: No package needed — template string generation
- For HTML/PDF: `markdown-it` (render MD → HTML) + `puppeteer` (HTML → PDF) — but heavy
- Simpler: Just generate Markdown, let users convert with any tool

---

### 4. "Agentic Coding Ready" Format

**What**: A structured export optimized for AI-assisted development workflows — when you want Claude or another AI to understand, query, or modify the data.

**Key Properties:**
- Self-describing schema (AI can understand the structure without documentation)
- Flat, denormalized (no joins needed)
- Includes field descriptions and value examples
- Small enough to fit in a context window (or chunked by category)
- Diffable (sorted, stable key order)

**Format:**
```json
{
  "_meta": {
    "name": "Labor Arts & Culture Database",
    "version": "1.0",
    "exported": "2026-03-01T12:00:00Z",
    "entryCount": 5954,
    "schema": {
      "id": "Auto-increment integer, primary key",
      "category": "One of: history, quote, music, film",
      "title": "Display title — event name, quote snippet, song title, or film title",
      "description": "Main content body (may contain HTML entities)",
      "month": "1-12 or null",
      "day": "1-31 or null",
      "year": "4-digit year or null",
      "creator": "Primary attribution — author, performer, director",
      "tags": "Comma-separated string",
      "sourceUrl": "External link (YouTube, Wikipedia, etc.)",
      "isPublished": "Boolean — true if approved for public display"
    },
    "categoryFields": {
      "music": {
        "performer": "Artist/band who performed the song",
        "writer": "Songwriter/composer",
        "genre": "Music genre",
        "runTime": "Duration string",
        "lyrics": "Full song lyrics text",
        "locationUrl": "Legacy field for source URL"
      },
      "film": {
        "cast": "Comma-separated actor names",
        "writers": "Screenwriters",
        "duration": "Runtime in minutes",
        "country": "Country of origin",
        "genre": "Film genre",
        "comment": "Editorial notes",
        "youtubeId": "YouTube video ID for trailer",
        "tmdbPosterPath": "TMDB poster image path"
      },
      "quote": {
        "source": "Publication or speech source"
      }
    }
  },
  "categories": [...],
  "entries": [...]
}
```

**Why this matters:**
- Drop this file into a Claude conversation → AI instantly understands the data model
- Ask "find all music entries missing lyrics" → AI can answer from the data
- Ask "generate import SQL for these 10 new entries" → AI knows the schema
- Round-trip: export → AI edits → re-import

---

## Local → Coolify Migration Strategy

### Current Plan
1. Develop locally with `prisma/dev.db`
2. Export via Admin Dashboard → `labor_database_backup_YYYY-MM-DD.json`
3. Deploy to Coolify (empty database, persistent volume at `/app/data`)
4. First boot: `prisma migrate deploy` creates tables, `seed.ts` adds categories
5. Import JSON backup via Admin Dashboard (`/admin` → Import)

### Concerns
- **Images**: Not included in JSON backup — need separate migration for uploaded images
  - Could tar `/uploads/entries/` and scp to server, or
  - Add image binary export (base64 in JSON — bloated but self-contained)
  - Or: re-download TMDB posters on production (they're fetched by URL anyway)
- **Large file size**: 5,954 entries with full lyrics/descriptions could be 10-50MB JSON
  - Current import parses entire body in memory (`req.body`)
  - May need streaming import for very large datasets
  - Or: chunked import by category
- **ID preservation**: Current import creates new IDs (auto-increment)
  - Image references use `entryId` — IDs must match after import
  - Consider: import with explicit IDs if database is empty

### Recommended Migration Flow
```
Local Dev                          Coolify Production
───────────                        ──────────────────
1. npm run build ✓
2. git push main ──────────────→  3. Coolify auto-deploys
                                   4. prisma migrate deploy
                                   5. seed.ts (categories)
6. Admin: Export JSON backup
7. Admin: Export images (zip) ──→  8. Upload images to /app/uploads
9. Open prod /admin ────────────→  10. Import JSON backup
                                   11. Verify entry count matches
```

---

## Implementation Priority

| Priority | Feature | Effort | Value |
|----------|---------|--------|-------|
| **P0** | Current JSON backup works for migration | Done | Critical |
| **P1** | Spreadsheet export (XLSX) | ~2 hours | High — Chris & Harold review |
| **P1** | Per-category JSON export | ~30 min | High — smaller, focused files |
| **P2** | Agentic format with schema header | ~1 hour | Medium — future AI workflows |
| **P2** | Image export/migration plan | ~2 hours | Medium — needed for deploy |
| **P3** | Markdown catalog | ~1 hour | Nice to have |
| **P3** | Flattened JSON (denormalized) | ~1 hour | Nice to have |

---

## Open Questions

1. **Who needs the spreadsheet?** If it's just Chris & Harold for review, CSV might be enough (opens in Excel/Sheets natively). Full XLSX is better if we want formatted headers, column widths, etc.

2. **Image migration**: Should we include base64 images in the JSON export (self-contained but huge), or handle images separately? TMDB posters can be re-fetched, but user-uploaded images need to be migrated.

3. **Export UI**: Add export buttons to Admin Dashboard? Or keep it as API-only endpoints for now?

4. **Agentic format**: Is this for us (development workflow) or for end users? If just for dev, we could also just point Claude at the SQLite file directly.

5. **Incremental exports**: Do we need "export only entries changed since X date"? Useful for ongoing sync but adds complexity.
