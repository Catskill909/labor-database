# AI Research Tool — Development Planning & Architecture Audit

> **Client-facing feature spec:** [ai-research-tool.md](ai-research-tool.md)  
> **This document:** Internal dev planning, architecture decisions, and phase breakdown

---

## Demo Status (March 7, 2026)

✅ **Proof of concept complete** — standalone demo at `/ai-demo`

### What's Built

| Component | Status | Notes |
|-----------|--------|-------|
| `POST /api/ai/enhance` endpoint | ✅ Done | Uses Gemini 2.0 Flash, category-aware prompts |
| `AiSandboxDemo.tsx` | ✅ Done | 2-panel editor with sample entries |
| `/ai-demo` route | ✅ Done | Accessible without auth for demo purposes |
| Gemini API integration | ✅ Done | `@google/generative-ai` package added |
| Category-aware prompts | ✅ Done | History, quote, music, film |
| Creator/author research | ✅ Done | AI researches Joe Hill, Florence Reece, etc. |
| Quick Facts (3-12) | ✅ Done | Scales with event significance |
| Canonical tags | ✅ Done | Uses `CANONICAL_TAGS` from `server/tags.ts` |
| Confidence indicators | ✅ Done | High/medium/low with color coding |
| Settings (length/tone) | ✅ Done | Short vs detailed, factual vs narrative |

### Demo Limitations (Deferred to Integration)

- Tag editing uses simple badges (not `TagSelector`)
- Links not editable after adding
- No database persistence
- Sample entries only (not real DB entries)

### Files Added/Modified

```
src/components/AiSandboxDemo.tsx  — NEW (standalone demo component)
src/App.tsx                       — Added /ai-demo route
server/index.ts                   — Added /api/ai/enhance endpoint + Gemini import
package.json                      — Added @google/generative-ai dependency
.env                              — Added GOOGLE_AI_API_KEY
ai-demo-setup.md                  — NEW (setup instructions)
```

---

## Architecture Audit

### Current Schema (What We Have)

```prisma
model Entry {
  id          Int      @id @default(autoincrement())
  category    String
  title       String
  description String
  month       Int?
  day         Int?
  year        Int?
  creator     String?
  metadata    String?  // JSON — category-specific fields
  tags        String?  // Comma-separated
  sourceUrl   String?
  isPublished Boolean  @default(false)
  // ... submission fields, images, timestamps
}
```

### New Fields Strategy

The `metadata` JSON field already holds category-specific data (film: director/cast/runtime, music: performer/lyrics/genre, etc.). We extend this pattern for AI research fields.

**New fields added to metadata JSON (all categories):**

| Field | Type | Purpose |
|-------|------|---------|
| `wikipediaUrl` | `string` | Verified Wikipedia article URL |
| `relatedLinks` | `{label: string, url: string}[]` | Array of labeled external links |
| `moreResearch` | `string` | Extended context, bullet points, historical notes |
| `aiEnhanced` | `boolean` | Flag: has this entry been through the AI tool? |
| `aiEnhancedAt` | `string` (ISO date) | Timestamp of last AI enhancement |

**No Prisma migration required.** These fields live inside the existing `metadata` JSON string. We only update the TypeScript interfaces that parse the metadata on the frontend and backend.

### Files That Need Changes

| File | Change |
|------|--------|
| `server/index.ts` | New endpoint: `POST /api/admin/ai/enhance`. Accepts entry ID, sends text to Gemini, returns structured suggestions |
| `server/index.ts` | Update `PUT /api/admin/entries/:id` to accept and save the new metadata fields |
| `src/components/AdminDashboard.tsx` | Add "Enhance with AI" button to entry actions row. Add new fields to `EditEntryModal` |
| `src/components/AiSandbox.tsx` | **[NEW]** The 2-panel editor component |
| `src/components/SubmissionWizard.tsx` | Add optional Wikipedia, Related Links, More Research fields to Step 2 for all categories |
| `src/components/EntryDetail.tsx` | Render Wikipedia link, Related Links, and More Research on public view |
| `.env` | Add `GOOGLE_AI_API_KEY` for Gemini API access |

---

## Existing Interface Audit

Audited March 5, 2026. These are the current form fields in each interface that will need the new research fields added.

### SubmissionWizard.tsx (Public + Admin "Add to Database")

**Architecture:** 3-step wizard modal. Step 1 = pick category, Step 2 = category-specific form, Step 3 = contact info (skipped for admin).

**Current fields by category:**

| Category | Step 2 Fields |
|----------|---------------|
| **History** | Month/Day/Year grid, Description textarea, Tags |
| **Quote** | Author, Source (book/speech/article), Quote textarea, Tags |
| **Music** | MusicSearch (Genius lookup), Song Title, Performer, Songwriter, URL, Genre/RunTime/Year grid, Lyrics textarea, Tags |
| **Film** | TmdbSearch (TMDB lookup), Title, Director, Writers, Cast, Runtime/Country/Year grid, Genre, Synopsis textarea, Trailer URL, Tags, Comments, Poster image (admin only) |

