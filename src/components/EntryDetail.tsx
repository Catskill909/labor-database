import { X, ExternalLink, Calendar, User } from 'lucide-react';
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

export default function EntryDetail({ entry, onClose }: EntryDetailProps) {
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
            <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-400">
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

          {/* Source URL */}
          {entry.sourceUrl && (
            <a
              href={entry.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink size={14} />
              View source
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
