import { ScrollText, Quote, Music, Film } from 'lucide-react';
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
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <nav className="border-b border-white/5 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
        <button
          onClick={() => setSelectedCategory('')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === ''
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          All
          {totalCount > 0 && (
            <span className="text-xs opacity-70">({totalCount.toLocaleString()})</span>
          )}
        </button>

        {categories.map(cat => (
          <button
            key={cat.slug}
            onClick={() => setSelectedCategory(cat.slug === selectedCategory ? '' : cat.slug)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.slug
                ? 'bg-blue-600 text-white'
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
