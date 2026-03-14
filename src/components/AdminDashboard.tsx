import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Eye, EyeOff, Download, Upload, Search, X, UserRound, Mail, MessageSquare, Edit2, Database, LogOut, AlertTriangle, Code2, Sparkles, Check, HelpCircle } from 'lucide-react';
import { SortDropdown, ADMIN_SORT_OPTIONS } from './FilterBar.tsx';
import type { Entry, Category, RelatedLink } from '../types.ts';
import { getRelatedLinks, parseSections, rebuildMoreResearch, parseMetadata } from '../types.ts';
import ImageDropzone from './ImageDropzone.tsx';
import SubmissionWizard from './SubmissionWizard.tsx';
import EntryDetail from './EntryDetail.tsx';
import MusicSearch from './MusicSearch.tsx';
import type { MusicDetails } from './MusicSearch.tsx';
import ExportModal from './ExportModal.tsx';
import ImportModal from './ImportModal.tsx';
import ApiModal from './ApiModal.tsx';
import TagSelector from './TagSelector.tsx';
import ConfirmModal from './ConfirmModal.tsx';
import ResearchFieldsSection from './ResearchFieldsSection.tsx';
import RelatedLinksEditor from './RelatedLinksEditor.tsx';
import AiSandbox from './AiSandbox.tsx';
import AdminHelpPanel from './AdminHelpPanel.tsx';

const PAGE_SIZE = 60;

