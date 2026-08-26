/**
 * Field mapping for restoring an entry from a Full Backup ZIP.
 *
 * This exists as its own module for one reason: the importer used to build the
 * create payload inline, and it silently dropped `createdAt` and `updatedAt`.
 * The export writes them (it selects every scalar column), so the data was in
 * every ZIP ever taken - the importer just threw it away and let Prisma's
 * `@default(now())` stamp the import date instead.
 *
 * That is not cosmetic. `createdAt` is the default browse order, backs the
 * "Newest"/"Oldest" sort options, and supplies `date_published` /
 * `date_modified` in the JSON Feed. A restored database sorted arbitrarily and
 * published every entry as though written on the day of the restore.
 *
 * The failure mode is worth naming: a backup that restores *looking* correct
 * while having quietly lost a column is the worst kind, because nothing fails.
 * The test beside this file derives the expected fields from the Prisma schema
 * rather than from a list kept here, so a column added to Entry and forgotten
 * here fails the build instead of surfacing after a disaster.
 */

/** Columns deliberately not carried across, and why. */
export const NOT_RESTORED = {
    id: 'reassigned by autoincrement; images are rewritten to the new id',
    searchTitle: 'refolded from the restored rows by syncSearchText()',
    searchCreator: 'refolded from the restored rows by syncSearchText()',
    searchDescription: 'refolded from the restored rows by syncSearchText()',
    searchAll: 'refolded from the restored rows by syncSearchText()',
} as const;

/** A date that survived JSON: ISO string in, Date out, undefined if absent. */
function restoreDate(value: unknown): Date | undefined {
    if (typeof value !== 'string' && !(value instanceof Date)) return undefined;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Build the `data` for `entry.create()` from one entry in a backup payload.
 *
 * `undefined` timestamps are left out so Prisma applies its defaults - which is
 * correct for a payload from an older export that predates this fix.
 */
export function entryCreateData(item: Record<string, unknown>) {
    return {
        category: item.category as string,
        title: item.title as string,
        description: item.description as string,
        month: item.month as number | null,
        day: item.day as number | null,
        year: item.year as number | null,
        creator: item.creator as string | null,
        metadata: item.metadata as string | null,
        tags: item.tags as string | null,
        sourceUrl: item.sourceUrl as string | null,
        isPublished: item.isPublished !== false,
        submitterName: item.submitterName as string | null,
        submitterEmail: item.submitterEmail as string | null,
        submitterComment: item.submitterComment as string | null,
        createdAt: restoreDate(item.createdAt),
        updatedAt: restoreDate(item.updatedAt),
    };
}
