import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, useMatch } from 'react-router-dom';
import { X } from 'lucide-react';
import { entryPath, parseEntryRef } from './entry-url.ts';
import Header from './components/Header.tsx';
import CategoryNav from './components/CategoryNav.tsx';
import FilterBar, { SORT_OPTIONS } from './components/FilterBar.tsx';
import EntryGrid from './components/EntryGrid.tsx';
import AdminLogin from './components/AdminLogin.tsx';
import OnThisDayView from './components/OnThisDayView.tsx';

const EntryDetail = lazy(() => import('./components/EntryDetail.tsx'));
const SubmissionWizard = lazy(() => import('./components/SubmissionWizard.tsx'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard.tsx'));
import type { Entry, Category } from './types.ts';

const PAGE_SIZE = 60;
const SITE_TITLE = 'LHF Labor Arts & Culture Database';
const NOT_AVAILABLE = "That entry isn't available. It may have been removed or the link may be incomplete.";

function HomePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('on-this-day');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showSubmissionWizard, setShowSubmissionWizard] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const mainRef = useRef<HTMLElement>(null);
  const offsetRef = useRef(0);

  const isOnThisDay = selectedCategory === 'on-this-day';

  // ---- Shareable links: /entry/123-title opens that entry's popup ----
  // The popup lives on top of this page, so the list keeps its scroll position
  // and filters while a link is open, and Back closes the popup.
  const navigate = useNavigate();
  const location = useLocation();
  const entryMatch = useMatch('/entry/:ref');
  const isEntryRoute = entryMatch !== null;
  const linkedId = parseEntryRef(entryMatch?.params.ref);
  const navState = location.state as { openedInApp?: boolean; linkNotice?: string } | null;
  const openedInApp = navState?.openedInApp === true;
  // A failed link sends the reader home with the reason in the history entry,
  // so the notice needs no state of its own. Dismissing it (or 8 s passing)
  // clears it from history; a refresh before then shows it again, harmlessly.
  const linkNotice = navState?.linkNotice ?? null;
  // The entry on screen. `selectedEntry` can hold the last one opened after
  // its popup closes; only show it while the address points at it.
  const shownEntry = isEntryRoute && selectedEntry && selectedEntry.id === linkedId ? selectedEntry : null;
  const selectedId = selectedEntry?.id;

  const goHomeWithNotice = useCallback((notice: string) => {
    navigate('/', { replace: true, state: { linkNotice: notice } });
  }, [navigate]);

  const dismissNotice = useCallback(() => {
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [navigate, location.pathname, location.search]);

  const openEntry = useCallback((entry: Entry) => {
    setSelectedEntry(entry);
    navigate(entryPath(entry), { state: { openedInApp: true } });
  }, [navigate]);

  // Opened from a card: step back to the list. Arrived by link: there is no
  // list behind it in history, so go to the home page instead of off the site.
  const closeEntry = useCallback(() => {
    if (openedInApp) navigate(-1);
    else navigate('/', { replace: true });
  }, [openedInApp, navigate]);

  // Keep the popup in step with the address (links, Back/Forward buttons).
  useEffect(() => {
    if (!isEntryRoute) return;
    if (linkedId === null) {
      goHomeWithNotice(NOT_AVAILABLE);
      return;
    }
    if (linkedId === selectedId) return;

    const controller = new AbortController();
    fetch(`/api/entries/${linkedId}`, { signal: controller.signal })
      .then(r => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Entry>;
      })
      .then(data => {
        if (!data) {
          goHomeWithNotice(NOT_AVAILABLE);
          return;
        }
        setSelectedEntry(data);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error('Failed to fetch linked entry:', err);
        goHomeWithNotice('That entry could not be loaded. Please try again in a moment.');
      });
    return () => controller.abort();
  }, [isEntryRoute, linkedId, selectedId, goHomeWithNotice]);

  // Show the current form of the address (the server redirects too; this
  // covers local development, where Vite serves the page).
  useEffect(() => {
    if (!shownEntry) return;
    const canonical = entryPath(shownEntry);
    if (location.pathname !== canonical) {
      navigate(canonical + location.search, { replace: true, state: location.state });
    }
  }, [shownEntry, location.pathname, location.search, location.state, navigate]);

  // Tab title names the open entry, so bookmarks and history are readable.
  useEffect(() => {
    if (!shownEntry) return;
    const name = shownEntry.category === 'quote' && shownEntry.creator
      ? `Quote by ${shownEntry.creator}`
      : shownEntry.title;
    const short = name.length > 70 ? `${name.slice(0, 69).trimEnd()}…` : name;
    document.title = `${short} | ${SITE_TITLE}`;
    return () => { document.title = SITE_TITLE; };
  }, [shownEntry]);

  useEffect(() => {
    if (!linkNotice) return;
    const timer = setTimeout(dismissNotice, 8000);
    return () => clearTimeout(timer);
  }, [linkNotice, dismissNotice]);

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
    setSort('');
  }, [selectedCategory]);

  // Debounce search input so a request isn't fired on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Derive effective sort from category — if sort is empty or invalid for current category, use first option
  const catSortOptions = SORT_OPTIONS[selectedCategory];
  const effectiveSort = sort && catSortOptions?.some(o => o.value === sort) ? sort : catSortOptions?.[0]?.value || 'newest';

  // Build query params (shared between initial fetch and load-more)
  const buildParams = useCallback((offset: number) => {
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== 'on-this-day') params.set('category', selectedCategory);
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    if (effectiveSort) params.set('sort', effectiveSort);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    return params;
  }, [selectedCategory, debouncedSearch, filters, effectiveSort]);

  // Initial fetch when category, search, or filters change (skip for On This Day)
  useEffect(() => {
    if (isOnThisDay) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasMore(true);
    offsetRef.current = 0;

    // Abort any in-flight request when params change so stale responses
    // can't overwrite newer results (race condition fix)
    const controller = new AbortController();
    const params = buildParams(0);
    fetch(`/api/entries?${params}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setEntries(data);
        offsetRef.current = data.length;
        setHasMore(data.length >= PAGE_SIZE);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error('Failed to fetch entries:', err);
        setLoading(false);
      });
    return () => controller.abort();
  }, [selectedCategory, debouncedSearch, filters, buildParams, isOnThisDay]);

  // Load more entries
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || isOnThisDay) return;
    setLoadingMore(true);

    const params = buildParams(offsetRef.current);
    fetch(`/api/entries?${params}`)
      .then(r => r.json())
      .then(data => {
        // Deduplicate by ID to prevent React key warnings
        setEntries(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newEntries = data.filter((e: Entry) => !existingIds.has(e.id));
          return [...prev, ...newEntries];
        });
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
          sort={effectiveSort}
          onSortChange={setSort}
        />
      )}

      <main ref={mainRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto w-full">
          {isOnThisDay ? (
            /* On This Day tab content */
            <OnThisDayView
              onSelectEntry={openEntry}
              onAddClick={() => setShowSubmissionWizard(true)}
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 rounded-full border-4 border-white/5 border-t-red-500 animate-spin"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg">
                {searchQuery
                  ? <>No entries found for "<span className="text-white/70">{searchQuery}</span>"</>
                  : 'No entries found'}
              </p>
              {searchQuery && <p className="text-sm mt-2">Try adjusting your search terms</p>}
            </div>
          ) : (
            <>
              <EntryGrid
                entries={entries}
                onSelectEntry={openEntry}
                searchQuery={searchQuery}
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
        {shownEntry && (
          <EntryDetail
            entry={shownEntry}
            onClose={closeEntry}
            onTagClick={(tag) => {
              const category = shownEntry.category;
              closeEntry();
              setSelectedCategory(category);
              setFilters({ tag });
            }}
          />
        )}
      </Suspense>

      {linkNotice && (
        <div
          role="status"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-2rem)] max-w-md flex items-start gap-3 px-4 py-3 rounded-lg bg-[var(--card)] border border-[var(--border)] shadow-2xl text-sm"
        >
          <span className="flex-1">{linkNotice}</span>
          <button onClick={dismissNotice} aria-label="Dismiss" className="text-gray-400 hover:text-white shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

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
        <Route path="/" element={<HomePage />}>
          {/* HomePage reads this itself (useMatch) and opens the popup, so the
              list stays mounted underneath instead of reloading. */}
          <Route path="entry/:ref" element={null} />
        </Route>
        <Route path="/admin" element={<AdminRoute />} />
      </Routes>
    </Router>
  );
}

export default App;
