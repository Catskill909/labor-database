import { useState, useEffect, useCallback, useRef } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format, addDays, subDays } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  ScrollText,
  Quote as QuoteIcon,
  Film,
  Music,
  Plus,
  Database,
} from 'lucide-react';
import type { Entry } from '../types.ts';
import { parseMetadata } from '../types.ts';

interface OnThisDayData {
  date: { month: number; day: number };
  sections: Record<string, Entry[]>;
  yearMatches: Record<string, Entry[]>;
  matchedYears: number[];
  counts: Record<string, number>;
}

interface CalendarData {
  month: number;
  daysWithEntries: number[];
  entryCounts: Record<number, number>;
}

interface OnThisDayViewProps {
  onSelectEntry: (entry: Entry) => void;
  onAddClick: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_SUFFIXES = (d: number) => {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

function formatDayOfWeek(month: number, day: number): string {
  const year = (month === 2 && day === 29) ? 2024 : 2024;
  try {
    const d = new Date(year, month - 1, day);
    return format(d, 'EEEE');
  } catch {
    return '';
  }
}

// Category icon helper
function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case 'history': return <ScrollText size={14} className="text-blue-400/60" />;
    case 'quote': return <QuoteIcon size={14} className="text-blue-400/60" />;
    case 'film': return <Film size={14} className="text-blue-400/60" />;
    case 'music': return <Music size={14} className="text-blue-400/60" />;
    default: return <Database size={14} className="text-blue-400/60" />;
  }
}

