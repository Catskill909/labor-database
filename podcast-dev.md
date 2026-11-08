# Labor Podcasts — development plan

*Started 8 Nov 2026. Status: **Phase 1 LIVE since 8 Nov 2026** (`a4569af`,
follow-up `67ed23b`), 50 shows imported, live audit clean. Next: tags (starter
list in the 8 Nov roundup email to Chris and Harold), then Phase 2.*

**Proposed tags (awaiting LHF's reply):** show type — News & Current Affairs,
Labor History, Commentary & Analysis, Interviews, Organizing & Rank-and-File,
Workers' Rights, Music & Culture, Local & Regional, International, Live Radio
(1–3 per show; a new tag group = `server/tags.ts` + `TagSelector.tsx` +
`npm run check:tags`). **Union** goes in `metadata.union` (admin form field
already exists), not tags: AAUP, IATSE Local 891, IAM, USW, SAG-AFTRA, BCTGM,
CFMEU, NALC, Montana AFL-CIO, LCLAA, SW Washington CLC; Roswell Hub asked.

**After launch (`67ed23b`):** cards no longer show a "Listen:" line (links are
in the popup); hosts/location text brightened.

### Phase 1 — what was built (8 Nov 2026)

| Piece | Where |
|---|---|
| Private field `Entry.privateMetadata` + migration | `prisma/schema.prisma`, `prisma/migrations/20261108183739_add_private_metadata` |
| One "hide private fields" helper for all public endpoints (replaced 4 copies) + test that fails if a new private column is missed | `server/public-entry.ts`, `server/public-entry.test.ts` |
| Podcast definitions: platforms, badges, status, safe links, cleaner (shared by pages and tests) | `server/podcast-meta.ts` (+ test), re-exported by `src/podcast.ts` |
| Card, popup, badges | `EntryGrid.tsx` (PodcastCard), `PodcastDetail.tsx`, `PodcastBadges.tsx` |
| Admin edit form (status switch, badges, 15 listen platforms + custom links, private contacts) | `PodcastEditModal.tsx`, `PodcastFields.tsx` |
| Add-new wizard podcast form (public: logo as a link; admin: upload) | `SubmissionWizard.tsx` |
| Tab icon, sort (Show A–Z default), admin list row, link previews | `CategoryNav.tsx`, `FilterBar.tsx`, `AdminDashboard.tsx`, `share-meta.ts` |
| Import builder | `scripts/prepare-podcasts-import.ts` → `client-data/podcasts/podcasts-import.zip` (gitignored) |

**Listen links:** Apple Podcasts, Spotify, YouTube, YouTube Music, Amazon Music,
iHeartRadio, Pocket Casts, Overcast, Pandora, TuneIn, SoundCloud, Castbox,
Podbean, Audible, Deezer, plus any number of named custom links. **A blank field
shows nothing** on the card or the popup; only `http(s)` links are ever shown.

**Import result (local test copy):** 50 shows, 49 logos, 44 working feeds,
40 Apple links found automatically. Re-importing the same file updates, never
duplicates. Report of what to check by hand: `client-data/podcasts/report.txt`.

**Verified locally (production build, isolated copy of data):** every public
endpoint and all 50 show pages scanned for every contact email and phone — none
found; contact details are not searchable; admin edit saves and shows publicly;
phone layout has no sideways scroll; no page errors.

**How it went live (8 Nov):** production Full Backup → push + Deploy (the
migration ran on start) → Admin → Import → `podcasts-import.zip` → checked.
Re-importing the same ZIP updates, never duplicates.

A new **Labor Podcasts** tab: the Labor Radio Podcast Network (LRPN) directory,
added as a sixth category. It has its own cards, a detail popup, public
submission, and admin add/edit, all working the same way as the other tabs.

- **Phase 1: directory, no player.** Cards, popup, submit, admin, and a
  one-time load of the current shows and logos.
- **Phase 2: listen in place.** The popup lists each show's episodes from its
  RSS feed, and an audio player stays at the bottom of the screen while you
  browse. Built from parts of the PodFeed app (`~/Desktop/podcast-feed`).

> ⚠️ **This repository is public.** The source sheet holds contact names,
> emails and phone numbers for each show. **None of that goes in this file,
> in any tracked file, or in the public API.** The sheet link is left out too.

---

## 1. What we have

### The data: LRPN directory form responses (Google Sheet)

- Sheet *"LRPN Directory Update and Member Engagement Form (Responses)"*, tab
  *Form Responses 1*.
- **50 shows** (responses from 18 Sep to 6 Oct 2026). The network describes
  itself as "200+ shows", so **more will come**. This is a first load, not the
  whole directory, and the way new shows get in matters (§6).

| Sheet column | Public? | Goes to |
|---|---|---|
| Program Name | yes | `title` |
| Program Description | yes | `description` |
| Show's page on its hosting site | yes | `sourceUrl` |
| RSS Feed URL | yes | `metadata.rssUrl` |
| Location | yes | `metadata.location` |
| Program graphic / logo (link) | n/a | used once to get the image, then an `EntryImage` |
| Host(s) and/or Producer(s) | yes | `creator` |
| How often released | yes | `metadata.frequency` (free text, see §4) |
| Is your program currently active? | yes | `metadata.status`: `active` / `occasional` / `hiatus` / `ended` |
| LRPN level (Member / Steward / Builder) | **ask** (§7) | `metadata.lrpnLevel` if public, otherwise private |
| Primary contact name | **no** | `submitterName` (already admin-only) |
| Primary contact email | **no** | `submitterEmail` (already admin-only) |
| Primary contact phone, role | **no** | private field (§3) |
| LRPN activities committed to | **no** | private field (§3) |
| Independence + accuracy acknowledgements | **no** | private field (§3), kept as a record |
| Timestamp | **no** | private field (§3) |

### The logos: `~/Downloads/Labor Radio Podcast Network logos`

- **48 files, 21 MB**: 35 jpg, 11 png, 2 webp.
- **48 of 50 shows match a logo by name.** Missing: **Workers Rising** and
  **Working History** (the Working History feed has artwork we can use).
- Sizes range from 176 px to 3,217 px square. Four files are over 1 MB, and
  two PNGs are about 6 MB each (AAUP Presents, Labor Heritage Power Hour).
  The image upload code keeps the original file at full size, so **resize to
  1,000 px before loading.**
- Nearly all are square. Cards should use a **square** image frame, not the
  2:3 frame used for film posters.
- File names don't always match show names (e.g. `Power At Work 2024.jpg` →
  *The Power Half-Hour*, `OnTheLine.jpg` → *On the Line: Stories of BC
  Workers*). The load script needs a fixed name → file list, checked by eye.
  Don't guess the matches automatically.

