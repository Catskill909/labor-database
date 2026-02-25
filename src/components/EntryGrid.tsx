import { ExternalLink, Music, Quote as QuoteIcon } from 'lucide-react';
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

          {/* Action buttons like original site */}
          <div className="flex items-center gap-2 mt-3">
            {entry.sourceUrl && (
              <span className="px-2.5 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-medium rounded">
                View Location
              </span>
            )}
            {meta.lyrics && (
              <span className="px-2.5 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-medium rounded">
                View Lyrics
              </span>
            )}
          </div>
        </div>
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

export default function EntryGrid({ entries, onSelectEntry }: EntryGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {entries.map(entry => {
        const onClick = () => onSelectEntry(entry);

        switch (entry.category) {
          case 'history':
            return <HistoryCard key={entry.id} entry={entry} onClick={onClick} />;
          case 'quote':
            return <QuoteCard key={entry.id} entry={entry} onClick={onClick} />;
          case 'music':
            return <MusicCard key={entry.id} entry={entry} onClick={onClick} />;
          default:
            return <GenericCard key={entry.id} entry={entry} onClick={onClick} />;
        }
      })}
    </div>
  );
}
