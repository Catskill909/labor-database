import { X, ExternalLink, Calendar, User, Clock, Globe, Play, MessageSquare } from 'lucide-react';
import ReactPlayer from 'react-player';
import type { Entry } from '../types.ts';
import { parseMetadata, formatEntryDate } from '../types.ts';

interface EntryDetailProps {
  entry: Entry;
  onClose: () => void;
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

function FilmDetail({ entry, onClose }: EntryDetailProps) {
  const meta = parseMetadata(entry);
  const posterUrl = entry.images?.[0]?.url || entry.images?.[0]?.thumbnailUrl || null;

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
                <img
                  src={posterUrl}
                  alt={entry.title}
                  className="w-full rounded-lg shadow-lg object-cover"
                />
              </div>
            )}

            {/* Right column: Details */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Genre badges */}
              {meta.genre && (
                <div className="flex flex-wrap gap-1.5">
                  {meta.genre.split(',').map((g: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-red-600/15 text-red-400 text-xs font-medium rounded-full">
                      {g.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Synopsis */}
              <div className="text-sm leading-relaxed text-gray-300">
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
                <ReactPlayer
                  src={`https://www.youtube.com/watch?v=${meta.youtubeId}`}
                  width="100%"
                  height="100%"
                  light={true}
                  controls={true}
                  playing={false}
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

          {/* Tags */}
          {entry.tags && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {entry.tags.split(',').map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[11px] text-gray-400">
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Source link */}
          {entry.sourceUrl && (
            <div className="mt-4">
              <a
                href={entry.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                <ExternalLink size={14} />
                View on Labor Film Database
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EntryDetail({ entry, onClose }: EntryDetailProps) {
  // Use dedicated film layout
  if (entry.category === 'film') {
    return <FilmDetail entry={entry} onClose={onClose} />;
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

          {/* Description */}
          <div className={`text-sm leading-relaxed whitespace-pre-wrap ${entry.category === 'quote' ? 'italic' : ''}`}>
            {entry.description}
          </div>

          {/* Quote: show author attribution below if not already in header */}
          {entry.category === 'quote' && entry.creator && (
            <p className="text-sm text-gray-400 font-medium">&mdash; {entry.creator}</p>
          )}

          {/* Quote source/detail */}
          {entry.category === 'quote' && meta.source && (
            <p className="text-sm text-gray-500">{meta.source}</p>
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
                    <ReactPlayer
                      src={entry.sourceUrl}
                      width="100%"
                      height="100%"
                      light={true}
                      controls={true}
                      playing={false}
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

          {/* Tags */}
          {entry.tags && (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.split(',').map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-gray-400">
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Images */}
          {entry.images && entry.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {entry.images.map(img => (
                <img
                  key={img.id}
                  src={img.thumbnailUrl || img.url}
                  alt={img.caption || entry.title}
                  className="rounded-lg w-full object-cover"
                />
              ))}
            </div>
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
