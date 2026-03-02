import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollText, Quote, Music, Film, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Category } from '../types.ts';

interface CategoryNavProps {
  categories: Category[];
  selectedCategory: string;
  setSelectedCategory: (slug: string) => void;
  counts: Record<string, number>;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'scroll-text': <ScrollText size={16} />,
  'quote': <Quote size={16} />,
  'music': <Music size={16} />,
  'film': <Film size={16} />,
};

export default function CategoryNav({ categories, selectedCategory, setSelectedCategory, counts }: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, categories]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -160 : 160;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <nav className="px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto relative">
        {/* Left chevron with fade backdrop */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center sm:hidden">
            <div className="flex items-center h-full pl-0.5 pr-3 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-transparent rounded-l-xl">
              <button
                onClick={() => scroll('left')}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-700/80 border border-white/20 text-white/90 hover:text-white hover:bg-zinc-600 transition-all"
                aria-label="Scroll tabs left"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {/* Right chevron with fade backdrop */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center sm:hidden">
            <div className="flex items-center h-full pr-0.5 pl-3 bg-gradient-to-l from-zinc-900 via-zinc-900/95 to-transparent rounded-r-xl">
              <button
                onClick={() => scroll('right')}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-700/80 border border-white/20 text-white/90 hover:text-white hover:bg-zinc-600 transition-all"
                aria-label="Scroll tabs right"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable tab bar */}
        <div
          ref={scrollRef}
          className="flex sm:inline-flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-xl p-1.5 overflow-x-auto no-scrollbar shadow-lg"
        >
          {/* On This Day — first tab */}
          <button
            onClick={() => setSelectedCategory('on-this-day')}
            className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === 'on-this-day'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-gray-200 hover:text-white hover:bg-white/10'
              }`}
          >
            <CalendarDays size={16} />
            On This Day
          </button>

          {categories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat.slug
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-200 hover:text-white hover:bg-white/10'
                }`}
            >
              {cat.icon && ICON_MAP[cat.icon]}
              {cat.label}
              {counts[cat.slug] !== undefined && (
                <span className="text-xs opacity-70">({counts[cat.slug].toLocaleString()})</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