### The player: `~/Desktop/podcast-feed` (PodFeed, PHP + plain JS)

It can't be added as-is: it's PHP and plain JavaScript, and this app is
React/TypeScript. **What to reuse is the design and the behaviour**, ported
into React components:

| PodFeed file | What it does | Phase 2 use |
|---|---|---|
| `assets/js/audio-player.js` (824 lines) | play/pause, ±15 s skip, scrubber, speed cycle, volume/mute, keyboard shortcuts, lock-screen controls, remembers position, mini player | **Port**: becomes the bottom player |
| `assets/js/player-modal.js` (1,166 lines) | episode list, search, sort, show-more descriptions, error states, share, download with progress | **Port the episode list, search/sort and error states.** Share uses our `CopyLinkButton`. Download becomes a plain link (§5) |
| `assets/css/player-modal.css`, `custom-audio-player.css` | dark player styling | Reference for the look; rewrite in Tailwind |
| `includes/RssFeedParser.php` | RSS + Atom parsing, iTunes image/duration, latest-episode date, caching | **Reference for edge cases**; rewrite in TypeScript on the server |
| `api/validate-rss-import.php` | checks a feed before import | Reference for the admin "Check feed" button |
| ads, analytics, hosting/upload, menu manager, cloning | — | **Leave out** |

---

## 2. How it fits this app

