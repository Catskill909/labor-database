# AI Research Tool — Development Planning & Architecture Audit

> **Client-facing feature spec:** [ai-research-tool.md](ai-research-tool.md)  
> **This document:** Internal dev planning, architecture decisions, and phase breakdown

---

## Phase 1 Integration Status (March 12, 2026)

✅ **Phase 1 complete** — AI research tool fully integrated into production app

### Demo (March 7)

Original proof of concept at `/ai-demo` with `AiSandboxDemo.tsx` using sample entries. All demo limitations resolved in Phase 1 integration.

### Phase 1 Integration (March 12)

| Component | Status | Notes |
|-----------|--------|-------|
| `POST /api/admin/ai/enhance` endpoint | ✅ Done | Moved from `/api/ai/enhance`, added `adminAuth` + rate limit (20/min) |
| `AiSandbox.tsx` | ✅ Done | Full-screen 2-panel editor, launched from admin EditEntryModal |
| Gemini API integration | ✅ Done | `@google/generative-ai`, Gemini 2.0 Flash |
| Category-aware prompts | ✅ Done | History, quote, music, film |
| Settings (length/tone) | ✅ Done | Short vs Detailed, Factual vs Narrative — paired toggle buttons |
| Confidence indicators | ✅ Done | 🟢/🟡/🔴 per suggestion block |
| Structured research fields | ✅ Done | Quick Facts, Key People & Organizations, Additional Notes — shared `parseSections`/`rebuildMoreResearch` in `types.ts` |
| Category-aware AI routing | ✅ Done | Quotes: "Context & Background" → Additional Notes (quote text read-only). History/Quote: structured fields in left panel. Music/Film: single More Research textarea |
| Button labels match targets | ✅ Done | "Add to Quick Facts", "Add to Key People", "Add to Additional Notes" |
| "Added!" persistent feedback | ✅ Done | Comma-separated tracking, resets only on new scan |
| Unsaved changes guard | ✅ Done | Amber confirm modal on EditEntryModal close |
| 2-column admin edit (History) | ✅ Done | Left: core fields. Right: research & links |
| 2-column admin edit (Quote) | ✅ Done | Left: Author, Quote, Tags, Images. Right: research & links |
| Public display (EntryDetail) | ✅ Done | Wikipedia, Related Links, Quick Facts, Key People, Additional Notes — with section merging for dedup |
| Quote blockquote styling | ✅ Done | `text-lg`, red left border accent, author attribution inline |
| Research fields in SubmissionWizard | ✅ Done | Collapsible "Research & Links" section (Wikipedia, Related Links, More Research) for all categories |
| Source/Source URL removed from Quote | ✅ Done | Removed from admin edit, public submission, and AI sandbox |
| Source URL removed from History admin | ✅ Done | Removed from 2-column edit layout |
| Admin table "Researched" badge | ✅ Done | Gold Sparkles icon in action row, fixed-width (no column shift), tooltip "Researched" |
| Edit modal "Researched" indicator | ✅ Done | Button label: "Researched" (red) / "Research" (purple). No "AI" in user-facing labels |
| Column header alignment fix | ✅ Done | Fixed grid template, centered Category/Status headers, fixed-width Actions column (250px) |

### Files Added/Modified

```
src/components/AiSandbox.tsx              — NEW (2-panel AI editor, z-60 overlay)
src/components/ResearchFieldsSection.tsx  — NEW (collapsible research fields wrapper)
src/components/RelatedLinksEditor.tsx     — NEW (editable link pair list)
src/types.ts                              — Added parseSections(), rebuildMoreResearch(), RelatedLink interface
src/components/AdminDashboard.tsx         — 2-column edit for History/Quote, structured research fields, AI button, unsaved changes guard
src/components/EntryDetail.tsx            — ResearchDisplay component, parseResearchSections() with section merging, quote blockquote styling
src/components/SubmissionWizard.tsx       — Research fields for all categories, removed Source from Quote
src/App.tsx                               — Lazy-load AiSandbox
server/index.ts                           — POST /api/admin/ai/enhance (adminAuth + aiLimiter)
package.json                              — @google/generative-ai dependency
.env                                      — GOOGLE_AI_API_KEY
```

### Data Model

All research fields stored in existing `metadata` JSON column — **no Prisma migration required**.

