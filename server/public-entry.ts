/**
 * Fields on `Entry` that only admins may see. Every public endpoint must pass
 * entries through `toPublicEntry()` before sending them.
 *
 * Adding a private column to the Entry model? Add it here too.
 * `public-entry.test.ts` reads schema.prisma and fails if a `submitter*` or
 * `private*` column is missing from this list.
 */
export const PRIVATE_ENTRY_FIELDS = [
    'submitterName',
    'submitterEmail',
    'submitterComment',
    'privateMetadata',
] as const;

export type PrivateEntryField = typeof PRIVATE_ENTRY_FIELDS[number];

/** A copy of the entry without its admin-only fields. */
export function toPublicEntry<T extends object>(entry: T): Omit<T, PrivateEntryField> {
    const copy = { ...entry } as Record<string, unknown>;
    for (const field of PRIVATE_ENTRY_FIELDS) delete copy[field];
    return copy as Omit<T, PrivateEntryField>;
}
