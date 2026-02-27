import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Film } from 'lucide-react';

interface TmdbSearchResult {
  tmdbId: number;
  title: string;
  year: number | null;
  overview: string;
  posterUrl: string | null;
}

export interface TmdbMovieDetails {
  tmdbId: number;
  title: string;
  year: number | null;
  overview: string;
  runtime: string | null;
  country: string;
  genres: string;
  directors: string;
  writers: string;
  cast: string;
  youtubeTrailerId: string | null;
  posterUrl: string | null;
  posterPath: string | null;
}

interface TmdbSearchProps {
  onSelect: (movie: TmdbMovieDetails) => void;
}

export default function TmdbSearch({ onSelect }: TmdbSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    clearTimeout(timer.current);
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query.trim())}`);
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

  const handleSelect = async (result: TmdbSearchResult) => {
    setLoading(true);
    setOpen(false);
    setQuery(result.title + (result.year ? ` (${result.year})` : ''));
    try {
      const res = await fetch(`/api/tmdb/movie/${result.tmdbId}`);
      const details: TmdbMovieDetails = await res.json();
      onSelect(details);
    } catch {
      console.error('Failed to fetch movie details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search film database (TMDB)..."
          className="w-full pl-9 pr-9 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 placeholder-gray-600"
        />
        {(searching || loading) && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl">
          {results.map(r => (
            <button
              key={r.tmdbId}
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              {r.posterUrl ? (
                <img src={r.posterUrl} alt="" className="w-10 h-14 object-cover rounded shrink-0 bg-black/20" />
              ) : (
                <div className="w-10 h-14 rounded bg-white/5 flex items-center justify-center shrink-0">
                  <Film size={16} className="text-gray-600" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {r.title} {r.year && <span className="text-gray-500">({r.year})</span>}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{r.overview}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && !searching && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl px-4 py-3 text-sm text-gray-500">
          No films found
        </div>
      )}
    </div>
  );
}