One `Entry` table holds everything. Podcasts become `category = 'podcast'`, with
show-specific fields in `metadata`, the same way films and music work.

- **Category row:** slug `podcast`, label *Labor Radio/Podcast* (agreed,
  §7), icon `podcast` (Lucide). `seed.ts` only seeds when there are **no**
  categories, so production gets the row from the import ZIP (the ZIP restore
  creates categories, §6) or from the admin categories API. Updating
  `seed.ts` alone does nothing on the live site.
- **No dates:** `month`/`day`/`year` stay empty. Podcasts don't appear in On
  This Day or Related Films & Music. Check that those queries keep filtering by
  category (`server/index.ts` ~755, ~800).
- **Tags:** the existing subject tags fit (Labor History, Organizing, …).
  Admins add them later. No taxonomy change is needed.
- **Search:** works automatically, because `searchAll` covers title, hosts,
  description and metadata. **This is why private data must not go in
  `metadata`** (§3).
- **Shareable links:** `/entry/:id` works for every category. Add a `podcast`
  case to `server/share-meta.ts` so previews read "Labor History Today —
  podcast" and use the logo.

### `metadata` for a podcast

```jsonc
{
  "rssUrl": "https://feed.podbean.com/laborhistorytoday/feed.xml",
  "location": "Washington, DC",
  "frequency": "Weekly",
  "status": "active",          // active | hiatus  (hiatus shows "On Hiatus", §7)
  "badges": ["builder", "founder"], // steward | builder | founder; members get none
  "union": "",                 // union behind the show, if any (filterable, §7)
  "listenLinks": {             // Apple looked up for nearly all, Spotify ~20
    "apple": "", "spotify": "", "youtube": ""
  }
}
```

---

## 3. Private fields: the one design decision with real risk

**Problem.** The sheet has contact phone numbers, roles and engagement
commitments. LHF needs them to run the network, but they must never be public.
Today there are only two places they could go, and neither is safe:

- **`metadata`** is returned by the public API **and** folded into `searchAll`.
  A phone number put there is public, and anyone could find it by searching.
- **`submitterName` / `submitterEmail` / `submitterComment`** are already
  admin-only, and contact name and email belong there. But stuffing phone, role
  and a list of activities into the comment box as text loses the structure
  LHF would want, like "which Builders committed to bumpers?".

**Recommendation:** add one nullable column, `Entry.privateMetadata` (JSON
string). It is admin-only, never added to search, and stripped from public
output.

**Related problem in the current code, to fix at the same time.** The public
"strip the private fields" step is **copied in four places** in
`server/index.ts` (lines ~299, ~712, ~1309, ~1437). Each copy lists the
submitter fields by hand. Adding a fifth private field means editing all four,
and missing one leaks it. Replace them with a single `toPublicEntry()` helper
and add a test that covers **every** public endpoint and category, not just
podcasts: "no response contains `submitter*` or `privateMetadata`."

This is a schema change, so **the backup rule applies** (CLAUDE.md §5): local
`cp prisma/dev.db backups/…` and a production Full Backup before deploying.

```jsonc
// privateMetadata for a podcast. Admin-only, never searched, never public.
{
  "contactPhone": "…",
  "contactRole": "host, producer",
  "activities": ["bumper-produce", "bumper-air", "identify-member", "submit-clips",
                 "producers-meeting", "promote"],
  "lrpnLevel": "builder",                // here instead, if levels stay private
  "acknowledgedIndependence": true,
  "acknowledgedAccuracy": true,
  "formSubmittedAt": "2026-09-22T17:20:11"
}
```

---

## 4. Data clean-up before loading

This is cleaning a prepared file **before** import. Production records are not
touched, because the podcast category is empty, so there is nothing to
overwrite.

