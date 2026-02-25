import { ExternalLink } from 'lucide-react';
import type { Entry } from '../types.ts';
import { parseMetadata, formatEntryDate } from '../types.ts';

interface EntryGridProps {
  entries: Entry[];
  onSelectEntry: (entry: Entry) => void;
}

function EntryCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  const meta = parseMetadata(entry);
  const dateStr = formatEntryDate(entry);

  return (
    <button
      onClick={onClick}
      className="text-left w-full p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-blue-500/30 transition-colors group"
    >
      {/* Category badge + date */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-400">
          {entry.category}
        </span>
        {dateStr && (
          <span className="text-[10px] text-gray-500">{dateStr}</span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold leading-snug mb-1.5 line-clamp-2 group-hover:text-blue-300 transition-colors">
        {entry.title}
      </h3>

      {/* Creator */}
      {entry.creator && (
        <p className="text-xs text-gray-400 mb-2">{entry.creator}</p>
      )}

      {/* Description snippet */}
      <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
        {entry.description}
      </p>

      {/* Music-specific: performer & location */}
      {entry.category === 'music' && meta.performer && (
        <p className="text-xs text-gray-400 mt-2">
          Performer: {meta.performer}
        </p>
      )}

      {/* Source URL indicator */}
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
      {entries.map(entry => (
        <EntryCard
          key={entry.id}
          entry={entry}
          onClick={() => onSelectEntry(entry)}
        />
      ))}
    </div>
  );
}
