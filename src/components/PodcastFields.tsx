import { Plus, Trash2, Lock } from 'lucide-react';
import { LISTEN_PLATFORMS, PODCAST_BADGES } from '../podcast.ts';
import type { PodcastMeta, PodcastPrivate, PodcastBadgeKey, ExtraLink } from '../podcast.ts';

const inputClass = 'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-400 block mb-1">
        {label}{hint && <span className="text-gray-600"> {hint}</span>}
      </span>
      {children}
    </label>
  );
}

/**
 * Show details stored in the public metadata. `admin` adds the On Hiatus switch
 * and the network badges, which only LHF sets.
 */
export function PodcastFields({ value, onChange, admin = false }: {
  value: PodcastMeta;
  onChange: (next: PodcastMeta) => void;
  admin?: boolean;
}) {
  const set = <K extends keyof PodcastMeta>(key: K, v: PodcastMeta[K]) => onChange({ ...value, [key]: v });
  const links = value.listenLinks ?? {};
  const extras = value.extraLinks ?? [];
  const badges = new Set(value.badges ?? []);

  const toggleBadge = (key: PodcastBadgeKey) => {
    const next = new Set(badges);
    if (next.has(key)) next.delete(key); else next.add(key);
    set('badges', [...next]);
  };
  const setExtra = (i: number, patch: Partial<ExtraLink>) =>
    set('extraLinks', extras.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Location" hint="(city, state/province, country — or National, Online…)">
          <input className={inputClass} value={value.location ?? ''} onChange={e => set('location', e.target.value)} />
        </Field>
        <Field label="How often" hint="(Weekly, Every two weeks…)">
          <input className={inputClass} value={value.frequency ?? ''} onChange={e => set('frequency', e.target.value)} />
        </Field>
      </div>
      <Field label="RSS feed" hint="(the feed address, not a listening page)">
        <input type="url" className={inputClass} placeholder="https://feed.podbean.com/…/feed.xml" value={value.rssUrl ?? ''} onChange={e => set('rssUrl', e.target.value)} />
      </Field>
      <Field label="Union" hint="(optional)">
        <input className={inputClass} placeholder="e.g. United Steelworkers" value={value.union ?? ''} onChange={e => set('union', e.target.value)} />
      </Field>

      {admin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10">
          <div>
            <span className="text-xs text-gray-400 block mb-1.5">Status</span>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={value.status === 'hiatus'}
                onChange={e => set('status', e.target.checked ? 'hiatus' : 'active')}
                className="accent-red-600"
              />
              On Hiatus
            </label>
            <p className="text-[11px] text-gray-500 mt-1">Untick when the show starts releasing again.</p>
          </div>
          <div>
            <span className="text-xs text-gray-400 block mb-1.5">Network badges</span>
            <div className="space-y-1">
              {PODCAST_BADGES.map(b => (
                <label key={b.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={badges.has(b.key)} onChange={() => toggleBadge(b.key)} className="accent-red-600" />
                  {b.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs text-gray-400 mb-1">Listen links <span className="text-gray-600">(leave blank to hide)</span></p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LISTEN_PLATFORMS.map(p => (
            <Field key={p.key} label={p.label}>
              <input
                type="url"
                className={inputClass}
                placeholder="https://…"
                value={links[p.key] ?? ''}
                onChange={e => set('listenLinks', { ...links, [p.key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-400 mb-1">Other links <span className="text-gray-600">(station page, archive, Patreon…)</span></p>
        <div className="space-y-2">
          {extras.map((link, i) => (
            <div key={i} className="flex gap-2">
              <input className={`${inputClass} sm:w-40`} placeholder="Name" value={link.label} onChange={e => setExtra(i, { label: e.target.value })} aria-label="Link name" />
              <input type="url" className={inputClass} placeholder="https://…" value={link.url} onChange={e => setExtra(i, { url: e.target.value })} aria-label="Link address" />
              <button type="button" onClick={() => set('extraLinks', extras.filter((_, j) => j !== i))} className="p-2 text-gray-500 hover:text-red-400" aria-label="Remove link">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set('extraLinks', [...extras, { label: '', url: '' }])}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white"
          >
            <Plus size={13} /> Add a link
          </button>
        </div>
      </div>
    </div>
  );
}

/** Contact details and network commitments. Admin only; never shown publicly. */
export function PodcastPrivateFields({ value, onChange }: {
  value: PodcastPrivate;
  onChange: (next: PodcastPrivate) => void;
}) {
  const set = (key: keyof PodcastPrivate, v: string) => onChange({ ...value, [key]: v });
  return (
    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
        <Lock size={12} /> Private — admins only, never shown on the site
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Contact name"><input className={inputClass} value={value.contactName ?? ''} onChange={e => set('contactName', e.target.value)} /></Field>
        <Field label="Contact email"><input type="email" className={inputClass} value={value.contactEmail ?? ''} onChange={e => set('contactEmail', e.target.value)} /></Field>
        <Field label="Contact phone"><input className={inputClass} value={value.contactPhone ?? ''} onChange={e => set('contactPhone', e.target.value)} /></Field>
        <Field label="Contact's role"><input className={inputClass} value={value.contactRole ?? ''} onChange={e => set('contactRole', e.target.value)} /></Field>
      </div>
      <Field label="Network level (from the form)"><input className={inputClass} value={value.lrpnLevel ?? ''} onChange={e => set('lrpnLevel', e.target.value)} /></Field>
      <Field label="Network activities committed to">
        <textarea rows={3} className={inputClass} value={value.activities ?? ''} onChange={e => set('activities', e.target.value)} />
      </Field>
      <Field label="Notes">
        <textarea rows={2} className={inputClass} value={value.notes ?? ''} onChange={e => set('notes', e.target.value)} />
      </Field>
      {value.formSubmittedAt && <p className="text-[11px] text-gray-500">Directory form submitted {value.formSubmittedAt}</p>}
    </div>
  );
}
