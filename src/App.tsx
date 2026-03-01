import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header.tsx';
import CategoryNav from './components/CategoryNav.tsx';
import FilterBar from './components/FilterBar.tsx';
import EntryGrid from './components/EntryGrid.tsx';
import AdminLogin from './components/AdminLogin.tsx';
import OnThisDayView from './components/OnThisDayView.tsx';

const EntryDetail = lazy(() => import('./components/EntryDetail.tsx'));
const SubmissionWizard = lazy(() => import('./components/SubmissionWizard.tsx'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard.tsx'));
import type { Entry, Category } from './types.ts';

const PAGE_SIZE = 60;

function HomePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('on-this-day');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showSubmissionWizard, setShowSubmissionWizard] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const mainRef = useRef<HTMLElement>(null);
  const offsetRef = useRef(0);

  const isOnThisDay = selectedCategory === 'on-this-day';

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

  // Build query params (shared between initial fetch and load-more)
  const buildParams = useCallback((offset: number) => {
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== 'on-this-day') params.set('category', selectedCategory);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    return params;
  }, [selectedCategory, searchQuery, filters]);

  // Initial fetch when category, search, or filters change (skip for On This Day)
  useEffect(() => {
    if (isOnThisDay) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasMore(true);
    offsetRef.current = 0;

    const params = buildParams(0);
    fetch(`/api/entries?${params}`)
      .then(r => r.json())
      .then(data => {
        setEntries(data);
        offsetRef.current = data.length;
        setHasMore(data.length >= PAGE_SIZE);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch entries:', err);
        setLoading(false);
      });
  }, [selectedCategory, searchQuery, filters, buildParams, isOnThisDay]);

  // Load more entries
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || isOnThisDay) return;
    setLoadingMore(true);

    const params = buildParams(offsetRef.current);
    fetch(`/api/entries?${params}`)
      .then(r => r.json())
      .then(data => {
        setEntries(prev => [...prev, ...data]);
        offsetRef.current += data.length;
        setHasMore(data.length >= PAGE_SIZE);
        setLoadingMore(false);
      })
      .catch(err => {
        console.error('Failed to load more:', err);
        setLoadingMore(false);
      });
  }, [loadingMore, hasMore, buildParams, isOnThisDay]);

  // Infinite scroll — detect when near bottom
  useEffect(() => {
    if (isOnThisDay) return;
    const el = mainRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 400) {
        loadMore();
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [loadMore, isOnThisDay]);

  // When search is typed, switch away from On This Day to show search results
  useEffect(() => {
    if (searchQuery.trim() && isOnThisDay) {
      setSelectedCategory('');
    }
  }, [searchQuery, isOnThisDay]);

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const displayTotal = selectedCategory && selectedCategory !== 'on-this-day'
    ? (counts[selectedCategory] || 0)
    : totalCount;

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

      {/* Only show FilterBar for browse categories, not On This Day */}
      {!isOnThisDay && (
        <FilterBar
          category={selectedCategory}
          filters={filters}
          setFilters={setFilters}
        />
      )}

      <main ref={mainRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto w-full">
          {isOnThisDay ? (
            /* On This Day tab content */
            <OnThisDayView
              onSelectEntry={setSelectedEntry}
              onAddClick={() => setShowSubmissionWizard(true)}
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 rounded-full border-4 border-white/5 border-t-red-500 animate-spin"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-lg">No entries found</p>
              {searchQuery && <p className="text-sm mt-2">Try adjusting your search terms</p>}
            </div>
          ) : (
            <>
              <EntryGrid
                entries={entries}
                onSelectEntry={setSelectedEntry}
              />

              {loadingMore && (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-white/5 border-t-red-500 animate-spin"></div>
                  <span className="text-sm text-gray-500">Loading more...</span>
                </div>
              )}

              {!hasMore && entries.length > PAGE_SIZE && (
                <p className="text-center text-xs text-gray-600 py-6">All {entries.length} entries loaded</p>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="shrink-0 border-t border-white/5 px-6 py-3 flex items-center justify-center text-[10px] text-gray-500">
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <a href="https://laborheritage.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            &copy; 2026 The Labor Heritage Foundation
          </a>
          <span>&middot;</span>
          {isOnThisDay ? (
            <span className="hidden sm:inline">Use arrow keys to navigate days</span>
          ) : (
            <span>Showing {entries.length} of {displayTotal} entries</span>
          )}
        </div>
      </footer>


      <Suspense fallback={null}>
        {selectedEntry && (
          <EntryDetail
            entry={selectedEntry}
            onClose={() => setSelectedEntry(null)}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showSubmissionWizard && (
          <SubmissionWizard
            categories={categories}
            onClose={() => setShowSubmissionWizard(false)}
            onSubmitted={() => {
              setShowSubmissionWizard(false);
              setSearchQuery(q => q + '');
            }}
          />
        )}
      </Suspense>
    </div>
  );
}

function AdminRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('isAdminAuthenticated') === 'true'
  );

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="w-10 h-10 rounded-full border-4 border-white/5 border-t-red-500 animate-spin"></div>
      </div>
    }>
      <AdminDashboard onLogout={() => {
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('isAdminAuthenticated');
        setIsAuthenticated(false);
      }} />
    </Suspense>
  );
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
