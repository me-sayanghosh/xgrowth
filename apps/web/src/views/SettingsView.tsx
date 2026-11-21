import { useState, useEffect } from 'react';
import { Save, Check } from 'lucide-react';

export function SettingsView() {
  const [pillars, setPillars] = useState<string>('');
  const [traits, setTraits] = useState<string>('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.brandPillars) setPillars(data.brandPillars.join('\n'));
        if (data.voiceTraits) setTraits(data.voiceTraits.join(', '));
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    const brandPillars = pillars.split('\n').map((p) => p.trim()).filter(Boolean);
    const voiceTraits = traits.split(',').map((t) => t.trim()).filter(Boolean);

    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-xgrowth-csrf': '1' },
      body: JSON.stringify({ brandPillars, voiceTraits }),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Brand Voice &amp; System Settings</h1>
        <p className="text-sm text-slate-400">Configure core content pillars, stylistic parameters, and publishing guards</p>
      </div>

      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-5">
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
