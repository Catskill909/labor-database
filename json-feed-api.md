# Labor Arts & Culture Database — Public API Reference

**Base URL:** `https://labor-database.supersoul.top`
**Authentication:** All endpoints listed below are **public** — no authentication required.
**Rate Limits:** 100 requests/minute (general), 30/minute (search endpoints).
**Format:** All responses are JSON with `Content-Type: application/json`.

---

## Endpoints

### Core Data

#### `GET /api/entries`
Browse and search all published entries.

| Parameter  | Type   | Required | Description |
|-----------|--------|----------|-------------|
| category  | string | No       | Filter by category: `history`, `quote`, `music`, `film` |
| search    | string | No       | Full-text search across title, description, creator, tags, metadata |
| month     | number | No       | Month (1-12) |
| day       | number | No       | Day of month (1-31) |
| year      | number | No       | Year (e.g. 1886) |
| creator   | string | No       | Filter by creator/author/director (case-insensitive) |
| genre     | string | No       | Filter by genre from metadata (case-insensitive) |
| tag       | string | No       | Comma-separated tags with AND logic (e.g. `mining,women`) |
| limit     | number | No       | Max results returned |
| offset    | number | No       | Pagination offset (default 0) |

```bash
curl "https://labor-database.supersoul.top/api/entries?category=history&limit=10"
```

#### `GET /api/entries/:id`
Single entry by ID. Returns 404 if not found or not published.

```bash
curl "https://labor-database.supersoul.top/api/entries/42"
```

#### `GET /api/entries/counts`
Entry counts per category.

```bash
# Response: { "history": 1411, "quote": 1916, "music": 435, "film": 2192 }
curl "https://labor-database.supersoul.top/api/entries/counts"
```

#### `GET /api/entries/filter-options`
Available filter values for a category.

| Parameter | Type   | Required | Description |
|----------|--------|----------|-------------|
| category | string | Yes      | One of: `music`, `film`, `history` |

```bash
# Response: { "genres": ["Blues", "Folk", ...], "years": ["2020", ...] }
curl "https://labor-database.supersoul.top/api/entries/filter-options?category=film"
```

#### `GET /api/categories`
List all active content categories.

```bash
# Response: [{ "id": 1, "slug": "history", "label": "Labor History", ... }]
curl "https://labor-database.supersoul.top/api/categories"
```

#### `GET /api/tags`
All canonical tags with counts and groups.

| Parameter | Type   | Required | Description |
|----------|--------|----------|-------------|
| category | string | No       | Filter tags to a specific category |

```bash
# Response: { "tags": [{ "tag": "mining", "count": 42, "group": "Industry" }], ... }
curl "https://labor-database.supersoul.top/api/tags"
```

---

### On This Day

#### `GET /api/on-this-day`
Entries for a specific calendar date. History and quotes match by exact month/day. Films and music match by year.

| Parameter | Type   | Required | Description |
|----------|--------|----------|-------------|
| month    | number | Yes      | Month (1-12) |
| day      | number | Yes      | Day (1-31) |
| tag      | string | No       | Comma-separated tag filter |

```bash
curl "https://labor-database.supersoul.top/api/on-this-day?month=5&day=1"
```

Response structure:
```json
{
  "date": { "month": 5, "day": 1 },
  "sections": { "history": [...], "quote": [...] },
  "yearMatches": { "film": [...], "music": [...] },
  "matchedYears": [1886, 1945],
  "counts": { "history": 5, "quote": 3 }
}
```

#### `GET /api/on-this-day/calendar`
Which days in a month have entries (for calendar dot indicators).

| Parameter | Type   | Required | Description |
|----------|--------|----------|-------------|
| month    | number | Yes      | Month (1-12) |

```bash
# Response: { "month": 5, "daysWithEntries": [1, 5, 15], "entryCounts": { "1": 3 } }
curl "https://labor-database.supersoul.top/api/on-this-day/calendar?month=5"
```

---

### JSON Feed

#### `GET /api/feed.json`
[JSON Feed 1.1](https://jsonfeed.org/version/1.1) spec-compliant feed. Compatible with RSS readers that support JSON Feed (NetNewsWire, Feedbin, Inoreader, etc.).

| Parameter | Type   | Required | Description |
|----------|--------|----------|-------------|
| category | string | No       | Filter by category |
| limit    | number | No       | Max items (default 50, max 200) |

```bash
curl "https://labor-database.supersoul.top/api/feed.json?category=music&limit=20"
```

**Feed URLs by category:**
- All: `https://labor-database.supersoul.top/api/feed.json`
- History: `https://labor-database.supersoul.top/api/feed.json?category=history`
- Quotes: `https://labor-database.supersoul.top/api/feed.json?category=quote`
- Music: `https://labor-database.supersoul.top/api/feed.json?category=music`
- Films: `https://labor-database.supersoul.top/api/feed.json?category=film`

**Custom extension:** Each feed item includes a `_labor_database` object with category-specific fields:
```json
{
  "_labor_database": {
    "category": "history",
    "creator": "Author Name",
    "month": 5, "day": 1, "year": 1886,
    "metadata": { },
    "source_url": "https://..."
  }
}
```

---

### Utility

#### `GET /api/health`
Database connectivity check. Returns 200 or 503.

```bash
curl "https://labor-database.supersoul.top/api/health"
```

---

## Data Model

### Entry Fields
| Field       | Type          | Description |
|------------|---------------|-------------|
| id         | number        | Unique identifier |
| category   | string        | `history`, `quote`, `music`, `film` |
| title      | string        | Entry title |
| description| string        | Main content/description |
| month      | number\|null  | Month (1-12) |
| day        | number\|null  | Day (1-31) |
| year       | number\|null  | Year |
| creator    | string\|null  | Author, performer, director, etc. |
| tags       | string\|null  | Comma-separated tags |
| sourceUrl  | string\|null  | External link |
| metadata   | string\|null  | JSON string with category-specific fields |
| isPublished| boolean       | Always true in public API |
| images     | array         | Uploaded images with `url` and `thumbnailUrl` |
| createdAt  | string        | ISO 8601 timestamp |
| updatedAt  | string        | ISO 8601 timestamp |

### Category-Specific Metadata
- **Quote:** `{ "source": "Book or speech title" }`
- **Music:** `{ "performer", "writer", "genre", "runTime", "lyrics", "locationUrl" }`
- **Film:** `{ "director", "writers", "cast", "duration", "country", "genre", "comment", "youtubeId", "tmdbPosterPath" }`
- **History:** (no special metadata)

---

## Error Handling
Errors return JSON with an `error` field:
```json
{ "error": "Entry not found" }
```

Common status codes:
- `200` — Success
- `404` — Not found
- `429` — Rate limit exceeded
- `500` — Server error

---

## Code Examples

### JavaScript (fetch)
```javascript
const res = await fetch("https://labor-database.supersoul.top/api/entries?category=history&limit=10");
const entries = await res.json();
entries.forEach(e => console.log(`[${e.year}] ${e.title}`));
```

### Python (requests)
```python
import requests

res = requests.get("https://labor-database.supersoul.top/api/entries", params={
    "category": "history",
    "limit": 10
})
for entry in res.json():
    print(f"[{entry.get('year', '?')}] {entry['title']}")
```

### Subscribe to JSON Feed
Add this URL to any JSON Feed-compatible reader:
```
https://labor-database.supersoul.top/api/feed.json
```
