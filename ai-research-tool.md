# AI Research & Enrichment Tool — Feature Proposal

**Project:** Labor Arts & Culture Database  
**Prepared by:** Paul Henshaw  
**Date:** March 5, 2026  
**Status:** Proposal for Discussion

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

### Enhancement Tracking
Each enhanced entry gets a small indicator so the team can track progress across the database (e.g., "Enhanced: 342 / 1,411 history entries").

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

## Integration with Existing Interfaces

The new research fields don't just live in the AI Sandbox — they also appear in the existing forms across the platform so curators and public users can contribute research manually.

### Public Submission Wizard ("Add to Database" on the public site)
The 3-step wizard (Pick Category → Category Form → Contact Info) gains these **optional** fields at the bottom of Step 2 for all categories:
- **Wikipedia Link** — text input, optional
- **Related Links** — "Add a link" button to add label + URL pairs, optional
- **More Research** — text area for additional context, optional

These are clearly marked as optional and placed below the existing required fields so they don't intimidate casual submitters.

### Admin "Add to Database" (via Admin Dashboard)
Same wizard as above but in admin mode (skips contact info step). The new fields appear in the same position. Admins are more likely to use these fields when manually adding well-researched entries.

### Admin Edit Modal (pencil icon on any entry)
The existing edit modal gains the three new fields at the bottom of the category-specific form, just above the Tags and Source URL fields. Additionally:
- An **"Enhance with AI"** button appears in the modal header, which opens the full 2-panel AI Sandbox view for that entry.
- Wikipedia Link shows as a clickable link preview when populated.
- Related Links shows as an editable list with add/remove buttons.

### Public Entry Detail (view modal on the public site)
When viewing any entry, the detail modal shows the new fields if they have content:
- **Wikipedia** — icon + clickable link
- **Related Links** — labeled list of external sources
- **More Context** — expandable "Read More" section

Entries without these fields look exactly the same as they do now — no empty placeholders.

---

## Implementation Phases

### Phase 1: Core AI Editor
- Build the 2-panel "Enhance with AI" interface
- Integrate Google Gemini API
- Create the click-to-add workflow
- Add Wikipedia Link, Related Links, and More Research fields

### Phase 2: Public Display
- Show the new research fields on the public entry detail view
- Add enhancement progress tracking to admin dashboard

### Phase 3: Batch Processing
- Multi-select entries for bulk AI scanning
- Background processing queue with review interface

---

## AI Scan Settings (User-Configurable)

Before clicking "Scan with AI", the curator can set preferences directly in the interface:
- **Output length** — Short (2–3 sentences for quick radio prep) or detailed (5–10 sentences for full narrative)
- **Tone** — Factual/encyclopedic or narrative/storytelling
- **Link sources** — Major sources only (Wikipedia, Library of Congress) or include smaller union/organization sites

These settings persist per session so the curator doesn't have to re-select them each time. If the results aren't right, the curator adjusts settings and clicks **"Regenerate"** for a fresh pass.

---

## Questions for Discussion

1. **More Research formatting** — Plain text or basic formatting (bold, bullet points)?
2. **Batch priority** — Which category should we enrich first? History entries have the shortest descriptions and would benefit most.
3. **Default settings** — What should the default output length and tone be?

---

> **Dev Planning:** See [ai-research-tool-dev.md](ai-research-tool-dev.md) for detailed technical implementation phases and architecture audit.
