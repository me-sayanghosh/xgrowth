import React, { useState } from 'react';
import { Sparkles, ArrowRight, Lightbulb, MessageSquareQuote, Check, X, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext.js';

interface HookItem {
  hook: string;
  style: string;
  charCount: number;
}

interface CtaItem {
  cta: string;
  type: string;
  charCount: number;
}

export function ContentStudioView() {
  const { setActiveView } = useApp();
  const [topic, setTopic] = useState('');
  const [pillar, setPillar] = useState('Backend and full-stack development');
  const [format, setFormat] = useState('single_post');
  const [language, setLanguage] = useState<'en' | 'bn' | 'mixed'>('en');
  const [facts, setFacts] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Hook Generator state
  const [showHookModal, setShowHookModal] = useState(false);
  const [hooksLoading, setHooksLoading] = useState(false);
  const [generatedHooks, setGeneratedHooks] = useState<HookItem[]>([]);
  const [copiedHookIndex, setCopiedHookIndex] = useState<number | null>(null);

  // CTA Recommender state
  const [showCtaModal, setShowCtaModal] = useState(false);
  const [ctasLoading, setCtasLoading] = useState(false);
  const [suggestedCtas, setSuggestedCtas] = useState<CtaItem[]>([]);
  const [copiedCtaIndex, setCopiedCtaIndex] = useState<number | null>(null);

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
          language,
          verifiedFacts: factList.length > 0 ? factList : [`Key development in ${topic}`],
          variantCount: 2,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Generated ${data.count} drafts in the Review Queue!`);
        setTimeout(() => setActiveView('queue'), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFetchHooks = async () => {
    if (!topic.trim()) return;
    setHooksLoading(true);
    setShowHookModal(true);
    try {
      const res = await fetch('/api/content/hooks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xgrowth-csrf': '1',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          pillar,
          language,
          count: 4,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.hooks)) {
        setGeneratedHooks(data.hooks);
      }
    } catch {
      // ignore
    } finally {
      setHooksLoading(false);
    }
  };

  const handleFetchCtas = async () => {
    if (!topic.trim()) return;
    setCtasLoading(true);
    setShowCtaModal(true);
    try {
      const res = await fetch('/api/content/cta/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xgrowth-csrf': '1',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          format,
          language,
          count: 4,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.ctas)) {
        setSuggestedCtas(data.ctas);
      }
    } catch {
      // ignore
    } finally {
      setCtasLoading(false);
    }
  };

  const insertHookIntoFacts = (hookText: string, index: number) => {
    setFacts((prev) => (prev ? `Hook: ${hookText}\n\n${prev}` : `Hook: ${hookText}`));
    setCopiedHookIndex(index);
    setTimeout(() => {
      setCopiedHookIndex(null);
      setShowHookModal(false);
    }, 600);
  };

  const appendCtaToFacts = (ctaText: string, index: number) => {
    setFacts((prev) => (prev ? `${prev}\nCTA: ${ctaText}` : `CTA: ${ctaText}`));
    setCopiedCtaIndex(index);
    setTimeout(() => {
      setCopiedCtaIndex(null);
      setShowCtaModal(false);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Content Studio</h1>
          <p className="text-sm text-slate-400">Generate grounded technical posts in your authentic developer voice</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={!topic.trim()}
            onClick={handleFetchHooks}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800 text-xs font-semibold disabled:opacity-40 transition"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Generate Hooks</span>
          </button>
          <button
            type="button"
            disabled={!topic.trim()}
            onClick={handleFetchCtas}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800 text-xs font-semibold disabled:opacity-40 transition"
          >
            <MessageSquareQuote className="w-3.5 h-3.5" />
            <span>Suggest CTAs</span>
          </button>
        </div>
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
            placeholder="e.g. Node.js 24 Web Crypto performance gains & backpressure"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Topic Pillar
            </label>
            <select
              value={pillar}
              onChange={(e) => setPillar(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="Backend and full-stack development">Backend and full-stack</option>
              <option value="React, Node.js, JavaScript and TypeScript">React, Node.js & TypeScript</option>
              <option value="AI tools and practical AI engineering">AI Engineering & Agents</option>
              <option value="Building in public">Building in public</option>
              <option value="System Architecture & Resilience">System Architecture</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Content Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="single_post">Single Post (≤280 chars)</option>
              <option value="educational_tip">Educational Tip</option>
              <option value="build_in_public">Build In Public Update</option>
              <option value="opinion_with_reasoning">Technical Opinion & Trade-offs</option>
              <option value="thread_draft">Multi-Tweet Thread (3-5 tweets)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Language Target
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="en">English (Default)</option>
              <option value="bn">Bengali (বাংলা)</option>
              <option value="mixed">Mixed English & Bengali</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Verified Facts & Context (One per line)
            </label>
            <span className="text-[11px] text-slate-500">Zero hallucinations — ground claims in sources</span>
          </div>
          <textarea
            rows={5}
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            placeholder="- Stream pipelines now support native backpressure abort signals.&#10;- Benchmark shows 30% latency reduction in crypto hashes.&#10;- Production migration took 2 days without API breaking changes."
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
          className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-sm flex items-center justify-center space-x-2 transition-all shadow-md disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{loading ? 'Synthesizing Drafts...' : 'Generate AI Draft Variants'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Hook Generator Modal */}
      {showHookModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">Opening Hook Variants</h3>
              </div>
              <button
                onClick={() => setShowHookModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select an authentic engineering hook to prepend to your draft facts:
            </p>

            {hooksLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs animate-pulse">
                Generating technical hook variants for &quot;{topic}&quot;...
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
                {generatedHooks.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800 capitalize font-medium">
                        {h.style.replace('_', ' ')}
                      </span>
                      <span className="text-slate-500">{h.charCount} chars</span>
                    </div>
                    <p className="text-sm text-slate-200">{h.hook}</p>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => insertHookIntoFacts(h.hook, idx)}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
                      >
                        {copiedHookIndex === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Inserted!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Use Hook</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CTA Recommender Modal */}
      {showCtaModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <MessageSquareQuote className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-white">Suggested Discussion CTAs</h3>
              </div>
              <button
                onClick={() => setShowCtaModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Append a non-manipulative, technical discussion prompt to invite peer feedback:
            </p>

            {ctasLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs animate-pulse">
                Generating architectural CTAs for &quot;{topic}&quot;...
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
                {suggestedCtas.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800 capitalize font-medium">
                        {c.type.replace('_', ' ')}
                      </span>
                      <span className="text-slate-500">{c.charCount} chars</span>
                    </div>
                    <p className="text-sm text-slate-200">{c.cta}</p>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => appendCtaToFacts(c.cta, idx)}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                      >
                        {copiedCtaIndex === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Appended!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Append CTA</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
