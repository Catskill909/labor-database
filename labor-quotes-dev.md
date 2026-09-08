# Labor Quotes (Weebly) → Labor Database: Import Feasibility Report

**Source:** [Labor Quotes](https://laborquotes.weebly.com/) — a Weebly-hosted labor quote compilation
**Date:** August 26, 2026
**Status:** PLANNING ONLY — no code written, no data imported
**Prepared for:** Chris Garlock / Labor Heritage Foundation

---

## Executive Summary

> ## ⚠️ Re-measured against PRODUCTION, 8 September 2026 — read this before the figures below
>
> Everything below was measured against a local `prisma/dev.db` copy. It has now
> been re-run against the **live database** (1,918 quotes, pulled through the
> public API) using the same folding as `server/search-text.ts`.
>
> | | This doc says | Measured against production |
> |---|---:|---:|
> | Unique quotes on the site | 701 | **701** ✅ |
> | Already held | 142 | **123 exact + 24 near = 147** |
> | Genuinely new | 559 (or 595 with the fallback rule) | **554** |
>
> The main-rule figures reconcile. **Use 554** until the fallback-rule blocks are
> triaged and hand-cleaned.
>
> ### The discovery that matters: 1,220 quote TITLES are truncated at 123 characters
>
> An earlier importer cut `Entry.title` to 120 characters and appended `...`.
> **1,220 of 1,918 production quotes** are affected.
>
> **No text was lost** — `description` holds the full quote, every UI surface
> renders `description` (verified in `OnThisDayView.tsx`, `EntryGrid.tsx` and
> `EntryDetail.tsx`), and search reads the folded `searchAll` which is built from
> description. **Nothing is visible to any visitor.**
>
> **But `POST /api/admin/import` dedupes on `title`.** An incoming quote carries
> its full text; the stored title says `...`; they do not match; the importer
> inserts a second copy. Of the 123 quotes we already hold, **only 34 have a
> title that would match — the other 89 would be silently duplicated.**
>
> **Therefore:** repair the 1,220 titles from their own `description` *before*
> importing, and dedupe during preparation against a fresh production export —
> never rely on the endpoint's exact match. The original advice below ("needs a
> normalized dedup pass") was right; this is the mechanism and the number.
>
> ### Review pack sent to the client, 8 Sep 2026
>
> `labor-quotes-review-2026-09-08.zip` — `1-NEW-QUOTES.csv` (554, attribution
> split into name / role / year, keep-by-default), `2-NEAR-MATCHES.csv` (24, with
> ours beside theirs; **12 are fuller on the site than in our database**, so they
> are candidates to complete rather than discard), and a plain-language README.
>
> **12 of the 554 have no attribution at all** — flagged in the README.

The site holds roughly **700 unique quotes** across 32 pages. All of them are machine-extractable — the markup is unusually regular, and a throwaway prototype already pulled 701 of them cleanly in a single pass.

**The headline is not the scrape. It's the overlap.** The Labor Database already contains **1,916 quote entries**. Measured against them, about **20% of the site (142 quotes) is already in the database** and roughly **559 are genuinely new**.

That reframes the job. This is a **merge**, not an import. And the existing importer's deduplication key — exact match on `(title, category)` — **will not catch these duplicates**, because the site's punctuation differs from the database's (straight vs. curly quotes, differing ellipses, no wrapping quotation marks). Running the existing script as-is would silently create ~142 near-duplicate entries that are invisible to exact-match dedup and tedious to clean up by hand afterward.

**Plus a second pass.** A fallback rule for quotes the site never bolded recovers a further **36 new** (see [The 277 missed blocks](#the-277-missed-blocks)), giving a working total of **737 unique quotes: 145 duplicates, 595 new.**

**Bottom line for Chris:** Yes, worth doing — ~595 new quotes is a meaningful addition to a 1,916-quote collection, and the source carries something our existing quotes almost entirely lack: **topical tags**. But it needs a normalized dedup pass before anything is written. Estimated **6–9 hours of dev time**. The one prerequisite is the site owner's permission (see [Permissions](#permissions--attribution)).

---

## Source Site: Structure

32 content pages, all listed in `sitemap.xml` and all crawlable (`robots.txt` disallows only `/ajax/` and `/apps/` for generic agents; no crawl-delay applies to us).

| Page group | Count | Pages | Role |
|---|---|---|---|
| **Author index** | 13 | `a.html`, `b.html`, `c.html`, `d-e.html`, `f-g.html`, `h-i.html`, `j-k.html`, `l.html`, `m-o.html`, `p-q.html`, `r.html`, `s.html`, `t-z.html` | Quotes grouped alphabetically by author surname |
| **Topic** | 18 | `automation`, `big-businesspower--corruption`, `brotherhood`, `economics--inequality`, `good--evil`, `labor-day`, `leadership`, `management`, `negotiating`, `outsourcing--globalization`, `politics`, `presidential-quotes`, `solidarity`, `strikes--struggle`, `the-law`, `unions--labor`, `wisdom--knowledge`, `work` | Same quotes, re-grouped by subject |
| **Affiliate** | 1 | `apwu-quotes` | American Postal Workers Union quotes |
| **Blog** | — | `/1/feed` (RSS) | "Quote of the Moment" posts + long-form political essays |

**The two groupings overlap heavily and that overlap is the useful part.** A quote on `s.html` (Springsteen) also appearing on `solidarity.html` tells us that quote is tagged *solidarity*. See [Tag Strategy](#tag-strategy).

### Markup pattern

The site is hand-authored in Weebly's editor but remarkably consistent. The dominant pattern:

```html
<strong>QUOTE TEXT</strong><em>&mdash;Attribution</em><br /><br />
```

Blocks are separated by double `<br />`. Real-world variations the parser must absorb:

- The dash sits **outside** `<em>` about a third of the time: `</strong>--<em>Author</em>`
- Dash is `&mdash;`, `--`, or `-` interchangeably
- Arbitrary nested `<font color="#1103ad">` wrappers around either or both halves
- Author feature sections introduced by `<h2>` with a Wikipedia link and a portrait image
- Zero-width spaces (`&#8203;`) and `&nbsp;` scattered through the text

---

## Extraction Results (measured, not estimated)

A prototype parser was run against all 32 pages. Results:

| Metric | Value |
|---|---|
| Raw quote rows extracted | 1,388 |
| **Unique quotes** (after normalizing) | **701** |
| Duplicate rows (same quote on author + topic page) | 687 |
| Quotes with attribution | 683 (97%) |
| Quotes with **no** attribution | 18 |
| Quote length | min 12 / median 109 / max 1,323 chars |
| Content blocks the `<strong>` rule missed | 277 |

Per-page yield ranged from 1 (`labor-day`) to 105 (`economics--inequality`).

### The 277 missed blocks

Not all noise. Spot-checking shows a mix of genuine quotes authored without `<strong>`, and non-quote prose (page intros, editorial commentary). Example of a **real quote the main rule misses**:

> The most potent weapon in the hands of the oppressor is the mind of the oppressed.—Steven Biko

**Classified (Aug 26):** 250 of the 277 are real quotes the site author simply never wrapped in `<strong>` — hand-authored pages, inconsistent styling. 26 are an artifact of the prototype's region regex matching mid-tag, and 1 is a horizontal rule of underscores. So the bucket is almost entirely bolding inconsistency, not junk.

**But the net gain is small.** A fallback rule (no `<strong>`, split on trailing `—`/`--`) recovers 206 unique quotes, of which **167 were already captured** by the main rule — the same quote appears bolded on its author page and unbolded on a topic page. Net: **39 missed, 3 already in the database, 36 genuinely new.**

Caveat: several of the 36 have `<h2>` section headings bleeding into the quote text (e.g. `Lou Dobbs Watch out for the fellow who talks about putting things in order!`). They need manual cleanup, so treat 36 as an upper bound.

### One known prototype defect

The prototype reported "1,336 quotes with an image," which is **wrong** — it attributed any image found in a containing element to every quote inside it. Author portraits do exist on the site (tied to `<h2>` feature sections), but the real count is unmeasured. Treat images as a **separate later pass**, not part of the first import.

---

## Target Mapping: `Entry` model

The database already has a `"quote"` category and an established shape. Mapping is direct:

| Source | `Entry` field | Notes |
|---|---|---|
| Quote text | `description` | Full text |
| Quote text (first 120 chars) | `title` | Matches existing `scripts/import-quotes.ts` convention |
| Attribution | `creator` | Needs splitting — see below |
| Attribution remainder | `metadata.source` | Role/publication/date portion |
| Topic pages the quote appears on | `tags` | Comma-separated — see [Tag Strategy](#tag-strategy) |
| Source page URL | `sourceUrl` | e.g. `https://laborquotes.weebly.com/s.html` |
| — | `category` | `"quote"` |
| — | `isPublished` | Decision needed — see [Open Questions](#open-questions-for-chris) |
| — | `month` / `day` / `year` | Mostly unavailable; a minority of attributions carry a date |

### Attribution needs splitting

The site's attribution field is a single blob mixing name, role, and source:

```
Loren Adams, Arkansas Postal Workers Union Editor, The Arkansas Postal Worker
Michelle Goldberg, "By Killing Renee Good, ICE Sent a Message to Us All", New York Times, 1/8/26
Justice Kentanji Brown Jackson in the dissent for Glacier Northwest Inc. v. Teamsters
```

`creator` should hold the name only; the rest goes to `metadata.source`. **Splitting on the first comma is the obvious heuristic and it is wrong often enough to matter** — "Justice Kentanji Brown Jackson in the dissent for..." has no comma at all, and names like "Martin Luther King, Jr." break on it. Plan on a heuristic pass plus **manual review of the ~560 new rows**. This is the single largest hand-work item in the project.

Note also: the existing 1,916 quotes have `creator` populated on 1,914 of them, so creator quality is a standard worth matching.

---

## The Deduplication Problem

**This is the part that will cause damage if skipped.**

`scripts/import-quotes.ts` dedups with:

```ts
const existing = await prisma.entry.findFirst({
    where: { title, category: 'quote' }
});
```

Exact string match on `title`. Compare a real overlapping pair:

| | Text |
|---|---|
| **In database** | `"I don't mind coming to work -- I just don't want to stay when I get there."` |
| **On the site** | `I don't mind coming to work -- I just don't want to stay when I get there.` |

Same quote. Different string — the database copy is wrapped in quotation marks. Exact match sees two distinct entries and creates a duplicate. Other observed divergences: curly vs. straight apostrophes (`’` vs `'`), curly vs. straight double quotes, and minor wording drift (`by the ground rules, that his enemy` vs `by the ground rules that his enemy`).

**Measured impact:** of the 142 overlapping quotes, **122 matched only after Unicode normalization and punctuation stripping**. An exact-match import creates ~122 near-duplicates that no automated check will later find.

### Recommended dedup approach

Match on a **normalized key**, not raw title:

1. Unicode NFKD normalize, strip combining marks
2. Fold curly quotes/apostrophes to ASCII
3. Lowercase
4. Strip all non-alphanumeric characters
5. Compare against the same transform of **both** `description` and `title` of existing `category='quote'` rows

This is exactly the transform the project already uses elsewhere — see the `searchTitle`/`searchCreator`/`searchAll` shadow columns and `server/search-text.ts`. **Reuse that module rather than writing a second normalizer**, so search and dedup can't drift apart.

For the ~20 quotes that match by prefix but not exactly (wording drift), flag for **human decision** rather than auto-skipping — some are genuinely different variants worth keeping.

---

## Tag Strategy

**This is the most valuable thing the source offers that we don't already have.** Only 955 of 1,916 existing quotes (50%) carry tags. The site's structure hands us tags for free.

Because each quote appears on both an author page and one or more topic pages, the topic pages *are* a tagging of the corpus. A quote found on `solidarity.html` and `strikes--struggle.html` becomes `tags: "solidarity, strikes"`.

431 of the scraped quotes appear on both an author page and at least one topic page, so the majority arrive pre-tagged. Topic slugs need mapping to the project's existing tag vocabulary before use — check `server/tags.ts` and `tags-dev.md` for the canonical list rather than inventing new tags from slugs.

Worth considering: **the 431 overlapping tags may be applicable to the 142 quotes already in the database.** That's a free enrichment of existing rows — tagging quotes we already have, using the source's topical grouping.

---

## Recommended Plan

**Phase 1 — Extract & normalize (2–3 hrs)**
Build `scripts/scrape-laborquotes.ts`. Fetch all 32 pages politely (1 req/sec, cache to disk so re-runs don't re-hit the site). Parse with the primary `<strong>`/`<em>` rule plus the fallback dash rule. Output a reviewable JSON file. **Writes nothing to the database.**

**Phase 2 — Recover the unbolded quotes (~1 hr)**
Classified: 250 of 277 are real quotes lacking `<strong>`, but only **36 are genuinely new** after dedup. Apply the fallback dash-split rule and hand-clean the heading-bleed cases.

**Phase 3 — Dedup report (1 hr)**
Run normalized matching against existing quotes. Produce a three-way report: *new* / *exact duplicate* / *near-duplicate needing a human call*. **Review this before importing anything.**

**Phase 4 — Attribution split + manual review (2–3 hrs)**
Heuristic name/source split, then read through the ~560 new rows. This is unavoidable hand-work.

**Phase 5 — Import (30 min)**
Import via Admin Dashboard JSON (per `data-import.md`) or a dedicated script. Per `CLAUDE.md` rule 3, this is a **DATA problem** — production data goes through Admin Dashboard Import/Export, not a code deploy. **Back up the production database first.**

**Phase 6 — Optional enrichment (unestimated)**
Backfill tags onto the 142 already-present quotes; author portrait images.

**Total: 6–9 hours**, excluding Phase 6.

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Exact-match dedup creates ~122 invisible duplicates | **High** | Normalized dedup via `server/search-text.ts` (Phase 3) |
| Attribution split produces bad `creator` values | Medium | Manual review of 560 rows (Phase 4) |
| Weebly markup changes and breaks the scraper | Low | One-time import; not an ongoing sync |
| The 277 unmatched blocks hide real quotes | Low (measured: 36 net new) | Phase 2 fallback rule + heading-bleed cleanup |
| Long "quotes" (max 1,323 chars) are actually essays | Low | Length threshold flag for review |
| Importing to production without backup | **High** | Back up first; `CLAUDE.md` rule 3 |

---

## Permissions & Attribution

The quotes themselves are short excerpts of others' words with attribution preserved — the normal case for a quote collection, and the same footing as our existing 1,916.

**But the compilation is someone's work.** Selecting, transcribing, and organizing ~700 quotes across 32 topical pages is editorial labor, and compilations attract their own protection. The `data-import.md` precedent set the right standard by flagging photo permission before import.

**Recommendation:** Chris contacts the site owner for permission before import. The contact address is obfuscated on the site via Cloudflare email protection; the blog's authorial voice suggests an APWU-affiliated editor, and `apwu-quotes.html` supports that. Setting `sourceUrl` on every imported row (the existing 1,916 quotes have **zero** `sourceUrl` values) gives durable provenance either way, and is worth doing regardless.

---

## Open Questions for Chris

1. **Publish immediately or stage for review?** `isPublished: true` on import, or `false` pending review? 559 unreviewed entries going straight live is a lot of surface area.
2. **Permission** — should we contact the site owner before or after building the scraper? (Building Phases 1–4 writes nothing and is safely reversible; only Phase 5 is a commitment.)
3. **Blog content** — the `/1/feed` RSS carries "Quote of the Moment" posts *and* long-form political essays with strong partisan language. Quotes only, or is the commentary of interest? **Recommend quotes only.**
4. **Near-duplicate variants** — when the site's wording differs slightly from ours, keep both or prefer one?
5. **Tag backfill** — enrich the 142 existing quotes with the source's topic tags? (Cheap, and improves a collection that's only 50% tagged.)

---

## Appendix: Verification Notes

**Working artifacts:** [`docs/labor-quotes/`](docs/labor-quotes/) — prototype parser, all 1,388 extracted rows, the 559 new-quote candidates, the dedup baseline export, and 33 cached source pages. See that folder's `README.md` for file-by-file detail and known defects.

Figures in this document were produced by a prototype parser run against all 32 pages on August 26, 2026, and by read-only `SELECT` queries against `prisma/dev.db`. Nothing was written to any database.

Numbers to treat as **measured**: page inventory, 1,388 raw rows, 701 unique quotes, 18 missing attributions, 277 unmatched blocks, 1,916 existing quote entries, 142 overlapping / 559 new, 955 existing tagged, 0 existing `sourceUrl`.

Numbers to treat as **estimated**: hours per phase only. The 277-block bucket was classified on Aug 26 and now yields a measured 36 genuinely-new quotes (upper bound — some need heading-bleed cleanup).

Known **incorrect** in the prototype and requiring re-measurement: image counts (over-attributed; see above).

The 20% overlap figure was computed against `prisma/dev.db`. **Production may differ** — re-run the dedup report against a current production backup before Phase 5.
