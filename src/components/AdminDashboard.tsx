import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Eye, EyeOff, Download, Upload, Search, X } from 'lucide-react';
import type { Entry, Category } from '../types.ts';

function getAdminHeaders(): HeadersInit {
  const token = sessionStorage.getItem('adminToken') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export default function AdminDashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filterPublished, setFilterPublished] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories', { headers: getAdminHeaders() });
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (filterPublished) params.set('isPublished', filterPublished);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/entries?${params}`, { headers: getAdminHeaders() });
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, filterPublished, search]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const togglePublish = async (entry: Entry) => {
    try {
      await fetch(`/api/admin/entries/${entry.id}/publish`, {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify({ isPublished: !entry.isPublished }),
      });
      fetchEntries();
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
      fetchEntries();
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
        fetchEntries();
      } catch (err) {
        console.error('Import failed:', err);
        alert('Import failed. Check console for details.');
      }
    };
    input.click();
  };

  const unpublishedCount = entries.filter(e => !e.isPublished).length;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Top bar */}
      <div className="border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {entries.length} entries
              {unpublishedCount > 0 && (
                <span className="text-amber-400 ml-2">({unpublishedCount} pending review)</span>
              )}
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
      <div className="border-b border-white/5 px-6 py-3">
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

          {/* Published filter */}
          <select
            value={filterPublished}
            onChange={e => setFilterPublished(e.target.value)}
            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs"
          >
            <option value="">All Status</option>
            <option value="true">Published</option>
            <option value="false">Pending Review</option>
          </select>

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

      {/* Entry list */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No entries found</div>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg"
              >
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
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal (simple) */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          categories={categories}
          onClose={() => setEditingEntry(null)}
          onSaved={() => { setEditingEntry(null); fetchEntries(); }}
        />
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
  const [title, setTitle] = useState(entry.title);
  const [description, setDescription] = useState(entry.description);
  const [category, setCategory] = useState(entry.category);
  const [creator, setCreator] = useState(entry.creator || '');
  const [month, setMonth] = useState(String(entry.month || ''));
  const [day, setDay] = useState(String(entry.day || ''));
  const [year, setYear] = useState(String(entry.year || ''));
  const [tags, setTags] = useState(entry.tags || '');
  const [sourceUrl, setSourceUrl] = useState(entry.sourceUrl || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/entries/${entry.id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          title, description, category, creator: creator || null,
          month: month || null, day: day || null, year: year || null,
          tags: tags || null, sourceUrl: sourceUrl || null,
          isPublished: entry.isPublished,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaved();
    } catch (err) {
      console.error('Save error:', err);
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Edit Entry</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm">
            {categories.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
          <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
          <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
          <input type="text" placeholder="Creator" value={creator} onChange={e => setCreator(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
            <input type="number" placeholder="Day" value={day} onChange={e => setDay(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
            <input type="number" placeholder="Year" value={year} onChange={e => setYear(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
          </div>
          <input type="text" placeholder="Tags (comma-separated)" value={tags} onChange={e => setTags(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
          <input type="text" placeholder="Source URL" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
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
