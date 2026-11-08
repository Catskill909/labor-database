/**
 * Shareable entry links: `/entry/123-take-this-job-and-shove-it`.
 *
 * The number finds the record; the words after it are only for people reading
 * the link. Titles repeat (71 published entries share a title with another) and
 * get edited, so the words are never used to look anything up — a link with
 * stale or missing words still opens the right entry, and the server redirects
 * it to the current form.
 *
 * Pure functions, no Node or DOM APIs: the browser app imports this file too,
 * so the links it copies and the links the server accepts cannot drift apart.
 */

export const ENTRY_PATH_PREFIX = '/entry/';

/** Longest name part of a link, in characters. Cut at a word boundary. */
const MAX_SLUG_LENGTH = 60;

/** Largest id accepted. SQLite INTEGER ids here are far below this. */
const MAX_ENTRY_ID = 2_147_483_647;

export interface LinkableEntry {
    id: number;
    category: string;
    title: string;
    creator?: string | null;
}

/**
 * Lowercase ASCII words joined by hyphens. Accents are folded ("Misère" →
 * "misere"), apostrophes dropped ("Don't" → "dont"), everything else that is
 * not a letter or digit becomes a word break. Text with no Latin letters or
 * digits gives an empty string, and the link is then just the number.
 */
export function slugify(text: string, maxLength = MAX_SLUG_LENGTH): string {
    const slug = text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/['’‘`]/g, '')
        .replace(/(\d)[,.](?=\d)/g, '$1') // "10,000" → "10000", "1.5" → "15"
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (slug.length <= maxLength) return slug;
    const cut = slug.slice(0, maxLength + 1);
    const lastBreak = cut.lastIndexOf('-');
    // One very long word with no break: hard cut rather than return nothing.
    return (lastBreak > 0 ? cut.slice(0, lastBreak) : slug.slice(0, maxLength)).replace(/-+$/, '');
}

/**
 * The words a person would recognise the entry by. A quote's `title` is the
 * quote itself (often cut to 120 characters on older rows), so quotes are
 * named by their author, as the detail popup heads them.
 */
function linkName(entry: LinkableEntry): string {
    const creator = entry.creator?.trim() ?? '';
    if (entry.category === 'quote' && creator) return creator;
    return entry.title?.trim() ?? '';
}

/** The canonical path for an entry, e.g. `/entry/123-salt-of-the-earth`. */
export function entryPath(entry: LinkableEntry): string {
    const slug = slugify(linkName(entry));
    return `${ENTRY_PATH_PREFIX}${entry.id}${slug ? `-${slug}` : ''}`;
}

/**
 * The entry id from the `:ref` part of `/entry/:ref`, or null when it is not a
 * valid reference. Only the leading number counts; whatever follows a hyphen
 * is ignored. "123abc", "0", "-5" and "" are not references.
 */
export function parseEntryRef(ref: string | undefined | null): number | null {
    if (!ref) return null;
    const match = /^([1-9]\d{0,9})(?:-.*)?$/s.exec(ref);
    if (!match) return null;
    const id = Number(match[1]);
    return id <= MAX_ENTRY_ID ? id : null;
}
