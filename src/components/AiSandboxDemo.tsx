import { useState } from 'react';
import { Sparkles, Copy, Plus, RefreshCw, ExternalLink, ChevronLeft, Check, HelpCircle, X } from 'lucide-react';

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

interface SampleEntry {
  id: number;
  category: 'history' | 'quote' | 'music' | 'film';
  title: string;
  description: string;
  year?: number;
  creator?: string;
}

const SAMPLE_ENTRIES: SampleEntry[] = [
  {
    id: 1,
    category: 'history',
    title: '1912 Lawrence Textile Strike',
    description: 'Major strike in Lawrence, Massachusetts.',
    year: 1912,
  },
  {
    id: 2,
    category: 'history',
    title: 'Triangle Shirtwaist Factory Fire',
    description: 'Fire that killed 146 garment workers.',
    year: 1911,
  },
  {
    id: 3,
    category: 'quote',
    title: '"There is power in a union"',
    description: '',
    creator: 'Joe Hill',
  },
  {
    id: 4,
    category: 'music',
    title: 'Which Side Are You On?',
    description: 'Union song from Harlan County.',
    year: 1931,
    creator: 'Florence Reece',
  },
  {
    id: 5,
    category: 'film',
    title: 'Norma Rae',
    description: 'Film about textile worker organizing.',
    year: 1979,
  },
];

const CONFIDENCE_COLORS = {
  high: { bg: 'bg-green-500/20', text: 'text-green-400', icon: '🟢' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '🟡' },
  low: { bg: 'bg-red-500/20', text: 'text-red-400', icon: '🔴' },
};