| Field | Type | Purpose |
|-------|------|---------|
| `wikipediaUrl` | `string` | Verified Wikipedia article URL |
| `relatedLinks` | `{label, url}[]` | Array of labeled external links (max 10) |
| `moreResearch` | `string` | Serialized structured sections with explicit headers |

The `moreResearch` field uses a deterministic section format:
```
Quick Facts:
• bullet point 1
• bullet point 2

Key People & Organizations:
• Person/org 1
• Person/org 2

Additional Notes:
Prose text, context, background...
```

Shared utilities in `src/types.ts`:
- `parseSections(text)` → `{ quickFacts, keyPeople, additionalNotes }`
- `rebuildMoreResearch(facts, people, notes)` → serialized string with explicit headers

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

## Interface Audit (Updated March 12, 2026)

### SubmissionWizard.tsx (Public + Admin "Add to Database")

**Architecture:** 3-step wizard modal. Step 1 = pick category, Step 2 = category-specific form, Step 3 = contact info (skipped for admin).

**Current fields by category:**

| Category | Step 2 Fields |
|----------|---------------|
| **History** | Month/Day/Year grid, Description textarea, Tags, + Research & Links (collapsible) |
| **Quote** | Author, Quote textarea, Tags, + Research & Links (collapsible) |
| **Music** | MusicSearch (Genius lookup), Song Title, Performer, Songwriter, URL, Genre/RunTime/Year grid, Lyrics textarea, Tags, + Research & Links (collapsible) |
| **Film** | TmdbSearch (TMDB lookup), Title, Director, Writers, Cast, Runtime/Country/Year grid, Genre, Synopsis textarea, Trailer URL, Tags, Comments, Poster image (admin only), + Research & Links (collapsible) |

**Research & Links** uses `ResearchFieldsSection` component (collapsible, collapsed by default for public):
- Wikipedia Link (text input, optional)
- Related Links (`RelatedLinksEditor` — add/remove label+URL pairs, optional)
- More Research (textarea, optional — flat format for public submissions)

**Removed:** Source field from Quote form (not displayed on site)

---

### EditEntryModal (inside AdminDashboard.tsx)

**Architecture:** Category-aware modal. 2-column layout for History and Quote (max-w-4xl), single column for Music and Film (max-w-lg). Parses `metadata` JSON on load, rebuilds on save. "Enhance with AI" button in header opens AiSandbox overlay (z-60). Unsaved changes guard with amber confirm modal (z-55).

**Current fields by category:**

| Category | Layout | Left Column | Right Column |
|----------|--------|-------------|--------------|
| **History** | 2-column | Title, Month/Day/Year, Description, Tags, Images | Wikipedia, Related Links, Quick Facts, Key People & Orgs, Additional Notes |
| **Quote** | 2-column | Author, Quote, Tags, Images | Wikipedia, Related Links, Quick Facts, Key People & Orgs, Additional Notes |
| **Music** | 1-column | MusicSearch, Title, Performer, Songwriter, URL, Genre/RunTime/Year, Lyrics, Tags, + Research & Links (collapsible), Images |  |
| **Film** | 1-column | Title, Director, Writers, Cast, Runtime/Country/Year, Genre, Synopsis, Comments, Trailer URL, Tags, + Research & Links (collapsible), Images |  |

**Structured research fields** (History/Quote right column): `parseSections()` parses `moreResearch` into `quickFacts`, `keyPeople`, `additionalNotes` on mount. `rebuildMoreResearch()` recombines on every change. Both imported from `types.ts`.

**AiSandbox onSave callback:** Updates all state including re-parsing moreResearch into structured fields for History/Quote.

**Removed:** Source/Source URL from History and Quote edit forms.

---

### EntryDetail.tsx (Public detail view)

**Architecture:** Modal with category-aware rendering. `FilmDetail` for films (2-column poster layout), generic `EntryDetail` for all others.

**Quote styling:** `text-lg` italic with red left border accent (`border-l-2 border-red-500/40`), author attribution inline. Visually distinct from research metadata below.

**Research display** (`ResearchDisplay` component, rendered after description/before tags):
- **Wikipedia** — BookOpen icon + clickable link (slate gray, emerald icon)
- **Related Links** — Link2 icon + labeled external links
- **Quick Facts** — Lightbulb icon (amber) + bullet list (`<ul>`)
- **Key People & Organizations** — Users icon (amber) + bullet list
- **Additional Notes** — FileText icon (purple) + prose text

