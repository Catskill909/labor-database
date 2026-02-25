import { Search, Plus, Database } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onAddClick: () => void;
}

export default function Header({ searchQuery, setSearchQuery, onAddClick }: HeaderProps) {
  return (
    <header className="border-b border-white/5 px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <Database size={28} className="text-blue-400" />
          <h1 className="text-xl font-bold tracking-tight">Labor Arts &amp; Culture Database</h1>
        </div>

        <div className="flex-1 w-full sm:max-w-xl">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search all categories..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors"
            />
          </div>
        </div>

        <button
          onClick={onAddClick}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
        >
          <Plus size={16} />
          Add to Database
        </button>
      </div>
    </header>
  );
}