| Show | Issue | Fix |
|---|---|---|
| El Cafecito del Día, El Desvío | "RSS" is the Podbean page, not the feed | Probably `feed.podbean.com/<name>/feed.xml`; confirm it loads |
| Shift Change (IAM) | RSS and page are both `iam4.me/podcast` | Find the real feed |
| The Labor Show w/JDoc & Krausey | "has no RSS feed" (live radio) | Leave `rssUrl` empty. Phase 2 shows "Listen on the station" instead |
| The Radical Songbook | page field is a sentence; RSS is a Zeno page | Page = piratebutteradio.com; find the Zeno RSS |
| Roswell Hub | YouTube channel, no audio feed | Directory listing only; link to YouTube |
| Workers Rising | page field is a sentence; "RSS" is a YouTube video feed | Page = East Side Freedom Library podcasts page. Video, not audio |
| Labor Force, Maryland Labor History | page URL missing `https://` | Add it |
| Unite and Win | program has ended | `status: ended`; still listed (a finished series is still worth listening to) |
| Belabored, Working To Live in SW Washington | on hiatus | `status: hiatus` |
| Several | trailing spaces in names ("El Desvio ", "Stick Together ") | Trim. `cleanEntryText` decodes HTML entities but doesn't trim |
| Frequency | free text ("Daily, Weekdays", "Currently in reforming state…") | Keep the text for display. Optionally map to a short set for filtering |

A **"Check feed"** step during preparation should fetch every RSS URL and
report: does it load, show title, episode count, latest episode date. That
catches dead feeds before they're published, and the same code becomes the
admin "Check feed" button and the Phase 2 episode fetcher.

---

## 5. Phase 1: directory, no player

### Front page
- **Tab:** *Labor Podcasts* in `CategoryNav` (icon mapping in
  `CategoryNav.tsx`).
- **Card (`PodcastCard` in `EntryGrid.tsx`):** square logo filling the card top,
  show name (2 lines), hosts (1 line), then a small row with location and
  frequency. A badge only when the show is **On hiatus** or **Ended**, not
  "Active" on every card. Optional *Network Builder / Steward* mark if levels
  are public (§7). Same grid and hover motion as the other tabs.
- **Popup (`EntryDetail.tsx` podcast branch):** large logo beside the name and
  hosts; full description; detail rows for location, how often, status; buttons
  for **Visit show page**, **Copy RSS link**, and listen links if filled; tags;
  Copy link (exists). Phase 2 adds the episode list in this popup.
- **Sort:** Name A–Z / Z–A, Newest added. Phase 2 adds *Latest episode*.
- **Filters (optional):** Active only, Location (US / Canada / Australia /
  International). Wait for LHF before building these.

### Public submission (`SubmissionWizard.tsx`)
A podcast form with the public fields from §1. Contact name and email go in the
existing contact step. Public visitors **can't upload images** (security rule,
CLAUDE.md §10), so ask for a **logo link** like the Google Form does, and an
admin attaches the file. Submissions arrive unpublished in the Review Queue, as
now.

### Admin
- List row in `AdminDashboard.tsx` (logo thumb, name, hosts, status).
- `EditEntryModal` podcast fields, plus a **private section** (contact phone,
  role, level, activities) shown only to admins.
- Logo upload uses the existing `ImageDropzone`.
- Export: podcast columns in XLSX/CSV (Name, Hosts, Location, Frequency,
  Status, Page, RSS). **Private fields only in the admin Full Backup**, never in
  the public JSON feed API.

### Every place a category is hard-coded (checklist)
A grep for `'film'` finds 36 places across these files. Each needs a podcast
case, or the podcast falls through to a generic default:
`EntryGrid`, `EntryDetail`, `SubmissionWizard`, `AdminDashboard`,
`CategoryNav`, `FilterBar`, `ContactModal`, `OnThisDayView` (confirm it
excludes podcasts), `AiSandboxDemo`, `ExportModal`, `server/index.ts`,
`server/share-meta.ts`, plus `admin-help.md` / `AdminHelpPanel` and
`FEATURES.md`.

### Tests (per the Pre-Push Checklist)
- `npm test`: the privacy test (§3) covering all public endpoints and all
  categories; a share-meta case for podcasts.
- `npm run test:browser`: Podcasts tab loads, a card opens its popup, the popup
  shows no contact data, `/entry/:id` for a podcast works.

---

## 6. Loading the first 50 shows

