import { useState, useEffect } from 'react';
import { Save, Check } from 'lucide-react';
import { useApp } from '../context/AppContext.js';

export function SettingsView() {
  const { apiFetch } = useApp();
  const [pillars, setPillars] = useState<string>('');
  const [traits, setTraits] = useState<string>('');
  const [voiceAvoid, setVoiceAvoid] = useState<string>('');
  const [operationMode, setOperationMode] = useState<'review_everything' | 'approved_category_auto_submit' | 'full_auto_submit'>('review_everything');
  const [language, setLanguage] = useState<'en' | 'bn' | 'mixed'>('en');
  const [maxPostsPerDay, setMaxPostsPerDay] = useState<number>(3);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.brandPillars) setPillars(data.brandPillars.join('\n'));
        if (data.voiceTraits) setTraits(data.voiceTraits.join(', '));
        if (data.voiceAvoid) setVoiceAvoid(data.voiceAvoid.join(', '));
        if (data.operationMode) setOperationMode(data.operationMode);
        if (data.language) setLanguage(data.language);
        if (typeof data.maxPostsPerDay === 'number') setMaxPostsPerDay(data.maxPostsPerDay);
      })
      .catch(() => {});
  }, [apiFetch]);

  const handleSave = async () => {
    const brandPillars = pillars.split('\n').map((p) => p.trim()).filter(Boolean);
    const voiceTraits = traits.split(',').map((t) => t.trim()).filter(Boolean);
    const avoidList = voiceAvoid.split(',').map((t) => t.trim()).filter(Boolean);

    await apiFetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandPillars,
        voiceTraits,
        voiceAvoid: avoidList,
        operationMode,
        language,
        maxPostsPerDay,
      }),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Brand Voice &amp; System Settings</h1>
        <p className="text-sm text-slate-400">Configure core content pillars, automation mode, language, and publishing guards</p>
      </div>

      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Automation Mode
            </label>
            <select
              value={operationMode}
              onChange={(e) => setOperationMode(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="review_everything">Review Everything (Manual Submit)</option>
              <option value="approved_category_auto_submit">Auto-Submit Approved Pillars</option>
              <option value="full_auto_submit">Auto-Submit All Approved Drafts</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Default Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="en">English (en)</option>
              <option value="bn">Bengali (bn)</option>
              <option value="mixed">Mixed English &amp; Bengali</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Max Posts Per Day
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxPostsPerDay}
              onChange={(e) => setMaxPostsPerDay(parseInt(e.target.value, 10) || 1)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Configured Content Pillars (One per line)
          </label>
          <textarea
            rows={5}
            value={pillars}
            onChange={(e) => setPillars(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Brand Voice Traits (Comma separated)
          </label>
          <input
            type="text"
            value={traits}
            onChange={(e) => setTraits(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Phrases &amp; Buzzwords to Avoid (Comma separated)
          </label>
          <input
            type="text"
            value={voiceAvoid}
            onChange={(e) => setVoiceAvoid(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>

        <div className="pt-2 flex items-center justify-between">
          {saved ? (
            <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
              <Check className="w-4 h-4" />
              <span>Settings successfully persisted!</span>
            </span>
          ) : (
            <span />
          )}

          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
