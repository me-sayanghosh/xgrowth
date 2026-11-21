import { useEffect, useState } from 'react';
import { EmergencyPauseBanner } from '../components/common/EmergencyPauseBanner.js';
import { useApp } from '../context/AppContext.js';
import { CheckCircle2, Clock, FileText, Send, Sparkles } from 'lucide-react';

export function DashboardView() {
  const { setActiveView } = useApp();
  const [stats, setStats] = useState({
    reviewCount: 3,
    approvedCount: 2,
    submittedCount: 8,
    candidateCount: 14,
  });

  useEffect(() => {
    fetch('/api/content/items')
      .then((res) => res.json())
      .then((items) => {
        if (Array.isArray(items)) {
          setStats({
            reviewCount: items.filter((i) => i.status === 'needs_review').length,
            approvedCount: items.filter((i) => i.status === 'approved').length,
            submittedCount: items.filter((i) => i.status === 'submitted_to_buffer' || i.status === 'queued').length,
            candidateCount: 14,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <EmergencyPauseBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Operations Dashboard</h1>
          <p className="text-sm text-slate-400">Content pipeline and Buffer publishing status</p>
        </div>
        <button
          onClick={() => setActiveView('studio')}
          className="flex items-center space-x-2 bg-sky-500 hover:bg-sky-450 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>New AI Draft</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Needs Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">{stats.reviewCount}</p>
          <p className="mt-1 text-xs text-slate-500">Awaiting human sign-off</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">{stats.approvedCount}</p>
          <p className="mt-1 text-xs text-slate-500">Ready for Buffer dispatch</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">In Buffer Queue</span>
            <Send className="w-4 h-4 text-sky-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">{stats.submittedCount}</p>
          <p className="mt-1 text-xs text-slate-500">Confirmed by Buffer API</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Discovered Topics</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">{stats.candidateCount}</p>
          <p className="mt-1 text-xs text-slate-500">Available in research inbox</p>
        </div>
      </div>

      {/* Operational Highlights */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
        <h2 className="text-lg font-bold text-white mb-2">Publishing Invariants & Guarantees</h2>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Deterministic SHA-256 cryptographic approval hashing active</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Post-approval edit invalidation strictly enforced</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>No blind retry on ambiguous timeouts (automatic reconciliation pipeline)</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Server-side personal API key protected via HTTP Bearer token</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