**Section parsing:** `parseResearchSections()` splits `moreResearch` by header lines matching `/^[A-Z][^•\-*\n]{3,60}:$/`. Merges duplicate sections with same normalized title, deduplicates individual lines. Auto-titles untitled sections: bullet content → "Quick Facts", prose → "Additional Notes".

**Conditional rendering:** Sections only appear if they have content. Subtle divider line before research block. No empty placeholders on entries without research data.

---

## Phase 1: Core AI Editor ✅ COMPLETE

### 1.1 — Google Gemini API Integration ✅

**Package:** `@google/generative-ai` (official Google SDK)

**Backend endpoint:** `POST /api/admin/ai/enhance` (protected by `adminAuth` + `aiLimiter` at 20 req/min)

```
Request:
{
  entryId?: number,        // loads entry from DB if provided
  title?: string,          // OR pass raw fields
  description?: string,
  category?: string,
  settings: {
    outputLength: "short" | "detailed",
    tone: "factual" | "narrative"
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

### 1.2 — AiSandbox.tsx Component ✅

Full-screen overlay (z-60) with 2-panel layout. Red accent theme (distinct from purple "Enhance with AI" button in EditEntryModal).

**Header:** Entry title, category badge, Length/Tone toggle buttons, Scan/Regenerate button, close button.

**Left panel (Live Record):**
- Title (read-only)
- Description (editable) — **read-only for Quotes** (labeled "Quote (read-only)")
- Tags (removable pills with count)
- Research & Links section (Wikipedia input, RelatedLinksEditor)
- **History/Quote:** Structured fields — Quick Facts, Key People & Organizations, Additional Notes (3 separate textareas, synced with `moreResearch` via shared `parseSections`/`rebuildMoreResearch`)
- **Music/Film:** Single More Research textarea

**Right panel (AI Suggestions):**

| Card | Button Label (History/Quote) | Button Label (Music/Film) | Routes To |
|------|------------------------------|---------------------------|-----------|
| Expanded Description / Context & Background | Add to Additional Notes | Add to Description | `description` or `additionalNotes` |
| Quick Facts | Add to Quick Facts | Add to More Research | `quickFacts` or `moreResearch` |
| Wikipedia | Add to Wikipedia | Add to Wikipedia | `wikipediaUrl` |
| External Links | Add Links | Add Links | `relatedLinks` |
| Suggested Tags | staging → Add Tags | staging → Add Tags | `tags` (5 max) |
| Key People & Organizations | Add to Key People | Add to More Research | `keyPeople` or `moreResearch` |

**Key behaviors:**
- "Added!" feedback persists (comma-separated tracking, resets only on new scan)
- "Apply to Record" passes updates to EditEntryModal state → re-parses structured fields for History/Quote
- Discard confirm modal if changes exist
- All suggestion cards use neutral `bg-white/[0.03] border-white/10` styling

### 1.3 — Shared Utilities in types.ts ✅

```typescript
// Parse moreResearch into structured sections
parseSections(text: string): { quickFacts: string; keyPeople: string; additionalNotes: string }

// Rebuild moreResearch from structured sections — all sections get explicit headers
rebuildMoreResearch(facts: string, people: string, notes: string): string
```

---

## Phase 2: Public Display ✅ COMPLETE

### 2.1 — EntryDetail.tsx ✅

Public detail modal renders research data via `ResearchDisplay` component (see Interface Audit above for full details). All sections conditional — entries without research data are unaffected.

### 2.2 — Admin Dashboard Research Tracking ✅ PARTIAL

**Implemented:**
- Gold Sparkles badge in admin table action row for researched entries (fixed-width, no column shift)
- "Researched" / "Research" button indicator in edit modal header (red/purple color states)
- No "AI" language in any user-facing labels — keeps the human curation focus

**Next up:**
- "Needs Review" filter in admin table — filter pill alongside Published/Pending, shows only entries where `metadata.aiEnhanced` is not true
- Server: `reviewed` query param on `GET /api/admin/entries` (values: `yes`, `no`, or omitted for all)
- Stats cards with per-category progress (future, lower priority)

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
