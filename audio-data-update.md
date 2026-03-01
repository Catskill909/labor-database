# Music Data Enrichment — Planning Document

## Goal
Add external API integration for the Labor Music category, similar to how TMDB works for films. Allow users/admins to search for a song and auto-fill: songwriter, lyrics, and a YouTube video URL.

---

## Current State (435 music entries)
- **Metadata keys**: `performer`, `writer`, `genre`, `runTime`, `lyrics`, `locationUrl`
- **sourceUrl**: YouTube/Spotify links (embedded player if YouTube)
- **Pain point**: All fields are manually entered — no auto-fill from external sources

---

## Chosen Approach: Genius + YouTube (2 APIs)

After evaluating LRCLIB, Lyrics.ovh, ytmusicapi, MusicBrainz, and others, we settled on:

| API | npm Package | Auth | What It Gets |
|---|---|---|---|
| **Genius** | `genius-lyrics-api` | Free API key | Lyrics, songwriter, artist, year, album art |
| **YouTube** | `ytsr` | None | YouTube video URL (pre-filled, admin can change) |

### Why This Combo
- **Genius** is the richest source for lyrics + songwriter credits — the core value for labor music history
- **YouTube search** is targeted using the artist+title from the Genius result the user selected, avoiding the "wrong version" problem
- Both are Node.js native — no Python dependency, no Docker changes
- Manual entry remains available for songs not in Genius catalog

### Why Not the Others
- **LRCLIB / Lyrics.ovh**: Smaller catalogs, unlikely to have labor/folk songs. Available as future fallback if needed
- **ytmusicapi**: Rich data but Python-only — adds deployment complexity for marginal benefit
- **MusicBrainz**: No lyrics, no video URLs
- **Musixmatch**: Free tier too limited for lyrics access

---

## How It Works

### User Flow (Same Pattern as TMDB for Films)

```
1. Admin/user selects "Music" category in submission form

2. Search bar appears: "Search song database (Genius)..."
   ┌──────────────────────────────────────────────────┐
   │ 🔍 solidarity forever                           │
   ├──────────────────────────────────────────────────┤
   │ Solidarity Forever — Pete Seeger (1915)          │  ← user picks
   │ Solidarity Forever — Utah Phillips               │    a specific
   │ Solidarity Forever — Billy Bragg (1990)           │    version
   └──────────────────────────────────────────────────┘

3. User selects a result →
   Backend fetches from Genius: lyrics, songwriter, year
   Backend searches YouTube for "Solidarity Forever Pete Seeger" → gets URL

4. Form auto-fills:
   - Song Title: "Solidarity Forever"
   - Performer: "Pete Seeger"
   - Songwriter: "Ralph Chaplin"
   - Year: 1915
   - Lyrics: [full lyrics text]
   - YouTube URL: https://youtube.com/watch?v=... (pre-filled, editable)

5. Admin reviews, tweaks if needed, submits
```

### Key Design Decision: YouTube URL is a Suggestion
The YouTube URL is **pre-filled but editable**. The admin picks which *version* of a song they want when they select from Genius results (step 2), and the YouTube search is targeted to that artist+title. But the admin can always paste a different URL.

---

## Architecture

```
Frontend (MusicSearch.tsx)
    │
    ▼
Backend (server/index.ts - new endpoints)
    │
    ├── GET /api/music/search?query=solidarity+forever
    │   └── Genius API search
    │   └── Returns: [{title, artist, geniusId, thumbnailUrl, year}]
    │
    └── GET /api/music/details/:geniusId
        ├── Genius: lyrics, songwriter, artist, year, album art URL
        └── ytsr: YouTube video URL (searched by artist + title)
        └── Returns: MusicDetails object → auto-fills form
```

### Data Mapping: API → Our Fields

| Our Field | Source | Notes |
|---|---|---|
| `title` | Genius `song.title` | |
| `performer` / `creator` | Genius `song.artist.name` | From the version user selected |
| `writer` | Genius `song.writer_artists` | Original songwriter (the labor history value) |
| `genre` | Manual entry | Genius genre data is inconsistent — keep manual |
| `lyrics` | Genius (scraped) | Full lyrics text |
| `sourceUrl` | ytsr search | YouTube URL, pre-filled but editable |
| `year` | Genius `song.release_date` | Year of selected version |

