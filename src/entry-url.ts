import type { Entry } from './types.ts';
import { entryPath } from '../server/entry-link.ts';

export { entryPath, parseEntryRef } from '../server/entry-link.ts';

/** The full shareable address of an entry, on whatever site is serving it. */
export function entryUrl(entry: Entry): string {
  return `${window.location.origin}${entryPath(entry)}`;
}