**Where new fields go:** Add below Tags for all categories:
- Wikipedia Link (text input, optional)
- Related Links (add/remove link pairs, optional)
- More Research (textarea, optional)

**State variables to add:**
```typescript
const [wikipediaUrl, setWikipediaUrl] = useState('');
const [relatedLinks, setRelatedLinks] = useState<{label: string, url: string}[]>([]);
const [moreResearch, setMoreResearch] = useState('');
```

**handleSubmit changes:** Include new fields in the metadata JSON object before sending to API.

---

### EditEntryModal (inside AdminDashboard.tsx, lines 654–988)

**Architecture:** Single modal with category-aware form. Parses existing `metadata` JSON on load, rebuilds it on save.

**Current fields by category:**

| Category | Fields |
|----------|--------|
| **Quote** | Author, Source, Quote textarea, Tags, Source URL |
| **Music** | MusicSearch, Song Title, Performer, Songwriter, URL, Genre/RunTime/Year grid, Lyrics textarea, Tags |
| **Film** | Title, Director, Writers, Cast, Runtime/Country/Year grid, Genre, Synopsis textarea, Comments, Trailer URL, Tags, Image management |
| **History** | Title, Month/Day/Year grid, Description textarea, Tags, Source URL |

**Where new fields go:** Add after the category-specific fields, before Image management:
- Wikipedia Link (text input, pre-filled from `meta.wikipediaUrl`)
- Related Links (editable list, pre-filled from `meta.relatedLinks`)
- More Research (textarea, pre-filled from `meta.moreResearch`)
- **"Enhance with AI" button** in the modal header → opens AiSandbox

**State variables to add:**
```typescript
const [wikipediaUrl, setWikipediaUrl] = useState(meta.wikipediaUrl || '');
const [relatedLinks, setRelatedLinks] = useState(meta.relatedLinks || []);
const [moreResearch, setMoreResearch] = useState(meta.moreResearch || '');
```

**handleSave changes:** For ALL categories, merge new fields into the metadata object before JSON.stringify.

---

### EntryDetail.tsx (Public detail view, lines 193–350)

**Architecture:** Modal with category-aware rendering. `FilmDetail` component for films (2-column poster layout), `EntryDetail` for all others.

**Where new sections go:** After the existing description/content area, before tags:
- **Wikipedia section** — Wikipedia icon + clickable link (conditional: only if `metadata.wikipediaUrl` exists)
- **Related Links section** — Labeled list of clickable external links (conditional: only if `metadata.relatedLinks` has items)
- **More Context section** — Expandable accordion with research text (conditional: only if `metadata.moreResearch` has content)

**parseMetadata update needed:** The `parseMetadata()` function in `src/types.ts` needs to extract the new fields from the JSON.

---

## Phase 1: Core AI Editor

### 1.1 — Google Gemini API Integration

**Package:** `@google/generative-ai` (official Google SDK)

**Backend endpoint:** `POST /api/admin/ai/enhance`

```
Request:
{
  entryId: number,
  settings: {
    outputLength: "short" | "detailed",
    tone: "factual" | "narrative",
    linkSources: "major" | "all"
  }
}

Response:
{
  expandedDescription: { text: string, confidence: "high" | "medium" | "low" },
  bulletPoints: { text: string, confidence: string }[],
  wikipediaUrl: { url: string, summary: string, confidence: string } | null,
  externalLinks: { label: string, url: string, confidence: string }[],
  suggestedTags: { tag: string, confidence: string }[],
  keyPeopleOrgs: { text: string, confidence: string }
}
```

**System prompt strategy:** Category-aware prompts that instruct Gemini to:
- Stay factual and historically accurate
- Only suggest Wikipedia links it can verify
- Use the existing 35 canonical tag names when suggesting tags
- Mark confidence levels based on source material strength

### 1.2 — AiSandbox.tsx Component

**New file:** `src/components/AiSandbox.tsx`

The core 2-panel interface:

