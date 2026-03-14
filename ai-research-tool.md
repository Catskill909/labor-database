# AI Research & Enrichment Tool

**Project:** Labor Arts & Culture Database
**Prepared by:** Paul Henshaw
**Date:** March 5, 2026 (proposed) · March 12, 2026 (Phase 1 & 2 complete)
**Status:** Phase 1 (Core AI Editor) & Phase 2 (Public Display) — COMPLETE. Phase 3 (Batch Processing) — planned.

---

## What Is This?

A new AI-powered research assistant built into the Labor Database admin panel. It helps curators expand short database entries with richer historical context, verified links, and related sources — all with human approval before anything goes live.

**The curator is always in control.** The AI suggests content; the human reviews, edits, and approves before publishing.

---

## How It Works: The 2-Panel Editor

When a curator opens any existing record (history event, quote, song, or film), they can click **"Enhance with AI"** to open a side-by-side editing view.

### Left Panel — The Live Record

Displays the current database entry with all existing fields, plus three new dedicated research fields:

| Field | Description |
|-------|-------------|
| Title | The entry headline |
| Description | Main content body |
| Date | Month / Day / Year |
| Creator | Author, director, performer, etc. |
| Tags | Categorization labels |
| Source URL | Primary external link |
| **Wikipedia Link** *(new)* | A dedicated field for a verified Wikipedia article |
| **Related Links** *(new)* | Additional external URLs — archives, news articles, Library of Congress, union sites. Each link has a label and URL |
| **More Research** *(new)* | Expanded text area for additional historical context, bullet points, or notes |

All fields are directly editable. The curator can also fill them in manually without using the AI.

### Right Panel — AI Suggestions

When the curator clicks **"Scan with AI"**, the right panel populates with generated content blocks:

| Suggestion Block | What the AI Generates | Where It Goes |
|-----------------|----------------------|---------------|
| Expanded Description | A longer, more detailed narrative of the event | Description field |
| Radio Prep Bullets | 3–5 quick facts formatted for on-air reading | More Research field |
| Wikipedia Article | A verified Wikipedia URL with brief summary | Wikipedia Link field |
| External Links | Relevant archive and source URLs with labels | Related Links list |
| Suggested Tags | Tags from the existing canonical tag system | Tag selector |
| Key People & Organizations | Names of figures, unions, and orgs mentioned | More Research field |

**Every suggestion block is fully editable.** The curator can rewrite, shorten, or refine the AI's text directly in the right panel before adding it to the record. This ensures only clean, curator-approved content moves to the live entry.

Each block has two buttons:
- **[+ Add to Record]** — Moves the edited content into the corresponding left panel field
- **[📋 Copy]** — Copies the text to clipboard for use in show prep, emails, or social media

---

## Smart Features

### Category-Aware Research
The AI adjusts its approach based on the entry type:
- **History** — Focuses on dates, causes, outcomes, key figures, and lasting impact
- **Quotes** — Identifies the speaker's biography, the context of the quote, and the historical moment
- **Music** — Finds songwriter background, the labor movement connection, and related protest songs
- **Film** — Finds cast and crew info, the real-world labor story behind the film, and critical reception

### Confidence Indicators
Each suggestion block shows a confidence level so the curator knows what to trust:
- 🟢 **High** — Strong source material found (e.g., a clear Wikipedia match)
- 🟡 **Medium** — Inferred from context (e.g., suggested tags based on keywords)
- 🔴 **Low** — Speculative (e.g., approximate dates or loose connections)

### Regenerate
If the first set of suggestions isn't useful, click **"Regenerate"** for a fresh set without losing any content already added to the left panel.

### Live Preview
A **"Preview"** toggle shows what the public-facing entry will look like with the new content before saving.

### Research Tracking
Entries that have been through the research tool get a subtle gold badge in the admin table row — visible at a glance without cluttering the interface. The badge tooltip reads "Researched." No public-facing labels — the public site never reveals whether content was AI-assisted or manually curated.

### "Needs Review" Filter
A filter option in the admin table (alongside Published/Pending) that shows only entries that haven't been researched yet. Curators click it and get a focused work queue — no new UI to learn, same pattern as existing filters.

---

## Batch Processing (Future Phase)

For enriching many records at once:
1. Select 10–50 entries from the admin dashboard using checkboxes
2. Click **"Batch AI Scan"**
3. The system processes them in the background
4. Results appear in a review queue for curator approval

