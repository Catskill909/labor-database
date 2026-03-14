import { useState, useRef } from 'react';
import { Sparkles, Copy, Plus, RefreshCw, X, Check, BookOpen, ExternalLink, Tag, Users, FileText, Lightbulb, AlertTriangle } from 'lucide-react';
import type { Entry, RelatedLink } from '../types.ts';
import { parseMetadata, getRelatedLinks, parseSections, rebuildMoreResearch } from '../types.ts';
import RelatedLinksEditor from './RelatedLinksEditor.tsx';

interface AiSandboxProps {
  entry: Entry;
  onClose: () => void;
  onSave: (updates: {
    description: string;
    tags: string;
    wikipediaUrl: string;
    relatedLinks: RelatedLink[];
    moreResearch: string;
  }) => void;
}

interface SuggestionBlock {
  text?: string;
  url?: string;
  summary?: string;
  confidence: 'high' | 'medium' | 'low';
}

interface AiSuggestions {
  expandedDescription: SuggestionBlock;
  bulletPoints: { text: string; confidence: string }[];
  wikipediaUrl: { url: string; summary: string; confidence: string } | null;
  externalLinks: { label: string; url: string; confidence: string }[];
  suggestedTags: { tag: string; confidence: string }[];
  keyPeopleOrgs: SuggestionBlock;
}

const CONFIDENCE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  high: { bg: 'bg-green-500/20', text: 'text-green-400', icon: '🟢' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '🟡' },
  low: { bg: 'bg-red-500/20', text: 'text-red-400', icon: '🔴' },
};

const MAX_TAGS = 5;

