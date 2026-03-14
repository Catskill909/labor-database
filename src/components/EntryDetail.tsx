import { useState } from 'react';
import { X, ExternalLink, Calendar, User, Clock, Globe, Play, MessageSquare, BookOpen, Link2, Users, Lightbulb, FileText } from 'lucide-react';
import type { Entry, RelatedLink } from '../types.ts';
import { parseMetadata, formatEntryDate, getRelatedLinks } from '../types.ts';

interface EntryDetailProps {
  entry: Entry;
  onClose: () => void;
  onTagClick?: (tag: string) => void;
}

// Full month name version for the detail modal
function formatFullDate(entry: Pick<Entry, 'month' | 'day' | 'year'>): string {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const parts: string[] = [];
  if (entry.month) parts.push(monthNames[entry.month - 1] || String(entry.month));
  if (entry.day) parts.push(String(entry.day) + ',');
  if (entry.year) parts.push(String(entry.year));
  return parts.join(' ');
}

// History: title is just a truncated description, so don't show it separately
const isHistoryOrQuote = (cat: string) => cat === 'history' || cat === 'quote';

// Parse moreResearch text into sections by detecting header lines like "Key People & Organizations:"
// Merges duplicate sections with the same normalized title
function parseResearchSections(text: string): { title: string | null; content: string }[] {
  const lines = text.split('\n');
  const sections: { title: string | null; content: string }[] = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    // Detect section headers: lines ending with ":" that are short and not bullet points
    const trimmed = line.trim();
    const isHeader = /^[A-Z][^•\-*\n]{3,60}:$/.test(trimmed);
    if (isHeader) {
      // Save previous section
      if (currentLines.length > 0 || currentTitle) {
        sections.push({ title: currentTitle, content: currentLines.join('\n').trim() });
      }
      currentTitle = trimmed.replace(/:$/, '');
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  // Save last section
  if (currentLines.length > 0 || currentTitle) {
    sections.push({ title: currentTitle, content: currentLines.join('\n').trim() });
  }

  // Merge sections with the same normalized title (e.g., duplicate "Quick Facts")
  const merged: { title: string | null; content: string }[] = [];
  const titleMap = new Map<string, number>(); // normalized title → index in merged array
  for (const section of sections) {
    const key = section.title ? section.title.toLowerCase().replace(/\s+/g, ' ').trim() : null;
    if (key && titleMap.has(key)) {
      const idx = titleMap.get(key)!;
      // Append content, deduplicating lines
      const existingLines = new Set(merged[idx].content.split('\n').map(l => l.trim()).filter(Boolean));
      const newLines = section.content.split('\n').map(l => l.trim()).filter(Boolean);
      const uniqueNew = newLines.filter(l => !existingLines.has(l));
      if (uniqueNew.length > 0) {
        merged[idx].content = merged[idx].content + '\n' + uniqueNew.join('\n');
      }
    } else {
      if (key) titleMap.set(key, merged.length);
      merged.push({ ...section });
    }
  }
  return merged.filter(s => s.content.trim() || s.title);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ResearchDisplay({ meta }: { meta: Record<string, any> }) {
  const wikipediaUrl = typeof meta.wikipediaUrl === 'string' ? meta.wikipediaUrl : '';
  const links: RelatedLink[] = getRelatedLinks(meta);
  const moreResearch = typeof meta.moreResearch === 'string' ? meta.moreResearch : '';

  if (!wikipediaUrl && links.length === 0 && !moreResearch) return null;

  const researchSections = moreResearch ? parseResearchSections(moreResearch) : [];

  return (
    <div className="space-y-4">
      {/* Wikipedia */}
      {wikipediaUrl && (
        <div>
          <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-1.5">
            <BookOpen size={14} className="text-emerald-400" />
            Wikipedia
          </h4>
          <a
            href={wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ExternalLink size={12} />
            {wikipediaUrl.replace(/^https?:\/\/(en\.)?wikipedia\.org\/wiki\//, '').replace(/_/g, ' ')}
          </a>
        </div>
      )}

      {/* Related Links */}
      {links.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-1.5">
            <Link2 size={14} className="text-emerald-400" />
            Related Links
          </h4>
          <div className="flex flex-col gap-1.5">
            {links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ExternalLink size={12} />
                {link.label || link.url}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Research sections — each with its own header */}
      {researchSections.map((section, i) => {
        // Detect if content looks like bullet points (starts with • or -)
        const isBulletContent = section.content && /^[•\-*]/m.test(section.content);
        // Auto-title untitled sections: bullet points → "Quick Facts", plain text → "Additional Notes"
        const title = section.title || (isBulletContent ? 'Quick Facts' : (section.content ? 'Additional Notes' : null));

        return (
          <div key={i}>
            {title && (
              <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-1.5">
                {title.toLowerCase().includes('people') || title.toLowerCase().includes('organization')
                  ? <Users size={14} className="text-amber-400" />
                  : title.toLowerCase().includes('fact')
                    ? <Lightbulb size={14} className="text-amber-400" />
                    : title.toLowerCase().includes('note') || title.toLowerCase().includes('context') || title.toLowerCase().includes('background')
                      ? <FileText size={14} className="text-purple-400" />
                      : <FileText size={14} className="text-emerald-400" />
                }
                {title}
              </h4>
            )}
            {section.content && (
              isBulletContent ? (
                <ul className="text-sm leading-relaxed text-gray-300 space-y-1.5 list-disc list-outside ml-4">
                  {section.content.split('\n').filter(line => line.trim()).map((line, j) => (
                    <li key={j}>{line.replace(/^[•\-*]\s*/, '')}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
                  {section.content}
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

function FilmDetail({ entry, onClose, onTagClick }: EntryDetailProps) {
  const meta = parseMetadata(entry);
  const posterUrl = entry.images?.[0]?.url || entry.images?.[0]?.thumbnailUrl || null;
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Wider modal for films */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between p-6 pb-4 bg-[var(--card)] border-b border-[var(--border)] rounded-t-xl">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-red-400">Film</span>
            <h2 className="text-xl font-bold mt-1 leading-snug">
              {entry.title}
              {entry.year && <span className="text-gray-500 font-normal ml-2">({entry.year})</span>}
            </h2>
            {/* Quick metadata line */}
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-400">
              {entry.creator && <span>{entry.creator}</span>}
              {meta.duration && (
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-gray-500" />
                  {meta.duration}
                </span>
              )}
              {meta.country && (
                <span className="flex items-center gap-1">
                  <Globe size={12} className="text-gray-500" />
                  {meta.country}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors shrink-0 ml-4">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Two-column layout: poster + info */}
          <div className="flex gap-6 flex-col md:flex-row">
            {/* Left column: Poster */}
            {posterUrl && (
              <div className="shrink-0 md:w-56">
                <button
                  onClick={() => setLightboxUrl(posterUrl)}
                  className="rounded-lg overflow-hidden cursor-zoom-in hover:ring-2 hover:ring-white/30 transition-all"
                >
                  <img
                    src={posterUrl}
                    alt={entry.title}
                    className="w-full rounded-lg shadow-lg object-cover"
                  />
                </button>
              </div>
            )}

            {/* Right column: Details */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Genre badges */}
              {meta.genre && (
                <div className="flex flex-wrap gap-1.5">
                  {meta.genre.split(',').map((g: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-400/20 text-slate-300 text-xs font-medium rounded-full">
                      {g.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Synopsis */}
              <div className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
                {entry.description}
              </div>

              {/* Credits table */}
              <div className="space-y-2 text-sm">
                {entry.creator && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 shrink-0 w-20">Director</span>
                    <span className="font-medium">{entry.creator}</span>
                  </div>
                )}
                {meta.writers && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 shrink-0 w-20">Writers</span>
                    <span>{meta.writers}</span>
                  </div>
                )}
                {meta.cast && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 shrink-0 w-20">Cast</span>
                    <span>{meta.cast}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* YouTube trailer — full width below the two-column section */}
          {meta.youtubeId && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Play size={14} className="text-red-400" />
                <span className="text-sm font-medium text-gray-400">Trailer</span>
              </div>
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${meta.youtubeId}`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Trailer"
                />
              </div>
            </div>
          )}

          {/* Comments / Curator notes */}
          {meta.comment && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={14} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-400">Curator Notes</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm leading-relaxed text-gray-400 whitespace-pre-wrap">
                {meta.comment}
              </div>
            </div>
          )}

          {/* Research: Wikipedia, Related Links, More Context */}
          <div className="mt-5">
            <ResearchDisplay meta={meta} />
          </div>

          {/* Tags */}
          {entry.tags && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {entry.tags.split(',').map((tag, i) => (
                <button
                  key={i}
                  onClick={() => onTagClick?.(tag.trim())}
                  className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[11px] text-gray-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-300 transition-colors cursor-pointer"
                >
                  {tag.trim()}
                </button>
              ))}
            </div>
          )}

          {/* Source link — skip if it's just the same YouTube URL already shown as embedded player */}
          {entry.sourceUrl && !(meta.youtubeId && /(?:youtube\.com\/|youtu\.be\/)/.test(entry.sourceUrl)) && (
            <div className="mt-4">
              <a
                href={entry.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                <ExternalLink size={14} />
                {/laborfilms\.wordpress\.com/.test(entry.sourceUrl)
                  ? 'View on Labor Film Database'
                  : 'View source'}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Image lightbox */}
      {lightboxUrl && (
        <ImageLightbox src={lightboxUrl} alt={entry.title} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
}

// Fullscreen image lightbox
function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      >
        <X size={24} className="text-white" />
      </button>

      {/* Image */}
      <img
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        className="relative z-10 max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
      />
    </div>
  );
}

export default function EntryDetail({ entry, onClose, onTagClick }: EntryDetailProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Use dedicated film layout
  if (entry.category === 'film') {
    return <FilmDetail entry={entry} onClose={onClose} onTagClick={onTagClick} />;
  }

  const meta = parseMetadata(entry);
  const dateStr = entry.category === 'history' ? formatFullDate(entry) : formatEntryDate(entry);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-start justify-between p-6 pb-4 bg-[var(--card)] border-b border-[var(--border)] rounded-t-xl">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-red-400">
              {entry.category}
            </span>
            {/* History/Quote: show date as header, not the truncated title */}
            {entry.category === 'history' && dateStr ? (
              <h2 className="text-lg font-bold mt-1 leading-snug">{dateStr}</h2>
            ) : entry.category === 'quote' && entry.creator ? (
              <h2 className="text-lg font-bold mt-1 leading-snug">{entry.creator}</h2>
            ) : (
              <h2 className="text-lg font-bold mt-1 leading-snug">{entry.title}</h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors shrink-0 ml-4"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Date + Creator (skip for history since date is in header, skip creator for quote since it's in header) */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            {!isHistoryOrQuote(entry.category) && dateStr && (
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>{dateStr}</span>
              </div>
            )}
            {entry.category !== 'quote' && entry.creator && (
              <div className="flex items-center gap-1.5">
                <User size={14} />
                <span>{entry.creator}</span>
              </div>
            )}
          </div>

          {/* Description / Quote */}
          {entry.category === 'quote' ? (
            <div className="py-2">
              <div className="border-l-2 border-red-500/40 pl-4">
                <p className="text-lg leading-relaxed whitespace-pre-wrap italic text-gray-100">
                  {entry.description}
                </p>
                {entry.creator && (
                  <p className="mt-3 text-sm text-gray-400 font-medium">&mdash; {entry.creator}</p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {entry.description}
              </div>
            </>
          )}

          {/* Music metadata */}
          {entry.category === 'music' && (
            <div className="space-y-2 text-sm">
              {meta.performer && <p><span className="text-gray-500">Performer:</span> {meta.performer}</p>}
              {meta.writer && <p><span className="text-gray-500">Songwriter:</span> {meta.writer}</p>}
              {meta.genre && <p><span className="text-gray-500">Genre:</span> {meta.genre}</p>}
              {meta.runTime && <p><span className="text-gray-500">Runtime:</span> {meta.runTime}</p>}

              {/* Embedded YouTube player for music */}
              {entry.sourceUrl && /(?:youtube\.com\/|youtu\.be\/)/.test(entry.sourceUrl) && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Play size={14} className="text-red-400" />
                    <span className="text-sm font-medium text-gray-400">Listen</span>
                  </div>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${(() => { const m = entry.sourceUrl!.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : ''; })()}`}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Listen"
                    />
                  </div>
                </div>
              )}

              {meta.lyrics && (
                <div>
                  <p className="text-gray-500 mb-1">Lyrics:</p>
                  <div className="bg-white/5 rounded-lg p-3 text-xs whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {meta.lyrics}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Research: Wikipedia, Related Links, More Context */}
          {(meta.wikipediaUrl || getRelatedLinks(meta).length > 0 || meta.moreResearch) && (
            <div className="border-t border-white/5 pt-1" />
          )}
          <ResearchDisplay meta={meta} />

          {/* Tags */}
          {entry.tags && (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.split(',').map((tag, i) => (
                <button
                  key={i}
                  onClick={() => onTagClick?.(tag.trim())}
                  className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-gray-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-300 transition-colors cursor-pointer"
                >
                  {tag.trim()}
                </button>
              ))}
            </div>
          )}

          {/* Images — click to open lightbox */}
          {entry.images && entry.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {entry.images.map(img => (
                <button
                  key={img.id}
                  onClick={() => setLightboxUrl(img.url ?? null)}
                  className="rounded-lg overflow-hidden cursor-zoom-in hover:ring-2 hover:ring-white/30 transition-all"
                >
                  <img
                    src={img.thumbnailUrl || img.url}
                    alt={img.caption || entry.title}
                    className="w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Image lightbox */}
          {lightboxUrl && (
            <ImageLightbox src={lightboxUrl} alt={entry.title} onClose={() => setLightboxUrl(null)} />
          )}

          {/* Source URL — skip for music with embedded YouTube player */}
          {entry.sourceUrl && !(entry.category === 'music' && /(?:youtube\.com\/|youtu\.be\/)/.test(entry.sourceUrl)) && (
            <a
              href={entry.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              <ExternalLink size={14} />
              {entry.category === 'music' ? 'Listen' : 'View source'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
