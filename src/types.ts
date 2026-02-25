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

// Helper to parse metadata JSON safely
export function parseMetadata(entry: Entry): Record<string, string | undefined> {
  if (!entry.metadata) return {};
  try {
    return JSON.parse(entry.metadata);
  } catch {
    return {};
  }
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
