import { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  BarChart2,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext.js';

interface MetricDelta {
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number;
}

interface Report {
  id: string;
  markdownReport: string;
  generatedAt: string;
  totalPublished: number;
  whatWorked: string[];
  nextExperiments: string[];
  wowDeltas?: {
    posts?: MetricDelta;
    likes?: MetricDelta;
    reposts?: MetricDelta;
    replies?: MetricDelta;
  };
}

export function AnalyticsView() {
  const { apiFetch } = useApp();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReports = () => {
    apiFetch('/api/analytics/reports')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setReport(data[0]);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/analytics/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'markdown' | 'json') => {
    if (!report) return;
    const res = await apiFetch(`/api/analytics/reports/${report.id}/export?format=${format}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xgrowth-report-${report.id}.${format === 'json' ? 'json' : 'md'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderDeltaBadge = (delta?: MetricDelta) => {
    if (!delta) return null;
    const pct = delta.deltaPercent;
    const isPositive = pct > 0;
    const isNegative = pct < 0;

    return (
      <span
        data-testid="wow-delta-badge"
        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
          isPositive
            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
            : isNegative
            ? 'bg-rose-950 text-rose-400 border border-rose-800'
            : 'bg-slate-800 text-slate-400'
        }`}
      >
        {isPositive && <TrendingUp className="w-3 h-3 text-emerald-400" />}
        {isNegative && <TrendingDown className="w-3 h-3 text-rose-400" />}
        {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
        <span>{pct > 0 ? `+${pct}%` : `${pct}%`} WoW</span>
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics &amp; Weekly Insights</h1>
          <p className="text-sm text-slate-400">Auditable, evidence-backed content performance and week-over-week trends</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {report && (
            <>
              <button
                onClick={() => handleExport('markdown')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Download Markdown</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Download JSON</span>
              </button>
            </>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Synthesizing Report...' : 'Generate New Weekly Report'}</span>
          </button>
        </div>
      </div>

      {report ? (
        <div className="space-y-6">
          {/* Week-over-Week Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Posts Published</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white">
                  {report.wowDeltas?.posts?.current ?? report.totalPublished}
                </span>
                {renderDeltaBadge(report.wowDeltas?.posts)}
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Likes</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white">
                  {report.wowDeltas?.likes?.current ?? 0}
                </span>
                {renderDeltaBadge(report.wowDeltas?.likes)}
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Reposts</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white">
                  {report.wowDeltas?.reposts?.current ?? 0}
                </span>
                {renderDeltaBadge(report.wowDeltas?.reposts)}
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Replies</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white">
                  {report.wowDeltas?.replies?.current ?? 0}
                </span>
                {renderDeltaBadge(report.wowDeltas?.replies)}
              </div>
            </div>
          </div>

          {/* Actionable Experiments Banner */}
          <div className="p-5 bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-800/60 rounded-xl space-y-3">
            <h2 className="text-sm font-bold text-sky-300 flex items-center space-x-2">
              <BarChart2 className="w-4 h-4" />
              <span>Recommended Next Week Content Experiments</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.nextExperiments.map((exp, idx) => (
                <div key={idx} className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-200 flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-sky-300 mr-1.5">Exp #{idx + 1}:</span>
                    <span>{exp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Markdown Viewer */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-slate-300">
                <FileText className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-semibold">Weekly Synthesis (Markdown Format)</span>
              </div>
              <span className="text-xs text-slate-500">Generated: {new Date(report.generatedAt).toLocaleString()}</span>
            </div>

            <pre className="font-mono text-xs text-slate-300 bg-slate-950 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {report.markdownReport}
            </pre>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-500">
          No weekly report generated yet. Click &quot;Generate New Weekly Report&quot; to synthesize insights.
        </div>
      )}
    </div>
  );
}
