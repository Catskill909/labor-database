import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header.tsx';
import CategoryNav from './components/CategoryNav.tsx';
import FilterBar from './components/FilterBar.tsx';
import EntryGrid from './components/EntryGrid.tsx';
import EntryDetail from './components/EntryDetail.tsx';
import SubmissionWizard from './components/SubmissionWizard.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import AdminLogin from './components/AdminLogin.tsx';
import type { Entry, Category } from './types.ts';

function HomePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showSubmissionWizard, setShowSubmissionWizard] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Fetch categories
  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => setCategories(data))
      .catch(err => console.error('Failed to fetch categories:', err));

    fetch('/api/entries/counts')
      .then(r => r.json())
      .then(data => setCounts(data))
      .catch(err => console.error('Failed to fetch counts:', err));
  }, []);

  // Reset filters when category changes
  useEffect(() => {
    setFilters({});
  }, [selectedCategory]);

  // Fetch entries when category, search, or filters change
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    // Add category-specific filters
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }

    fetch(`/api/entries?${params}`)
      .then(r => r.json())
      .then(data => {
        setEntries(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch entries:', err);
        setLoading(false);
      });
  }, [selectedCategory, searchQuery, filters]);

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={() => setShowSubmissionWizard(true)}
      />

      <CategoryNav
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        counts={counts}
      />

      <FilterBar
        category={selectedCategory}
        filters={filters}
        setFilters={setFilters}
      />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 rounded-full border-4 border-white/5 border-t-blue-500 animate-spin"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-lg">No entries found</p>
              {searchQuery && <p className="text-sm mt-2">Try adjusting your search terms</p>}
            </div>
          ) : (
            <EntryGrid
              entries={entries}
              onSelectEntry={setSelectedEntry}
            />
          )}
        </div>
      </main>

      <footer className="shrink-0 border-t border-white/5 px-6 py-3 text-center text-xs text-gray-500">
        <span>Showing {entries.length} of {totalCount} entries</span>
        <span className="mx-2">&middot;</span>
        <a href="https://laborheritage.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
          &copy; 2026 The Labor Heritage Foundation
        </a>
      </footer>

      {selectedEntry && (
        <EntryDetail
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}

      {showSubmissionWizard && (
        <SubmissionWizard
          categories={categories}
          onClose={() => setShowSubmissionWizard(false)}
          onSubmitted={() => {
            setShowSubmissionWizard(false);
            // Refresh entries
            setSearchQuery(q => q + '');
          }}
        />
      )}
    </div>
  );
}

function AdminRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return true;
    }
    return sessionStorage.getItem('isAdminAuthenticated') === 'true';
  });

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return <AdminDashboard />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminRoute />} />
      </Routes>
    </Router>
  );
}

export default App;
