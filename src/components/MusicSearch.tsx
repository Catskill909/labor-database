import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Music2 } from 'lucide-react';

interface MusicSearchResult {
  geniusId: number;
  title: string;
  artist: string;
  thumbnailUrl: string | null;
}

export interface MusicDetails {
  geniusId: number;
  title: string;
  artist: string;
  writers: string;
  year: number | null;
  lyrics: string;
  youtubeUrl: string | null;
  albumArtUrl: string | null;
}

interface MusicSearchProps {
  onSelect: (song: MusicDetails) => void;
}

export default function MusicSearch({ onSelect }: MusicSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Track whether query was set by selection (not user typing)
  const selectedRef = useRef(false);

  // Debounced search — only fires on user typing, never after a selection
  useEffect(() => {
    clearTimeout(timer.current);
    if (selectedRef.current) return;
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/music/search?query=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer.current);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = async (result: MusicSearchResult) => {
    selectedRef.current = true;
    setLoading(true);
    setOpen(false);
    setResults([]);
    setQuery(result.title + ' — ' + result.artist);
    try {
      const res = await fetch(`/api/music/details/${result.geniusId}`);
      const details: MusicDetails = await res.json();
      onSelect(details);
    } catch {
      console.error('Failed to fetch song details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectedRef.current = false;
    setQuery(e.target.value);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => !selectedRef.current && results.length > 0 && setOpen(true)}
          placeholder="Search song database (Genius)..."
          className="w-full pl-9 pr-9 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-red-500/50 placeholder-gray-600"
        />
        {(searching || loading) && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 animate-spin" />
        )}
      </div>

      {/* Loading indicator (details fetch takes 3-5s: lyrics scraping + YouTube search) */}
      {loading && (
        <div className="flex items-center gap-2 mt-2 px-1">
          <Loader2 size={14} className="text-red-400 animate-spin shrink-0" />
          <span className="text-xs text-gray-400">Fetching lyrics &amp; YouTube video. Please wait.</span>
        </div>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl">
          {results.map(r => (
            <button
              key={r.geniusId}
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              {r.thumbnailUrl ? (
                <img src={r.thumbnailUrl} alt="" className="w-10 h-10 object-cover rounded shrink-0 bg-black/20" />
              ) : (
                <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center shrink-0">
                  <Music2 size={16} className="text-gray-600" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-200 truncate">{r.title}</p>
                <p className="text-xs text-gray-500 truncate">{r.artist}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && !searching && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl px-4 py-3 text-sm text-gray-500">
          No songs found
        </div>
      )}
    </div>
  );
}
