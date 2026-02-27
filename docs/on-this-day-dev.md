# Phase 4: "On This Day" — Development Planning

**Status:** Phase 4 COMPLETE — implemented as first tab in main view
**Target Users:** Labor Radio Podcast hosts, radio show producers, content researchers
**Use Case:** Daily show prep — open the page, see what happened today in labor history, grab quotes, find related songs and films for the broadcast

---

## The Vision

A **broadcast-ready reference view** — clean, scannable, beautiful typography designed for someone who's about to go on-air and needs to quickly read or reference labor history content. Think of it as a "daily briefing" for labor podcasters.

> "Search 'Lawrence' and get the 1912 strike, related songs, relevant quotes, and related films all in one place."
> — Project brief

The "On This Day" feature is the **killer feature** of this platform. It's the reason the client builds these databases — to have instant access to "what happened today" for daily show prep.

---

## Data Availability (Current)

| Category | Has Month/Day | Has Year | Total | Notes |
|----------|--------------|----------|-------|-------|
| History  | 1,411 (100%) | 1,411 (100%) | 1,411 | Best source — every entry has full date |
| Quotes   | 1,744 (91%)  | 1,747 (91%)  | 1,916 | Strong coverage |
| Music    | 0 (0%)       | 62 (14%)     | 435   | No month/day — can only match by year |
| Films    | 0 (0%)       | 1,753 (80%)  | 2,192 | No month/day — release year only |

**Key insight:** History and Quotes are the primary "On This Day" content. Films and Music can appear in a "This Year in Labor" or "Related by Year" section but won't match specific dates.

---

## UI/UX Design Concepts

### Design Principles
1. **Broadcast-ready** — Large, readable typography. No clutter. A host should be able to glance at the screen and read aloud.
2. **Scannable sections** — Clear visual separation between categories. Quick eye navigation.
3. **Date-forward** — The date is the hero. Big, bold, unmistakable.
4. **Responsive** — Works on desktop (studio monitor) and tablet/phone (mobile show prep).
5. **Dark mode native** — Already have a dark theme. This view should feel premium in dark mode.

### Layout Concept: "The Daily Briefing"

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌─── Date Hero ───────────────────────────────────────────────┐ │
│  │                                                              │ │
│  │     📅  FEBRUARY 26                                          │ │
│  │     Thursday, 2026                                           │ │
│  │                                                              │ │
│  │     ◀  Yesterday    [Calendar Picker]    Tomorrow  ▶         │ │
│  │                                                              │ │
│  │     Quick: Today | This Week | Pick a Date                   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─── On This Day in Labor History ────────────────────────────┐ │
│  │                                                              │ │
│  │  ● 1919 — Grand Canyon designated a national park.           │ │
│  │           Workers who built the trails...                     │ │
│  │                                                              │ │
│  │  ● 1935 — Robert Watson-Watt demonstrates radar...           │ │
│  │                                                              │ │
│  │  ● 1993 — World Trade Center bombing. First responders       │ │
│  │           and rescue workers union response...                │ │
│  │                                                              │ │
│  │  [Show 12 more events →]                                     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─── Labor Quotes for This Day ───────────────────────────────┐ │
│  │                                                              │ │
│  │  "The labor movement was the principal force..."             │ │
│  │   — Martin Luther King Jr.                                   │ │
│  │                                                              │ │
│  │  "There is no power in the world that can stop..."           │ │
│  │   — César Chávez                                             │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─── Released This Year (1919, 1935, 1993...) ────────────────┐ │
│  │                                                              │ │
│  │  🎬 Films    │  🎵 Music                                     │ │
│  │  [poster]    │  Song Title — Performer                       │ │
│  │  [poster]    │  Song Title — Performer                       │ │
│  │              │                                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─── Share / Export ──────────────────────────────────────────┐ │
│  │  [Copy as Text]  [Share Link]  [Print View]                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Typography & Reading UX
- **History entries**: Timeline-style with year as bold anchor, description as body text. Large enough to read on-air from a monitor.
- **Quote entries**: Indented italic block with em-dash author attribution. Classic pull-quote styling.
- **Year-matched content** (films/music): Compact horizontal cards — thumbnail + title. Secondary to the main date content.
- **Empty states**: Friendly messaging — "No events recorded for this date yet. Know one? [Submit it →]"

### Navigation Patterns
- **Prev/Next arrows** — step through dates one day at a time
- **Calendar picker** — visual month calendar to jump to any date
- **Quick shortcuts** — "Today", "This Week", keyboard arrows
- **URL-driven** — `/on-this-day/02-26` is shareable and bookmarkable
- **"This Week" view** — show Mon–Sun at a glance for weekly show prep

