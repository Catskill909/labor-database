import { useState } from 'react';
import { ChevronDown, BookOpen, Link2, FileText } from 'lucide-react';
import RelatedLinksEditor from './RelatedLinksEditor.tsx';
import type { RelatedLink } from '../types.ts';

interface ResearchFieldsSectionProps {
  wikipediaUrl: string;
  onWikipediaUrlChange: (url: string) => void;
  relatedLinks: RelatedLink[];
  onRelatedLinksChange: (links: RelatedLink[]) => void;
  moreResearch: string;
  onMoreResearchChange: (text: string) => void;
  defaultExpanded?: boolean;
}

export default function ResearchFieldsSection({
  wikipediaUrl,
  onWikipediaUrlChange,
  relatedLinks,
  onRelatedLinksChange,
  moreResearch,
  onMoreResearchChange,
  defaultExpanded = false,
}: ResearchFieldsSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const hasContent = !!(wikipediaUrl || relatedLinks.length > 0 || moreResearch);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
      >
        <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
          <BookOpen size={12} />
          Research &amp; Links
          {hasContent && !expanded && (
            <span className="text-[10px] text-green-400/70 ml-1">has content</span>
          )}
          <span className="text-gray-600">(optional)</span>
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-2 space-y-3">
          {/* Wikipedia URL */}
          <div>
            <label className="text-xs text-gray-400 flex items-center gap-1 mb-1">
              <BookOpen size={10} />
              Wikipedia Link
            </label>
            <input
              type="url"
              placeholder="https://en.wikipedia.org/wiki/..."
              value={wikipediaUrl}
              onChange={e => onWikipediaUrlChange(e.target.value)}
              className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm"
            />
          </div>

          {/* Related Links */}
          <div>
            <label className="text-xs text-gray-400 flex items-center gap-1 mb-1">
              <Link2 size={10} />
              Related Links
            </label>
            <RelatedLinksEditor links={relatedLinks} onChange={onRelatedLinksChange} />
          </div>

          {/* More Research */}
          <div>
            <label className="text-xs text-gray-400 flex items-center gap-1 mb-1">
              <FileText size={10} />
              More Research
            </label>
            <textarea
              placeholder="Additional historical context, notes, bullet points..."
              value={moreResearch}
              onChange={e => onMoreResearchChange(e.target.value)}
              rows={3}
              maxLength={5000}
              className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm"
            />
            {moreResearch.length > 4500 && (
              <p className="text-[10px] text-yellow-400 mt-0.5">{5000 - moreResearch.length} characters remaining</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