### TypeScript Interfaces

```typescript
// Search results (displayed in dropdown)
interface MusicSearchResult {
  geniusId: number;
  title: string;
  artist: string;
  thumbnailUrl: string | null;
  year: number | null;
}

// Full details (returned after user selects a result)
interface MusicDetails {
  geniusId: number;
  title: string;
  artist: string;             // → performer + creator
  writers: string;             // → writer (songwriter)
  year: number | null;         // → year
  lyrics: string;              // → lyrics
  youtubeUrl: string | null;   // → sourceUrl (pre-filled, editable)
  albumArtUrl: string | null;  // → future: download as EntryImage
}
```

---

## Touch Points in Codebase

| File | Change |
|---|---|
| `server/index.ts` | Add `/api/music/search` and `/api/music/details/:geniusId` endpoints |
| `src/components/MusicSearch.tsx` | **New file** — search dropdown component (modeled on TmdbSearch.tsx) |
| `src/components/SubmissionWizard.tsx` | Add MusicSearch to music form (Step 2), auto-fill fields on select |
| `src/components/AdminDashboard.tsx` | Add MusicSearch to EditEntryModal for music entries |
| `package.json` | Add `genius-lyrics-api` + `ytsr` |
| `CLAUDE.md` | Document `GENIUS_API_KEY` env var |

### Environment Variables

| Variable | Required? | Where Set | Purpose |
|---|---|---|---|
| `GENIUS_API_KEY` | Yes | Coolify env vars | Genius API access (free at [genius.com/api-clients](https://genius.com/api-clients)) |

No YouTube API key needed — `ytsr` scrapes without auth.

---

## Implementation Phases

### Phase 1: Core Search + Auto-Fill
- [ ] Register Genius API key at genius.com/api-clients
- [ ] Add `genius-lyrics-api` + `ytsr` to package.json
- [ ] Create `/api/music/search` endpoint (Genius search)
- [ ] Create `/api/music/details/:geniusId` endpoint (Genius details + ytsr YouTube search)
- [ ] Build `MusicSearch.tsx` component (modeled on TmdbSearch.tsx)
- [ ] Integrate into SubmissionWizard.tsx music form (Step 2)
- [ ] Integrate into EditEntryModal (AdminDashboard.tsx)
- [ ] Add `GENIUS_API_KEY` to .env and Coolify
- [ ] Test with known labor songs (Solidarity Forever, Which Side Are You On, Joe Hill, etc.)

### Phase 2: Enrichment + Polish
- [ ] Album art download as EntryImage (like TMDB poster download)
- [ ] Admin bulk enrichment tool — scan entries missing lyrics/video, auto-search, preview, batch update
- [ ] Coverage testing against all 435 existing music entries

### Phase 3: Fallbacks (If Needed)
- [ ] LRCLIB as lyrics fallback for songs not on Genius
- [ ] YouTube Data API v3 as fallback if ytsr becomes unreliable

---

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Labor songs not in Genius catalog | High | Manual entry always available; test coverage before full rollout |
| Genius API rate limits | Low | Debounced search (400ms, like TMDB), low volume usage |
| ytsr breaks (scrapes YouTube) | Medium | YouTube URL field stays editable; swap to YouTube Data API v3 if needed |
| Genius lyrics scraping blocked | Medium | LRCLIB fallback (Phase 3); lyrics field stays manually editable |

---

## APIs Considered But Not Chosen

| API | Why Not |
|---|---|
| LRCLIB | Smaller catalog, unlikely to have labor/folk songs. Future fallback only. |
| Lyrics.ovh | Same coverage concern. Future fallback only. |
| ytmusicapi | Python-only — adds Docker/deployment complexity. Revisit only if Node approach fails. |
| MusicBrainz | No lyrics, no video URLs. |
| Musixmatch | Free tier too limited. |
| YouTube Data API v3 | Requires API key + quota. Using ytsr (no auth) first, API as fallback. |

---

## Next Steps
1. **Register Genius API key** at [genius.com/api-clients](https://genius.com/api-clients)
2. **Test coverage** — search Genius for 20-30 known labor songs to gauge hit rate
3. **Build Phase 1** — endpoints → component → form integration
