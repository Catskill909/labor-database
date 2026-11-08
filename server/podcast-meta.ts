// Labor Radio/Podcast: shared definitions for the card, the popup and the admin
// form (the frontend re-exports this from src/podcast.ts).
// Pure functions only — tested in server/podcast-meta.test.ts.
//
// Public fields live in Entry.metadata (JSON). Contact details live in
// Entry.privateMetadata, which public endpoints never return.

/** Listening platforms offered in the admin form, in display order. */
export const LISTEN_PLATFORMS = [
  { key: 'apple', label: 'Apple Podcasts' },
  { key: 'spotify', label: 'Spotify' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'youtubeMusic', label: 'YouTube Music' },
  { key: 'amazon', label: 'Amazon Music' },
  { key: 'iheart', label: 'iHeartRadio' },
  { key: 'pocketcasts', label: 'Pocket Casts' },
  { key: 'overcast', label: 'Overcast' },
  { key: 'pandora', label: 'Pandora' },
  { key: 'tunein', label: 'TuneIn' },
  { key: 'soundcloud', label: 'SoundCloud' },
  { key: 'castbox', label: 'Castbox' },
  { key: 'podbean', label: 'Podbean' },
  { key: 'audible', label: 'Audible' },
  { key: 'deezer', label: 'Deezer' },
] as const;

export type ListenPlatformKey = typeof LISTEN_PLATFORMS[number]['key'];

export const PODCAST_BADGES = [
  { key: 'founder', label: 'Network Founder' },
  { key: 'builder', label: 'Network Builder' },
  { key: 'steward', label: 'Network Steward' },
] as const;

export type PodcastBadgeKey = typeof PODCAST_BADGES[number]['key'];

export type PodcastStatus = 'active' | 'hiatus';

/** A link the admin added that is not one of the named platforms. */
export interface ExtraLink { label: string; url: string }

export interface PodcastMeta {
  rssUrl?: string;
  location?: string;
  frequency?: string;
  status?: PodcastStatus;
  badges?: PodcastBadgeKey[];
  union?: string;
  listenLinks?: Partial<Record<ListenPlatformKey, string>>;
  extraLinks?: ExtraLink[];
}

/** Contact details and network commitments. Admin-only. */
export interface PodcastPrivate {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactRole?: string;
  lrpnLevel?: string;
  activities?: string;
  formSubmittedAt?: string;
  notes?: string;
}

/**
 * The URL if it is a real web address, otherwise null. Blank fields, typos and
 * anything that is not http(s) — `javascript:` in particular — are dropped, so
 * a bad value in the admin form can never become a link on the page.
 */
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let text = value.trim();
  if (!text) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = `https://${text}`; // "iam4.me/podcast"
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    // new URL() throws on text that is not a URL at all; that is the
    // "not a link" answer this function exists to give.
    return null;
  }
}

/** Parse metadata JSON into PodcastMeta; anything unreadable gives {}. */
export function parsePodcastMeta(raw: string | null | undefined): PodcastMeta {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value as PodcastMeta : {};
  } catch {
    // Malformed JSON in a stored row should show an empty card section, not
    // break the whole grid.
    return {};
  }
}

export function parsePodcastPrivate(raw: string | null | undefined): PodcastPrivate {
  return parsePodcastMeta(raw) as PodcastPrivate;
}

/** Links to show: only filled-in, valid ones, named platforms first. */
export function visibleListenLinks(meta: PodcastMeta): { key: string; label: string; url: string }[] {
  const out: { key: string; label: string; url: string }[] = [];
  for (const p of LISTEN_PLATFORMS) {
    const url = safeHttpUrl(meta.listenLinks?.[p.key]);
    if (url) out.push({ key: p.key, label: p.label, url });
  }
  (meta.extraLinks ?? []).forEach((link, i) => {
    const url = safeHttpUrl(link?.url);
    const label = typeof link?.label === 'string' ? link.label.trim() : '';
    if (url && label) out.push({ key: `extra-${i}`, label, url });
  });
  return out;
}

/** Badges to show, in a fixed order, ignoring unknown keys. */
export function visibleBadges(meta: PodcastMeta): { key: PodcastBadgeKey; label: string }[] {
  const set = new Set(meta.badges ?? []);
  return PODCAST_BADGES.filter(b => set.has(b.key));
}

export function isOnHiatus(meta: PodcastMeta): boolean {
  return meta.status === 'hiatus';
}

function trimmed(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Tidy a podcast's public metadata before saving: trim text, drop blank and
 * invalid links, keep known badges only. Keys this module doesn't know about
 * are kept as they were, so saving from the form never loses other data.
 */
export function cleanPodcastMeta<T extends PodcastMeta>(meta: T): T {
  const out = { ...meta } as Record<string, unknown>;
  for (const key of ['rssUrl', 'location', 'frequency', 'union'] as const) {
    const value = trimmed(meta[key]);
    if (value) out[key] = value; else delete out[key];
  }
  const rss = safeHttpUrl(meta.rssUrl);
  if (rss) out.rssUrl = rss; else delete out.rssUrl;

  if (meta.status === 'hiatus') out.status = 'hiatus'; else out.status = 'active';

  const known = new Set<string>(PODCAST_BADGES.map(b => b.key));
  const badges = [...new Set((meta.badges ?? []).filter(b => known.has(b)))];
  if (badges.length) out.badges = badges; else delete out.badges;

  const listenLinks: Record<string, string> = {};
  for (const p of LISTEN_PLATFORMS) {
    const url = safeHttpUrl(meta.listenLinks?.[p.key]);
    if (url) listenLinks[p.key] = url;
  }
  if (Object.keys(listenLinks).length) out.listenLinks = listenLinks; else delete out.listenLinks;

  const extraLinks = (meta.extraLinks ?? [])
    .map(l => ({ label: trimmed(l?.label) ?? '', url: safeHttpUrl(l?.url) ?? '' }))
    .filter(l => l.label && l.url);
  if (extraLinks.length) out.extraLinks = extraLinks; else delete out.extraLinks;

  return out as T;
}

/** Same idea for the admin-only fields: trimmed, blanks removed. */
export function cleanPodcastPrivate(value: PodcastPrivate): PodcastPrivate {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    const text = trimmed(raw);
    if (text) out[key] = text;
  }
  return out as PodcastPrivate;
}
