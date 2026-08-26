# Labor Quotes scrape — working artifacts

Supporting data for [`labor-quotes-dev.md`](../../labor-quotes-dev.md) (repo root).
Produced August 26, 2026. **Planning artifacts — nothing here has been imported.**

## Files

| File | What it is |
|---|---|
| `prototype-extractor.py` | Throwaway Python parser used to produce the measurements in the plan doc. **Not production code** — the real importer is specced as `scripts/scrape-laborquotes.ts`. Reads from `cache/`, so it re-runs offline. |
| `quotes-raw.json` | All 1,388 extracted rows (701 unique + author/topic duplicates). Each row: `page`, `section`, `quote`, `attribution`, `key`. |
| `genuinely-new.json` | The 559 quotes with no match in the current database — the actual import candidates. |
| `db-quotes-export.json` | Read-only export of the existing 1,916 `category='quote'` entries from `prisma/dev.db`, used as the dedup baseline. **Derived data — regenerate rather than trust it; production may differ.** |
| `cache/` | 33 raw HTML pages fetched from the source site, so re-parsing needs no network and no extra load on their server. |

## Known defects in the prototype

- **Image counts are wrong.** It attributed any image in a containing element to every quote inside it (reported 1,336; the real number is unmeasured). Ignore image fields entirely.
- **277 content blocks are unclassified.** Blocks that didn't match the `<strong>`/`<em>` rule. A mix of real quotes authored without `<strong>` and non-quote page prose — nobody has separated them yet. This is Phase 2 in the plan.
- **Attribution is a single unsplit blob.** `attribution` mixes name, role, and publication. Splitting it into `creator` + `metadata.source` is Phase 4.

## Reproducing

```bash
cd docs/labor-quotes && python3 prototype-extractor.py
```

Uses `cache/` if present; otherwise re-fetches at 1 req/sec. Writes `quotes-raw.json`.

## Note on git

These files total ~3.1MB and include third-party page content plus a dump of our own quote
table. Consider whether they belong in the repo — see the gitignore discussion in the plan doc.
`data-import.md`, the closest precedent for this kind of analysis, is gitignored.