export default function AiSandboxDemo() {
  const [selectedEntry, setSelectedEntry] = useState<SampleEntry | null>(null);
  const [suggestions, setSuggestions] = useState<AiSuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Settings
  const [outputLength, setOutputLength] = useState<'short' | 'detailed'>('detailed');
  const [tone, setTone] = useState<'factual' | 'narrative'>('factual');
  const [showHelp, setShowHelp] = useState(false);

  // Live record fields (what would be saved)
  const [liveDescription, setLiveDescription] = useState('');
  const [liveWikipedia, setLiveWikipedia] = useState('');
  const [liveMoreResearch, setLiveMoreResearch] = useState('');
  const [liveTags, setLiveTags] = useState<string[]>([]);
  const [liveLinks, setLiveLinks] = useState<{ label: string; url: string }[]>([]);

  const selectEntry = (entry: SampleEntry) => {
    setSelectedEntry(entry);
    setSuggestions(null);
    setError(null);
    setLiveDescription(entry.description);
    setLiveWikipedia('');
    setLiveMoreResearch('');
    setLiveTags([]);
    setLiveLinks([]);
  };

  const handleScan = async () => {
    if (!selectedEntry) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = sessionStorage.getItem('adminToken') || '';
      const response = await fetch('/api/admin/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: selectedEntry.title,
          description: selectedEntry.description,
          category: selectedEntry.category,
          creator: selectedEntry.creator,
          settings: { outputLength, tone },
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch suggestions');
      }
      
      const data = await response.json();
      setSuggestions(data);
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

  const addToDescription = (text: string) => {
    setLiveDescription(prev => prev ? `${prev}\n\n${text}` : text);
  };

  const addToMoreResearch = (text: string) => {
    setLiveMoreResearch(prev => prev ? `${prev}\n\n${text}` : text);
  };

  const addTags = (tags: string[]) => {
    setLiveTags(prev => [...new Set([...prev, ...tags])]);
  };

  const addLinks = (links: { label: string; url: string }[]) => {
    setLiveLinks(prev => [...prev, ...links]);
  };

  if (!selectedEntry) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-red-500" />
                AI Research Tool Demo
              </h1>
              <button
                onClick={() => setShowHelp(true)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Help"
              >
                <HelpCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <p className="text-gray-400">
              Proof of concept for the Labor Database AI enrichment feature.
              Select a sample entry to see the 2-panel editor in action.
            </p>
          </div>
          
          <div className="grid gap-4">
            {SAMPLE_ENTRIES.map(entry => (
              <button
                key={entry.id}
                onClick={() => selectEntry(entry)}
                className="text-left p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-red-400">
                    {entry.category}
                  </span>
                  {entry.year && (
                    <span className="text-xs text-gray-500">{entry.year}</span>
                  )}
                </div>
                <h3 className="text-lg font-semibold">{entry.title}</h3>
                {entry.description && (
                  <p className="text-sm text-gray-400 mt-1">{entry.description}</p>
                )}
                {entry.creator && (
                  <p className="text-xs text-gray-500 mt-1">— {entry.creator}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-red-500" />
                  About This Demo
                </h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-red-400 mb-2">What is this?</h3>
                  <p className="text-gray-300">
                    A proof of concept for an AI-powered research assistant that helps curators enrich database entries with historical context, verified links, and related sources.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-red-400 mb-2">How It Works</h3>
                  <ol className="text-gray-300 space-y-2 list-decimal list-inside">
                    <li>Select a sample entry from the list</li>
                    <li>Click <strong>"Scan with AI"</strong> to generate research suggestions</li>
                    <li>Review the AI suggestions in the right panel</li>
                    <li>Click <strong>"Add to Record"</strong> to transfer content to the left panel</li>
                    <li>Edit the content as needed before saving</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-red-400 mb-2">What the AI Provides</h3>
                  <ul className="text-gray-300 space-y-1">
                    <li>• <strong>Expanded Description</strong> — Richer historical narrative</li>
                    <li>• <strong>Quick Facts</strong> — 3-12 bullet points for quick reference</li>
                    <li>• <strong>Wikipedia Link</strong> — Verified article URL with summary</li>
                    <li>• <strong>External Links</strong> — Archives, union sites, Library of Congress</li>
                    <li>• <strong>Suggested Tags</strong> — From Library of Congress labor subject headings</li>
                    <li>• <strong>Key People & Organizations</strong> — Figures and unions mentioned</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-red-400 mb-2">Confidence Indicators</h3>
                  <ul className="text-gray-300 space-y-1">
                    <li>🟢 <strong>High</strong> — Strong source material found</li>
                    <li>🟡 <strong>Medium</strong> — Inferred from context</li>
                    <li>🔴 <strong>Low</strong> — Speculative, verify before using</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-red-400 mb-2">Settings</h3>
                  <ul className="text-gray-300 space-y-1">
                    <li>• <strong>Length</strong> — Short (2-3 sentences) or Detailed (5-10 sentences)</li>
                    <li>• <strong>Tone</strong> — Factual/encyclopedic or Narrative/storytelling</li>
                  </ul>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Demo Note</h3>
                  <p className="text-sm text-gray-400">
                    This is a standalone proof of concept. In full integration, the AI tool would connect to the real database, use the existing tag selector, and save curator-approved content directly to entries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Help Modal (also available in editor view) */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-red-500" />
                About This Demo
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">What is this?</h3>
                <p className="text-gray-300">
                  A proof of concept for an AI-powered research assistant that helps curators enrich database entries with historical context, verified links, and related sources.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">How It Works</h3>
                <ol className="text-gray-300 space-y-2 list-decimal list-inside">
                  <li>Select a sample entry from the list</li>
                  <li>Click <strong>"Scan with AI"</strong> to generate research suggestions</li>
                  <li>Review the AI suggestions in the right panel</li>
                  <li>Click <strong>"Add to Record"</strong> to transfer content to the left panel</li>
                  <li>Edit the content as needed before saving</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">Confidence Indicators</h3>
                <ul className="text-gray-300 space-y-1">
                  <li>🟢 <strong>High</strong> — Strong source material found</li>
                  <li>🟡 <strong>Medium</strong> — Inferred from context</li>
                  <li>🔴 <strong>Low</strong> — Speculative, verify before using</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Demo Note</h3>
                <p className="text-sm text-gray-400">
                  This is a standalone proof of concept. In full integration, the AI tool would connect to the real database, use the existing tag selector, and save curator-approved content directly to entries.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedEntry(null)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-500" />
                AI Research Tool
              </h1>
              <p className="text-sm text-gray-400">{selectedEntry.title}</p>
            </div>
          </div>
          
          {/* Scan Settings */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Help"
            >
              <HelpCircle className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Length:</span>
              <button
                onClick={() => setOutputLength('short')}
                className={`px-2 py-1 rounded ${outputLength === 'short' ? 'bg-red-500' : 'bg-white/10'}`}
              >
                Short
              </button>
              <button
                onClick={() => setOutputLength('detailed')}
                className={`px-2 py-1 rounded ${outputLength === 'detailed' ? 'bg-red-500' : 'bg-white/10'}`}
              >
                Detailed
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Tone:</span>
              <button
                onClick={() => setTone('factual')}
                className={`px-2 py-1 rounded ${tone === 'factual' ? 'bg-red-500' : 'bg-white/10'}`}
              >
                Factual
              </button>
              <button
                onClick={() => setTone('narrative')}
                className={`px-2 py-1 rounded ${tone === 'narrative' ? 'bg-red-500' : 'bg-white/10'}`}
              >
                Narrative
              </button>
            </div>
            <button
              onClick={handleScan}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {suggestions ? 'Regenerate' : 'Scan with AI'}
            </button>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="max-w-7xl mx-auto p-4">
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* 2-Panel Layout */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-2 gap-6">
        {/* LEFT: Live Record */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-white/10 pb-2">
            Live Record
          </h2>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title</label>
            <input
              type="text"
              value={selectedEntry.title}
              readOnly
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={liveDescription}
              onChange={(e) => setLiveDescription(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg resize-none focus:outline-none focus:border-red-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Wikipedia Link</label>
            <input
              type="text"
              value={liveWikipedia}
              onChange={(e) => setLiveWikipedia(e.target.value)}
              placeholder="https://en.wikipedia.org/wiki/..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-red-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Related Links</label>
            <div className="space-y-2">
              {liveLinks.length === 0 ? (
                <p className="text-sm text-gray-500 italic">(none yet)</p>
              ) : (
                liveLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">{link.label}:</span>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline truncate">
                      {link.url}
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">More Research</label>
            <textarea
              value={liveMoreResearch}
              onChange={(e) => setLiveMoreResearch(e.target.value)}
              rows={6}
              placeholder="Additional context, bullet points, historical notes..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg resize-none focus:outline-none focus:border-red-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2">
              {liveTags.length === 0 ? (
                <p className="text-sm text-gray-500 italic">(none yet)</p>
              ) : (
                liveTags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-sm">
                    {tag}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: AI Suggestions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-white/10 pb-2">
            AI Suggestions
          </h2>
          
          {!suggestions && !loading && (
            <div className="text-center py-12 text-gray-500">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Click "Scan with AI" to generate suggestions</p>
            </div>
          )}
          
          {loading && (
            <div className="text-center py-12 text-gray-400">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin" />
              <p>Researching...</p>
            </div>
          )}
          
          {suggestions && (
            <div className="space-y-6">
              {/* Expanded Description */}
              <SuggestionCard
                title="Expanded Description"
                confidence={suggestions.expandedDescription.confidence}
                onCopy={() => copyToClipboard(suggestions.expandedDescription.text || '', 'desc')}
                onAdd={() => addToDescription(suggestions.expandedDescription.text || '')}
                copied={copiedField === 'desc'}
              >
                <p className="text-sm text-gray-300 whitespace-pre-wrap">
                  {suggestions.expandedDescription.text}
                </p>
              </SuggestionCard>

              {/* Quick Facts */}
              {suggestions.bulletPoints && suggestions.bulletPoints.length > 0 && (
                <SuggestionCard
                  title="Quick Facts"
                  confidence={suggestions.bulletPoints[0]?.confidence || 'medium'}
                  onCopy={() => copyToClipboard(suggestions.bulletPoints.map(b => `• ${b.text}`).join('\n'), 'bullets')}
                  onAdd={() => addToMoreResearch(suggestions.bulletPoints.map(b => `• ${b.text}`).join('\n'))}
                  copied={copiedField === 'bullets'}
                >
                  <ul className="text-sm text-gray-300 space-y-1">
                    {suggestions.bulletPoints.map((b, i) => (
                      <li key={i}>• {b.text}</li>
                    ))}
                  </ul>
                </SuggestionCard>
              )}

              {/* Wikipedia */}
              {suggestions.wikipediaUrl && (
                <SuggestionCard
                  title="Wikipedia"
                  confidence={suggestions.wikipediaUrl.confidence}
                  onCopy={() => copyToClipboard(suggestions.wikipediaUrl?.url || '', 'wiki')}
                  onAdd={() => setLiveWikipedia(suggestions.wikipediaUrl?.url || '')}
                  copied={copiedField === 'wiki'}
                >
                  <a
                    href={suggestions.wikipediaUrl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-red-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {suggestions.wikipediaUrl.url}
                  </a>
                  <p className="text-sm text-gray-400 mt-1">{suggestions.wikipediaUrl.summary}</p>
                </SuggestionCard>
              )}

              {/* External Links */}
              {suggestions.externalLinks && suggestions.externalLinks.length > 0 && (
                <SuggestionCard
                  title="External Links"
                  confidence={suggestions.externalLinks[0]?.confidence || 'medium'}
                  onCopy={() => copyToClipboard(suggestions.externalLinks.map(l => `${l.label}: ${l.url}`).join('\n'), 'links')}
                  onAdd={() => addLinks(suggestions.externalLinks.map(l => ({ label: l.label, url: l.url })))}
                  copied={copiedField === 'links'}
                >
                  <ul className="text-sm space-y-1">
                    {suggestions.externalLinks.map((link, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-300">{link.label}:</span>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline truncate">
                          {link.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </SuggestionCard>
              )}

              {/* Suggested Tags */}
              {suggestions.suggestedTags && suggestions.suggestedTags.length > 0 && (
                <SuggestionCard
                  title="Suggested Tags"
                  confidence={suggestions.suggestedTags[0]?.confidence || 'medium'}
                  onCopy={() => copyToClipboard(suggestions.suggestedTags.map(t => t.tag).join(', '), 'tags')}
                  onAdd={() => addTags(suggestions.suggestedTags.map(t => t.tag))}
                  copied={copiedField === 'tags'}
                >
                  <div className="flex flex-wrap gap-2">
                    {suggestions.suggestedTags.map((t, i) => (
                      <span key={i} className="px-2 py-1 bg-white/10 text-gray-300 rounded text-sm">
                        {t.tag}
                      </span>
                    ))}
                  </div>
                </SuggestionCard>
              )}

              {/* Key People & Orgs */}
              {suggestions.keyPeopleOrgs && (
                <SuggestionCard
                  title="Key People & Organizations"
                  confidence={suggestions.keyPeopleOrgs.confidence}
                  onCopy={() => copyToClipboard(suggestions.keyPeopleOrgs.text || '', 'people')}
                  onAdd={() => addToMoreResearch(suggestions.keyPeopleOrgs.text || '')}
                  copied={copiedField === 'people'}
                >
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">
                    {suggestions.keyPeopleOrgs.text}
                  </p>
                </SuggestionCard>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({
  title,
  confidence,
  onCopy,
  onAdd,
  copied,
  children,
}: {
  title: string;
  confidence: string;
  onCopy: () => void;
  onAdd: () => void;
  copied: boolean;
  children: React.ReactNode;
}) {
  const conf = CONFIDENCE_COLORS[confidence as keyof typeof CONFIDENCE_COLORS] || CONFIDENCE_COLORS.medium;
  
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium flex items-center gap-2">
          <span>{conf.icon}</span>
          {title}
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded ${conf.bg} ${conf.text}`}>
          {confidence}
        </span>
      </div>
      <div className="mb-3">{children}</div>
      <div className="flex gap-2">
        <button
          onClick={onAdd}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded text-sm font-medium transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add to Record
        </button>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
