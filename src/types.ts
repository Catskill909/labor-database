export interface Entry {
  id: number;
  category: string;
  title: string;
  description: string;
  month: number | null;
  day: number | null;
  year: number | null;
  creator: string | null;
  metadata: string | null;
  tags: string | null;
  sourceUrl: string | null;
  isPublished: boolean;
  submitterName?: string | null;
  submitterEmail?: string | null;
  submitterComment?: string | null;
  images: EntryImage[];
  createdAt: string;
  updatedAt: string;
}

export interface EntryImage {
  id: number;
  entryId: number;
  filename: string;
  caption: string | null;
  sortOrder: number;
  url?: string;
  thumbnailUrl?: string;
}

export interface Category {
  id: number;
  slug: string;
  label: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface RelatedLink {
  label: string;
  url: string;
}

// Helper to parse metadata JSON safely
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMetadata(entry: Entry): Record<string, any> {
  if (!entry.metadata) return {};
  try {
    return JSON.parse(entry.metadata);
  } catch {
    return {};
  }
}

// Safe RelatedLink[] getter for metadata
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRelatedLinks(meta: Record<string, any>): RelatedLink[] {
  const val = meta.relatedLinks;
  if (!Array.isArray(val)) return [];
  return val.filter(
    (item: unknown): item is RelatedLink =>
      typeof item === 'object' && item !== null &&
      typeof (item as RelatedLink).label === 'string' && typeof (item as RelatedLink).url === 'string'
  );
}

// Parse moreResearch text into structured sections
export function parseSections(text: string): { quickFacts: string; keyPeople: string; additionalNotes: string } {
  if (!text) return { quickFacts: '', keyPeople: '', additionalNotes: '' };
  const lines = text.split('\n');
  let currentSection = 'notes';
  const sectionLines: Record<string, string[]> = { facts: [], people: [], notes: [] };
  for (const line of lines) {
    const lower = line.trim().toLowerCase().replace(/:$/, '');
    if (lower.startsWith('quick fact')) { currentSection = 'facts'; continue; }
    if (lower.startsWith('key people') || lower.startsWith('key org')) { currentSection = 'people'; continue; }
    if (lower.startsWith('additional note') || lower.startsWith('context') || lower.startsWith('background')) { currentSection = 'notes'; continue; }
    sectionLines[currentSection].push(line);
  }
  return {
    quickFacts: sectionLines.facts.join('\n').trim(),
    keyPeople: sectionLines.people.join('\n').trim(),
    additionalNotes: sectionLines.notes.join('\n').trim(),
  };
}

// Rebuild moreResearch from structured sections — all sections get explicit headers
export function rebuildMoreResearch(facts: string, people: string, notes: string): string {
  const parts: string[] = [];
  if (facts.trim()) parts.push(`Quick Facts:\n${facts.trim()}`);
  if (people.trim()) parts.push(`Key People & Organizations:\n${people.trim()}`);
  if (notes.trim()) parts.push(`Additional Notes:\n${notes.trim()}`);
  return parts.join('\n\n');
}

// Format date from entry fields
export function formatEntryDate(entry: Pick<Entry, 'month' | 'day' | 'year'>): string {
  const parts: string[] = [];
  if (entry.month) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    parts.push(monthNames[entry.month - 1] || String(entry.month));
  }
  if (entry.day) parts.push(String(entry.day));
  if (entry.year) parts.push(String(entry.year));
  return parts.join(' ');
}
