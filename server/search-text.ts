/**
 * Search Text Normalization
 *
 * SQLite's LIKE is case-insensitive only for ASCII A–Z. For anything else —
 * accented Latin ("MISÈRE" vs "misère"), curly punctuation ("don’t" vs "don't")
 * — a LIKE against the raw column silently fails to match. Roughly 1 in 7
 * entries in this database contains such a character.
 *
 * The fix is a set of shadow columns holding a folded copy of each entry's text.
 * Both the stored copy and the incoming query run through normalizeSearchText(),
 * so they meet in the same character space and plain LIKE works again.
 *
 * Stored values are padded with a leading and trailing space so that whole-word
 * patterns ('% word %') also match terms at the start and end of the string.
 */

/**
 * Fold a string into the search character space:
 *   NFD-decompose → strip combining marks → lowercase → all non-alphanumerics
 *   collapse to single spaces.
 *
 * Letters and digits of every script are preserved (\p{L}/\p{N}), so non-Latin
 * titles stay searchable; only punctuation and symbols are dropped. This also
 * subsumes the punctuation folding the search SQL used to do inline, including
 * the curly apostrophe it missed.
 */
export function normalizeSearchText(input: string): string {
    return input
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

/**
 * Normalize a single query term for use in a LIKE pattern.
 * Returns '' when the term folds away entirely (e.g. a lone "?" or "—") —
 * callers must skip those, since '%  %' would match every row.
 */
export function normalizeQueryTerm(term: string): string {
    return normalizeSearchText(term);
}

/** Wrap a normalized value in the padding used by the stored columns. */
function pad(value: string): string {
    return ` ${value} `;
}

/** The subset of Entry fields the search columns are derived from. */
export interface SearchSourceFields {
    title?: string | null;
    creator?: string | null;
    description?: string | null;
    tags?: string | null;
    metadata?: string | null;
}

/** The shadow columns written alongside every entry. */
export interface SearchFields {
    searchTitle: string;
    searchCreator: string;
    searchDescription: string;
    searchAll: string;
}

/**
 * Build the shadow columns for an entry.
 *
 * searchAll concatenates every searchable field, so it alone is sufficient for
 * the WHERE clause; the three narrower columns exist to preserve the existing
 * result ranking (exact title > title > creator > description).
 */
export function buildSearchFields(entry: SearchSourceFields): SearchFields {
    const title = normalizeSearchText(entry.title ?? '');
    const creator = normalizeSearchText(entry.creator ?? '');
    const description = normalizeSearchText(entry.description ?? '');
    const tags = normalizeSearchText(entry.tags ?? '');
    const metadata = normalizeSearchText(entry.metadata ?? '');

    return {
        searchTitle: pad(title),
        searchCreator: pad(creator),
        searchDescription: pad(description),
        searchAll: pad([title, creator, description, tags, metadata].filter(Boolean).join(' ')),
    };
}
