import { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Settings,
  Plus,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  X,
  Radio,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext.js';

interface Candidate {
  _id: string;
  title: string;
  sourceUrl: string;
  sourceName: string;
  excerpt: string;
  topicPillar: string;
  freshnessScore: number;
  credibilityScore: number;
  status: string;
}

interface ResearchSource {
  _id: string;
  name: string;
  url: string;
  category: string;
  type: string;
  isActive: boolean;
  lastFetchedAt?: string;
  fetchErrorCount?: number;
}

export function ResearchInboxView() {
  const { setActiveView } = useApp();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);

  // Modals state
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showOpmlModal, setShowOpmlModal] = useState(false);

  // New source form state
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceCategory, setNewSourceCategory] = useState('Distributed Systems');

  // New candidate form state
  const [newCandTitle, setNewCandTitle] = useState('');
  const [newCandUrl, setNewCandUrl] = useState('');
  const [newCandSource, setNewCandSource] = useState('');
  const [newCandExcerpt, setNewCandExcerpt] = useState('');
  const [newCandPillar, setNewCandPillar] = useState('Distributed Systems');

  // OPML import state
  const [opmlText, setOpmlText] = useState('');
  const [opmlStatus, setOpmlStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCandidates = () => {
    fetch('/api/research/candidates')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCandidates(data);
      })
      .catch(() => {});
  };

  const fetchSources = () => {
    fetch('/api/research/sources')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSources(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCandidates();
    fetchSources();
  }, []);

  const promoteToBrief = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/research/candidates/${id}/to-brief`, {
        method: 'POST',
        headers: { 'x-xgrowth-csrf': '1' },
      });
      const data = await res.json();
      if (data.success) {
        setCandidates((prev) =>
          prev.map((c) => (c._id === id ? { ...c, status: 'briefed' } : c)),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;

    try {
      const res = await fetch('/api/research/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xgrowth-csrf': '1',
        },
        body: JSON.stringify({
          name: newSourceName.trim(),
          url: newSourceUrl.trim(),
          category: newSourceCategory,
          type: 'rss',
        }),
      });
      if (res.ok) {
        setNewSourceName('');
        setNewSourceUrl('');
        fetchSources();
      }
    } catch {
      // ignore
    }
  };

  const handleToggleSource = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/research/sources/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-xgrowth-csrf': '1',
        },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        setSources((prev) =>
          prev.map((s) => (s._id === id ? { ...s, isActive: !currentActive } : s)),
        );
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this research source?')) return;
    try {
      const res = await fetch(`/api/research/sources/${id}`, {
        method: 'DELETE',
        headers: { 'x-xgrowth-csrf': '1' },
      });
      if (res.ok) {
        setSources((prev) => prev.filter((s) => s._id !== id));
      }
    } catch {
      // ignore
    }
  };

  const handleSyncSource = async (id: string) => {
    setSyncingSourceId(id);
    try {
      await fetch(`/api/research/sources/${id}/sync`, {
        method: 'POST',
        headers: { 'x-xgrowth-csrf': '1' },
      });
      fetchSources();
      fetchCandidates();
    } catch {
      // ignore
    } finally {
      setSyncingSourceId(null);
    }
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandTitle.trim() || !newCandUrl.trim()) return;

    try {
      const res = await fetch('/api/research/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xgrowth-csrf': '1',
        },
        body: JSON.stringify({
          title: newCandTitle.trim(),
          sourceUrl: newCandUrl.trim(),
          sourceName: newCandSource.trim() || 'Manual Entry',
          excerpt: newCandExcerpt.trim() || newCandTitle.trim(),
          topicPillar: newCandPillar,
        }),
      });
      if (res.ok) {
        setShowCandidateModal(false);
        setNewCandTitle('');
        setNewCandUrl('');
        setNewCandSource('');
        setNewCandExcerpt('');
        fetchCandidates();
      }
    } catch {
      // ignore
    }
  };

  const handleExportOpml = async () => {
    try {
      const res = await fetch('/api/research/sources/opml/export');
      const xml = await res.text();
      const blob = new Blob([xml], { type: 'text/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'xgrowth-subscriptions.opml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const handleImportOpml = async () => {
    if (!opmlText.trim()) return;
    setOpmlStatus('Importing...');
    try {
      const res = await fetch('/api/research/sources/opml/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xgrowth-csrf': '1',
        },
        body: JSON.stringify({ opmlText }),
      });
      const data = await res.json();
      if (res.ok) {
        setOpmlStatus(`Successfully imported ${data.count} source(s)!`);
        setOpmlText('');
        fetchSources();
        setTimeout(() => {
          setShowOpmlModal(false);
          setOpmlStatus(null);
        }, 1200);
      } else {
        setOpmlStatus(`Error: ${data.error || 'Failed to import OPML'}`);
      }
    } catch {
      setOpmlStatus('Network error importing OPML');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result;
      if (typeof content === 'string') {
        setOpmlText(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Research Inbox</h1>
          <p className="text-sm text-slate-400">Discover and promote verified technical candidates</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCandidateModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Candidate</span>
          </button>
          <button
            onClick={() => setShowSourceModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Manage Sources ({sources.length})</span>
          </button>
          <button
            onClick={handleExportOpml}
            title="Export OPML Feed Subscriptions"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export OPML</span>
          </button>
          <button
            onClick={() => setShowOpmlModal(true)}
            title="Import OPML Feed Subscriptions"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import OPML</span>
          </button>
        </div>
      </div>

      {/* Candidate List */}
      <div className="grid grid-cols-1 gap-4">
        {candidates.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-500 space-y-2">
            <Radio className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-medium text-slate-400">No candidates found</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Configure your RSS feeds via &apos;Manage Sources&apos;, import an OPML file, or click &apos;Add Candidate&apos; to introduce a new technical topic.
            </p>
          </div>
        ) : (
          candidates.map((c) => (
            <div
              key={c._id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:border-slate-700"
            >
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 text-xs font-semibold bg-sky-950 text-sky-400 border border-sky-800 rounded-full">
                    {c.topicPillar}
                  </span>
                  <span className="text-xs text-slate-500">Credibility: {c.credibilityScore}/5</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-500">Freshness: {c.freshnessScore}/5</span>
                </div>
                <h3 className="text-base font-semibold text-white">{c.title}</h3>
                <p className="text-sm text-slate-400 line-clamp-2">{c.excerpt}</p>
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 text-xs text-sky-400 hover:underline pt-1"
                >
                  <span>{c.sourceName || 'Primary Source'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {c.status === 'briefed' ? (
                  <button
                    onClick={() => setActiveView('studio')}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-semibold hover:bg-emerald-900 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Open in Studio</span>
                  </button>
                ) : (
                  <button
                    onClick={() => promoteToBrief(c._id)}
                    disabled={loading}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create Brief</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Source Manager Modal */}
      {showSourceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-semibold text-white">Manage Research Sources</h2>
              </div>
              <button
                onClick={() => setShowSourceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Configured RSS / Tech Feeds ({sources.length})
                </h3>
                {sources.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No sources configured yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sources.map((s) => (
                      <div
                        key={s._id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-white truncate">{s.name}</span>
                            <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded">
                              {s.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{s.url}</p>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => handleToggleSource(s._id, s.isActive)}
                            className={`px-2 py-1 text-xs rounded font-medium transition ${
                              s.isActive
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {s.isActive ? 'Active' : 'Disabled'}
                          </button>
                          <button
                            onClick={() => handleSyncSource(s._id)}
                            disabled={syncingSourceId === s._id}
                            title="Sync Feed Now"
                            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-50"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${syncingSourceId === s._id ? 'animate-spin' : ''}`}
                            />
                          </button>
                          <button
                            onClick={() => handleDeleteSource(s._id)}
                            title="Delete Source"
                            className="p-1.5 rounded bg-red-950/40 text-red-400 hover:bg-red-900/60"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Source Form */}
              <form onSubmit={handleCreateSource} className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Plus className="w-3.5 h-3.5 text-sky-400" />
                  <span>Add New RSS Source</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Source Name (e.g. Netflix Tech)"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    required
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="text"
                    placeholder="Category / Topic Pillar"
                    value={newSourceCategory}
                    onChange={(e) => setNewSourceCategory(e.target.value)}
                    required
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <input
                  type="url"
                  placeholder="Feed URL (https://.../feed.xml)"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded transition"
                >
                  Save Source
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manual Candidate Modal */}
      {showCandidateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-semibold text-white">Add Manual Candidate</h2>
              </div>
              <button
                onClick={() => setShowCandidateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCandidate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Topic Title</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Consensus in Raft vs Paxos"
                  value={newCandTitle}
                  onChange={(e) => setNewCandTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Primary Source URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newCandUrl}
                  onChange={(e) => setNewCandUrl(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Source Name</label>
                  <input
                    type="text"
                    placeholder="e.g. AWS Architecture"
                    value={newCandSource}
                    onChange={(e) => setNewCandSource(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Topic Pillar</label>
                  <select
                    value={newCandPillar}
                    onChange={(e) => setNewCandPillar(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Distributed Systems">Distributed Systems</option>
                    <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                    <option value="Software Architecture">Software Architecture</option>
                    <option value="Engineering Leadership">Engineering Leadership</option>
                    <option value="Performance & Optimization">Performance & Optimization</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Key Takeaway / Excerpt</label>
                <textarea
                  rows={3}
                  placeholder="Summarize key architectural trade-offs, findings, or concepts..."
                  value={newCandExcerpt}
                  onChange={(e) => setNewCandExcerpt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCandidateModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OPML Import Modal */}
      {showOpmlModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-semibold text-white">Import OPML Feed Subscriptions</h2>
              </div>
              <button
                onClick={() => setShowOpmlModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Upload an exported `.opml` or `.xml` file from your RSS reader (e.g. Feedly, Inoreader, NetNewsWire) or paste raw XML below:
              </p>

              <div>
                <input
                  type="file"
                  accept=".opml,.xml"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-lg text-xs font-medium text-slate-300 hover:text-white flex items-center justify-center space-x-2 transition"
                >
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span>Choose OPML File from Computer</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Or Paste OPML XML</label>
                <textarea
                  rows={6}
                  placeholder="<?xml version=&quot;1.0&quot; encoding=&quot;UTF-8&quot;?>&#10;<opml version=&quot;2.0&quot;>..."
                  value={opmlText}
                  onChange={(e) => setOpmlText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              {opmlStatus && (
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs text-sky-300">
                  {opmlStatus}
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowOpmlModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportOpml}
                  disabled={!opmlText.trim()}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow disabled:opacity-50"
                >
                  Import Feeds
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