**Use the Full Backup ZIP restore** (`POST /api/admin/import-zip`), with a ZIP
built for the purpose. It is the only existing path that brings **entries,
images and the category row in one step**, and it's additive. It matches on
category + title, and the podcast category is empty, so no existing record can
be overwritten.

1. `scripts/prepare-podcasts-import.ts` (pure, same pattern as
   `prepare-quotes-import.ts`): reads a CSV export of the sheet + the logo
   folder + the fixed name → file list, writes `podcasts-import.zip` with
   `data.json` (category row + 50 entries) and `images/` (logos resized to
   1,000 px). Refuses to write if any show lacks a status, or any name repeats.
   **Inputs and output live in `client-data/podcasts/`** (gitignored). They
   contain contact data. `.gitignore` also blocks `podcasts-import*` and
   `lrpn-*.csv` anywhere in the repo, as a backstop.
2. Restore onto an **isolated copy of live data** locally first, and look at it
   (memory: local testing before push).
3. Production: Full Backup → deploy code → Import ZIP → check the tab →
   publish.
4. After restore, search columns are filled by `syncSearchText` on that path.
   Confirm, otherwise run `npm run backfill:search`.

The ZIP restore must also carry `privateMetadata` if that column is added.
That's a change to the restore code, with a test.

**After the first load:** new shows arrive as public submissions or admin
entries, one at a time. **Ongoing intake is an open question (§7).** LRPN
already runs the Google Form and it collects commitments our form won't. If
the Form stays the front door, a repeat "sync new rows" import is worth
building. If the site's form becomes the front door, it needs the engagement
questions too.

---

## 7. Decisions from LHF (email, 3–5 Nov 2026)

Agreed in the "Network show graphics" thread (Paul's plan of 3 Nov, replies
from Chris 4 Nov and Harold 4 Nov, Chris "all sounds good" 5 Nov):

