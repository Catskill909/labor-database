import { useState } from 'react';
import { X, Copy, Check, Play, Globe, Code2, Rss, Zap } from 'lucide-react';

interface ApiModalProps {
  onClose: () => void;
}

type TabId = 'endpoints' | 'examples' | 'feed' | 'tryit';

const tabs: { id: TabId; label: string; icon: typeof Globe }[] = [
  { id: 'endpoints', label: 'Endpoints', icon: Globe },
  { id: 'examples', label: 'Examples', icon: Code2 },
  { id: 'feed', label: 'JSON Feed', icon: Rss },
  { id: 'tryit', label: 'Try It', icon: Zap },
];

const endpoints = [
  {
    group: 'Core Data',
    items: [
      { method: 'GET', path: '/api/entries', desc: 'Browse & search entries', params: 'category, search, month, day, year, creator, genre, tag, limit, offset' },
      { method: 'GET', path: '/api/entries/:id', desc: 'Single entry detail', params: 'id (path)' },
      { method: 'GET', path: '/api/entries/counts', desc: 'Entry counts per category', params: '' },
      { method: 'GET', path: '/api/entries/filter-options', desc: 'Filter options by category', params: 'category (required)' },
      { method: 'GET', path: '/api/categories', desc: 'List active categories', params: '' },
      { method: 'GET', path: '/api/tags', desc: 'All tags with counts & groups', params: 'category' },
    ],
  },
  {
    group: 'On This Day',
    items: [
      { method: 'GET', path: '/api/on-this-day', desc: 'Entries for a specific date', params: 'month (required), day (required), tag' },
      { method: 'GET', path: '/api/on-this-day/calendar', desc: 'Calendar dot indicators', params: 'month (required)' },
    ],
  },
  {
    group: 'Feed',
    items: [
      { method: 'GET', path: '/api/feed.json', desc: 'JSON Feed 1.1 spec', params: 'category, limit (default 50, max 200)' },
      { method: 'GET', path: '/api/health', desc: 'Health check', params: '' },
    ],
  },
];

const quickEndpoints = [
  '/api/entries?category=history&limit=3',
  '/api/entries?category=film&limit=3',
  '/api/entries?category=music&limit=3',
  '/api/entries?category=quote&limit=3',
  '/api/entries/counts',
  '/api/on-this-day?month=3&day=2',
  '/api/categories',
  '/api/tags?category=history',
  '/api/feed.json?limit=5',
  '/api/health',
];

