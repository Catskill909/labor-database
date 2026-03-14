import { Plus, X } from 'lucide-react';
import type { RelatedLink } from '../types.ts';

interface RelatedLinksEditorProps {
  links: RelatedLink[];
  onChange: (links: RelatedLink[]) => void;
  maxLinks?: number;
  readOnly?: boolean;
}

export default function RelatedLinksEditor({ links, onChange, maxLinks = 10, readOnly = false }: RelatedLinksEditorProps) {
  const addLink = () => {
    if (links.length >= maxLinks) return;
    onChange([...links, { label: '', url: '' }]);
  };

  const updateLink = (index: number, field: 'label' | 'url', value: string) => {
    const updated = links.map((link, i) => i === index ? { ...link, [field]: value } : link);
    onChange(updated);
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {links.map((link, i) => (
        <div key={i} className="flex gap-2 items-start">
          <input
            type="text"
            placeholder="Label (e.g. AFL-CIO Archive)"
            value={link.label}
            onChange={e => updateLink(i, 'label', e.target.value)}
            readOnly={readOnly}
            className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm"
          />
          <input
            type="url"
            placeholder="https://..."
            value={link.url}
            onChange={e => updateLink(i, 'url', e.target.value)}
            readOnly={readOnly}
            className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm"
          />
          {!readOnly && (
            <button
              type="button"
              onClick={() => removeLink(i)}
              className="p-1.5 text-gray-500 hover:text-red-400 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      {!readOnly && links.length < maxLinks && (
        <button
          type="button"
          onClick={addLink}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <Plus size={12} />
          Add a link
        </button>
      )}
    </div>
  );
}
