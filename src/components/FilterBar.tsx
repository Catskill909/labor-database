import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X, Tag, ChevronDown } from 'lucide-react';

interface TagInfo {
  tag: string;
  count: number;
  group: string;
}

interface FilterBarProps {
  category: string;
  filters: Record<string, string>;
  setFilters: (filters: Record<string, string>) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const selectClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-red-500/50 appearance-none cursor-pointer';
const inputClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-red-500/50 placeholder-gray-600';

// Debounced text input that only fires the update after typing stops
function DebouncedInput({ value, onChange, ...props }: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 300);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return <input {...props} value={local} onChange={e => handleChange(e.target.value)} />;
}

// Tag filter dropdown with grouped multi-select
function TagFilterDropdown({ category, selectedTags, onChange }: {
  category: string;
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = category ? `/api/tags?category=${category}` : '/api/tags';
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setTags(data.tags || []);
        setGroups(data.groups || []);
      })
      .catch(() => {});
  }, [category]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const tagsByGroup: Record<string, TagInfo[]> = {};
  for (const t of tags) {
    if (!tagsByGroup[t.group]) tagsByGroup[t.group] = [];
    tagsByGroup[t.group].push(t);
  }

  if (tags.length === 0) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 ${selectClass} ${selectedTags.length > 0 ? 'border-red-500/50 text-white' : ''}`}
      >
        <Tag size={12} />
        {selectedTags.length > 0 ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''}` : 'Tags'}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-gray-900 border border-white/10 rounded-lg shadow-xl w-72 max-h-80 overflow-y-auto">
          {selectedTags.length > 0 && (
            <div className="px-3 py-2 border-b border-white/10">
              <button
                onClick={() => onChange([])}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Clear all tags
              </button>
            </div>
          )}
          {groups.map(group => {
            const groupTags = tagsByGroup[group];
            if (!groupTags || groupTags.length === 0) return null;
            return (
              <div key={group}>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-medium bg-white/[0.02] sticky top-0">
                  {group}
                </div>
                {groupTags.map(t => (
                  <label
                    key={t.tag}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(t.tag)}
                      onChange={() => toggle(t.tag)}
                      className="rounded border-white/20 bg-white/5 text-red-500 focus:ring-red-500/50 focus:ring-offset-0"
                    />
                    <span className={`flex-1 ${selectedTags.includes(t.tag) ? 'text-white' : 'text-gray-400'}`}>
                      {t.tag}
                    </span>
                    <span className="text-[10px] text-gray-600">{t.count}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({ category, filters, setFilters }: FilterBarProps) {
  const [genres, setGenres] = useState<string[]>([]);

  // Fetch filter options when category changes
  useEffect(() => {
    if (category === 'music' || category === 'film') {
      fetch(`/api/entries/filter-options?category=${category}`)
        .then(r => r.json())
        .then(data => {
          if (data.genres) setGenres(data.genres);
        })
        .catch(() => {});
    } else {
      setGenres([]);
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

  const selectedTags = filters.tag ? filters.tag.split(',').map(t => t.trim()).filter(Boolean) : [];
  const handleTagChange = (tags: string[]) => {
    update('tag', tags.join(','));
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

        {/* Tag filter — available for all categories */}
        <TagFilterDropdown
          category={category}
          selectedTags={selectedTags}
          onChange={handleTagChange}
        />

        {/* Selected tag pills */}
        {selectedTags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {selectedTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-300"
              >
                {tag}
                <button onClick={() => handleTagChange(selectedTags.filter(t => t !== tag))} className="hover:text-white">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
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
