import { useState, useEffect } from 'react';
import { ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';
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

export function ResearchInboxView() {
  const { setActiveView } = useApp();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/research/candidates')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCandidates(data);
      })
      .catch(() => {});
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Research Inbox</h1>
          <p className="text-sm text-slate-400">Discover and promote verified technical candidates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {candidates.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-500">
            No candidates found. Configure RSS sources or trigger a manual sync in background jobs.
          </div>
        ) : (
          candidates.map((c) => (
            <div key={c._id} className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
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

              <div className="flex items-center space-x-2">
                {c.status === 'briefed' ? (
                  <button
                    onClick={() => setActiveView('studio')}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-semibold hover:bg-emerald-900"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Open in Studio</span>
                  </button>
                ) : (
                  <button
                    onClick={() => promoteToBrief(c._id)}
                    disabled={loading}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
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
    </div>
  );
}
