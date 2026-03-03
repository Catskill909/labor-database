import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={isLoading ? undefined : onCancel} 
      />
      <div className={`relative w-full max-w-sm bg-[var(--card)] border-2 rounded-xl shadow-2xl overflow-hidden ${
        isDanger ? 'border-red-600/50' : 'border-amber-600/50'
      }`}>
        {/* Header */}
        <div className={`px-5 py-4 border-b ${
          isDanger ? 'bg-red-600/10 border-red-600/20' : 'bg-amber-600/10 border-amber-600/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isDanger ? 'bg-red-600 shadow-lg shadow-red-600/30' : 'bg-amber-600 shadow-lg shadow-amber-600/30'
            }`}>
              {isDanger ? (
                <Trash2 size={18} className="text-white" />
              ) : (
                <AlertTriangle size={18} className="text-white" />
              )}
            </div>
            <h3 className={`text-lg font-bold ${isDanger ? 'text-red-400' : 'text-amber-400'}`}>
              {title}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-white/5 bg-white/[0.02]">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white font-medium transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 px-5 py-2 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                {isDanger && <Trash2 size={14} />}
                {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
