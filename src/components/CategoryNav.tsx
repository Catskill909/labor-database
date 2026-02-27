import { ScrollText, Quote, Music, Film, CalendarDays } from 'lucide-react';
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
  return (
    <nav className="border-b border-white/5 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
        {/* On This Day — first tab, replaces "All" */}
        <button
          onClick={() => setSelectedCategory('on-this-day')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === 'on-this-day'
              ? 'bg-red-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <CalendarDays size={16} />
          On This Day
        </button>

        {categories.map(cat => (
          <button
            key={cat.slug}
            onClick={() => setSelectedCategory(cat.slug)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.slug
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
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
    </nav>
  );
}