export default function ApiModal({ onClose }: ApiModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('endpoints');
  const [copied, setCopied] = useState<string | null>(null);
  const [tryItUrl, setTryItUrl] = useState('/api/entries?category=history&limit=3');
  const [tryItResult, setTryItResult] = useState<string | null>(null);
  const [tryItMeta, setTryItMeta] = useState<{ status: number; time: number; count: number | null } | null>(null);
  const [tryItLoading, setTryItLoading] = useState(false);
  const [tryItError, setTryItError] = useState<string | null>(null);

  const baseUrl = window.location.origin;

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ text, label }: { text: string; label: string }) => (
    <button
      onClick={() => copyToClipboard(text, label)}
      className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
      title="Copy to clipboard"
    >
      {copied === label ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-500" />}
    </button>
  );

  const CodeBlock = ({ code, lang, label }: { code: string; lang: string; label: string }) => (
    <div className="relative group">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] border-b border-white/5 rounded-t-lg">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{lang}</span>
        <CopyBtn text={code} label={label} />
      </div>
      <pre className="bg-black/40 border border-white/5 border-t-0 rounded-b-lg p-3 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre-wrap break-all">
        {code}
      </pre>
    </div>
  );

  const handleTryIt = async () => {
    setTryItLoading(true);
    setTryItError(null);
    setTryItResult(null);
    setTryItMeta(null);
    const start = performance.now();
    try {
      const url = tryItUrl.startsWith('/') ? tryItUrl : `/${tryItUrl}`;
      const res = await fetch(url);
      const elapsed = Math.round(performance.now() - start);
      const data = await res.json();
      const json = JSON.stringify(data, null, 2);
      // Cap display at 50KB to prevent browser slowdown
      setTryItResult(json.length > 50000 ? json.slice(0, 50000) + '\n\n... (truncated, response too large)' : json);
      setTryItMeta({
        status: res.status,
        time: elapsed,
        count: Array.isArray(data) ? data.length : data?.items?.length ?? null,
      });
    } catch (err) {
      setTryItError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setTryItLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-red-400 mb-0.5">Developer</p>
            <h3 className="text-lg font-bold">API Reference</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 pb-1 border-b border-white/5">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all
                  ${activeTab === tab.id ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ==================== ENDPOINTS TAB ==================== */}
          {activeTab === 'endpoints' && (
            <>
              <p className="text-xs text-gray-500">All public endpoints. No authentication required.</p>
              {endpoints.map(group => (
                <div key={group.group}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{group.group}</h4>
                  <div className="space-y-1.5">
                    {group.items.map(ep => (
                      <div key={ep.path} className="flex items-start gap-2 p-2.5 bg-white/[0.02] border border-white/5 rounded-lg group">
                        <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold bg-green-500/15 text-green-400 rounded">
                          {ep.method}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm text-gray-200 font-mono truncate">{ep.path}</code>
                            <CopyBtn text={`${baseUrl}${ep.path}`} label={ep.path} />
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{ep.desc}</p>
                          {ep.params && (
                            <p className="text-[10px] text-gray-600 mt-0.5">Params: {ep.params}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ==================== EXAMPLES TAB ==================== */}
          {activeTab === 'examples' && (
            <>
              <p className="text-xs text-gray-500">Copy-paste examples for common use cases.</p>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Fetch all history entries</h4>
                <div className="space-y-3">
                  <CodeBlock
                    lang="curl"
                    label="curl-history"
                    code={`curl "${baseUrl}/api/entries?category=history&limit=10"`}
                  />
                  <CodeBlock
                    lang="javascript"
                    label="js-history"
                    code={`const res = await fetch("${baseUrl}/api/entries?category=history&limit=10");
const entries = await res.json();
console.log(\`Found \${entries.length} entries\`);
entries.forEach(e => console.log(\`[\${e.year}] \${e.title}\`));`}
                  />
                  <CodeBlock
                    lang="python"
                    label="py-history"
                    code={`import requests

res = requests.get("${baseUrl}/api/entries", params={
    "category": "history",
    "limit": 10
})
entries = res.json()
for e in entries:
    print(f"[{e.get('year', '?')}] {e['title']}")`}
                  />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">On This Day</h4>
                <CodeBlock
                  lang="curl"
                  label="curl-otd"
                  code={`curl "${baseUrl}/api/on-this-day?month=5&day=1"`}
                />
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Search entries</h4>
                <CodeBlock
                  lang="curl"
                  label="curl-search"
                  code={`curl "${baseUrl}/api/entries?search=haymarket&category=history"`}
                />
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Filter by tags</h4>
                <CodeBlock
                  lang="curl"
                  label="curl-tags"
                  code={`# AND logic: entries must match ALL tags
curl "${baseUrl}/api/entries?tag=mining,women&category=history"`}
                />
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">JSON Feed (for RSS readers)</h4>
                <CodeBlock
                  lang="curl"
                  label="curl-feed"
                  code={`curl "${baseUrl}/api/feed.json?category=music&limit=20"`}
                />
              </div>
            </>
          )}

          {/* ==================== JSON FEED TAB ==================== */}
          {activeTab === 'feed' && (
            <>
              <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <h4 className="text-sm font-bold text-blue-400 mb-1">JSON Feed 1.1</h4>
                <p className="text-xs text-gray-400">
                  This endpoint follows the <a href="https://jsonfeed.org/version/1.1" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">JSON Feed specification</a> — a modern alternative to RSS/Atom using JSON instead of XML. Compatible with feed readers like NetNewsWire, Feedbin, Inoreader, and others.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Feed URLs</h4>
                <div className="space-y-1.5">
                  {[
                    { label: 'All entries', url: '/api/feed.json' },
                    { label: 'History only', url: '/api/feed.json?category=history' },
                    { label: 'Quotes only', url: '/api/feed.json?category=quote' },
                    { label: 'Music only', url: '/api/feed.json?category=music' },
                    { label: 'Films only', url: '/api/feed.json?category=film' },
                  ].map(feed => (
                    <div key={feed.url} className="flex items-center gap-2 p-2.5 bg-white/[0.02] border border-white/5 rounded-lg">
                      <Rss size={13} className="text-orange-400 shrink-0" />
                      <span className="text-xs text-gray-400 shrink-0 w-24">{feed.label}</span>
                      <code className="text-xs text-gray-300 font-mono flex-1 truncate">{baseUrl}{feed.url}</code>
                      <CopyBtn text={`${baseUrl}${feed.url}`} label={feed.url} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Parameters</h4>
                <div className="text-xs text-gray-400 space-y-1">
                  <p><code className="text-gray-300 bg-white/5 px-1 py-0.5 rounded">category</code> — Filter by category: history, quote, music, film</p>
                  <p><code className="text-gray-300 bg-white/5 px-1 py-0.5 rounded">limit</code> — Max items (default 50, max 200)</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Custom Extension</h4>
                <p className="text-xs text-gray-400 mb-2">
                  Each item includes a <code className="text-gray-300 bg-white/5 px-1 py-0.5 rounded">_labor_database</code> extension with category-specific fields:
                </p>
                <CodeBlock
                  lang="json"
                  label="feed-extension"
                  code={`{
  "_labor_database": {
    "category": "history",
    "creator": "Author Name",
    "month": 5, "day": 1, "year": 1886,
    "metadata": { /* category-specific fields */ },
    "source_url": "https://..."
  }
}`}
                />
              </div>
            </>
          )}

          {/* ==================== TRY IT TAB ==================== */}
          {activeTab === 'tryit' && (
            <>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Quick select</label>
                <select
                  value={tryItUrl}
                  onChange={e => setTryItUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-gray-300 focus:outline-none focus:border-red-500/50 [&>option]:bg-zinc-900"
                >
                  {quickEndpoints.map(ep => (
                    <option key={ep} value={ep}>{ep}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Endpoint URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tryItUrl}
                    onChange={e => setTryItUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleTryIt()}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-gray-300 focus:outline-none focus:border-red-500/50 placeholder:text-gray-600"
                    placeholder="/api/entries?limit=5"
                  />
                  <button
                    onClick={handleTryIt}
                    disabled={tryItLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-all"
                  >
                    {tryItLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Play size={14} />
                    )}
                    Send
                  </button>
                </div>
              </div>

              {tryItMeta && (
                <div className="flex gap-3 text-xs">
                  <span className={`px-2 py-0.5 rounded font-bold ${tryItMeta.status < 300 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                    {tryItMeta.status}
                  </span>
                  <span className="text-gray-500">{tryItMeta.time}ms</span>
                  {tryItMeta.count !== null && <span className="text-gray-500">{tryItMeta.count} items</span>}
                </div>
              )}

              {tryItError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {tryItError}
                </div>
              )}

              {tryItResult && (
                <pre className="bg-black/40 border border-white/5 rounded-lg p-3 text-xs font-mono text-green-400 overflow-auto max-h-80 whitespace-pre-wrap break-all">
                  {tryItResult}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
