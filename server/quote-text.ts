/**
 * Quote marks around a quote's text, for places that add their own marks.
 *
 * About 1 in 3 stored quotes (imported over the years) already carry their own
 * marks — "…", “…” or a mix — and the rest don't. A page that always wraps the
 * text in “…” therefore showed two sets on those: “"Always aim high…"”.
 * The stored text is left alone; pages decide here instead.
 *
 * Only double marks count. Single ones (‘ ’ ') are mostly apostrophes —
 * "workers'" — and stripping them would eat real text.
 */
// ″ (double prime) and a backwards ” at the start both occur in the stored data
// as stand-ins for quote marks, so they count too.
const DOUBLE_MARKS = /["“”„″]/;
const OPENING = /^["“”„″]/;
const CLOSING = /["”“″]$/;

/**
 * The text without its outer marks when the whole text is one quotation
 * ("…" with no other double marks inside), otherwise null.
 */
export function unwrapQuote(text: string): string | null {
    const t = text.trim();
    if (t.length < 3 || !OPENING.test(t) || !CLOSING.test(t)) return null;
    const inner = t.slice(1, -1).trim();
    if (!inner || DOUBLE_MARKS.test(inner)) return null; // e.g. "a" said b "c"
    return inner;
}

/**
 * The text as it should appear inside a page's own quote marks.
 * `addMarks` is false when the text starts with marks the page can't safely
 * remove — e.g. `"…wild beast." (referring to Martin Irons)` — so it is shown
 * exactly as stored rather than with a second set around it.
 */
export function quoteForDisplay(text: string): { text: string; addMarks: boolean } {
    const inner = unwrapQuote(text);
    if (inner !== null) return { text: inner, addMarks: true };
    const t = text.trim();
    if (OPENING.test(t)) return { text: t, addMarks: false };
    // Only a closing mark (about 100 stored quotes end `…purchased.”` with no
    // opening one): drop the stray mark, unless the text quotes something inside.
    if (CLOSING.test(t)) {
        const rest = t.slice(0, -1).trimEnd();
        return DOUBLE_MARKS.test(rest) ? { text: t, addMarks: false } : { text: rest, addMarks: true };
    }
    return { text: t, addMarks: true };
}
