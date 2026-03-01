import { useState } from 'react';
import { X, Download, Package, FileJson, FileSpreadsheet, FileText } from 'lucide-react';

interface ExportModalProps {
  categories: Array<{ slug: string; label: string; isActive: boolean }>;
  onClose: () => void;
}

type ExportFormat = 'full' | 'json' | 'xlsx' | 'csv';

const formatOptions: { value: ExportFormat; label: string; description: string; icon: typeof Package }[] = [
  { value: 'full', label: 'Full Backup (JSON + Images)', description: 'ZIP with data and all uploaded images. Complete migration package.', icon: Package },
  { value: 'json', label: 'Data Only (JSON)', description: 'Re-importable JSON format with schema header.', icon: FileJson },
  { value: 'xlsx', label: 'Spreadsheet (XLSX)', description: 'One sheet per category with formatted columns.', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', description: 'Universal comma-separated format.', icon: FileText },
];

export default function ExportModal({ categories, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('full');
  const [category, setCategory] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setError('');
    setSuccess(false);
    try {
      const token = sessionStorage.getItem('adminToken') || '';
      const res = await fetch(
        `/api/admin/export?format=${format}&category=${category}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Export failed');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `export.${format === 'full' ? 'zip' : format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={exporting ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-red-400 mb-0.5">Admin</p>
            <h3 className="text-lg font-bold">Export Database</h3>
          </div>
          <button onClick={onClose} disabled={exporting} className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Format Selection */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">Export Format</label>
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
                      name="exportFormat"
                      value={opt.value}
                      checked={format === opt.value}
                      onChange={() => setFormat(opt.value)}
                      className="mt-1 accent-red-500"
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

          {/* Category Filter */}
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-red-500/50 [&>option]:bg-zinc-900"
            >
              <option value="all">All Categories</option>
              {categories.filter(c => c.isActive).map(c => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              Export downloaded successfully!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5">
          <button
            onClick={onClose}
            disabled={exporting}
            className="px-4 py-2.5 text-sm text-gray-400 hover:text-white font-medium transition-colors disabled:opacity-30"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Preparing export...
              </>
            ) : (
              <>
                <Download size={16} />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