export default function AiSandbox({ entry, onClose, onSave }: AiSandboxProps) {
  const meta = parseMetadata(entry);
  const isQuote = entry.category === 'quote';
  const isHistory = entry.category === 'history';
  const useStructuredResearch = isQuote || isHistory;

  // Live record state (left panel)
  const [liveDescription, setLiveDescription] = useState(entry.description || '');
  const [liveWikipedia, setLiveWikipedia] = useState(meta.wikipediaUrl || '');
  const [liveLinks, setLiveLinks] = useState<RelatedLink[]>(getRelatedLinks(meta));
  const [liveMoreResearch, setLiveMoreResearch] = useState(meta.moreResearch || '');

  // Structured research fields (for history/quote)
  const initialSections = parseSections(meta.moreResearch || '');
  const [liveQuickFacts, setLiveQuickFacts] = useState(initialSections.quickFacts);
  const [liveKeyPeople, setLiveKeyPeople] = useState(initialSections.keyPeople);
  const [liveAdditionalNotes, setLiveAdditionalNotes] = useState(initialSections.additionalNotes);

  const updateStructuredField = (field: 'facts' | 'people' | 'notes', value: string) => {
    const facts = field === 'facts' ? value : liveQuickFacts;
    const people = field === 'people' ? value : liveKeyPeople;
    const notes = field === 'notes' ? value : liveAdditionalNotes;
    if (field === 'facts') setLiveQuickFacts(value);
    if (field === 'people') setLiveKeyPeople(value);
    if (field === 'notes') setLiveAdditionalNotes(value);
    setLiveMoreResearch(rebuildMoreResearch(facts, people, notes));
  };
  const [liveTags, setLiveTags] = useState<string[]>(
    entry.tags ? entry.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
  );

  // AI state (right panel)
  const [suggestions, setSuggestions] = useState<AiSuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [addedField, setAddedField] = useState<string | null>(null);

  // Suggested tags staging — curator can remove before adding to record
  const [stagedTags, setStagedTags] = useState<{ tag: string; confidence: string }[]>([]);

  // Settings
  const [outputLength, setOutputLength] = useState<'short' | 'detailed'>('detailed');
  const [tone, setTone] = useState<'factual' | 'narrative'>('factual');


  // Discard confirm modal
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Track if changes were made
  const initialRef = useRef({
    description: entry.description || '',
    tags: entry.tags || '',
    wikipediaUrl: meta.wikipediaUrl || '',
    moreResearch: meta.moreResearch || '',
  });

  const hasChanges = () => {
    const init = initialRef.current;
    return liveDescription !== init.description ||
      liveTags.join(',') !== init.tags ||
      liveWikipedia !== init.wikipediaUrl ||
      liveMoreResearch !== init.moreResearch ||
      liveLinks.length !== getRelatedLinks(meta).length;
  };

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    setAddedField(null);
    try {
      const token = sessionStorage.getItem('adminToken') || '';
      const res = await fetch('/api/admin/ai/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          entryId: entry.id,
          settings: { outputLength, tone },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get suggestions');
      }
      const data: AiSuggestions = await res.json();
      setSuggestions(data);
      // Stage suggested tags so curator can curate them
      if (data.suggestedTags?.length > 0) {
        setStagedTags(data.suggestedTags);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const markAdded = (field: string) => {
    setAddedField((prev: string | null) => prev ? `${prev},${field}` : field);
  };
  const isAdded = (field: string) => addedField?.split(',').includes(field) ?? false;

  const addToDescription = (text: string) => {
    setLiveDescription((prev: string) => prev ? `${prev}\n\n${text}` : text);
    markAdded('description');
  };

  const addToMoreResearch = (text: string, field?: string) => {
    if (useStructuredResearch) {
      // Route content to the right structured field
      const lower = text.trim().toLowerCase();
      if (lower.startsWith('quick facts:') || field === 'bullets') {
        // Strip header if present
        const content = text.replace(/^Quick Facts:\n?/i, '');
        const newFacts = liveQuickFacts ? `${liveQuickFacts}\n${content}` : content;
        setLiveQuickFacts(newFacts);
        setLiveMoreResearch(rebuildMoreResearch(newFacts, liveKeyPeople, liveAdditionalNotes));
      } else if (lower.startsWith('key people') || field === 'keyPeople' || field === 'people') {
        const content = text.replace(/^Key People[^:]*:\n?/i, '');
        const newPeople = liveKeyPeople ? `${liveKeyPeople}\n${content}` : content;
        setLiveKeyPeople(newPeople);
        setLiveMoreResearch(rebuildMoreResearch(liveQuickFacts, newPeople, liveAdditionalNotes));
      } else {
        // Default: goes to additional notes
        const newNotes = liveAdditionalNotes ? `${liveAdditionalNotes}\n\n${text}` : text;
        setLiveAdditionalNotes(newNotes);
        setLiveMoreResearch(rebuildMoreResearch(liveQuickFacts, liveKeyPeople, newNotes));
      }
    } else {
      setLiveMoreResearch((prev: string) => prev ? `${prev}\n\n${text}` : text);
    }
    markAdded(field || 'moreResearch');
  };

  const addTags = (newTags: string[]) => {
    setLiveTags((prev: string[]) => {
      const merged = [...new Set([...prev, ...newTags])];
      return merged.slice(0, MAX_TAGS);
    });
    markAdded('tags');
  };

  const removeTag = (tag: string) => {
    setLiveTags(prev => prev.filter(t => t !== tag));
  };

  const removeStagedTag = (tag: string) => {
    setStagedTags(prev => prev.filter(t => t.tag !== tag));
  };

  const addLinks = (links: { label: string; url: string }[]) => {
    setLiveLinks(prev => [...prev, ...links].slice(0, 10));
    markAdded('links');
  };

  const handleClose = () => {
    if (hasChanges()) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    onSave({
      description: liveDescription,
      tags: liveTags.join(', '),
      wikipediaUrl: liveWikipedia,
      relatedLinks: liveLinks,
      moreResearch: liveMoreResearch,
    });
  };

  const conf = (c: string) => CONFIDENCE_COLORS[c] || CONFIDENCE_COLORS.medium;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0a0a]/95 backdrop-blur-sm">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles size={20} className="text-red-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">Enhance: {entry.title}</h2>
              <span className="text-xs uppercase tracking-wider text-red-400">{entry.category}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Settings toggles matching demo style */}
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Length:</span>
                <button
                  onClick={() => setOutputLength('short')}
                  className={`px-2 py-1 rounded transition-colors ${outputLength === 'short' ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-300'}`}
                >
                  Short
                </button>
                <button
                  onClick={() => setOutputLength('detailed')}
                  className={`px-2 py-1 rounded transition-colors ${outputLength === 'detailed' ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-300'}`}
                >
                  Detailed
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Tone:</span>
                <button
                  onClick={() => setTone('factual')}
                  className={`px-2 py-1 rounded transition-colors ${tone === 'factual' ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-300'}`}
                >
                  Factual
                </button>
                <button
                  onClick={() => setTone('narrative')}
                  className={`px-2 py-1 rounded transition-colors ${tone === 'narrative' ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-300'}`}
                >
                  Narrative
                </button>
              </div>
            </div>

            <button
              onClick={handleScan}
              disabled={loading}
              className="whitespace-nowrap px-4 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors inline-flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-red-600/20"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : suggestions ? (
                <RefreshCw size={14} />
              ) : (
                <Sparkles size={14} />
              )}
              {loading ? 'Scanning...' : suggestions ? 'Regenerate' : 'Scan with AI'}
            </button>

            <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        {/* LEFT: Live Record */}
        <div className="flex-1 overflow-y-auto p-4 md:border-r border-white/10">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Live Record</h3>

          <div className="space-y-4">
            {/* Title (read-only) — hidden for history/quote since they use date/author as identifier */}
            {!isHistory && !isQuote && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Title</label>
                <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300">
                  {entry.title}
                </div>
              </div>
            )}
            {isQuote && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Author</label>
                <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300">
                  {entry.creator || 'Unknown Author'}
                </div>
              </div>
            )}

            {/* Description / Quote */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">{isQuote ? 'Quote (read-only)' : 'Description'}</label>
              {isQuote ? (
                <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 italic whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {liveDescription}
                </div>
              ) : (
                <textarea
                  value={liveDescription}
                  onChange={e => setLiveDescription(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                />
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                <Tag size={10} /> Tags ({liveTags.length}/{MAX_TAGS})
              </label>
              <div className="flex flex-wrap gap-1.5">
                {liveTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-300"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-white">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {liveTags.length === 0 && (
                  <span className="text-xs text-gray-600 italic">No tags yet</span>
                )}
              </div>
            </div>

            {/* Divider — Research section */}
            <div className="border-t border-white/10 pt-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <BookOpen size={12} />
                Research &amp; Links
              </h4>
            </div>

            {/* Wikipedia */}
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                <BookOpen size={10} /> Wikipedia Link
              </label>
              <input
                type="url"
                placeholder="https://en.wikipedia.org/wiki/..."
                value={liveWikipedia}
                onChange={e => setLiveWikipedia(e.target.value)}
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm"
              />
            </div>

            {/* Related Links */}
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                <ExternalLink size={10} /> Related Links
              </label>
              <RelatedLinksEditor links={liveLinks} onChange={setLiveLinks} />
            </div>

            {/* More Research — structured fields for history/quote, single textarea for others */}
            {useStructuredResearch ? (
              <>
                <div>
                  <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                    <Lightbulb size={10} /> Quick Facts
                  </label>
                  <textarea
                    value={liveQuickFacts}
                    onChange={e => updateStructuredField('facts', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                    placeholder={isQuote ? "Key facts about this person or quote..." : "Bullet points, key facts about this event..."}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                    <Users size={10} /> Key People &amp; Organizations
                  </label>
                  <textarea
                    value={liveKeyPeople}
                    onChange={e => updateStructuredField('people', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                    placeholder="People and organizations involved..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                    <FileText size={10} /> Additional Notes
                  </label>
                  <textarea
                    value={liveAdditionalNotes}
                    onChange={e => updateStructuredField('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                    placeholder="Additional curator notes, context..."
                  />
                </div>
              </>
            ) : (
              <>
                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText size={12} />
                    More Research
                  </h4>
                  <p className="text-[10px] text-gray-600 mb-2">Curator notes, additional context, bullet points</p>
                </div>
                <div>
                  <textarea
                    value={liveMoreResearch}
                    onChange={e => setLiveMoreResearch(e.target.value)}
                    rows={5}
                    maxLength={5000}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                    placeholder="Additional historical context, notes, quick facts..."
                  />
                  {liveMoreResearch.length > 4500 && (
                    <p className="text-[10px] text-yellow-400 mt-0.5">{5000 - liveMoreResearch.length} characters remaining</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: AI Suggestions */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">AI Suggestions</h3>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-400 rounded-full animate-spin mb-3" />
              <p className="text-sm">Researching with AI...</p>
              <p className="text-xs text-gray-600 mt-1">This may take 5-10 seconds</p>
            </div>
          )}

          {!loading && !suggestions && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-600">
              <Sparkles size={32} className="mb-3 text-red-500/30" />
              <p className="text-sm">Click "Scan with AI" to generate suggestions</p>
            </div>
          )}

          {suggestions && !loading && (
            <div className="space-y-4">
              {/* Expanded Description — for quotes, this goes to Additional Notes instead */}
              {suggestions.expandedDescription?.text && (
                <SuggestionCard
                  title={isQuote ? 'Context & Background' : 'Expanded Description'}
                  icon={<FileText size={14} />}
                  confidence={suggestions.expandedDescription.confidence}
                  content={suggestions.expandedDescription.text}
                  copiedField={copiedField}
                  addedField={addedField}
                  onCopy={() => copyToClipboard(suggestions.expandedDescription.text!, 'description')}
                  onAdd={isQuote
                    ? () => addToMoreResearch(suggestions.expandedDescription.text!, 'description')
                    : () => addToDescription(suggestions.expandedDescription.text!)
                  }
                  addLabel={isQuote ? 'Add to Additional Notes' : 'Add to Description'}
                  copyId="description"
                  addId="description"
                />
              )}

              {/* Quick Facts — styled bullet points */}
              {suggestions.bulletPoints?.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center mb-2">
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      <Lightbulb size={14} />
                      Quick Facts ({suggestions.bulletPoints.length})
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto mb-2">
                    {suggestions.bulletPoints.map((bp, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-[10px] mt-1 shrink-0">{conf(bp.confidence).icon}</span>
                        <span>{bp.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToMoreResearch(`Quick Facts:\n${suggestions.bulletPoints.map(bp => `• ${bp.text}`).join('\n')}`, 'bullets')}
                      disabled={isAdded('bullets')}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                        isAdded('bullets') ? 'bg-green-500/20 text-green-400' : 'bg-white/10 hover:bg-white/15'
                      }`}
                    >
                      {isAdded('bullets') ? <Check size={10} /> : <Plus size={10} />}
                      {isAdded('bullets') ? 'Added!' : useStructuredResearch ? 'Add to Quick Facts' : 'Add to More Research'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(suggestions.bulletPoints.map(bp => `• ${bp.text}`).join('\n'), 'bullets')}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors"
                    >
                      {copiedField === 'bullets' ? <Check size={10} /> : <Copy size={10} />}
                      {copiedField === 'bullets' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* Wikipedia */}
              {suggestions.wikipediaUrl && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center mb-2">
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      <BookOpen size={14} />
                      Wikipedia
                      <span className="text-[10px]">{conf(suggestions.wikipediaUrl.confidence).icon}</span>
                    </span>
                  </div>
                  <a href={suggestions.wikipediaUrl.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-slate-400 hover:text-slate-200 break-all">
                    {suggestions.wikipediaUrl.url}
                  </a>
                  {suggestions.wikipediaUrl.summary && (
                    <p className="text-xs text-gray-400 mt-1 mb-2">{suggestions.wikipediaUrl.summary}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => { setLiveWikipedia(suggestions.wikipediaUrl!.url); markAdded('wiki'); }}
                      disabled={isAdded('wiki')}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                        isAdded('wiki') ? 'bg-green-500/20 text-green-400' : 'bg-white/10 hover:bg-white/15'
                      }`}
                    >
                      {isAdded('wiki') ? <Check size={10} /> : <Plus size={10} />}
                      {isAdded('wiki') ? 'Added!' : 'Set Wikipedia'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(suggestions.wikipediaUrl!.url, 'wiki')}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors"
                    >
                      {copiedField === 'wiki' ? <Check size={10} /> : <Copy size={10} />}
                      {copiedField === 'wiki' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* External Links */}
              {suggestions.externalLinks?.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center mb-2">
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      <ExternalLink size={14} />
                      External Links ({suggestions.externalLinks.length})
                    </span>
                  </div>
                  <div className="space-y-1 mb-2">
                    {suggestions.externalLinks.map((link, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-[10px]">{conf(link.confidence).icon}</span>
                        <a href={link.url} target="_blank" rel="noopener noreferrer"
                          className="text-slate-400 hover:text-slate-200 truncate">
                          {link.label}
                        </a>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addLinks(suggestions.externalLinks.map(l => ({ label: l.label, url: l.url })))}
                      disabled={isAdded('links')}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                        isAdded('links') ? 'bg-green-500/20 text-green-400' : 'bg-white/10 hover:bg-white/15'
                      }`}
                    >
                      {isAdded('links') ? <Check size={10} /> : <Plus size={10} />}
                      {isAdded('links') ? 'Added!' : 'Add All Links'}
                    </button>
                  </div>
                </div>
              )}

              {/* Suggested Tags — with removable staging area */}
              {stagedTags.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center mb-2">
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      <Tag size={14} />
                      Suggested Tags
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-2">Remove tags you don't want, then add to record</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {stagedTags.map((t, i) => {
                      const alreadyAdded = liveTags.includes(t.tag);
                      return (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-colors ${
                            alreadyAdded
                              ? 'bg-green-500/20 border-green-500/30 text-green-400'
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <span className="text-[10px]">{conf(t.confidence).icon}</span>
                          {t.tag}
                          {alreadyAdded ? (
                            <Check size={10} className="text-green-400" />
                          ) : (
                            <>
                              <button
                                onClick={() => addTags([t.tag])}
                                disabled={liveTags.length >= MAX_TAGS}
                                className="hover:text-green-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Add to record"
                              >
                                <Plus size={10} />
                              </button>
                              <button
                                onClick={() => removeStagedTag(t.tag)}
                                className="hover:text-red-400"
                                title="Remove suggestion"
                              >
                                <X size={10} />
                              </button>
                            </>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        addTags(stagedTags.map(t => t.tag));
                        setStagedTags([]);
                      }}
                      disabled={liveTags.length >= MAX_TAGS || isAdded('tags')}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                        isAdded('tags') ? 'bg-green-500/20 text-green-400' : 'bg-white/10 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      {isAdded('tags') ? <Check size={10} /> : <Plus size={10} />}
                      {isAdded('tags') ? 'Added!' : 'Add Remaining to Record'}
                    </button>
                  </div>
                </div>
              )}

              {/* Key People & Organizations */}
              {suggestions.keyPeopleOrgs?.text && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center mb-2">
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      <Users size={14} />
                      Key People &amp; Organizations
                      <span className="text-[10px]">{conf(suggestions.keyPeopleOrgs.confidence).icon}</span>
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto mb-2">
                    {suggestions.keyPeopleOrgs.text}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToMoreResearch(`Key People & Organizations:\n${suggestions.keyPeopleOrgs.text}`, 'people')}
                      disabled={isAdded('people')}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                        isAdded('people') ? 'bg-green-500/20 text-green-400' : 'bg-white/10 hover:bg-white/15'
                      }`}
                    >
                      {isAdded('people') ? <Check size={10} /> : <Plus size={10} />}
                      {isAdded('people') ? 'Added!' : useStructuredResearch ? 'Add to Key People' : 'Add to More Research'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(suggestions.keyPeopleOrgs.text!, 'people')}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors"
                    >
                      {copiedField === 'people' ? <Check size={10} /> : <Copy size={10} />}
                      {copiedField === 'people' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="flex items-center justify-end gap-2 max-w-7xl mx-auto">
          <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Apply to Record
          </button>
        </div>
      </div>

      {/* Discard changes confirm modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDiscardConfirm(false)} />
          <div className="relative w-full max-w-sm bg-[var(--card)] border-2 border-amber-600/50 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b bg-amber-600/10 border-amber-600/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-600 shadow-lg shadow-amber-600/30">
                  <AlertTriangle size={18} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-amber-400">Unsaved Changes</h3>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-300 leading-relaxed">
                You have unsaved AI enhancements. Closing will discard all changes made in this session.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-white/5 bg-white/[0.02]">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white font-medium transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="flex items-center gap-2 px-5 py-2 text-white text-sm font-bold rounded-lg bg-amber-600 hover:bg-amber-700 transition-all"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable suggestion card component
function SuggestionCard({
  title, icon, confidence, content, copiedField, addedField, onCopy, onAdd, addLabel, copyId, addId,
}: {
  title: string;
  icon: React.ReactNode;
  confidence: string;
  content: string;
  copiedField: string | null;
  addedField: string | null;
  onCopy: () => void;
  onAdd: () => void;
  addLabel: string;
  copyId: string;
  addId: string;
}) {
  const c = CONFIDENCE_COLORS[confidence] || CONFIDENCE_COLORS.medium;
  const isAdded = addedField?.split(',').includes(addId) ?? false;
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center mb-2">
        <span className="text-xs font-medium flex items-center gap-1.5">
          {icon}
          {title}
          <span className="text-[10px]">{c.icon}</span>
        </span>
      </div>
      <div className="text-sm text-gray-300 whitespace-pre-wrap mb-2 max-h-40 overflow-y-auto">
        {content}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAdd}
          disabled={isAdded}
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            isAdded ? 'bg-green-500/20 text-green-400' : 'bg-white/10 hover:bg-white/15'
          }`}
        >
          {isAdded ? <Check size={10} /> : <Plus size={10} />}
          {isAdded ? 'Added!' : addLabel}
        </button>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors"
        >
          {copiedField === copyId ? <Check size={10} /> : <Copy size={10} />}
          {copiedField === copyId ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
