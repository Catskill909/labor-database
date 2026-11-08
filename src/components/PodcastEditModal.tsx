import { useState } from 'react';
import { X } from 'lucide-react';
import type { Entry } from '../types.ts';
import { parsePodcastMeta, parsePodcastPrivate, cleanPodcastMeta, cleanPodcastPrivate } from '../podcast.ts';
import type { PodcastMeta, PodcastPrivate } from '../podcast.ts';
import { PodcastFields, PodcastPrivateFields } from './PodcastFields.tsx';
import ImageDropzone from './ImageDropzone.tsx';
import TagSelector from './TagSelector.tsx';

const inputClass = 'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm';

function adminHeaders(json = true): HeadersInit {
  const token = sessionStorage.getItem('adminToken') || '';
  return json
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { Authorization: `Bearer ${token}` };
}

/** Admin edit form for one Labor Radio/Podcast show. */
export default function PodcastEditModal({ entry, onClose, onSaved }: {
  entry: Entry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(entry.title);
  const [creator, setCreator] = useState(entry.creator ?? '');
  const [description, setDescription] = useState(entry.description);
  const [sourceUrl, setSourceUrl] = useState(entry.sourceUrl ?? '');
  const [tags, setTags] = useState(entry.tags ?? '');
  const [meta, setMeta] = useState<PodcastMeta>(() => parsePodcastMeta(entry.metadata));
  const [priv, setPriv] = useState<PodcastPrivate>(() => parsePodcastPrivate(entry.privateMetadata));
  const [images, setImages] = useState(entry.images ?? []);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const deleteImage = async (imageId: number) => {
    const res = await fetch(`/api/entries/${entry.id}/images/${imageId}`, { method: 'DELETE', headers: adminHeaders(false) });
    if (res.ok) setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const save = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Show name and description are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const metadata = cleanPodcastMeta({ ...parsePodcastMeta(entry.metadata), ...meta });
      const privateMetadata = cleanPodcastPrivate(priv);
      const res = await fetch(`/api/admin/entries/${entry.id}`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: 'podcast',
          creator: creator.trim() || null,
          sourceUrl: sourceUrl.trim() || null,
          tags: tags || null,
          metadata: JSON.stringify(metadata),
          privateMetadata: Object.keys(privateMetadata).length ? JSON.stringify(privateMetadata) : null,
          isPublished: entry.isPublished,
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);

      if (newImages.length > 0) {
        const form = new FormData();
        newImages.forEach(f => form.append('images', f));
        const up = await fetch(`/api/entries/${entry.id}/images`, { method: 'POST', headers: adminHeaders(false), body: form });
        if (!up.ok) throw new Error('Saved, but the logo upload failed');
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
      <div role="dialog" aria-modal="true" aria-label={`Edit ${entry.title}`} className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold">Edit Show</h3>
          <button onClick={onClose} disabled={saving} aria-label="Close" className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-30"><X size={18} /></button>
        </div>
        <p className="text-xs uppercase tracking-wider font-semibold text-red-400 mb-4">Labor Radio/Podcast</p>

        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6">
          {/* Logo */}
          <div className="space-y-2">
            <span className="text-xs text-gray-400 block">Logo</span>
            {images.map(img => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden bg-black/20 aspect-square">
                <img src={img.thumbnailUrl || img.url} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => deleteImage(img.id)} aria-label="Remove logo"
                  className="absolute top-1 right-1 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-600/80">
                  <X size={12} className="text-white" />
                </button>
              </div>
            ))}
            <ImageDropzone files={newImages} setFiles={setNewImages} maxFiles={1} />
            {images.length > 0 && <p className="text-[11px] text-gray-500">The first image is the logo shown on the card.</p>}
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-gray-400 block mb-1">Show name</span>
              <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400 block mb-1">Host(s) / producer(s)</span>
              <input className={inputClass} value={creator} onChange={e => setCreator(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400 block mb-1">Description</span>
              <textarea rows={5} className={inputClass} value={description} onChange={e => setDescription(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400 block mb-1">Show website</span>
              <input type="url" className={inputClass} placeholder="https://…" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} />
            </label>

            <PodcastFields value={meta} onChange={setMeta} admin />

            <div>
              <span className="text-xs text-gray-400 block mb-1">Tags</span>
              <TagSelector value={tags} onChange={setTags} />
            </div>

            <PodcastPrivateFields value={priv} onChange={setPriv} />
          </div>
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm rounded-lg hover:bg-white/5 disabled:opacity-30">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
