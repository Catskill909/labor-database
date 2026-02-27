import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Eye, EyeOff, Download, Upload, Search, X } from 'lucide-react';
import type { Entry, Category } from '../types.ts';
import ImageDropzone from './ImageDropzone.tsx';

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

export default function AdminDashboard() {
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
  }, [selectedCategory, filterPublished, search, buildParams]);

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

  const handleBackup = () => {
    const token = sessionStorage.getItem('adminToken') || '';
    window.open(`/api/admin/backup?token=${token}`, '_blank');
  };

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

  return (
    <div className="h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Top bar */}
      <div className="shrink-0 border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Showing {entries.length} of {totalCount} entries
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleBackup} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
              <Download size={14} /> Backup
            </button>
            <button onClick={handleImport} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
              <Upload size={14} /> Import
            </button>
            <a href="/" className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              View Site
            </a>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="shrink-0 border-b border-white/5 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2">
          {/* Category tabs */}
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 rounded text-xs font-medium ${!selectedCategory ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.slug === selectedCategory ? '' : cat.slug)}
              className={`px-3 py-1.5 rounded text-xs font-medium ${selectedCategory === cat.slug ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {cat.label}
            </button>
          ))}

          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Published filter buttons */}
          <button
            onClick={() => setFilterPublished(filterPublished === '' ? '' : '')}
            className={`px-3 py-1.5 rounded text-xs font-medium ${filterPublished === '' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            All Status
          </button>
          <button
            onClick={() => setFilterPublished(filterPublished === 'false' ? '' : 'false')}
            className={`px-3 py-1.5 rounded text-xs font-medium ${filterPublished === 'false' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-amber-300'}`}
          >
            Pending Review {unpublishedCount > 0 && `(${unpublishedCount})`}
          </button>
          <button
            onClick={() => setFilterPublished(filterPublished === 'true' ? '' : 'true')}
            className={`px-3 py-1.5 rounded text-xs font-medium ${filterPublished === 'true' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Published
          </button>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search entries..."
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      </div>

      {/* Entry list — scrollable */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 rounded-full border-4 border-white/5 border-t-blue-500 animate-spin"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No entries found</div>
          ) : (
            <>
              <div className="space-y-2">
                {entries.map(entry => (
                  <AnimatedRow key={entry.id}>
                    <div className="flex items-center gap-3 p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg">
                      {/* Publish status indicator */}
                      <div className={`w-2 h-2 rounded-full shrink-0 ${entry.isPublished ? 'bg-green-500' : 'bg-amber-500'}`} />

                      {/* Entry info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-400">
                            {entry.category}
                          </span>
                          <span className="text-sm font-medium truncate">{entry.title}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{entry.description}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditingEntry(entry)}
                          className="p-2 hover:bg-white/5 rounded transition-colors text-gray-400 hover:text-white"
                          title="Edit"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() => togglePublish(entry)}
                          className={`p-2 hover:bg-white/5 rounded transition-colors ${entry.isPublished ? 'text-green-400' : 'text-amber-400'}`}
                          title={entry.isPublished ? 'Unpublish' : 'Publish'}
                        >
                          {entry.isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="p-2 hover:bg-white/5 rounded transition-colors text-gray-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </AnimatedRow>
                ))}
              </div>

              {/* Load more indicator */}
              {loadingMore && (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-white/5 border-t-blue-500 animate-spin"></div>
                  <span className="text-sm text-gray-500">Loading more...</span>
                </div>
              )}

              {!hasMore && entries.length > PAGE_SIZE && (
                <p className="text-center text-xs text-gray-600 py-6">All {entries.length} entries loaded</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Modal (simple) */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          categories={categories}
          onClose={() => setEditingEntry(null)}
          onSaved={() => { setEditingEntry(null); refetch(); }}
        />
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
      // Build metadata for films
      let metadata: string | null = entry.metadata;
      if (isFilm) {
        const filmMeta: Record<string, string> = { ...meta };
        if (filmCast) filmMeta.cast = filmCast; else delete filmMeta.cast;
        if (filmWriters) filmMeta.writers = filmWriters; else delete filmMeta.writers;
        if (filmRuntime) filmMeta.duration = filmRuntime; else delete filmMeta.duration;
        if (filmCountry) filmMeta.country = filmCountry; else delete filmMeta.country;
        if (filmGenre) filmMeta.genre = filmGenre; else delete filmMeta.genre;
        if (filmComment) filmMeta.comment = filmComment; else delete filmMeta.comment;
        // Extract YouTube ID from source URL
        if (sourceUrl) {
          const ytMatch = sourceUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (ytMatch) filmMeta.youtubeId = ytMatch[1];
        }
        metadata = Object.keys(filmMeta).length > 0 ? JSON.stringify(filmMeta) : null;
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
        <p className="text-xs uppercase tracking-wider font-semibold text-blue-400 mb-4">
          {categories.find(c => c.slug === category)?.label || category}
        </p>

        <div className="space-y-3">

          <FieldLabel label="Title">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
          </FieldLabel>

          <FieldLabel label={isFilm ? "Director(s)" : "Creator"}>
            <input type="text" value={creator} onChange={e => setCreator(e.target.value)} className={inputClass} />
          </FieldLabel>

          {isFilm && (
            <>
              <FieldLabel label="Writer(s)">
                <input type="text" value={filmWriters} onChange={e => setFilmWriters(e.target.value)} className={inputClass} />
              </FieldLabel>
              <FieldLabel label="Cast / Starring">
                <input type="text" value={filmCast} onChange={e => setFilmCast(e.target.value)} className={inputClass} />
              </FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                <FieldLabel label="Runtime">
                  <input type="text" placeholder="e.g. 95m" value={filmRuntime} onChange={e => setFilmRuntime(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
                </FieldLabel>
                <FieldLabel label="Country">
                  <input type="text" value={filmCountry} onChange={e => setFilmCountry(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
                </FieldLabel>
                <FieldLabel label="Year">
                  <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
                </FieldLabel>
              </div>
              <FieldLabel label="Genre">
                <input type="text" placeholder="e.g. Documentary, Drama" value={filmGenre} onChange={e => setFilmGenre(e.target.value)} className={inputClass} />
              </FieldLabel>
            </>
          )}

          <FieldLabel label={isFilm ? "Synopsis" : "Description"}>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className={inputClass} />
          </FieldLabel>

          {isFilm && (
            <FieldLabel label="Comments / Notes">
              <textarea placeholder="Original curator notes, additional context" value={filmComment} onChange={e => setFilmComment(e.target.value)} rows={3} className={inputClass} />
            </FieldLabel>
          )}

          {!isFilm && (
            <div className="grid grid-cols-3 gap-2">
              <FieldLabel label="Month">
                <input type="number" value={month} onChange={e => setMonth(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
              </FieldLabel>
              <FieldLabel label="Day">
                <input type="number" value={day} onChange={e => setDay(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
              </FieldLabel>
              <FieldLabel label="Year">
                <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
              </FieldLabel>
            </div>
          )}

          <FieldLabel label={isFilm ? "Trailer URL (YouTube, Vimeo)" : "Source URL"}>
            <input type="text" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className={inputClass} />
          </FieldLabel>

          <FieldLabel label="Tags (comma-separated)">
            <input type="text" value={tags} onChange={e => setTags(e.target.value)} className={inputClass} />
          </FieldLabel>

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
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
