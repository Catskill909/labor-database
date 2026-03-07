# AI Research Tool Demo — Setup Instructions

**Status:** ✅ Working proof of concept (March 7, 2026)

---

## Quick Start

1. **Get a Gemini API Key** (free)
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the key

2. **Add the key to your `.env` file**
   ```
   GOOGLE_AI_API_KEY=your_key_here
   ```

3. **Install dependencies and start the server**
   ```bash
   npm install
   npm run dev:fullstack
   ```

4. **Open the demo**
   - Navigate to: `http://localhost:5173/ai-demo`

---

## What This Demo Shows

A proof of concept for the AI-powered research assistant described in [ai-research-tool.md](ai-research-tool.md).

**Features demonstrated:**
- 2-panel editor (Live Record ↔ AI Suggestions)
- Category-aware research (history, quote, music, film)
- Configurable output length and tone
- Confidence indicators (🟢 high / 🟡 medium / 🔴 low)
- Click-to-add workflow
- Copy to clipboard

**Sample entries included:**
- 1912 Lawrence Textile Strike
- Triangle Shirtwaist Factory Fire
- Joe Hill quote
- "Which Side Are You On?" (music)
- Norma Rae (film)

---

## Cost

Using **Gemini 2.0 Flash** — extremely cost-effective:
- ~$0.000125 per scan (input + output tokens)
- 1,000 scans ≈ $0.12

The free tier includes a generous monthly allowance for testing.

---

## Files Added for This Demo

| File | Purpose |
|------|---------|
| `src/components/AiSandboxDemo.tsx` | Standalone 2-panel demo component |
| `server/index.ts` (endpoint added) | `POST /api/ai/enhance` — calls Gemini API |
| `ai-demo-setup.md` | This file |

**To remove the demo later:**
1. Delete `src/components/AiSandboxDemo.tsx`
2. Remove the `/ai-demo` route from `src/App.tsx`
3. Remove the `// AI RESEARCH DEMO` section from `server/index.ts`
4. Optionally remove `@google/generative-ai` from `package.json`

---

## What's Working in This Demo

- **2-panel editor** — Live Record ↔ AI Suggestions side-by-side
- **Category-aware prompts** — Different research focus for history, quote, music, film
- **Creator/author research** — For quotes and music, AI researches the person (e.g., Joe Hill biography)
- **Configurable settings** — Output length (short/detailed), tone (factual/narrative)
- **Confidence indicators** — 🟢 high / 🟡 medium / 🔴 low
- **Click-to-add workflow** — Transfer AI content to Live Record fields
- **Copy to clipboard** — For radio prep, social media, etc.
- **Quick Facts** — 3-12 facts depending on entry significance
- **Canonical tags only** — Uses Library of Congress labor subject headings

## Limitations (Demo Only)

These will be added in full integration:
- **Tag editing** — Demo shows tags as badges; real integration uses existing `TagSelector` component
- **Link editing** — Demo doesn't allow removing/editing added links
- **No database save** — Demo doesn't persist changes (proof of concept only)
- **No existing entry data** — Uses hardcoded sample entries, not real database entries

---

## Coolify Deployment

### Environment Variable Setup

Add this environment variable in Coolify alongside existing API keys:

| Variable | Value | Notes |
|----------|-------|-------|
| `GOOGLE_AI_API_KEY` | `AIzaSy...` | Gemini API key from Google AI Studio |

**Steps in Coolify:**
1. Go to your Labor Database project in Coolify
2. Navigate to **Environment Variables**
3. Add new variable: `GOOGLE_AI_API_KEY`
4. Paste your Gemini API key as the value
5. Save and redeploy

The AI demo will work automatically once the env var is set. If the key is missing, the endpoint returns a helpful error message.

### Security Notes

- The API key is only used server-side (never exposed to frontend)
- The `/api/ai/enhance` endpoint has no auth (demo mode) — add auth for production
- Rate limiting is inherited from existing Express rate limiter
- No user data is sent to Google — only entry title/description/category

---

## Integration Phase (If Client Approves)

See [ai-research-tool-dev.md](ai-research-tool-dev.md) for full integration plan:
- Add new metadata fields to Entry schema (`wikipediaUrl`, `relatedLinks`, `moreResearch`)
- Add "Enhance with AI" button to `EditEntryModal`
- Add research fields to `SubmissionWizard`
- Display research fields on public `EntryDetail` view
- Enhancement tracking in admin dashboard
- Batch processing queue (Phase 3)
