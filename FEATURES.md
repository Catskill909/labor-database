# Labor Arts & Culture Database — Features

**What the database does today, for the people who use it.**
Built for the Labor Heritage Foundation. Live at
**https://labor-database.supersoul.top**

*Last updated 28 September 2026. Counts are published entries on the live site.*

| Collection | Entries |
|---|---:|
| Labor History | 1,446 |
| Labor Quotes | 2,458 |
| Films | 2,194 |
| Music | 444 |
| **Total** | **6,542** |

This document has three parts:

1. [**For visitors**](#1-for-visitors) — what anyone on the public site can do
2. [**For LHF editors**](#2-for-lhf-editors) — the admin dashboard
3. [**For developers and maintainers**](#3-for-developers-and-maintainers) — the public API, and the tools that have no button

A short list of what is **not** built yet is at the end, so nothing here is
mistaken for a promise.

---

## 1. For visitors

### On This Day — the front page

The site opens on today's date and shows everything the collection holds for it.

- **Labor History** — events that happened on this day, with the full date.
- **Labor Quotes** — quotes featured on this calendar date.
- **Related Films** and **Related Music** — up to 5 films and 4 songs chosen
  because they share **subject tags** with the day's history, with rarer,
  more specific subjects counting for more. Each card shows the tags it shares,
  so it is clear why it is there. (On days whose history has no tags, the
  panel falls back to matching by year.)
- **Calendar** — jump to any day; days with entries are marked with a dot.
- **Keyboard** — `←` / `→` previous and next day, `t` back to today,
  `Esc` closes the calendar.

### Browse and search

- **Tabs for each collection** — History, Quotes, Music, Films.
- **One search box across everything** — titles, names, descriptions, tags and
  details. Typing a search switches from On This Day to results.
- **Search forgives the way people actually type.** Capitals, accents and curly
  apostrophes do not matter: *misère*, *Misère* and *MISÈRE* find the same film;
  *farmers'* and *farmers’* return the same results. Alternate and translated
  film titles held in the title are searchable too (*Misère au Borinage*).
- **Filters** by subject tag, and per collection: month, day and year for
  history; author for quotes; title or artist, and genre, for music; title or
  director, genre and year for films.
- **Sorting** — newest or oldest added, title A–Z, and a sort that suits each
  collection: event date for history, author for quotes, artist or year for
  music, director or year for films.
- **Tag links** — click any tag on an entry to see everything else with it.

### Entry pages

Click any card to open the full entry.

- **History** — full date, full description, images, sources.
- **Quotes** — the full quote and its author.
- **Music** — performer, songwriter, genre, running time, lyrics, and an
  embedded YouTube player where one is known.
- **Films** — poster, synopsis, director, writers, cast, running time, country,
  genre, an embedded trailer, and curator notes.
- **Research** — where editors have added them: a Wikipedia link, related links,
  and further context.
- **Images** open full-screen when clicked.

### Contact & Corrections

- **On every entry**, a mail button in the bottom-right corner opens
  *Contact & Corrections* with that entry already identified. **Write to us**
  opens the visitor's email program with a short template addressed to
  info@laborheritage.org. The template names the entry the way a reader
  recognises it — a film by title, year and director; a song by title and
  performer; a quote by its author; a history entry by its date — plus a
  reference number that finds the exact record.
- **From the site menu**, the same form opens without an entry, for general
  questions, missing items and broken links.

### Add to the Database

- Anyone can **suggest a new entry** — history, quote, song or film — through a
  step-by-step form. Film and music forms can **search TMDB and Genius** and
  fill in the details automatically.
- Suggestions go to the **Review Queue**. Nothing a visitor submits appears on
  the site until an editor publishes it.
- Submitters can leave their name, email and a comment. **These are never shown
  publicly** — only editors see them.

### Also on the site

- **About** and **Privacy Policy** pages.
- Links to the **Labor Heritage Foundation** and **Labor Landmarks**.
- Works on phones and tablets.

---

## 2. For LHF editors

The admin dashboard is at **`/admin`** and needs the admin password.

### Managing entries

- **Published** and **Review Queue** counters — click either to filter the list
  to it.
- **Search, filter and sort** every entry, published or not.
- **Preview** any entry exactly as the public sees it.
- **Publish / unpublish** with one click.
- **Edit** — the form matches the collection: quote, song, film or history
  fields, plus tags and research fields.
- **Delete**, with a confirmation step.
- **Submitter info** — a purple icon on visitor-submitted entries shows the
  submitter's name, email and comment.

### Adding entries

- The same step-by-step form as the public site, without the contact step.
- **Films:** search **TMDB** to fill in title, year, director, cast, synopsis and
  poster. The poster is downloaded and stored with the entry.
- **Music:** search **Genius** to fill in artist, songwriter and year, with
  **lyrics** and a suggested **YouTube** link. Every field stays editable.
- **Images:** upload images to any entry.
- **Tags:** pick from the subject taxonomy — 35 terms in four groups: *Theme*,
  *Industry*, *Social Dimension*, and *Curation* (which holds
  *Festival Watchlist*).

### Research tools

- **Research & Links** fields on every entry: Wikipedia link, related links, and
  a free-text notes area that displays as tidy sections.
- **AI research assistant** — *Scan with AI* suggests context, links and tags for
  an entry. Editors review every suggestion and choose what to keep; nothing is
  saved automatically.

### Export, backup and import

- **Export** in four formats, for everything or one collection:
  - **JSON** — complete data
  - **Excel (XLSX)** — one sheet per collection, readable columns
  - **CSV** — for spreadsheets and other tools
  - **Full backup (ZIP)** — all data plus every image. This is the file that
    restores the whole database on a new server.
- **Import** — a JSON file of entries, or a full backup ZIP.
- **API reference** — built-in documentation of the public API (see part 3).

> ⚠️ **Import updates by title.** An imported entry whose title matches an
> existing one *overwrites* it rather than being skipped. Prepared bulk imports
> are checked against a fresh export first. For a handful of fixes, edit the
> entries by hand instead.

> ⚠️ **Reset Database** deletes everything. It asks for confirmation. Take a
> full backup first.

---

## 3. For developers and maintainers

### Public API — no key required

Documented in the admin **API reference**. All read-only, all published data.

| Endpoint | Returns |
|---|---|
| `GET /api/entries` | Entries — `category`, `search`, `tag`, `month`, `day`, `year`, `creator`, `genre`, `sort`, `limit`, `offset` |
| `GET /api/entries/:id` | One entry |
| `GET /api/entries/counts` | Counts per collection |
| `GET /api/entries/filter-options` | Values for the filter menus |
| `GET /api/on-this-day?month=&day=` | A day's history and quotes, with related films and music |
| `GET /api/on-this-day/calendar?month=` | Which days of a month have entries |
| `GET /api/categories`, `GET /api/tags` | The collection list and tag taxonomy |
| `GET /api/feed.json` | **JSON Feed 1.1** — for feed readers and other sites |
| `GET /api/health` | Server and database status |

Submitter contact details are stripped from every public response.

### Tools with no button

These exist on the server but have **no control in the admin dashboard**. They
are run by a developer, and each **writes to the database — back up first.**

- **Tag statistics** — `GET /api/admin/tags/stats`
- **Tag normalisation** — `POST /api/admin/tags/normalize` (maps legacy and
  variant tag names onto the taxonomy)
- **Auto-tagging** — `POST /api/admin/tags/auto-tag` (suggests tags for untagged
  entries)
- **Scripts** in `scripts/` — data preparation, enrichment, search-index
  backfill, and `npm run check:tags`. After running any script that writes
  entries, run `npm run backfill:search`.

### Where the rules live

- **`CLAUDE.md`** — permanent project rules: build checks, backups, the search
  index, tags, imports.
- **`HANDOFF.md`** — current state, open work, and what is waiting on the client.
- **`README.md`** — standing the app up on a server.

---

## Not built yet

Recorded so nobody reads the list above as more than it is.

- **Shareable links to individual entries.** Entries have no web address of
  their own yet, which is why the correction email carries a reference number.
- **Adding new tags without a developer.** The taxonomy is fixed in code;
  a new tag currently needs a code change and a deploy.
- **An in-site correction form with review.** Corrections arrive by email today.
  A form with before-and-after review is deferred until corrections arrive in
  real numbers.
- **Pinning or overriding a related film or song** on a particular day.
- **A dedicated alternate-titles field for films** whose other title is not
  already in the title.