export default function OnThisDayView({ onSelectEntry, onAddClick }: OnThisDayViewProps) {
  const today = new Date();
  const defaultClassNames = getDefaultClassNames();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [day, setDay] = useState(today.getDate());
  const [data, setData] = useState<OnThisDayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarMonthRef = useRef(month);

  const goToDate = useCallback((m: number, d: number) => {
    setMonth(m);
    setDay(d);
    setShowCalendar(false);
  }, []);

  const goToPrevDay = useCallback(() => {
    const ref = new Date(2024, month - 1, day);
    const prev = subDays(ref, 1);
    goToDate(prev.getMonth() + 1, prev.getDate());
  }, [month, day, goToDate]);

  const goToNextDay = useCallback(() => {
    const ref = new Date(2024, month - 1, day);
    const next = addDays(ref, 1);
    goToDate(next.getMonth() + 1, next.getDate());
  }, [month, day, goToDate]);

  const goToToday = useCallback(() => {
    const now = new Date();
    goToDate(now.getMonth() + 1, now.getDate());
  }, [goToDate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevDay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNextDay();
          break;
        case 't':
          e.preventDefault();
          goToToday();
          break;
        case 'Escape':
          setShowCalendar(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevDay, goToNextDay, goToToday]);

  // Fetch on-this-day data
  useEffect(() => {
    setLoading(true);
    fetch(`/api/on-this-day?month=${month}&day=${day}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch On This Day:', err);
        setLoading(false);
      });
  }, [month, day]);

  // Fetch calendar data when calendar opens or month changes
  useEffect(() => {
    if (!showCalendar) return;
    fetch(`/api/on-this-day/calendar?month=${calendarMonthRef.current}`)
      .then(r => r.json())
      .then(d => setCalendarData(d))
      .catch(err => console.error('Failed to fetch calendar data:', err));
  }, [showCalendar]);

  const isToday = month === today.getMonth() + 1 && day === today.getDate();
  const totalEntries = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;
  const dayOfWeek = formatDayOfWeek(month, day);

  return (
    <>
      {/* Date Hero — compact, inline */}
      <div className="text-center mb-6">
        <div className="mb-3">
          <p className="text-xs text-blue-400 font-medium tracking-widest uppercase mb-1">
            {isToday ? 'Today' : dayOfWeek}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {MONTH_NAMES[month - 1]} {day}<sup className="text-xl sm:text-2xl text-gray-500">{DAY_SUFFIXES(day)}</sup>
          </h2>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={goToPrevDay}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            title="Previous day (Left arrow)"
          >
            <ChevronLeft size={18} />
          </button>

          {!isToday && (
            <button
              onClick={goToToday}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs transition-colors"
            >
              Today
            </button>
          )}

          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors ${
              showCalendar
                ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
            title="Pick a date"
          >
            <Calendar size={16} />
            <span className="text-xs">Pick date</span>
          </button>

          <button
            onClick={goToNextDay}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            title="Next day (Right arrow)"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Calendar picker dropdown */}
        {showCalendar && (
          <div className="mt-3 flex justify-center relative z-10">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-2xl">
              <DayPicker
                mode="single"
                captionLayout="dropdown-months"
                startMonth={new Date(2024, 0)}
                endMonth={new Date(2024, 11)}
                selected={new Date(2024, month - 1, day)}
                onSelect={(date) => {
                  if (date) {
                    goToDate(date.getMonth() + 1, date.getDate());
                  }
                }}
                defaultMonth={new Date(2024, month - 1)}
                modifiers={{
                  hasEntries: calendarData
                    ? calendarData.daysWithEntries.map(d => new Date(2024, calendarData.month - 1, d))
                    : [],
                }}
                modifiersClassNames={{
                  hasEntries: 'has-entries',
                }}
                onMonthChange={(date) => {
                  calendarMonthRef.current = date.getMonth() + 1;
                  fetch(`/api/on-this-day/calendar?month=${date.getMonth() + 1}`)
                    .then(r => r.json())
                    .then(d => setCalendarData(d))
                    .catch(() => {});
                }}
                classNames={{
                  root: `${defaultClassNames.root} rdp-dark`,
                  chevron: defaultClassNames.chevron,
                }}
              />
              <p className="text-[10px] text-gray-600 mt-2 text-center">
                Pick a month or tap a date
              </p>
            </div>
          </div>
        )}

        {/* Entry count */}
        {!loading && (
          <p className="text-xs text-gray-500 mt-3">
            {totalEntries === 0
              ? 'No entries for this date'
              : `${totalEntries} ${totalEntries === 1 ? 'entry' : 'entries'}`
            }
          </p>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-white/5 border-t-blue-500 animate-spin"></div>
        </div>
      )}

      {/* Sectioned content with headers */}
      {!loading && data && totalEntries > 0 && (
        <div className="space-y-8">

          {/* Labor History */}
          {data.sections.history && data.sections.history.length > 0 && (
            <section>
              <SectionHeader
                icon={<ScrollText size={20} />}
                title="Labor History"
                count={data.sections.history.length}
                label="event"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {data.sections.history.map(entry => (
                  <HistoryOTDCard key={entry.id} entry={entry} onClick={() => onSelectEntry(entry)} />
                ))}
              </div>
            </section>
          )}

          {/* Labor Quotes */}
          {data.sections.quote && data.sections.quote.length > 0 && (
            <section>
              <SectionHeader
                icon={<QuoteIcon size={20} />}
                title="Labor Quotes"
                count={data.sections.quote.length}
                label="quote"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {data.sections.quote.map(entry => (
                  <QuoteOTDCard key={entry.id} entry={entry} onClick={() => onSelectEntry(entry)} />
                ))}
              </div>
            </section>
          )}

          {/* Other date-matched categories */}
          {Object.entries(data.sections)
            .filter(([cat]) => cat !== 'history' && cat !== 'quote')
            .map(([cat, entries]) => (
              <section key={cat}>
                <SectionHeader
                  icon={<CategoryIcon category={cat} />}
                  title={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  count={entries.length}
                  label="entry"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {entries.map(entry => (
                    <OnThisDayCard key={entry.id} entry={entry} onClick={() => onSelectEntry(entry)} />
                  ))}
                </div>
              </section>
            ))
          }

          {/* From the Era — year-matched films & music */}
          {data.matchedYears.length > 0 && (data.yearMatches.film?.length > 0 || data.yearMatches.music?.length > 0) && (
            <>
              {/* Films */}
              {data.yearMatches.film && data.yearMatches.film.length > 0 && (
                <section>
                  <SectionHeader
                    icon={<Film size={20} />}
                    title="Films from the Era"
                    count={data.yearMatches.film.length}
                    label="film"
                    subtitle={data.matchedYears.length === 1
                      ? `Released in ${data.matchedYears[0]}`
                      : `From ${data.matchedYears.length} matching years`}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {data.yearMatches.film.map(entry => (
                      <FilmOTDCard key={entry.id} entry={entry} onClick={() => onSelectEntry(entry)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Music */}
              {data.yearMatches.music && data.yearMatches.music.length > 0 && (
                <section>
                  <SectionHeader
                    icon={<Music size={20} />}
                    title="Music from the Era"
                    count={data.yearMatches.music.length}
                    label="song"
                    subtitle={data.matchedYears.length === 1
                      ? `From ${data.matchedYears[0]}`
                      : `From ${data.matchedYears.length} matching years`}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {data.yearMatches.music.map(entry => (
                      <MusicOTDCard key={entry.id} entry={entry} onClick={() => onSelectEntry(entry)} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

        </div>
      )}

      {/* Empty state */}
      {!loading && totalEntries === 0 && (
        <div className="text-center py-16">
          <CalendarDays size={48} className="mx-auto text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">
            No entries for {MONTH_NAMES[month - 1]} {day}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Know something that happened on this date in labor history?
          </p>
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            Submit an Entry
          </button>
        </div>
      )}
    </>
  );
}

// Section header with icon, title, count, and optional subtitle
function SectionHeader({ icon, title, count, label, subtitle }: {
  icon: React.ReactNode;
  title: string;
  count: number;
  label: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
      <div className="text-blue-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {subtitle && (
          <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <span className="text-xs text-gray-500 shrink-0">
        {count} {count === 1 ? label : label + 's'}
      </span>
    </div>
  );
}

// Card component for On This Day entries
function OnThisDayCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  switch (entry.category) {
    case 'history':
      return <HistoryOTDCard entry={entry} onClick={onClick} />;
    case 'quote':
      return <QuoteOTDCard entry={entry} onClick={onClick} />;
    case 'film':
      return <FilmOTDCard entry={entry} onClick={onClick} />;
    case 'music':
      return <MusicOTDCard entry={entry} onClick={onClick} />;
    default:
      return <GenericOTDCard entry={entry} onClick={onClick} />;
  }
}

function formatFullDate(entry: Pick<Entry, 'month' | 'day' | 'year'>): string {
  const parts: string[] = [];
  if (entry.month) parts.push(MONTH_NAMES[entry.month - 1] || String(entry.month));
  if (entry.day) parts.push(String(entry.day) + ',');
  if (entry.year) parts.push(String(entry.year));
  return parts.join(' ');
}

function HistoryOTDCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  // Rough check: ~80 chars per line at card width, 12 lines
  const isLong = entry.description.length > 800;
  const dateStr = formatFullDate(entry);

  return (
    <button
      onClick={onClick}
      className="text-left w-full p-5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-blue-500/30 transition-colors group flex flex-col items-start"
    >
      {dateStr && (
        <p className="text-sm text-blue-400 mb-3 font-medium">{dateStr}</p>
      )}
      <p className="text-sm leading-relaxed text-gray-200 group-hover:text-white transition-colors line-clamp-12">
        {entry.description}
      </p>
      {isLong && (
        <span className="text-xs text-blue-400/70 mt-1.5 block">More...</span>
      )}
    </button>
  );
}

function QuoteOTDCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  const isLong = entry.description.length > 800;

  return (
    <button
      onClick={onClick}
      className="text-left w-full p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-blue-500/30 transition-colors group flex flex-col items-start"
    >
      <p className="text-sm leading-relaxed italic text-gray-200 group-hover:text-white transition-colors line-clamp-12">
        &ldquo;{entry.description}&rdquo;
      </p>
      {isLong && (
        <span className="text-xs text-blue-400/70 mt-1.5">More...</span>
      )}
      {entry.creator && (
        <p className="text-xs text-gray-400 mt-2 font-medium">
          &mdash; {entry.creator}
          {entry.year && <span className="text-gray-600 ml-1">({entry.year})</span>}
        </p>
      )}
    </button>
  );
}

function FilmOTDCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  const posterUrl = entry.images?.[0]?.thumbnailUrl || null;
  const meta = parseMetadata(entry);

  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-blue-500/30 transition-colors group overflow-hidden"
    >
      {posterUrl ? (
        <div className="relative w-full aspect-[2/3] overflow-hidden bg-black/20">
          <img
            src={posterUrl}
            alt={entry.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-3">
            <h3 className="text-sm font-semibold text-white line-clamp-2">
              {entry.title}
              {entry.year && <span className="text-gray-300 font-normal ml-1">({entry.year})</span>}
            </h3>
            {entry.creator && (
              <p className="text-[11px] text-gray-300 mt-0.5 truncate">{entry.creator}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full aspect-[2/3] flex flex-col bg-white/5">
          <div className="flex-1 flex items-center justify-center">
            <Film size={28} className="text-gray-600" />
          </div>
          <div className="p-3">
            <h3 className="text-sm font-semibold group-hover:text-blue-300 transition-colors line-clamp-2">
              {entry.title}
              {entry.year && <span className="text-gray-500 font-normal ml-1">({entry.year})</span>}
            </h3>
            {entry.creator && (
              <p className="text-xs text-gray-400 mt-1 truncate">{entry.creator}</p>
            )}
          </div>
        </div>
      )}
      {/* Genre badges */}
      {meta.genre && (
        <div className="px-3 pb-3 pt-1 flex flex-wrap gap-1">
          {meta.genre.split(',').slice(0, 2).map((g: string, i: number) => (
            <span key={i} className="px-1.5 py-0.5 bg-blue-600/15 text-blue-400 text-[10px] rounded">
              {g.trim()}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function MusicOTDCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  const meta = parseMetadata(entry);

  return (
    <button
      onClick={onClick}
      className="text-left w-full p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-blue-500/30 transition-colors group flex items-center gap-3"
    >
      <Music size={18} className="text-blue-400/40 shrink-0" />
      <div className="min-w-0">
        <h3 className="text-sm font-semibold group-hover:text-blue-300 transition-colors truncate">
          {entry.title}
        </h3>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {meta.performer || entry.creator || 'Unknown artist'}
          {entry.year ? ` \u00B7 ${entry.year}` : ''}
        </p>
      </div>
    </button>
  );
}

function GenericOTDCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-blue-500/30 transition-colors group"
    >
      <div className="flex items-center gap-2 mb-2">
        <CategoryIcon category={entry.category} />
        <span className="text-xs text-gray-500 uppercase tracking-wider">{entry.category}</span>
        {entry.year && (
          <span className="ml-auto text-xs text-gray-600">{entry.year}</span>
        )}
      </div>
      <p className="text-sm font-medium group-hover:text-blue-300 transition-colors">{entry.title}</p>
      {entry.creator && <p className="text-xs text-gray-400 mt-1">{entry.creator}</p>}
    </button>
  );
}
