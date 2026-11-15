import { X } from 'lucide-react';
import type { RefObject } from 'react';

/**
 * Round "clear" button inside a search box. Shown only while there is text;
 * clears it and puts the cursor back in the box so the next search can be
 * typed straight away. Used by every search box in the app (public header,
 * admin) so they look and behave the same. The box itself should also clear
 * on Escape — see `clearOnEscape`.
 */
export default function SearchClearButton({ value, onClear, inputRef }: {
  value: string;
  onClear: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={() => { onClear(); inputRef?.current?.focus(); }}
      aria-label="Clear search"
      title="Clear search"
      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 transition-colors"
    >
      <X size={13} strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}

/** onKeyDown for a search box: Escape clears it (when there is text). */
export function clearOnEscape(value: string, onClear: () => void) {
  return (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && value) {
      e.preventDefault();
      e.stopPropagation(); // don't also close a popup behind the box
      onClear();
    }
  };
}
