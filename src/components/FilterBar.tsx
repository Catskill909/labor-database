import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

interface FilterBarProps {
  category: string;
  filters: Record<string, string>;
  setFilters: (filters: Record<string, string>) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const selectClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer';
const inputClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 placeholder-gray-600';

// Debounced text input that only fires the update after typing stops
function DebouncedInput({ value, onChange, ...props }: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 300);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return <input {...props} value={local} onChange={e => handleChange(e.target.value)} />;
}

export default function FilterBar({ category, filters, setFilters }: FilterBarProps) {
  const [genres, setGenres] = useState<string[]>([]);

  // Fetch filter options when category changes
  useEffect(() => {
    if (category === 'music') {
      fetch(`/api/entries/filter-options?category=music`)
        .then(r => r.json())
        .then(data => {
          if (data.genres) setGenres(data.genres);
        })
        .catch(() => {});
    }
  }, [category]);

  const update = (key: string, value: string) => {
    const next = { ...filters };
    if (value) {
      next[key] = value;
    } else {
      delete next[key];
    }
    setFilters(next);
  };

  const hasFilters = Object.keys(filters).length > 0;

  const clearAll = () => setFilters({});

  // No filters for "All" view
  if (!category) return null;

  return (
    <div className="px-4 sm:px-6 py-2 border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
        <SlidersHorizontal size={14} className="text-gray-500 shrink-0" />

        {category === 'history' && (
          <>
            <select
              value={filters.month || ''}
              onChange={e => update('month', e.target.value)}
              className={selectClass}
            >
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={String(i + 1)}>{m}</option>
              ))}
            </select>

            <select
              value={filters.day || ''}
              onChange={e => update('day', e.target.value)}
              className={selectClass}
            >
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i} value={String(i + 1)}>{i + 1}</option>
              ))}
            </select>

            <input
              type="number"
              value={filters.year || ''}
              onChange={e => update('year', e.target.value)}
              placeholder="Year"
              className={`${inputClass} w-24`}
              min="1600"
              max="2100"
            />
          </>
        )}

        {category === 'quote' && (
          <DebouncedInput
            type="text"
            value={filters.creator || ''}
            onChange={v => update('creator', v)}
            placeholder="Filter by author..."
            className={`${inputClass} w-48`}
          />
        )}

        {category === 'music' && (
          <>
            <DebouncedInput
              type="text"
              value={filters.creator || ''}
              onChange={v => update('creator', v)}
              placeholder="Artist / performer..."
              className={`${inputClass} w-48`}
            />

            <select
              value={filters.genre || ''}
              onChange={e => update('genre', e.target.value)}
              className={selectClass}
            >
              <option value="">Genre</option>
              {genres.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </>
        )}

        {category === 'film' && (
          <>
            <DebouncedInput
              type="text"
              value={filters.creator || ''}
              onChange={v => update('creator', v)}
              placeholder="Director..."
              className={`${inputClass} w-48`}
            />

            <input
              type="number"
              value={filters.year || ''}
              onChange={e => update('year', e.target.value)}
              placeholder="Year"
              className={`${inputClass} w-24`}
              min="1900"
              max="2100"
            />
          </>
        )}

        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
