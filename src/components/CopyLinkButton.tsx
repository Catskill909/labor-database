import { useEffect, useRef, useState } from 'react';
import { Link2, Check } from 'lucide-react';
import type { Entry } from '../types.ts';
import { entryUrl } from '../entry-url.ts';

/**
 * "Copy link" for a detail popup. If the browser refuses clipboard access
 * (plain-http pages, some in-app browsers), the link is shown selected so it
 * can be copied by hand instead.
 *
 * Render with `key={entry.id}` so another entry starts from "Copy link".
 */
export default function CopyLinkButton({ entry }: { entry: Entry }) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const url = entryUrl(entry);

  useEffect(() => {
    if (state !== 'copied') return;
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (state === 'manual') inputRef.current?.select();
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      // navigator.clipboard is missing on non-HTTPS pages and writeText is
      // refused in some embedded browsers; both mean "copy it yourself".
      setState('manual');
    }
  };

  if (state === 'manual') {
    return (
      <input
        ref={inputRef}
        readOnly
        value={url}
        onFocus={e => e.currentTarget.select()}
        aria-label="Link to this entry"
        className="w-56 sm:w-72 px-2 py-1.5 text-xs rounded-lg bg-black/40 border border-[var(--border)] text-gray-200"
      />
    );
  }

  return (
    <button
      onClick={copy}
      title="Copy a link to this entry"
      // On phones only the icon shows, so the name has to come from here.
      aria-label={state === 'copied' ? 'Link copied' : 'Copy link to this entry'}
      className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors shrink-0"
    >
      {state === 'copied' ? <Check size={16} className="text-green-400" /> : <Link2 size={16} />}
      <span className={state === 'copied' ? '' : 'hidden sm:inline'}>{state === 'copied' ? 'Copied!' : 'Copy link'}</span>
    </button>
  );
}