Ideal for the initial enrichment of the 1,411 history entries that currently have short descriptions.

---

## What Changes on the Public Site

Once a record has curator-approved AI content, the public entry detail view gains:
- **Wikipedia** — A Wikipedia icon and link (only appears if a Wikipedia URL exists)
- **Related Links** — A labeled list of external sources below the main description
- **More Context** — An expandable "Read More" section for the additional research text

These sections only appear on entries that have the new content — existing entries are unaffected.

---

## Estimated Monthly Costs

The tool uses **Google Gemini 1.5 Flash**, one of the most cost-effective AI models available.

| Usage Scenario | Estimated Cost |
|---------------|---------------|
| Light daily use (5–10 scans/day) | **Under $0.15/month** |
| Heavy daily use (50 scans/day) | **Under $1.00/month** |
| One-time full database scan (all 5,954 entries) | **~$2.50 one-time** |

There are no monthly minimums or subscription fees — you only pay for what you use.

## Integration with Existing Interfaces ✅ Complete

The research fields appear across all four interfaces — curators and public users can contribute research manually or via AI.

### Public Submission Wizard ("Add to Database" on the public site) ✅
The 3-step wizard gains a collapsible **"Research & Links"** section at the bottom of Step 2 for all categories:
- **Wikipedia Link** — text input, optional
- **Related Links** — "Add a link" button to add label + URL pairs, optional
- **More Research** — text area for additional context, optional

Collapsed by default so it doesn't intimidate casual submitters. Removed: "Source" field from Quote submissions.

### Admin "Add to Database" (via Admin Dashboard) ✅
Same wizard in admin mode (skips contact info step). Same research fields.

### Admin Edit Modal (pencil icon on any entry) ✅
**History and Quote** use a **2-column layout** (wider modal):
- **Left column:** Core fields (Title, Date, Description/Quote, Author, Tags, Images)
- **Right column:** Structured research fields — Wikipedia Link, Related Links, Quick Facts, Key People & Organizations, Additional Notes (3 separate textareas that sync with `moreResearch`)

**Music and Film** use a single column with a collapsible Research & Links section (Wikipedia, Related Links, More Research as a single textarea).

**"Enhance with AI" button** in the modal header opens the full-screen 2-panel AI Sandbox.

**Unsaved changes guard:** Amber confirm modal warns if closing with unsaved edits.

Removed: Source/Source URL from History and Quote edit forms.

### Public Entry Detail (view modal on the public site) ✅
When viewing any entry, the detail modal shows research fields if they have content:
- **Wikipedia** — BookOpen icon + clickable link
- **Related Links** — labeled list of external sources with ExternalLink icons
- **Quick Facts** — Lightbulb icon + bullet list
- **Key People & Organizations** — Users icon + bullet list
- **Additional Notes** — FileText icon + prose text

**Quote styling:** Larger text (`text-lg`), italic, with red left border accent — visually distinct as the primary content. Research metadata appears below with a subtle divider.

Entries without these fields look exactly the same as they do now — no empty placeholders.

---

## Implementation Phases

### Phase 1: Core AI Editor ✅ COMPLETE (March 12, 2026)
- 2-panel "Enhance with AI" full-screen editor (AiSandbox.tsx)
- Google Gemini 2.0 Flash integration with category-aware prompts
- Click-to-add workflow with persistent "Added!" feedback
- Structured research fields: Quick Facts, Key People & Organizations, Additional Notes
- Category-aware routing: Quotes show read-only quote text, expanded description → Additional Notes
- Shared `parseSections`/`rebuildMoreResearch` utilities for consistent data handling

### Phase 2: Public Display ✅ COMPLETE (March 12, 2026)
- Research fields rendered on public entry detail view with section parsing and dedup
- Quote blockquote styling with red accent border
- 2-column admin edit layout for History and Quote
- Research fields in all submission forms (collapsible)

### Phase 3: Batch Processing — PLANNED
- Multi-select entries for bulk AI scanning
- Background processing queue with review interface
- Enhancement tracking stats in admin dashboard

---

## AI Scan Settings (User-Configurable) ✅

Paired toggle buttons in the AiSandbox header:
- **Output length** — Short or Detailed (default: Detailed)
- **Tone** — Factual or Narrative (default: Factual)