function getAdminHeaders(): HeadersInit {
  const token = sessionStorage.getItem('adminToken') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function AnimatedRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('entry-visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className="entry-card">{children}</div>;
}

interface AdminDashboardProps {
  onLogout?: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filterPublished, setFilterPublished] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  // Reset sort to category default when category changes
  const adminSortOptions = ADMIN_SORT_OPTIONS[selectedCategory] || ADMIN_SORT_OPTIONS.default;
  const effectiveSort = sort && adminSortOptions.some(o => o.value === sort) ? sort : adminSortOptions[0]?.value || 'newest';
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [submitterInfoEntry, setSubmitterInfoEntry] = useState<Entry | null>(null);
  const [previewEntry, setPreviewEntry] = useState<Entry | null>(null);
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<Entry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);


  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories', { headers: getAdminHeaders() });
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const buildParams = useCallback((offset: number) => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (filterPublished) params.set('isPublished', filterPublished);
    if (search.trim()) params.set('search', search.trim());
    if (effectiveSort) params.set('sort', effectiveSort);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    return params;
  }, [selectedCategory, filterPublished, search, effectiveSort]);

  // Initial fetch when filters change
  useEffect(() => {
    setLoading(true);
    setHasMore(true);
    offsetRef.current = 0;

    const params = buildParams(0);
    fetch(`/api/admin/entries?${params}`, { headers: getAdminHeaders() })
      .then(res => {
        const total = parseInt(res.headers.get('X-Total-Count') || '0');
        setTotalCount(total);
        return res.json();
      })
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
  }, [selectedCategory, filterPublished, search, buildParams]);

  // Load more
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const params = buildParams(offsetRef.current);
    fetch(`/api/admin/entries?${params}`, { headers: getAdminHeaders() })
      .then(res => res.json())
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
  }, [loadingMore, hasMore, buildParams]);

  // Infinite scroll listener
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 400) {
        loadMore();
      }
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Helper to refetch from scratch (after mutations)
  const refetch = useCallback(() => {
    setLoading(true);
    setHasMore(true);
    offsetRef.current = 0;
    const params = buildParams(0);
    fetch(`/api/admin/entries?${params}`, { headers: getAdminHeaders() })
      .then(res => {
        const total = parseInt(res.headers.get('X-Total-Count') || '0');
        setTotalCount(total);
        return res.json();
      })
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
  }, [buildParams]);

  const togglePublish = async (entry: Entry) => {
    try {
      await fetch(`/api/admin/entries/${entry.id}/publish`, {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify({ isPublished: !entry.isPublished }),
      });
      refetch();
    } catch (err) {
      console.error('Failed to toggle publish:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmEntry) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/admin/entries/${deleteConfirmEntry.id}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
      setDeleteConfirmEntry(null);
      refetch();
    } catch (err) {
      console.error('Failed to delete entry:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('adminToken') || ''}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Reset failed');
      alert(`Database reset complete.\n\n${result.deletedEntries} entries deleted\n${result.deletedImages} image files removed`);
      setShowResetModal(false);
      refetch();
    } catch (err) {
      console.error('Reset failed:', err);
      alert(`Reset failed: ${err instanceof Error ? err.message : 'Check console.'}`);
    } finally {
      setResetting(false);
    }
  };

  const unpublishedCount = entries.filter(e => !e.isPublished).length;
  const publishedCount = totalCount - unpublishedCount;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-2 rounded-lg shadow-lg">
              <Database size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Manage Labor Arts &amp; Culture Database</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddWizard(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95"
            >
              <Plus size={16} /> Add to Database
            </button>
            <button onClick={() => setShowResetModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-red-900/50 border border-red-900/30 text-red-400 font-bold rounded-xl transition-all hover:scale-105 active:scale-95">
              <Trash2 size={16} /> Reset DB
            </button>
            <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-gray-300 font-bold rounded-xl transition-all hover:scale-105 active:scale-95">
              <Download size={16} /> Export
            </button>
            <button onClick={() => setShowApiModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-gray-300 font-bold rounded-xl transition-all hover:scale-105 active:scale-95">
              <Code2 size={16} /> API
            </button>
            <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-gray-300 font-bold rounded-xl transition-all hover:scale-105 active:scale-95">
              <Upload size={16} /> Import
            </button>
            <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-gray-300 font-bold rounded-xl transition-all hover:scale-105 active:scale-95">
              <HelpCircle size={16} /> Help
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-gray-400 hover:text-red-400 font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
                data-tooltip="Logout"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_3fr] gap-6 mb-8">
          <div
            onClick={() => setFilterPublished(filterPublished === 'true' ? '' : 'true')}
            className={`bg-zinc-900 border px-5 py-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${filterPublished === 'true' ? 'border-green-500/40 ring-1 ring-green-500/20' : 'border-white/5'}`}
          >
            <p className="text-sm text-gray-500 mb-1">Published</p>
            <p className="text-3xl font-bold">{publishedCount}</p>
          </div>
          <div
            onClick={() => setFilterPublished(filterPublished === 'false' ? '' : 'false')}
            className={`bg-zinc-900 border px-5 py-4 rounded-2xl relative cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${filterPublished === 'false' ? 'border-red-500/40 ring-1 ring-red-500/20' : 'border-white/5'}`}
          >
            <p className="text-sm text-gray-500 mb-1">Review Queue</p>
            <p className={`text-3xl font-bold ${unpublishedCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>{unpublishedCount}</p>
            {unpublishedCount > 0 && (
              <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="bg-zinc-900 border border-white/5 px-5 py-4 rounded-2xl flex items-center gap-4">
            <Search size={20} className="text-gray-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, creator, or tag..."
              className="bg-transparent border-none text-white focus:outline-none w-full text-lg placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* ── Category Tabs + Sort ── */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-900/60 border border-white/5 rounded-xl p-1 w-fit">
            <button
              onClick={() => { setSelectedCategory(''); setFilterPublished(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!selectedCategory && !filterPublished ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.slug}
                onClick={() => { setSelectedCategory(cat.slug === selectedCategory ? '' : cat.slug); setFilterPublished(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === cat.slug ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <SortDropdown
              value={effectiveSort}
              onChange={setSort}
              options={adminSortOptions}
            />
          </div>
        </div>

        {/* ── Entry Table ── */}
        <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[1fr_100px_90px_250px] gap-4 px-6 py-3 border-b border-white/5 bg-zinc-800/50">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Entry</span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Category</span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Status</span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Actions</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 rounded-full border-4 border-white/5 border-t-red-500 animate-spin"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              {search.trim()
                ? <>No entries found for "<span className="text-white/70">{search.trim()}</span>"</>
                : 'No entries found'}
            </div>
          ) : (
            <div ref={scrollRef} className="max-h-[calc(100vh-380px)] overflow-y-auto">
              {entries.map(entry => (
                <AnimatedRow key={entry.id}>
                  <div className={`grid grid-cols-1 md:grid-cols-[1fr_100px_90px_250px] gap-2 md:gap-4 items-center px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors group ${parseMetadata(entry).aiEnhanced ? 'bg-amber-500/[0.03]' : ''}`}>
                    {/* Entry info */}
                    <div className="min-w-0">
                      {entry.category === 'history' ? (
                        <>
                          <p className="font-bold text-sm text-amber-400 group-hover:text-amber-300 transition-colors">
                            {[
                              entry.month ? ['January','February','March','April','May','June','July','August','September','October','November','December'][entry.month - 1] : '',
                              entry.day ? `${entry.day},` : '',
                              entry.year ? String(entry.year) : '',
                            ].filter(Boolean).join(' ') || 'No date'}
                          </p>
                          <p className="text-xs text-gray-300 truncate mt-0.5">{entry.description}</p>
                        </>
                      ) : entry.category === 'quote' ? (
                        <>
                          <p className="font-bold text-sm text-sky-400 group-hover:text-sky-300 transition-colors">
                            {entry.creator || 'Unknown Author'}
                          </p>
                          <p className="text-xs text-gray-300 truncate mt-0.5 italic">{entry.description}</p>
                        </>
                      ) : entry.category === 'music' ? (
                        <>
                          <p className="font-bold text-sm text-emerald-400 group-hover:text-emerald-300 transition-colors truncate">
                            {entry.title}
                          </p>
                          <p className="text-xs text-gray-300 truncate mt-0.5">{entry.creator || 'Unknown Artist'}</p>
                        </>
                      ) : entry.category === 'film' ? (
                        <>
                          <p className="font-bold text-sm text-violet-400 group-hover:text-violet-300 transition-colors truncate">
                            {entry.title}{entry.year ? ` (${entry.year})` : ''}
                          </p>
                          <p className="text-xs text-gray-300 truncate mt-0.5">{entry.creator || 'Unknown Director'}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-sm uppercase tracking-wide group-hover:text-red-400 transition-colors truncate">
                            {entry.title}
                          </p>
                          <p className="text-xs text-gray-300 truncate mt-0.5">{entry.description}</p>
                        </>
                      )}
                    </div>

                    {/* Category badge */}
                    <div className="text-center">
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-medium text-gray-400 uppercase">
                        {entry.category}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${entry.isPublished ? 'bg-green-500' : 'bg-amber-500'}`} />
                      <span className={`text-xs ${entry.isPublished ? 'text-green-400' : 'text-amber-400'}`}>
                        {entry.isPublished ? 'Published' : 'Pending'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2">
                      {(entry.submitterName || entry.submitterEmail) ? (
                        <button
                          onClick={() => setSubmitterInfoEntry(entry)}
                          className="p-2 rounded-lg transition-all bg-purple-900/30 text-purple-400 border border-purple-500/20 hover:bg-purple-900/50 hover:text-purple-300"
                          data-tooltip="Submitter Info"
                        >
                          <UserRound size={14} />
                        </button>
                      ) : (
                        <div className="w-[34px]" />
                      )}
                      <div
                        className={`p-2 ${parseMetadata(entry).aiEnhanced ? 'text-amber-500/70' : 'invisible'}`}
                        data-tooltip={parseMetadata(entry).aiEnhanced ? 'Researched' : undefined}
                      >
                        <Sparkles size={12} />
                      </div>
                      <button
                        onClick={() => setPreviewEntry(entry)}
                        className="p-2 bg-zinc-800 text-gray-400 hover:text-blue-400 hover:bg-zinc-700 rounded-lg transition-all"
                        data-tooltip="Preview"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="p-2 bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-all"
                        data-tooltip="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => togglePublish(entry)}
                        className={`p-2 rounded-lg transition-all ${entry.isPublished ? 'bg-zinc-800 text-green-400 hover:bg-zinc-700' : 'bg-zinc-800 text-amber-400 hover:bg-zinc-700'}`}
                        data-tooltip={entry.isPublished ? 'Unpublish' : 'Publish'}
                      >
                        {entry.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmEntry(entry)}
                        className="p-2 bg-zinc-800 text-gray-400 hover:text-red-500 hover:bg-zinc-700 rounded-lg transition-all"
                        data-tooltip="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </AnimatedRow>
              ))}

              {/* Load more indicator */}
              {loadingMore && (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-white/5 border-t-red-500 animate-spin"></div>
                  <span className="text-sm text-gray-500">Loading more...</span>
                </div>
              )}

              {!hasMore && entries.length > PAGE_SIZE && (
                <p className="text-center text-xs text-gray-600 py-6">All {entries.length} entries loaded</p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Add Entry Wizard (admin mode) */}
      {showAddWizard && (
        <SubmissionWizard
          categories={categories}
          onClose={() => setShowAddWizard(false)}
          onSubmitted={() => { setShowAddWizard(false); refetch(); }}
          isAdmin
        />
      )}

      {/* Preview Modal */}
      {previewEntry && (
        <EntryDetail entry={previewEntry} onClose={() => setPreviewEntry(null)} />
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          categories={categories}
          onClose={() => setEditingEntry(null)}
          onSaved={() => { setEditingEntry(null); refetch(); }}
        />
      )}

      {/* Reset DB Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !resetting && setShowResetModal(false)} />
          <div className="relative w-full max-w-md bg-[var(--card)] border-2 border-red-600/60 rounded-xl shadow-2xl overflow-hidden">

            {/* Red warning banner */}
            <div className="bg-red-600/15 border-b border-red-600/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 p-2 rounded-lg shadow-lg shadow-red-600/30">
                  <AlertTriangle size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-400">Reset Database</h3>
                  <p className="text-xs text-red-400/60 font-medium">DESTRUCTIVE ACTION — CANNOT BE UNDONE</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-red-950/40 border border-red-900/40 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-200">
                  This will <span className="font-bold text-red-400">permanently delete:</span>
                </p>
                <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
                  <li><span className="text-white font-semibold">{totalCount.toLocaleString()}</span> database entries</li>
                  <li>All uploaded images (film posters, thumbnails)</li>
                  <li>All EntryImage records</li>
                </ul>
              </div>

              <p className="text-sm text-gray-500">
                Only do this before importing a full backup. Make sure you have exported a backup first!
              </p>

              {/* Type to confirm */}
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">
                  Type <span className="font-mono font-bold text-red-400 bg-red-950/50 px-1.5 py-0.5 rounded">RESET</span> to confirm
                </label>
                <input
                  type="text"
                  placeholder="Type RESET here"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-red-500/50 placeholder:text-gray-600"
                  onChange={(e) => {
                    const confirmBtn = document.getElementById('reset-confirm-btn') as HTMLButtonElement;
                    if (confirmBtn) confirmBtn.disabled = e.target.value !== 'RESET' || resetting;
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end px-6 py-4 border-t border-white/5">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="px-4 py-2.5 text-sm text-gray-400 hover:text-white font-medium transition-colors disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                id="reset-confirm-btn"
                onClick={handleReset}
                disabled={true}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {resetting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Everything
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          categories={categories}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onComplete={() => refetch()}
        />
      )}

      {/* API Reference Modal */}
      {showApiModal && (
        <ApiModal onClose={() => setShowApiModal(false)} />
      )}

      {/* Help Panel */}
      <AdminHelpPanel isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {submitterInfoEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSubmitterInfoEntry(null)} />
          <div className="relative w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Submitter Info</h3>
              <button onClick={() => setSubmitterInfoEntry(null)} className="p-2 hover:bg-white/5 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              SUBMITTED FOR: <span className="font-bold text-white">{submitterInfoEntry.title}</span>
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <UserRound size={16} className="text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-red-400 mb-0.5">Name</p>
                  <p className="text-sm">{submitterInfoEntry.submitterName || <span className="text-gray-500 italic">No name provided</span>}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail size={16} className="text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-red-400 mb-0.5">Email</p>
                  {submitterInfoEntry.submitterEmail ? (
                    <a href={`mailto:${submitterInfoEntry.submitterEmail}`} className="text-sm text-blue-400 hover:text-blue-300 underline">
                      {submitterInfoEntry.submitterEmail}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No email provided</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageSquare size={16} className="text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-red-400 mb-0.5">Comment</p>
                  <p className="text-sm">{submitterInfoEntry.submitterComment || <span className="text-gray-500 italic">No comment</span>}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmEntry}
        title="Delete Entry"
        message={`Are you sure you want to delete "${deleteConfirmEntry?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmEntry(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function EditEntryModal({ entry, categories, onClose, onSaved }: {
  entry: Entry;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  // Parse existing metadata
  const meta = entry.metadata ? (() => { try { return JSON.parse(entry.metadata); } catch { return {}; } })() : {};

  const [title, setTitle] = useState(entry.title);
  const [description, setDescription] = useState(entry.description);
  const category = entry.category;
  const [creator, setCreator] = useState(entry.creator || '');
  const [month, setMonth] = useState(String(entry.month || ''));
  const [day, setDay] = useState(String(entry.day || ''));
  const [year, setYear] = useState(String(entry.year || ''));
  const [tags, setTags] = useState(entry.tags || '');
  const [sourceUrl, setSourceUrl] = useState(entry.sourceUrl || '');
  const [saving, setSaving] = useState(false);

  // Film-specific fields (pre-filled from metadata)
  const [filmCast, setFilmCast] = useState(meta.cast || '');
  const [filmWriters, setFilmWriters] = useState(meta.writers || '');
  const [filmRuntime, setFilmRuntime] = useState(meta.duration || '');
  const [filmCountry, setFilmCountry] = useState(meta.country || '');
  const [filmGenre, setFilmGenre] = useState(meta.genre || '');
  const [filmComment, setFilmComment] = useState(meta.comment || '');

  // Image management
  const [existingImages, setExistingImages] = useState(entry.images || []);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

  const isFilm = category === 'film';
  const isMusic = category === 'music';
  const isQuote = category === 'quote';

  // Music-specific fields (pre-filled from metadata)
  const [musicPerformer, setMusicPerformer] = useState(meta.performer || '');
  const [musicSongwriter, setMusicSongwriter] = useState(meta.writer || '');
  const [musicGenre, setMusicGenre] = useState(meta.genre || '');
  const [musicRunTime, setMusicRunTime] = useState(meta.runTime || '');
  const [musicLyrics, setMusicLyrics] = useState(meta.lyrics || '');

  // Research fields (all categories, pre-filled from metadata)
  const [wikipediaUrl, setWikipediaUrl] = useState(meta.wikipediaUrl || '');
  const [relatedLinks, setRelatedLinks] = useState<RelatedLink[]>(getRelatedLinks(meta));
  const [moreResearch, setMoreResearch] = useState(meta.moreResearch || '');

  // Structured research sections (admin edit for history/quote)
  const isHistory = entry.category === 'history';
  const initialSections = parseSections(meta.moreResearch || '');
  const [quickFacts, setQuickFacts] = useState(initialSections.quickFacts);
  const [keyPeople, setKeyPeople] = useState(initialSections.keyPeople);
  const [additionalNotes, setAdditionalNotes] = useState(initialSections.additionalNotes);

  const updateQuickFacts = (v: string) => { setQuickFacts(v); setMoreResearch(rebuildMoreResearch(v, keyPeople, additionalNotes)); };
  const updateKeyPeople = (v: string) => { setKeyPeople(v); setMoreResearch(rebuildMoreResearch(quickFacts, v, additionalNotes)); };
  const updateAdditionalNotes = (v: string) => { setAdditionalNotes(v); setMoreResearch(rebuildMoreResearch(quickFacts, keyPeople, v)); };

  // AI Sandbox & enhancement tracking
  const [showAiSandbox, setShowAiSandbox] = useState(false);
  const [aiEnhanced, setAiEnhanced] = useState(!!meta.aiEnhanced);

  // Unsaved changes guard
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const hasUnsavedChanges = () => {
    return title !== entry.title ||
      description !== entry.description ||
      creator !== (entry.creator || '') ||
      month !== String(entry.month || '') ||
      day !== String(entry.day || '') ||
      year !== String(entry.year || '') ||
      tags !== (entry.tags || '') ||
      sourceUrl !== (entry.sourceUrl || '') ||
      wikipediaUrl !== (meta.wikipediaUrl || '') ||
      moreResearch !== (meta.moreResearch || '') ||
      relatedLinks.length !== getRelatedLinks(meta).length;
  };
  const handleCloseAttempt = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  const handleMusicSelect = (song: MusicDetails) => {
    setTitle(song.title);
    setMusicPerformer(song.artist);
    setMusicSongwriter(song.writers);
    if (song.year) setYear(String(song.year));
    setMusicLyrics(song.lyrics);
    if (song.youtubeUrl) setSourceUrl(song.youtubeUrl);
  };

  const handleDeleteImage = async (imageId: number) => {
    setDeletingImageId(imageId);
    try {
      const res = await fetch(`/api/entries/${entry.id}/images/${imageId}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        setExistingImages(prev => prev.filter(img => img.id !== imageId));
      }
    } catch (err) {
      console.error('Failed to delete image:', err);
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build metadata per category
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let categoryMeta: Record<string, any> = { ...meta };
      if (isFilm) {
        if (filmCast) categoryMeta.cast = filmCast; else delete categoryMeta.cast;
        if (filmWriters) categoryMeta.writers = filmWriters; else delete categoryMeta.writers;
        if (filmRuntime) categoryMeta.duration = filmRuntime; else delete categoryMeta.duration;
        if (filmCountry) categoryMeta.country = filmCountry; else delete categoryMeta.country;
        if (filmGenre) categoryMeta.genre = filmGenre; else delete categoryMeta.genre;
        if (filmComment) categoryMeta.comment = filmComment; else delete categoryMeta.comment;
        if (sourceUrl) {
          const ytMatch = sourceUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (ytMatch) categoryMeta.youtubeId = ytMatch[1];
        }
      } else if (isMusic) {
        if (musicPerformer) categoryMeta.performer = musicPerformer; else delete categoryMeta.performer;
        if (musicSongwriter) categoryMeta.writer = musicSongwriter; else delete categoryMeta.writer;
        if (musicGenre) categoryMeta.genre = musicGenre; else delete categoryMeta.genre;
        if (musicRunTime) categoryMeta.runTime = musicRunTime; else delete categoryMeta.runTime;
        if (musicLyrics) categoryMeta.lyrics = musicLyrics; else delete categoryMeta.lyrics;
        if (sourceUrl) categoryMeta.locationUrl = sourceUrl; else delete categoryMeta.locationUrl;
      } else if (isQuote) {
        // No quote-specific metadata fields (source removed)
      }

      // Merge research fields for all categories
      if (wikipediaUrl) categoryMeta.wikipediaUrl = wikipediaUrl; else delete categoryMeta.wikipediaUrl;
      if (relatedLinks.length > 0) categoryMeta.relatedLinks = relatedLinks; else delete categoryMeta.relatedLinks;
      if (moreResearch) categoryMeta.moreResearch = moreResearch; else delete categoryMeta.moreResearch;

      // AI enhancement tracking
      if (aiEnhanced) {
        categoryMeta.aiEnhanced = true;
        if (!categoryMeta.aiEnhancedAt) categoryMeta.aiEnhancedAt = new Date().toISOString();
      }

      const metadata = Object.keys(categoryMeta).length > 0 ? JSON.stringify(categoryMeta) : null;

      const res = await fetch(`/api/admin/entries/${entry.id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          title, description, category, creator: creator || null,
          month: month || null, day: day || null, year: year || null,
          tags: tags || null, sourceUrl: sourceUrl || null,
          metadata,
          isPublished: entry.isPublished,
        }),
      });
      if (!res.ok) throw new Error('Save failed');

      // Upload new images if any
      if (imageFiles.length > 0) {
        const formData = new FormData();
        for (const file of imageFiles) {
          formData.append('images', file);
        }
        await fetch(`/api/entries/${entry.id}/images`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('adminToken') || ''}` },
          body: formData,
        });
      }

      onSaved();
    } catch (err) {
      console.error('Save error:', err);
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCloseAttempt} />
      <div className={`relative w-full ${(isHistory || isQuote) ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl p-6`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold">Edit Entry</h3>
            <button
              type="button"
              onClick={() => setShowAiSandbox(true)}
              className={`ml-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                aiEnhanced
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20'
              }`}
              data-tooltip={aiEnhanced ? 'Researched — click to re-scan' : 'Research with AI'}
            >
              <Sparkles size={12} />
              <span className="hidden sm:inline">{aiEnhanced ? 'Researched' : 'Research'}</span>
              {aiEnhanced && <Check size={10} className="text-red-400" />}
            </button>
          </div>
          <button onClick={handleCloseAttempt} className="p-2 hover:bg-white/5 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-xs uppercase tracking-wider font-semibold text-red-400 mb-4">
          {categories.find(c => c.slug === category)?.label || category}
        </p>

        {/* ── HISTORY or QUOTE — 2-column layout ── */}
        {(isHistory || isQuote) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column: core fields */}
            <div className="space-y-3">
              {isHistory && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <FieldLabel label="Month">
                      <input type="number" value={month} onChange={e => setMonth(e.target.value)} className={inputClass} />
                    </FieldLabel>
                    <FieldLabel label="Day">
                      <input type="number" value={day} onChange={e => setDay(e.target.value)} className={inputClass} />
                    </FieldLabel>
                    <FieldLabel label="Year">
                      <input type="number" value={year} onChange={e => setYear(e.target.value)} className={inputClass} />
                    </FieldLabel>
                  </div>
                  <FieldLabel label="Description">
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} className={inputClass} />
                  </FieldLabel>
                  <FieldLabel label="Tags">
                    <TagSelector value={tags} onChange={setTags} />
                  </FieldLabel>
                </>
              )}
              {isQuote && (
                <>
                  <FieldLabel label="Author">
                    <input type="text" value={creator} onChange={e => setCreator(e.target.value)} className={inputClass} />
                  </FieldLabel>
                  <FieldLabel label="Quote">
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6} className={inputClass} />
                  </FieldLabel>
                  <FieldLabel label="Tags">
                    <TagSelector value={tags} onChange={setTags} />
                  </FieldLabel>
                </>
              )}

              {/* Images */}
              {existingImages.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Current Images</label>
                  <div className="grid grid-cols-3 gap-2">
                    {existingImages.map(img => (
                      <div key={img.id} className="relative group rounded-lg overflow-hidden bg-black/20 aspect-square">
                        <img src={img.thumbnailUrl || img.url} alt={img.caption || 'Entry image'} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => handleDeleteImage(img.id)} disabled={deletingImageId === img.id}
                          className="absolute top-1 right-1 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80 disabled:opacity-50">
                          {deletingImageId === img.id ? <div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" /> : <X size={12} className="text-white" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">{existingImages.length > 0 ? 'Add More Images' : 'Upload Images'}</label>
                <ImageDropzone files={imageFiles} setFiles={setImageFiles} maxFiles={5} />
              </div>
            </div>

            {/* Right column: research & links */}
            <div className="space-y-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Research & Links</p>
              <FieldLabel label="Wikipedia Link">
                <input type="url" placeholder="https://en.wikipedia.org/wiki/..." value={wikipediaUrl} onChange={e => setWikipediaUrl(e.target.value)} className={inputClass} />
              </FieldLabel>
              <FieldLabel label="Related Links">
                <RelatedLinksEditor links={relatedLinks} onChange={setRelatedLinks} />
              </FieldLabel>
              <FieldLabel label="Quick Facts">
                <textarea placeholder={isQuote ? "Key facts about this person or quote..." : "Bullet points, key facts about this event..."} value={quickFacts} onChange={e => updateQuickFacts(e.target.value)} rows={4} className={inputClass} />
              </FieldLabel>
              <FieldLabel label="Key People & Organizations">
                <textarea placeholder="People and organizations involved..." value={keyPeople} onChange={e => updateKeyPeople(e.target.value)} rows={4} className={inputClass} />
              </FieldLabel>
              <FieldLabel label="Additional Notes">
                <textarea placeholder="Additional curator notes, context..." value={additionalNotes} onChange={e => updateAdditionalNotes(e.target.value)} rows={3} className={inputClass} />
              </FieldLabel>
            </div>
          </div>
        ) : (
          /* ── Non-history/quote categories: single column ── */
          <div className="space-y-3">

            {/* ── MUSIC ── */}
            {isMusic && (
              <>
                <MusicSearch onSelect={handleMusicSelect} />
                <FieldLabel label="Song Title">
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
                </FieldLabel>
                <FieldLabel label="Performer">
                  <input type="text" value={musicPerformer} onChange={e => setMusicPerformer(e.target.value)} className={inputClass} />
                </FieldLabel>
                <FieldLabel label="Songwriter">
                  <input type="text" value={musicSongwriter} onChange={e => setMusicSongwriter(e.target.value)} className={inputClass} />
                </FieldLabel>
                <FieldLabel label="URL — YouTube, Spotify, etc.">
                  <input type="text" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className={inputClass} />
                </FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  <FieldLabel label="Genre">
                    <input type="text" value={musicGenre} onChange={e => setMusicGenre(e.target.value)} className={inputClass} />
                  </FieldLabel>
                  <FieldLabel label="Run Time">
                    <input type="text" value={musicRunTime} onChange={e => setMusicRunTime(e.target.value)} className={inputClass} />
                  </FieldLabel>
                  <FieldLabel label="Year">
                    <input type="number" value={year} onChange={e => setYear(e.target.value)} className={inputClass} />
                  </FieldLabel>
                </div>
                <FieldLabel label="Keywords / Lyrics">
                  <textarea value={musicLyrics} onChange={e => setMusicLyrics(e.target.value)} rows={4} className={inputClass} />
                </FieldLabel>
                <FieldLabel label="Tags">
                  <TagSelector value={tags} onChange={setTags} />
                </FieldLabel>
              </>
            )}

            {/* ── FILM ── */}
            {isFilm && (
              <>
                <FieldLabel label="Title">
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
                </FieldLabel>
                <FieldLabel label="Director(s)">
                  <input type="text" value={creator} onChange={e => setCreator(e.target.value)} className={inputClass} />
                </FieldLabel>
                <FieldLabel label="Writer(s)">
                  <input type="text" value={filmWriters} onChange={e => setFilmWriters(e.target.value)} className={inputClass} />
                </FieldLabel>
                <FieldLabel label="Cast / Starring">
                  <input type="text" value={filmCast} onChange={e => setFilmCast(e.target.value)} className={inputClass} />
                </FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  <FieldLabel label="Runtime">
                    <input type="text" placeholder="e.g. 95m" value={filmRuntime} onChange={e => setFilmRuntime(e.target.value)} className={inputClass} />
                  </FieldLabel>
                  <FieldLabel label="Country">
                    <input type="text" value={filmCountry} onChange={e => setFilmCountry(e.target.value)} className={inputClass} />
                  </FieldLabel>
                  <FieldLabel label="Year">
                    <input type="number" value={year} onChange={e => setYear(e.target.value)} className={inputClass} />
                  </FieldLabel>
                </div>
                <FieldLabel label="Genre">
                  <input type="text" placeholder="e.g. Documentary, Drama" value={filmGenre} onChange={e => setFilmGenre(e.target.value)} className={inputClass} />
                </FieldLabel>
                <FieldLabel label="Synopsis">
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className={inputClass} />
                </FieldLabel>
                <FieldLabel label="Comments / Notes">
                  <textarea placeholder="Original curator notes, additional context" value={filmComment} onChange={e => setFilmComment(e.target.value)} rows={3} className={inputClass} />
                </FieldLabel>
                <FieldLabel label="Trailer URL (YouTube, Vimeo)">
                  <input type="text" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className={inputClass} />
                </FieldLabel>
                <FieldLabel label="Tags">
                  <TagSelector value={tags} onChange={setTags} />
                </FieldLabel>
              </>
            )}

            {/* Research & Links (non-history) */}
            <ResearchFieldsSection
              wikipediaUrl={wikipediaUrl} onWikipediaUrlChange={setWikipediaUrl}
              relatedLinks={relatedLinks} onRelatedLinksChange={setRelatedLinks}
              moreResearch={moreResearch} onMoreResearchChange={setMoreResearch}
              defaultExpanded
            />

            {/* Existing images */}
            {existingImages.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Current Images</label>
                <div className="grid grid-cols-3 gap-2">
                  {existingImages.map(img => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden bg-black/20 aspect-square">
                      <img src={img.thumbnailUrl || img.url} alt={img.caption || 'Entry image'} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleDeleteImage(img.id)} disabled={deletingImageId === img.id}
                        className="absolute top-1 right-1 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80 disabled:opacity-50">
                        {deletingImageId === img.id ? <div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" /> : <X size={12} className="text-white" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload new images */}
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">{existingImages.length > 0 ? 'Add More Images' : 'Upload Images'}</label>
              <ImageDropzone files={imageFiles} setFiles={setImageFiles} maxFiles={5} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={handleCloseAttempt} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* AI Sandbox overlay */}
      {showAiSandbox && (
        <AiSandbox
          entry={entry}
          onClose={() => setShowAiSandbox(false)}
          onSave={(updates) => {
            setDescription(updates.description);
            setTags(updates.tags);
            setWikipediaUrl(updates.wikipediaUrl);
            setRelatedLinks(updates.relatedLinks);
            setMoreResearch(updates.moreResearch);
            setAiEnhanced(true);
            // Re-parse structured sections for history/quote admin edit
            if (isHistory || isQuote) {
              const sections = parseSections(updates.moreResearch);
              setQuickFacts(sections.quickFacts);
              setKeyPeople(sections.keyPeople);
              setAdditionalNotes(sections.additionalNotes);
            }
            setShowAiSandbox(false);
          }}
        />
      )}

      {/* Unsaved changes confirm modal */}
      {showUnsavedConfirm && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowUnsavedConfirm(false)} />
          <div className="relative w-full max-w-sm bg-[var(--card)] border-2 border-amber-600/50 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b bg-amber-600/10 border-amber-600/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-600 shadow-lg shadow-amber-600/30">
                  <AlertTriangle size={18} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-amber-400">Unsaved Changes</h3>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-300 leading-relaxed">
                You have unsaved changes to this entry. Closing now will discard all your edits.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-white/5 bg-white/[0.02]">
              <button
                onClick={() => setShowUnsavedConfirm(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white font-medium transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowUnsavedConfirm(false);
                  onClose();
                }}
                className="flex items-center gap-2 px-5 py-2 text-white text-sm font-bold rounded-lg bg-amber-600 hover:bg-amber-700 transition-all"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