---

## Calendar / Date Picker Package Options

### Option 1: react-day-picker (RECOMMENDED)

**Why it's the best fit:**
- Minimal, unstyled by default — we control the look with our existing Tailwind theme
- 2.7M+ weekly npm downloads, actively maintained
- Accessible (WCAG 2.1 AA compliant)
- Supports single date selection (our primary use case)
- Lightweight — no heavy dependencies
- macOS-inspired default style that can be extended
- Already used under the hood by shadcn/ui calendar components

**Install:** `npm install react-day-picker date-fns`
**Docs:** [daypicker.dev](https://daypicker.dev/)

**Pros:**
- Tiny bundle, no bloat
- Full Tailwind CSS styling via `classNames` prop
- Built-in keyboard navigation
- Can highlight dates that have entries (custom `modifiers`)

**Cons:**
- No built-in range picker shortcuts (we'd build our own "This Week" button)
- Requires date-fns as peer dependency (but it's tree-shakeable)

### Option 2: react-tailwindcss-datepicker

**Why it's interesting:**
- Built specifically for Tailwind CSS
- Has built-in shortcuts ("Today", "Yesterday", "Last 7 Days", custom)
- Dark mode support out of the box
- Date range support built-in

**Install:** `npm install react-tailwindcss-datepicker`
**Docs:** [react-tailwindcss-datepicker.vercel.app](https://react-tailwindcss-datepicker.vercel.app/)

**Pros:**
- Looks great with Tailwind immediately
- Built-in shortcut buttons
- Theming with Tailwind color classes
- Range selection for "This Week" view

**Cons:**
- Requires `@tailwindcss/forms` plugin and Tailwind 3 — we're on Tailwind 4
- Uses dayjs (adds a dependency)
- Less control over calendar cell rendering (harder to highlight "dates with entries")
- Smaller community than react-day-picker

### Option 3: Custom-built with Tailwind

**Why consider it:**
- We only need month/day selection (no year in the calendar — year is handled differently)
- Our use case is very specific — "pick a month/day to see what happened"
- A 12-month grid or simple month+day selector might be better UX than a traditional calendar

**Pros:**
- Zero dependencies
- Perfectly tailored to our use case
- Could build a "year wheel" or "month grid" that's more intuitive for historical dates

**Cons:**
- More dev time
- Accessibility harder to get right
- No keyboard navigation for free

### Recommendation

**Go with react-day-picker** — it's the most flexible, lightest weight, and gives us full control over styling with our Tailwind theme. We can:
- Style it to match our dark theme
- Add custom modifiers to highlight dates that have content
- Keep the calendar small and elegant as a popup/dropdown
- Build our own "Today" / "This Week" / prev/next buttons around it

---

## API Design

### New Endpoints

```
GET /api/on-this-day?month=2&day=26
```
Returns all published entries matching the given month+day, grouped by category, sorted by year (oldest first).

Response shape:
```json
{
  "date": { "month": 2, "day": 26 },
  "sections": {
    "history": [
      { "id": 123, "year": 1919, "title": "...", "description": "..." },
      { "id": 456, "year": 1935, "title": "...", "description": "..." }
    ],
    "quote": [
      { "id": 789, "year": 1968, "title": "...", "description": "...", "creator": "MLK" }
    ]
  },
  "yearMatches": {
    "film": [ ... ],
    "music": [ ... ]
  },
  "counts": {
    "history": 5,
    "quote": 2,
    "film": 3,
    "music": 1
  }
}
```

```
GET /api/on-this-day/week?month=2&day=24
```
Returns a week's worth of content (Mon–Sun containing the given date). For weekly show prep.

```
GET /api/on-this-day/calendar?month=2
```
Returns which days in the given month have entries (for highlighting dates in the calendar picker).

Response:
```json
{
  "month": 2,
  "daysWithEntries": [1, 3, 5, 6, 8, 12, 14, 15, 19, 20, 22, 24, 25, 26, 28],
  "entryCounts": { "1": 3, "3": 7, "5": 2, ... }
}
```

---

## Frontend Routes

```
/on-this-day              → Today's date (default)
/on-this-day/:monthDay    → Specific date, e.g., /on-this-day/02-26
/on-this-day/week/:date   → Week view (future enhancement)
```

### Component Tree

```
OnThisDayPage
├── DateHero              — Big date display + navigation arrows + calendar trigger
│   └── CalendarPicker    — react-day-picker dropdown, highlighted dates
├── HistorySection        — Timeline-style list of history entries
│   └── HistoryTimelineItem  — Year badge + description text
├── QuoteSection          — Pull-quote styled quote entries
│   └── QuoteBlock        — Italic text + author
├── YearMatchSection      — Films/Music released in matching years
│   ├── FilmStrip         — Horizontal scroll of poster thumbnails
│   └── MusicList         — Compact song entries
├── EmptyState            — "No entries for this date" with submit CTA
└── ShareBar              — Copy text, share link, print view
```

---

## Brainstorm: Extra Ideas

### "Read-Aloud" Mode
A simplified view that strips everything except the text content — optimized for reading on-air. Larger font, no images, no chrome. Maybe triggered by a "Presenter Mode" toggle.

### Date Density Heatmap
A year-at-a-glance view (like GitHub's contribution graph) showing which dates have the most content. Hot spots = great show days. Could help producers plan ahead.

### "This Week in Labor" Summary
Auto-generated weekly digest — all entries for Mon–Sun of the current week. Could be:
- A dedicated page view
- An exportable text block (copy-paste into show notes)
- Future: auto-emailed to subscribers

### Random Date / "Surprise Me"
Button that picks a random date with rich content. Good for inspiration when a host doesn't have a specific topic.

### Print Stylesheet
A clean print view with proper page breaks — some hosts print daily notes for studio reference.

### Keyboard Navigation
- `←` / `→` — previous/next day
- `t` — jump to today
- `w` — toggle week view
- `p` — toggle presenter mode
- `Esc` — close calendar picker

### "On This Day" Widget/Embed
Embeddable snippet for partner sites (laborradionetwork.org, union websites). Shows today's highlights with a link back to the full database. Future phase but worth designing the API to support it.

### Social Sharing Cards
Auto-generated Open Graph images for sharing on social media. "On This Day in Labor History: February 26, 1919 — ..." with branded layout.

---

## Implementation Phases (Suggested Breakdown)

### Phase 4a: Core "On This Day" Page
- New route `/on-this-day` with React Router
- API endpoint `GET /api/on-this-day?month=&day=`
- DateHero component with today's date, prev/next navigation
- History timeline section
- Quote section
- Basic responsive layout
- URL-driven date (shareable links)

### Phase 4b: Calendar Picker & Polish
- Install and integrate react-day-picker
- Calendar popup with highlighted dates (days that have content)
- `GET /api/on-this-day/calendar?month=` endpoint
- Smooth transitions between dates
- Empty states with submission CTA
- Keyboard navigation (arrow keys for prev/next day)

### Phase 4c: Year-Matched Content & Extras
- "Released This Year" section for films/music
- "This Week" view for weekly show prep
- Share/Copy/Print functionality
- Presenter Mode toggle (simplified reading view)

---

## Decisions (Locked)

1. **"On This Day" IS the landing page.** `/` shows today's On This Day view. The full database browse moves to `/browse`. This is the primary tool — daily show prep is what users open the site for.

2. **Calendar package: react-day-picker** + date-fns. Lightweight, Tailwind-friendly, accessible.

3. **Content is short — show it all inline.** Most history entries are 1-2 sentences. Quotes are a line + author. No need for "read more" truncation — show full text for broadcast reading. Films are the longest but they're secondary.

4. **Content priority order:**
   - **Primary:** Labor History (month/day match) — the core content
   - **Secondary:** Quotes (month/day match) — supporting material
   - **Tertiary:** Films & Music — matched by year or by thematic connection to the day's events. These are "bonus" context, not the main draw. Films from the era, songs that touch on the subject.

5. **Year-matching for films/music IS useful** — "films from this era" and "songs related to the subject" give hosts additional material. Room for it in the layout since primary content is compact.

6. **Week view** — defer to Phase 5. Daily view is the priority.

---

## References

- [react-day-picker](https://daypicker.dev/) — Lightweight, accessible, Tailwind-friendly calendar
- [react-tailwindcss-datepicker](https://react-tailwindcss-datepicker.vercel.app/) — Tailwind-native date range picker
- [shadcn/ui Calendar](https://www.jqueryscript.net/blog/best-shadcn-ui-date-picker.html) — shadcn calendar components built on react-day-picker
- [Untitled UI Date Pickers](https://www.untitledui.com/react/components/date-pickers) — React Aria + Tailwind date pickers
- [Material Tailwind Date Picker](https://www.material-tailwind.com/docs/react/plugins/date-picker) — Material design + Tailwind
