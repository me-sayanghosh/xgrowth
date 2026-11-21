import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext.js';

export function ContentStudioView() {
  const { setActiveView } = useApp();
  const [topic, setTopic] = useState('');
  const [pillar, setPillar] = useState('Backend and full-stack development');
  const [format, setFormat] = useState('single_post');
  const [facts, setFacts] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    try {
      const factList = facts
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xgrowth-csrf': '1',
        },
        body: JSON.stringify({
          topic,
          topicPillar: pillar,
          format,
          verifiedFacts: factList.length > 0 ? factList : [`Key development in ${topic}`],
          variantCount: 2,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Generated ${data.count} drafts! They are ready in the Review Queue.`);
        setTimeout(() => setActiveView('queue'), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Content Studio</h1>
        <p className="text-sm text-slate-400">Generate grounded technical posts in the developer's voice</p>
      </div>

      <form onSubmit={handleGenerate} className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Topic Title
          </label>
          <input
            type="text"
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Node.js 24 Web Crypto performance gains"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Topic Pillar
            </label>
            <select
              value={pillar}
              onChange={(e) => setPillar(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="Backend and full-stack development">Backend and full-stack development</option>
              <option value="React, Node.js, JavaScript and TypeScript">React, Node.js, JavaScript and TypeScript</option>
              <option value="AI tools and practical AI engineering">AI tools and practical AI engineering</option>
              <option value="Building in public">Building in public</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Content Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="single_post">Single Post (≤280 chars)</option>
              <option value="educational_tip">Educational Tip</option>
              <option value="build_in_public">Build In Public Update</option>
              <option value="opinion_with_reasoning">Technical Opinion</option>
              <option value="thread_draft">Multi-Tweet Thread</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Verified Facts (One per line)
          </label>
          <textarea
            rows={4}
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            placeholder="- Stream pipelines now support native backpressure abort signals.&#10;- Benchmark shows 30% latency reduction in crypto hashes."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-700 rounded-lg text-emerald-300 text-sm">
            {successMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-sm flex items-center justify-center space-x-2 transition-all shadow-md"
        >
          <Sparkles className="w-4 h-4" />
          <span>{loading ? 'Synthesizing Drafts...' : 'Generate AI Draft Variants'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