| Topic | Decision | Effect on the build |
|---|---|---|
| **Tab name** | **Labor Radio/Podcast** (as proposed, not objected to) | Category label. Slug stays `podcast` |
| **Badges** | **Yes**: Network **Steward** and **Builder** get a badge. Plain Members get none | `metadata.badges` is public (overrides §3's "ask") |
| **Network Founder badge** | Harold's request: a **"Network Founder"** badge on **Labor Heritage Power Hour** and **Labor History Today** | Special badge, admin-set. Not from the form |
| **Inactive shows** | **Show them, labelled "On Hiatus"**, so the back catalogue stays reachable. Admin must be able to switch a show back to active and remove the label | Status switch in the admin edit form. "Ended" shows (Unite and Win) also show as On Hiatus unless LHF says otherwise |
| **Intake** | **Google Form stays the way shows join and update.** Paul to add "an easy way to bring those into the database" | Build an admin **"Import new form responses"** step (§6). The public Add form for podcasts is lower priority |
| **Listen links** | Apple Podcasts found automatically for nearly all shows, Spotify for ~20. **Shows without Spotify just show Apple + website.** Shows can send their link if they want it added | Prep script looks up Apple/Spotify. No manual collecting |
| **Subject tags** | **Paul proposes a starter list; LHF reviews.** Harold's ideas: *News, History, Commentary, Local Affairs*, plus **the union behind each show** | See note below |
| **Missing logos** | Chris sent 4 more on 4 Nov (now in the folder). Remaining two (Workers Rising, Working History) come **from their feeds** | Prep script reads the feed's artwork |
| **Embed** | Harold wants this tab **embeddable on laborradionetwork.org**, to replace that site's home page. Paul replied: **Phase 2** | See §8 "Embed" |
| **Player** | Paul to LHF: audio only works for shows with a working standard RSS feed | Already planned (§8) |

**Tags note.** The current 35 tags are *subjects* (Strikes, Mining, …).
Harold's are *show types* (News, Commentary) and *unions* (USW, IAM, SAG-AFTRA…).
Unions shouldn't go in the shared tag list, because they'd crowd the picker for
films and music too. Store them as a podcast field (`metadata.union`) with its
own filter. Show types can be either a small new tag group or a field; decide
when writing the starter list. Any new tag = the two-file edit +
`npm run check:tags` (CLAUDE.md).

**Still open:** is there a list of the other ~150 network shows beyond these
50 form responses?

---

## 8. Phase 2: listen in place

### Server
- `GET /api/podcasts/:id/episodes`: fetches **that entry's stored `rssUrl`
  only**, never a URL sent by the browser. That prevents the server being
  used to fetch arbitrary addresses (SSRF). Timeout ~8 s, size cap, follow at
  most a few redirects, handle RSS and Atom (PodFeed's parser is the
  edge-case list). Returns: title, date, duration, audio URL, episode image,
  description.
- **Cache** each feed for ~30 min (50+ feeds; don't refetch on every popup
  open). A cache table could also hold *latest episode date* per show, for a
  "New this week" card badge and a *Latest episode* sort. Keep it **out of
  `metadata`**, because writing there triggers search re-sync on every refresh.
- **Episode descriptions are HTML from third parties.** Show as text, or
  sanitize (DOMPurify) before rendering. Never insert raw HTML.

### Security headers: this will break in production if forgotten
Helmet's default policy allows audio from **this site only**. Podcast audio
comes from dozens of hosts (Podbean, Buzzsprout, Libsyn, Anchor, Spreaker,
SoundCloud, 3CR, plus tracking redirects like Podtrac/OP3). That's the same
"works locally, broken live" pattern as the YouTube and image issues in
CLAUDE.md. Needed:
- `media-src 'self' https:`
- `img-src` gains `https:` for episode artwork, or artwork goes through the
  server.
- **Test with the production build** (`npm run build` + server), not
  `npm run dev`, which sends no security headers.

Playback needs no proxy: an `<audio>` element can play from another site
without permission headers. **Download progress** (PodFeed's fetch + blob
method) does need those headers, and many hosts don't send them. Use a plain
download link. The progress popup is not worth the trouble.

### Player (ported from PodFeed)
- **`PlayerContext` at the App level**, so audio keeps playing when you close
  the popup, switch tabs or search.
- **Bottom bar:** artwork, episode + show name, play/pause, −15/+30 s,
  scrubber with times, speed (1× → 1.25 → 1.5 → 2 → 0.75), volume. Collapses
  to a mini bar on phones.
- **Lock-screen / headphone controls** (Media Session API, in
  `audio-player.js`).
- **Remembers position** per episode (localStorage, wrapped in try/catch).
- **In the popup:** latest episodes first, episode search, sort, show more
  descriptions, a clear error when a feed is down (PodFeed's messages are good;
  reuse the wording).
- **Shows with no feed** (Labor Show, Roswell Hub): no episode list; a
  "Listen at the source" button instead.

### Embed on laborradionetwork.org (Harold's request, agreed for Phase 2)
- A stripped page, e.g. `/embed/podcasts`: cards + popup only, no site header
  or menu, so it fits inside the LRPN home page via `<iframe>`.
- **Security headers block this today.** Helmet sends
  `X-Frame-Options: SAMEORIGIN` and `frame-ancestors 'self'`, so no other site
  can frame any page. Allow framing **only on the embed route** and **only
  for** `https://www.laborradionetwork.org` (and the bare domain), not
  site-wide.
- LHF then edits shows in one place (this admin) and the LRPN home page
  updates itself.

### Later ideas (not planned)
- Labor History Today and *On This Day in Working Class History* are daily
  history shows. Their episodes could appear on matching On This Day pages.
- Embed an LRPN Daily/Weekly "latest episode" on the landing page.

---

## 9. Order of work

1. LHF answers §7 (Q1–3 shape the cards; Q4 shapes the form).
2. Phase 1 code: `toPublicEntry()` + privacy test → `privateMetadata`
   migration (backup first) → card, popup, form, admin, export, share-meta →
   tests.
3. Prepare + check feeds + build the import ZIP → restore on a copy of live
   data → review with LHF.
4. Deploy (Paul presses Deploy) → Full Backup → Import ZIP → publish.
5. Phase 2: episodes endpoint + cache → security headers → player → tests on
   the production build.