Settings persist per session. "Regenerate" button for fresh suggestions without losing content already added.

---

## Curation Workflow & Progress Management — BRAINSTORM

The research tool needs a way for curators to **manage their progress** across thousands of entries. This is not about labeling content as "AI-generated" — it's about helping the team answer: *What's been reviewed? What still needs attention? What should I work on next?*

### The Core Problem

The database has ~6,000 entries. Curators will work through them over weeks or months. They need to:
- See at a glance which entries have been researched and which haven't
- Pick up where they left off
- Prioritize categories or date ranges
- Track team progress if multiple curators are working

### Ideas to Explore

#### 1. Edit Modal Indicator ✅ DONE
The "Research" button in the admin edit modal changes appearance when the research tool has been used: red with checkmark and "Researched" label vs purple "Research" button. Tooltip reads "Researched — click to re-scan." No "AI" language in user-facing labels.

**Open question:** Should this also show a date? e.g., "Reviewed Mar 12" — helpful if a curator wants to re-review old entries after improvements to the AI prompts.

#### 2. Admin Table Badge ✅ DONE
A subtle gold Sparkles icon in the admin table action row for entries that have been researched. Tooltip reads "Researched." Fixed-width column (always rendered, invisible when not enhanced) so it doesn't shift other columns.

#### 3. Stats Cards on Admin Dashboard
Add "Reviewed: X / Y" progress cards to the existing admin dashboard stats area, broken down by category:
- History: 142 / 1,411 reviewed
- Quotes: 38 / 1,916 reviewed
- Music: 12 / 435 reviewed
- Films: 5 / 2,192 reviewed

Could include a simple progress bar. Clicking a card could filter the table to show only un-reviewed entries — same pattern as the existing Published/Review Queue filter cards.

#### 4. Filter: "Needs Review" Toggle — NEXT UP
Add a filter option in the admin table (alongside existing category/status filters) to show only entries that haven't been through the research tool yet. The curator clicks it and gets a focused work queue. Same pattern as existing Published/Pending filter — intuitive, no new UI to learn.

**Possible filters:**
- Not yet reviewed (no research data at all)
- Reviewed but incomplete (has some fields but not others — e.g., has Wikipedia but no Quick Facts)
- All reviewed

#### 5. Sort by "Least Complete"
A sort option that puts entries with the least research data at the top. Useful for finding entries that need the most work. Could rank by: number of research fields populated, length of moreResearch content, or presence/absence of Wikipedia URL.

#### 6. Category Priority Queue
A simple view that answers: "I have 30 minutes. What should I review?" Could surface entries that are:
- In the priority category (e.g., History first since those have the shortest descriptions)
- Near a date that's coming up (On This Day relevance)
- Already popular (most viewed, if we had analytics)
- Recently submitted by public users (new content needs review)

#### 7. Bulk Status Marking
After batch processing (Phase 3), curators will need to review many entries. A "mark as reviewed" bulk action — select rows, click "Mark Reviewed" — lets the team move quickly through a batch without opening each entry.

### What's NOT in Scope

- No public-facing "AI" labels — the public site never shows whether content was AI-assisted or manually written. All content is curator-approved.
- No automated publishing — the research tool helps curators prepare content, but publishing decisions are always manual.
- No tracking of individual curator activity — this is a small team tool, not a performance tracker.

### Implementation Notes

**Data already available:** `metadata.aiEnhanced` (boolean) and `metadata.aiEnhancedAt` (ISO timestamp) are saved when the research tool is used on an entry. These can power all of the above features without schema changes.

**Possible additions to metadata:**
- `reviewStatus`: "not_started" | "in_progress" | "complete" — more granular than a boolean
- `reviewNotes`: curator's notes about what still needs work on this entry
- `lastReviewedBy`: curator name (if multi-user auth is added later)

### Questions for Discussion

1. Which of these would be most useful to start with?
2. Should "reviewed" mean "the tool was used" or "a curator has explicitly signed off"?
3. Is category-level progress tracking (idea #3) enough, or do curators need row-level indicators (idea #2)?
4. How important is the "what to work on next" prioritization (idea #6) vs simple progress tracking?

---

> **Dev Planning:** See [ai-research-tool-dev.md](ai-research-tool-dev.md) for detailed technical implementation phases and architecture audit.
