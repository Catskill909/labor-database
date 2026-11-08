import { useState } from 'react';
import { X, ExternalLink, MapPin, Repeat, Users, Rss, Check, Headphones, Podcast, Landmark } from 'lucide-react';
import type { Entry } from '../types.ts';
import { parsePodcastMeta, visibleBadges, visibleListenLinks, isOnHiatus, safeHttpUrl } from '../podcast.ts';
import { PodcastBadge, HiatusBadge } from './PodcastBadges.tsx';
import { EntryCorrectionButton } from './ContactModal';
import CopyLinkButton from './CopyLinkButton.tsx';

interface PodcastDetailProps {
  entry: Entry;
  onClose: () => void;
  onTagClick?: (tag: string) => void;
}

function CopyRssButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be refused (no permission, insecure page). Fall back to
      // opening the feed so the visitor can still copy its address.
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Rss size={13} className="text-orange-400" />}
      {copied ? 'Feed address copied' : 'Copy RSS feed'}
    </button>
  );
}

export default function PodcastDetail({ entry, onClose, onTagClick }: PodcastDetailProps) {
  const meta = parsePodcastMeta(entry.metadata);
  const logoUrl = entry.images?.[0]?.url || entry.images?.[0]?.thumbnailUrl || null;
  const badges = visibleBadges(meta);
  const links = visibleListenLinks(meta);
  const hiatus = isOnHiatus(meta);
  const website = safeHttpUrl(entry.sourceUrl);
  const rss = safeHttpUrl(meta.rssUrl);

  const facts = [
    { icon: MapPin, label: 'Location', value: meta.location },
    { icon: Repeat, label: 'How often', value: meta.frequency },
    { icon: Landmark, label: 'Union', value: meta.union },
  ].filter(f => f.value && f.value.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div role="dialog" aria-modal="true" aria-label={entry.title} className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between p-6 pb-4 bg-[var(--card)] border-b border-[var(--border)] rounded-t-xl">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-red-400">Radio / Podcast</span>
            <h2 className="text-xl font-bold mt-1 leading-snug">{entry.title}</h2>
            {entry.creator && (
              <p className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-400">
                <Users size={13} className="text-gray-500 shrink-0" />
                <span>{entry.creator}</span>
              </p>
            )}
            {(badges.length > 0 || hiatus) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {badges.map(b => <PodcastBadge key={b.key} badge={b.key} label={b.label} />)}
                {hiatus && <HiatusBadge />}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-4">
            <CopyLinkButton key={entry.id} entry={entry} />
            <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-white/5 rounded-lg transition-colors shrink-0">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex gap-6 flex-col sm:flex-row">
            <div className="shrink-0 w-40 sm:w-52 mx-auto sm:mx-0">
              {logoUrl ? (
                <img src={logoUrl} alt={`${entry.title} logo`} className="w-full aspect-square rounded-lg shadow-lg object-cover bg-black/30" />
              ) : (
                <div className="w-full aspect-square rounded-lg bg-white/5 flex items-center justify-center">
                  <Podcast size={48} className="text-gray-600" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              {hiatus && (
                <p className="text-xs text-gray-400 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  This show isn't releasing new episodes right now. Its past episodes are still available.
                </p>
              )}

              <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.description}</p>

              {facts.length > 0 && (
                <dl className="space-y-1.5 text-sm">
                  {facts.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-2">
                      <Icon size={14} className="text-gray-500 mt-0.5 shrink-0" aria-hidden="true" />
                      <dt className="text-gray-500 shrink-0">{label}:</dt>
                      <dd className="text-gray-200">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {links.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">
                    <Headphones size={13} /> Listen on
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {links.map(l => (
                      <a
                        key={l.key}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/15 border border-red-500/25 text-red-200 hover:bg-red-600/25 transition-colors"
                      >
                        {l.label}
                        <ExternalLink size={11} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {(website || rss) && (
                <div className="flex flex-wrap gap-2">
                  {website && (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
                    >
                      <ExternalLink size={13} /> Show website
                    </a>
                  )}
                  {rss && <CopyRssButton url={rss} />}
                </div>
              )}

              {entry.tags && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {entry.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                    <button
                      key={tag}
                      onClick={() => onTagClick?.(tag)}
                      className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-gray-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end px-6 pb-5 pt-2 pointer-events-none">
          <div className="pointer-events-auto">
            <EntryCorrectionButton entry={entry} />
          </div>
        </div>
      </div>
    </div>
  );
}
