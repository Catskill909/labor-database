import { useState, useRef } from 'react';
import { X, Upload, Package, FileJson, AlertTriangle } from 'lucide-react';

interface ImportModalProps {
  onClose: () => void;
  onComplete: () => void;
}

type ImportFormat = 'zip' | 'json';

interface ImportProgress {
  phase: 'uploading' | 'extracting' | 'importing' | 'done' | 'error';
  message?: string;
  percent?: number;
  current?: number;
  total?: number;
  added?: number;
  updated?: number;
  images?: number;
  error?: string;
}

const formatOptions: { value: ImportFormat; label: string; description: string; icon: typeof Package }[] = [
  { value: 'zip', label: 'Full Backup (.zip)', description: 'Data + all images. Use this for full restore or production migration.', icon: Package },
  { value: 'json', label: 'Data Only (.json)', description: 'Entries only, no images. Good for incremental updates.', icon: FileJson },
];

export default function ImportModal({ onClose, onComplete }: ImportModalProps) {
  const [format, setFormat] = useState<ImportFormat>('zip');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const handleChooseFile = () => {
    if (fileRef.current) {
      fileRef.current.accept = format === 'zip' ? '.zip' : '.json';
      fileRef.current.click();
    }
  };

  const handleZipImport = (file: File) => {
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || '';
    const formData = new FormData();
    formData.append('backup', file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    // Phase 1: Upload progress
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setProgress({ phase: 'uploading', percent, message: `Uploading... ${percent}%` });
      }
    };

    xhr.upload.onload = () => {
      setProgress({ phase: 'extracting', message: 'Processing on server...' });
    };

    // Phase 2: Read SSE stream for processing progress
    let buffer = '';
    xhr.onprogress = () => {
      const newData = xhr.responseText.substring(buffer.length);
      buffer = xhr.responseText;

      const lines = newData.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.substring(6));
            if (event.phase === 'importing') {
              setProgress({
                phase: 'importing',
                current: event.current,
                total: event.total,
                added: event.added,
                updated: event.updated,
                images: event.images,
                message: `Processing entries... ${event.current}/${event.total}`,
              });
            } else if (event.phase === 'extracting') {
              setProgress({ phase: 'extracting', message: event.message });
            } else if (event.phase === 'done') {
              setProgress({ phase: 'done' });
              setResult(`${event.stats.added} added, ${event.stats.updated} updated, ${event.stats.imagesRestored} images restored`);
              setImporting(false);
              onComplete();
            } else if (event.phase === 'error') {
              setProgress({ phase: 'error', error: event.error });
              setError(event.error);
              setImporting(false);
            }
          } catch { /* skip malformed lines */ }
        }
      }
    };

    xhr.onerror = () => {
      setError('Network error during import. Please try again.');
      setImporting(false);
      setProgress(null);
    };

    xhr.onload = () => {
      // If we haven't already handled done/error via SSE, check status
      if (xhr.status >= 400 && !error) {
        setError('Import failed. Check server logs.');
        setImporting(false);
        setProgress(null);
      }
    };

    xhr.open('POST', '/api/admin/import-zip');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  };

  const handleJsonImport = async (file: File) => {
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || '';
      const text = await file.text();
      const jsonData = JSON.parse(text);

      setProgress({ phase: 'importing', message: 'Importing data...' });

      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(`${data.stats.added} added, ${data.stats.updated} updated, ${data.stats.skipped} skipped`);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed. Check console.');
      console.error('Import failed:', err);
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError('');
    setResult('');
    setProgress({ phase: 'uploading', percent: 0, message: 'Starting upload...' });

    if (format === 'zip') {
      handleZipImport(file);
    } else {
      handleJsonImport(file);
    }

    // Reset file input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  };

  const progressPercent = progress?.phase === 'uploading'
    ? (progress.percent || 0)
    : progress?.phase === 'importing' && progress.total
      ? Math.round(((progress.current || 0) / progress.total) * 100)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={importing ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl">

        {/* Hidden file input */}
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelected} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-red-400 mb-0.5">Admin</p>
            <h3 className="text-lg font-bold">Import Backup</h3>
          </div>
          <button onClick={onClose} disabled={importing} className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Format Selection */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">Import Format</label>
            <div className="space-y-2">
              {formatOptions.map(opt => {
                const Icon = opt.icon;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                      ${format === opt.value
                        ? 'border-red-500/40 bg-red-500/5'
                        : 'border-white/5 hover:border-white/10 bg-white/[0.02]'}`}
                  >
                    <input
                      type="radio"
                      name="importFormat"
                      value={opt.value}
                      checked={format === opt.value}
                      onChange={() => setFormat(opt.value)}
                      className="mt-1 accent-red-500"
                      disabled={importing}
                    />
                    <Icon size={16} className={`mt-0.5 shrink-0 ${format === opt.value ? 'text-red-400' : 'text-gray-500'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Merge warning */}
          <div className="flex items-start gap-2.5 text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2.5">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>Import merges with existing data. To start fresh, use <strong>Reset DB</strong> first, then import. Large backups may take several minutes.</span>
          </div>

          {/* Progress */}
          {progress && !result && !error && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>{progress.message}</span>
              </div>
              {progressPercent !== null && (
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
              {progress.phase === 'importing' && progress.added !== undefined && (
                <p className="text-[11px] text-gray-500">
                  {progress.added} added, {progress.updated} updated, {progress.images} images
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              Import complete: {result}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5">
          <button
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2.5 text-sm text-gray-400 hover:text-white font-medium transition-colors disabled:opacity-30"
          >
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleChooseFile}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Choose File
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
