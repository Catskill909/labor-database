/**
 * Related Films & Music — topical matching for On This Day.
 *
 * What this replaces: films and music used to be selected because their `year`
 * equalled the year of one of the day's history events, ordered oldest-first and
 * capped at 20 shared across both categories. That is coincidence, not
 * connection — a 1933 film beside a 1933 event — and it is what the client
 * asked us to fix ("shared subject tags rather than matching by year").
 *
 * Why a plain "shares a tag" filter is not enough: with 34 canonical terms over
 * ~5,950 entries, sharing a tag is close to existing. Measured across all 366
 * days, "shares at least one tag with the day's history" returns an average of
 * 781 films per day and as many as 1,686 — 77% of the film catalogue.
 *
 * So candidates are RANKED rather than filtered, by how *distinctive* the shared
 * tags are. Tag frequency is heavily skewed — "Working Class" sits on 825
 * entries, "Domestic Workers" on 38 — so sharing a rare tag is strong evidence
 * of a real connection and sharing a common one is nearly none. Each shared tag
 * contributes 1/frequency, which means both rarer tags and more of them score
 * higher.
 *
 * Year survives only as a tiebreak between otherwise equally-scored entries.
 */

/** Split the comma-separated `Entry.tags` column into trimmed, non-empty terms. */
export function splitTags(tags: string | null | undefined): string[] {
    if (!tags) return [];
    return tags.split(',').map(t => t.trim()).filter(Boolean);
}

/** How many of each category a day may show. Films render 5-across, music 4-across. */
export const RELATED_LIMITS: Record<string, number> = { film: 5, music: 4 };

export interface RelatedCandidate {
    id: number;
    category: string;
    tags: string | null;
    year: number | null;
}

export interface RankedRelated<T> {
    entry: T;
    /** The day's tags this entry shares — surfaced in the UI so the pairing explains itself. */
    matchedTags: string[];
    score: number;
}

/**
 * Build the tag → number-of-published-entries map used for rarity weighting.
 * Frequencies come from the whole published corpus, not from the day, so a
 * tag's weight is stable regardless of which day is being viewed.
 */
export function buildTagFrequency(entries: { tags: string | null }[]): Map<string, number> {
    const freq = new Map<string, number>();
    for (const e of entries) {
        for (const tag of splitTags(e.tags)) {
            freq.set(tag, (freq.get(tag) ?? 0) + 1);
        }
    }
    return freq;
}

/**
 * Rank candidates against the day's tag set and cap each category.
 *
 * Returns a per-category map, each list ordered by:
 *   1. score descending — rarer and more numerous shared tags first
 *   2. year match — a tiebreak only, never a reason on its own
 *   3. oldest first — a stable, meaningful order for genuine ties
 *
 * An entry sharing no tag with the day scores nothing and is dropped. When
 * `dayTags` is empty every candidate is dropped, and the caller is expected to
 * fall back to year matching (12 days in the current data have history entries
 * carrying no tags at all).
 */
export function rankRelated<T extends RelatedCandidate>(options: {
    candidates: T[];
    dayTags: Set<string>;
    tagFrequency: Map<string, number>;
    matchedYears: number[];
    /** Entries already shown in the day's own sections — never repeat them below. */
    excludeIds: Set<number>;
    limits?: Record<string, number>;
}): Record<string, RankedRelated<T>[]> {
    const { candidates, dayTags, tagFrequency, matchedYears, excludeIds } = options;
    const limits = options.limits ?? RELATED_LIMITS;

    if (dayTags.size === 0) return {};

    const years = new Set(matchedYears);

    const scored = candidates
        .filter(c => !excludeIds.has(c.id))
        .map(entry => {
            const matchedTags = splitTags(entry.tags).filter(t => dayTags.has(t));
            // A tag absent from the frequency map would be a tag on no published
            // entry, which cannot happen for a candidate that carries it — but
            // default to 1 rather than divide by zero if the map is ever stale.
            const score = matchedTags.reduce((sum, t) => sum + 1 / (tagFrequency.get(t) || 1), 0);
            return { entry, matchedTags, score, yearMatch: entry.year !== null && years.has(entry.year) };
        })
        .filter(c => c.matchedTags.length > 0)
        .sort((a, b) =>
            b.score - a.score ||
            Number(b.yearMatch) - Number(a.yearMatch) ||
            (a.entry.year ?? Number.MAX_SAFE_INTEGER) - (b.entry.year ?? Number.MAX_SAFE_INTEGER));

    const byCategory: Record<string, RankedRelated<T>[]> = {};
    for (const c of scored) {
        const limit = limits[c.entry.category];
        if (limit === undefined) continue;
        const bucket = (byCategory[c.entry.category] ??= []);
        if (bucket.length >= limit) continue;
        bucket.push({ entry: c.entry, matchedTags: c.matchedTags, score: c.score });
    }
    return byCategory;
}
