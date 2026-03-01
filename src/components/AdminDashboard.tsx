import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Eye, EyeOff, Download, Upload, Search, X, UserRound, Mail, MessageSquare, Edit2, Database, LogOut } from 'lucide-react';
import type { Entry, Category } from '../types.ts';
import ImageDropzone from './ImageDropzone.tsx';
import SubmissionWizard from './SubmissionWizard.tsx';
import EntryDetail from './EntryDetail.tsx';
import MusicSearch from './MusicSearch.tsx';
import type { MusicDetails } from './MusicSearch.tsx';
import ExportModal from './ExportModal.tsx';

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
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [submitterInfoEntry, setSubmitterInfoEntry] = useState<Entry | null>(null);
  const [previewEntry, setPreviewEntry] = useState<Entry | null>(null);
  const [showAddWizard, setShowAddWizard] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);

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
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    return params;
  }, [selectedCategory, filterPublished, search]);

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
  }, [selectedCategory, filterPublished, search, buildParams, refreshKey]);

  // Load more
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const params = buildParams(offsetRef.current);
    fetch(`/api/admin/entries?${params}`, { headers: getAdminHeaders() })
      .then(res => res.json())
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

  const deleteEntry = async (id: number) => {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    try {
      await fetch(`/api/admin/entries/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
      refetch();
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const [showExportModal, setShowExportModal] = useState(false);

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        const res = await fetch('/api/admin/import', {
          method: 'POST',
          headers: getAdminHeaders(),
          body: JSON.stringify(data),
        });

        const result = await res.json();
        alert(`Import complete: ${result.stats.added} added, ${result.stats.updated} updated, ${result.stats.skipped} skipped`);
        refetch();
      } catch (err) {
        console.error('Import failed:', err);
        alert('Import failed. Check console for details.');
      }
    };
    input.click();
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
            <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-gray-300 font-bold rounded-xl transition-all hover:scale-105 active:scale-95">
              <Download size={16} /> Export
            </button>
            <button onClick={handleImport} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-gray-300 font-bold rounded-xl transition-all hover:scale-105 active:scale-95">
              <Upload size={16} /> Import
            </button>
            <a href="/" className="px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors font-medium">
              View Site
            </a>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div
            onClick={() => setFilterPublished(filterPublished === 'true' ? '' : 'true')}
            className={`bg-zinc-900 border p-6 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${filterPublished === 'true' ? 'border-green-500/40 ring-1 ring-green-500/20' : 'border-white/5'}`}
          >
            <p className="text-sm text-gray-500 mb-1">Published</p>
            <p className="text-3xl font-bold">{publishedCount}</p>
          </div>
          <div
            onClick={() => setFilterPublished(filterPublished === 'false' ? '' : 'false')}
            className={`bg-zinc-900 border p-6 rounded-2xl relative cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${filterPublished === 'false' ? 'border-red-500/40 ring-1 ring-red-500/20' : 'border-white/5'}`}
          >
            <p className="text-sm text-gray-500 mb-1">Review Queue</p>
            <p className={`text-3xl font-bold ${unpublishedCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>{unpublishedCount}</p>
            {unpublishedCount > 0 && (
              <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="bg-zinc-900 border border-white/5 p-6 rounded-2xl flex items-center gap-4">
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

        {/* ── Category Tabs ── */}
        <div className="flex items-center gap-1 mb-6 bg-zinc-900/60 border border-white/5 rounded-xl p-1 w-fit">
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

        {/* ── Entry Table ── */}
        <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[1fr_120px_100px_auto] gap-4 px-6 py-3 border-b border-white/5 bg-zinc-800/50">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Entry</span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Category</span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Status</span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Actions</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 rounded-full border-4 border-white/5 border-t-red-500 animate-spin"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No entries found</div>
          ) : (
            <div ref={scrollRef} className="max-h-[calc(100vh-380px)] overflow-y-auto">
              {entries.map(entry => (
                <AnimatedRow key={entry.id}>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px_auto] gap-2 md:gap-4 items-center px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors group">
                    {/* Entry info */}
                    <div className="min-w-0">
                      <p className="font-bold text-sm uppercase tracking-wide group-hover:text-red-400 transition-colors truncate">
                        {entry.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{entry.description}</p>
                    </div>

                    {/* Category badge */}
                    <div>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-medium text-gray-400 uppercase">
                        {entry.category}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5">
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
                        onClick={() => deleteEntry(entry.id)}
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

      {/* Submitter Info Modal */}
      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          categories={categories}
          onClose={() => setShowExportModal(false)}
        />
      )}

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

// Tag autocomplete input — suggests canonical tags from the server
function TagAutocomplete({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/tags', { headers: getAdminHeaders() })
      .then(r => r.json())
      .then(d => setAllTags(d.canonical || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!showSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSuggestions]);

  const currentTags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  const handleInputChange = (input: string) => {
    onChange(input);
    // Get the last tag being typed
    const parts = input.split(',');
    const lastPart = parts[parts.length - 1].trim().toLowerCase();
    if (lastPart.length > 0) {
      const existing = new Set(parts.slice(0, -1).map(t => t.trim()));
      const filtered = allTags.filter(t =>
        t.toLowerCase().includes(lastPart) && !existing.has(t)
      );
      setSuggestions(filtered.slice(0, 8));
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectTag = (tag: string) => {
    const parts = value.split(',').map(t => t.trim()).filter(Boolean);
    parts.pop(); // Remove the partial tag being typed
    parts.push(tag);
    onChange(parts.join(', '));
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        className={className}
        placeholder="Start typing to see suggestions..."
      />
      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {currentTags.map((tag, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-300">
              {tag}
            </span>
          ))}
        </div>
      )}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-gray-900 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {suggestions.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => selectTag(tag)}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
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

  // Quote-specific fields (pre-filled from metadata)
  const [quoteSource, setQuoteSource] = useState(meta.source || '');

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
      let metadata: string | null = entry.metadata;
      if (isFilm) {
        const filmMeta: Record<string, string> = { ...meta };
        if (filmCast) filmMeta.cast = filmCast; else delete filmMeta.cast;
        if (filmWriters) filmMeta.writers = filmWriters; else delete filmMeta.writers;
        if (filmRuntime) filmMeta.duration = filmRuntime; else delete filmMeta.duration;
        if (filmCountry) filmMeta.country = filmCountry; else delete filmMeta.country;
        if (filmGenre) filmMeta.genre = filmGenre; else delete filmMeta.genre;
        if (filmComment) filmMeta.comment = filmComment; else delete filmMeta.comment;
        if (sourceUrl) {
          const ytMatch = sourceUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (ytMatch) filmMeta.youtubeId = ytMatch[1];
        }
        metadata = Object.keys(filmMeta).length > 0 ? JSON.stringify(filmMeta) : null;
      } else if (isMusic) {
        const musicMeta: Record<string, string> = { ...meta };
        if (musicPerformer) musicMeta.performer = musicPerformer; else delete musicMeta.performer;
        if (musicSongwriter) musicMeta.writer = musicSongwriter; else delete musicMeta.writer;
        if (musicGenre) musicMeta.genre = musicGenre; else delete musicMeta.genre;
        if (musicRunTime) musicMeta.runTime = musicRunTime; else delete musicMeta.runTime;
        if (musicLyrics) musicMeta.lyrics = musicLyrics; else delete musicMeta.lyrics;
        if (sourceUrl) musicMeta.locationUrl = sourceUrl; else delete musicMeta.locationUrl;
        metadata = Object.keys(musicMeta).length > 0 ? JSON.stringify(musicMeta) : null;
      } else if (isQuote) {
        const quoteMeta: Record<string, string> = { ...meta };
        if (quoteSource) quoteMeta.source = quoteSource; else delete quoteMeta.source;
        metadata = Object.keys(quoteMeta).length > 0 ? JSON.stringify(quoteMeta) : null;
      }

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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold">Edit Entry</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-xs uppercase tracking-wider font-semibold text-red-400 mb-4">
          {categories.find(c => c.slug === category)?.label || category}
        </p>

        <div className="space-y-3">

          {/* ── QUOTE ── */}
          {isQuote && (
            <>
              <FieldLabel label="Author">
                <input type="text" value={creator} onChange={e => setCreator(e.target.value)} className={inputClass} />
              </FieldLabel>
              <FieldLabel label="Source — book title, speech, article">
                <input type="text" value={quoteSource} onChange={e => setQuoteSource(e.target.value)} className={inputClass} />
              </FieldLabel>
              <FieldLabel label="Quote">
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} className={inputClass} />
              </FieldLabel>
              <FieldLabel label="Tags">
                <TagAutocomplete value={tags} onChange={setTags} className={inputClass} />
              </FieldLabel>
              <FieldLabel label="Source URL">
                <input type="text" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className={inputClass} />
              </FieldLabel>
            </>
          )}

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
                <TagAutocomplete value={tags} onChange={setTags} className={inputClass} />
              </FieldLabel>
            </>
          )}

          {/* ── HISTORY ── */}
          {!isFilm && !isMusic && !isQuote && (
            <>
              <FieldLabel label="Title">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
              </FieldLabel>
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
                <TagAutocomplete value={tags} onChange={setTags} className={inputClass} />
              </FieldLabel>
              <FieldLabel label="Source URL">
                <input type="text" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className={inputClass} />
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
                <TagAutocomplete value={tags} onChange={setTags} className={inputClass} />
              </FieldLabel>
            </>
          )}

          {/* Existing images */}
          {existingImages.length > 0 && (
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Current Images</label>
              <div className="grid grid-cols-3 gap-2">
                {existingImages.map(img => (
                  <div key={img.id} className="relative group rounded-lg overflow-hidden bg-black/20 aspect-square">
                    <img
                      src={img.thumbnailUrl || img.url}
                      alt={img.caption || 'Entry image'}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      disabled={deletingImageId === img.id}
                      className="absolute top-1 right-1 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80 disabled:opacity-50"
                    >
                      {deletingImageId === img.id ? (
                        <div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
                      ) : (
                        <X size={12} className="text-white" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload new images */}
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">
              {existingImages.length > 0 ? 'Add More Images' : 'Upload Images'}
            </label>
            <ImageDropzone files={imageFiles} setFiles={setImageFiles} maxFiles={5} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
