import { useEffect, useRef } from 'react';
import { ExternalLink, Music, Quote as QuoteIcon, Film, Play } from 'lucide-react';
import type { Entry } from '../types.ts';
import { parseMetadata, formatEntryDate } from '../types.ts';

interface EntryGridProps {
  entries: Entry[];
  onSelectEntry: (entry: Entry) => void;
}

// Format a full date like the original Wix site: "July 22, 2023"
function formatFullDate(entry: Pick<Entry, 'month' | 'day' | 'year'>): string {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const parts: string[] = [];
  if (entry.month) parts.push(monthNames[entry.month - 1] || String(entry.month));
  if (entry.day) parts.push(String(entry.day) + ',');
  if (entry.year) parts.push(String(entry.year));
  return parts.join(' ');
}

function HistoryCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  const dateStr = formatFullDate(entry);

  return (
    <button
      onClick={onClick}
      className="text-left w-full p-5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-blue-500/30 transition-colors group"
    >
      {/* Date header — like the original Wix site */}
      {dateStr && (
        <p className="text-sm text-gray-400 mb-3 font-medium">{dateStr}</p>
      )}

      {/* Full description — no separate title for history */}
      <p className="text-sm leading-relaxed line-clamp-6">
        {entry.description}
      </p>
    </button>
  );
}

function QuoteCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full p-5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-blue-500/30 transition-colors group"
    >
      {/* Quote icon */}
      <QuoteIcon size={16} className="text-blue-400/40 mb-2" />

      {/* Quote text */}
      <p className="text-sm leading-relaxed line-clamp-5 italic">
        {entry.description}
      </p>

      {/* Author */}
      {entry.creator && (
        <p className="text-xs text-gray-400 mt-3 font-medium">&mdash; {entry.creator}</p>
      )}

      {/* Source/detail */}
      {(() => {
        const meta = parseMetadata(entry);
        return meta.source ? (
          <p className="text-[10px] text-gray-500 mt-1">{meta.source}</p>
        ) : null;
      })()}
    </button>
  );
}

function MusicCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  const meta = parseMetadata(entry);

  return (
    <button
      onClick={onClick}
      className="text-left w-full p-5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-blue-500/30 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <Music size={16} className="text-blue-400/40 mt-0.5 shrink-0" />
        <div className="min-w-0">
          {/* Song title */}
          <h3 className="text-sm font-semibold leading-snug mb-1 group-hover:text-blue-300 transition-colors">
            {entry.title}
          </h3>

          {/* Performer + Artist */}
          {meta.performer && (
            <p className="text-xs text-gray-400">
              <span className="text-gray-500">Performer:</span> {meta.performer}
            </p>
          )}
          {meta.writer && meta.writer !== meta.performer && (
            <p className="text-xs text-gray-400">
              <span className="text-gray-500">Artist:</span> {meta.writer}
            </p>
          )}

          {/* Action buttons — only show if data exists, like original site */}
          {(entry.sourceUrl || meta.lyrics) && (
            <div className="flex items-center gap-2 mt-3">
              {entry.sourceUrl && (
                <span className="px-2.5 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-medium rounded">
                  Listen
                </span>
              )}
              {meta.lyrics && (
                <span className="px-2.5 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-medium rounded">
                  View Lyrics
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function FilmCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  const meta = parseMetadata(entry);
  const posterUrl = entry.images?.[0]?.thumbnailUrl || null;

  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-blue-500/30 transition-colors group overflow-hidden"
    >
      {/* Poster image or placeholder */}
      {posterUrl ? (
        <div className="relative w-full aspect-[2/3] overflow-hidden bg-black/20">
          <img
            src={posterUrl}
            alt={entry.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Gradient overlay at bottom for readability */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
          {/* Title overlay on poster */}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-white drop-shadow-lg group-hover:text-blue-200 transition-colors">
              {entry.title}
              {entry.year && <span className="text-gray-300 font-normal ml-1">({entry.year})</span>}
            </h3>
            {entry.creator && (
              <p className="text-[11px] text-gray-300 mt-0.5 truncate">{entry.creator}</p>
            )}
          </div>
          {meta.youtubeId && (
            <div className="absolute top-2 right-2 p-1.5 bg-red-600/90 rounded-full shadow-lg">
              <Play size={10} className="text-white fill-white" />
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full aspect-[2/3] flex flex-col bg-white/5">
          <div className="flex-1 flex items-center justify-center">
            <Film size={28} className="text-gray-600" />
          </div>
          <div className="p-3">
            <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors">
              {entry.title}
              {entry.year && <span className="text-gray-500 font-normal ml-1">({entry.year})</span>}
            </h3>
            {entry.creator && (
              <p className="text-xs text-gray-400 mt-1 truncate">{entry.creator}</p>
            )}
          </div>
        </div>
      )}

      {/* Metadata footer */}
      <div className="px-3 pb-3 pt-1">
        {/* Genre badges */}
        {meta.genre && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {meta.genre.split(',').slice(0, 2).map((g: string, i: number) => (
              <span key={i} className="px-1.5 py-0.5 bg-blue-600/15 text-blue-400 text-[10px] rounded">
                {g.trim()}
              </span>
            ))}
          </div>
        )}
        {/* Duration + Country */}
        {(meta.duration || meta.country) && (
          <p className="text-[10px] text-gray-500">
            {[meta.duration, meta.country].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </button>
  );
}

function GenericCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  const dateStr = formatEntryDate(entry);

  return (
    <button
      onClick={onClick}
      className="text-left w-full p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-blue-500/30 transition-colors group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-400">
          {entry.category}
        </span>
        {dateStr && (
          <span className="text-[10px] text-gray-500">{dateStr}</span>
        )}
      </div>

      <h3 className="text-sm font-semibold leading-snug mb-1.5 line-clamp-2 group-hover:text-blue-300 transition-colors">
        {entry.title}
      </h3>

      {entry.creator && (
        <p className="text-xs text-gray-400 mb-2">{entry.creator}</p>
      )}

      <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
        {entry.description}
      </p>

      {entry.sourceUrl && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-blue-400/60">
          <ExternalLink size={10} />
          <span>View source</span>
        </div>
      )}
    </button>
  );
}

// Wrapper that fades in cards as they scroll into view
function AnimatedCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('entry-visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="entry-card">
      {children}
    </div>
  );
}

export default function EntryGrid({ entries, onSelectEntry }: EntryGridProps) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {entries.map(entry => {
          const onClick = () => onSelectEntry(entry);

          let card: React.ReactNode;
          switch (entry.category) {
            case 'history':
              card = <HistoryCard entry={entry} onClick={onClick} />;
              break;
            case 'quote':
              card = <QuoteCard entry={entry} onClick={onClick} />;
              break;
            case 'music':
              card = <MusicCard entry={entry} onClick={onClick} />;
              break;
            case 'film':
              card = <FilmCard entry={entry} onClick={onClick} />;
              break;
            default:
              card = <GenericCard entry={entry} onClick={onClick} />;
          }

          return (
            <AnimatedCard key={entry.id}>
              {card}
            </AnimatedCard>
          );
        })}
      </div>
    </>
  );
}
