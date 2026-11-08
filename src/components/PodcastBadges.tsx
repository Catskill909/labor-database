import { Award, Star, Shield, PauseCircle } from 'lucide-react';
import type { PodcastBadgeKey } from '../podcast.ts';

const BADGE_STYLE: Record<PodcastBadgeKey, { icon: typeof Award; className: string }> = {
  founder: { icon: Star, className: 'bg-amber-500/90 text-black' },
  builder: { icon: Award, className: 'bg-red-600/90 text-white' },
  steward: { icon: Shield, className: 'bg-sky-600/90 text-white' },
};

export function PodcastBadge({ badge, label, compact = false }: { badge: PodcastBadgeKey; label: string; compact?: boolean }) {
  const { icon: Icon, className } = BADGE_STYLE[badge];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold shadow ${className} ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
    >
      <Icon size={compact ? 10 : 12} aria-hidden="true" />
      {compact ? label.replace('Network ', '') : label}
    </span>
  );
}

export function HiatusBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold shadow bg-zinc-800/90 text-zinc-200 border border-white/15 ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
    >
      <PauseCircle size={compact ? 10 : 12} aria-hidden="true" />
      On Hiatus
    </span>
  );
}
