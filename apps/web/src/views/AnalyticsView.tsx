import { useState, useEffect } from 'react';
import { Sparkles, FileText, BarChart2 } from 'lucide-react';

interface Report {
  id: string;
  markdownReport: string;
  generatedAt: string;
  whatWorked: string[];
  nextExperiments: string[];
}

export function AnalyticsView() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReports = () => {
    fetch('/api/analytics/reports')
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
      const res = await fetch('/api/analytics/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-xgrowth-csrf': '1' },
      });
      const data = await res.json();
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics &amp; Weekly Insights</h1>
          <p className="text-sm text-slate-400">Auditable, evidence-backed content performance without fabricated metrics</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold"
        >
          <Sparkles className="w-4 h-4" />
          <span>{loading ? 'Synthesizing Report...' : 'Generate New Weekly Report'}</span>
        </button>
      </div>

      {report ? (
        <div className="space-y-6">
          {/* Actionable Experiments Banner */}
          <div className="p-5 bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-800/60 rounded-xl space-y-3">
            <h2 className="text-sm font-bold text-sky-300 flex items-center space-x-2">
              <BarChart2 className="w-4 h-4" />
              <span>Recommended Next Week Content Experiments</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.nextExperiments.map((exp, idx) => (
                <div key={idx} className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-200">
                  <span className="font-bold text-sky-400 mr-1.5">Exp #{idx + 1}:</span>
                  <span>{exp}</span>
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
          No weekly report generated yet. Click "Generate New Weekly Report" to synthesize insights.
        </div>
      )}
    </div>
  );
}