```
┌─────────────────────────────────────────────────────────────────┐
│  Enhance with AI: "1912 Lawrence Textile Strike"                │
│                                                                 │
│  ┌── Scan Settings ──────────────────────────────────────────┐  │
│  │ Length: [Short ○ | ● Detailed]  Tone: [● Factual | ○ Nar] │  │
│  │ Sources: [● Major only | ○ Include smaller sites]          │  │
│  │                              [🔍 Scan with AI] [♻ Regen]  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌── LEFT: Live Record ──────┐  ┌── RIGHT: AI Suggestions ──┐  │
│  │                            │  │                            │  │
│  │ Title: [Lawrence Textile ] │  │ 🟢 Expanded Description    │  │
│  │                            │  │ ┌────────────────────────┐ │  │
│  │ Description:               │  │ │ The 1912 Lawrence...   │ │  │
│  │ ┌────────────────────────┐ │  │ │ [editable textarea]    │ │  │
│  │ │ Current short text...  │ │  │ └────────────────────────┘ │  │
│  │ └────────────────────────┘ │  │ [+ Add to Description]     │  │
│  │                            │  │ [📋 Copy]                  │  │
│  │ Wikipedia: [____________] │  │                            │  │
│  │                            │  │ 🟢 Wikipedia               │  │
│  │ Related Links:             │  │ en.wikipedia.org/wiki/...  │  │
│  │  (none yet)                │  │ "The strike began when..." │  │
│  │                            │  │ [+ Add to Wikipedia]       │  │
│  │ More Research:             │  │                            │  │
│  │ ┌────────────────────────┐ │  │ 🟡 Suggested Tags          │  │
│  │ │ (empty)                │ │  │ [Strikes] [Women] [Textile]│  │
│  │ └────────────────────────┘ │  │ [+ Add Tags]               │  │
│  │                            │  │                            │  │
│  │ Tags: [Mining] [1910s]     │  │ 🟡 Key People & Orgs       │  │
│  │                            │  │ ┌────────────────────────┐ │  │
│  │                            │  │ │ • Elizabeth Gurley Flynn│ │  │
│  │                            │  │ │ • IWW                  │ │  │
│  │                            │  │ │ [editable]             │ │  │
│  │                            │  │ └────────────────────────┘ │  │
│  │                            │  │ [+ Add to More Research]   │  │
│  │                            │  │ [📋 Copy]                  │  │
│  └────────────────────────────┘  └────────────────────────────┘  │
│                                                                 │
│  [Preview Card ▼]                    [Cancel]  [Save & Publish] │
└─────────────────────────────────────────────────────────────────┘
```

**Key behaviors:**
- Right panel blocks are **editable textareas** — curator can rewrite before clicking [+ Add]
- [+ Add] moves content to the corresponding left panel field with visual animation
- Left panel fields are always directly editable regardless of AI
- "Save & Publish" writes all left panel fields to the database in one API call
- "Cancel" discards all unsaved changes (confirmation dialog if changes exist)

### 1.3 — Metadata TypeScript Interface Update

```typescript
// Shared metadata fields (all categories)
interface BaseMetadata {
  wikipediaUrl?: string;
  relatedLinks?: { label: string; url: string }[];
  moreResearch?: string;
  aiEnhanced?: boolean;
  aiEnhancedAt?: string;
}

// Category-specific metadata extends BaseMetadata
interface FilmMetadata extends BaseMetadata {
  director?: string;
  writers?: string;
  cast?: string;
  runtime?: string;
  country?: string;
  trailerUrl?: string;
  // ... existing film fields
}

// Similar for MusicMetadata, QuoteMetadata, etc.
```

---

## Phase 2: Public Display

### 2.1 — EntryDetail.tsx Updates

Add three new sections to the public entry detail modal, rendered conditionally:

**Wikipedia section:**
- Wikipedia icon + clickable link
- Only renders if `metadata.wikipediaUrl` exists

**Related Links section:**
- Labeled list of external links with icons
- Only renders if `metadata.relatedLinks` has items

**More Research section:**
- Expandable "More Context" accordion
- Only renders if `metadata.moreResearch` has content

### 2.2 — Admin Dashboard Enhancement Tracking

Add to the admin stats cards:
- "AI Enhanced: X / Y entries" with progress bar per category
- Filter: show only un-enhanced entries (helps the team prioritize)

---

## Phase 3: Batch Processing

### 3.1 — Batch Selection UI

Add checkboxes to admin entry table rows. "Select All" header checkbox. Selection counter: "12 entries selected."

### 3.2 — Batch Processing Queue

New endpoint: `POST /api/admin/ai/batch-enhance`

- Accepts array of entry IDs + scan settings
- Processes entries sequentially with rate limiting (respect Gemini API limits)
- Stores results as draft suggestions per entry (not auto-applied)
- Returns progress via SSE (reuse the existing SSE pattern from ZIP import)

### 3.3 — Batch Review Queue

New admin view: list of entries with pending AI suggestions. Each row shows:
- Entry title and category
- "Review" button → opens AiSandbox with pre-populated right panel
- "Skip" button → marks as reviewed without changes
- "Apply All" button → accepts all AI suggestions for that entry (power user shortcut)

---

## Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `GOOGLE_AI_API_KEY` | **Yes** (for AI features) | Gemini API key from Google AI Studio |

Add to Coolify env vars alongside existing `TMDB_API_KEY` and `GENIUS_API_KEY`.

---

## Security Considerations

- `POST /api/admin/ai/enhance` protected by `adminAuth` middleware (same as all admin routes)
- Rate limit AI endpoint separately: suggest 20 requests/minute to prevent accidental API cost spikes
- API key stored server-side only — never sent to frontend
- AI responses are treated as untrusted user input — sanitize before rendering

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| AI hallucinations (fake Wikipedia links) | Confidence indicators + curator review before publishing |
| Gemini API downtime | Graceful error handling — "AI unavailable, try again later" message |
| Cost overrun from batch processing | Rate limiting + daily cost cap alert in server logs |
| Large metadata JSON bloat | `relatedLinks` capped at 10 items, `moreResearch` capped at 5,000 chars |

---

## Dependencies to Add

| Package | Purpose |
|---------|---------|
| `@google/generative-ai` | Official Google Gemini SDK |

Single new dependency. No other packages needed.
