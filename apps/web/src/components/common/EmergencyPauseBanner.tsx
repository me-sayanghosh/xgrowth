import { useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { AlertTriangle, Play, Pause } from 'lucide-react';

export function EmergencyPauseBanner() {
  const { globalPause, setGlobalPause, apiFetch } = useApp();
  const [loading, setLoading] = useState(false);

  const togglePause = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/settings/emergency-pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paused: !globalPause }),
      });
      const data = await res.json();
      if (data.success) {
        setGlobalPause(data.globalPause);
      }
    } catch {
      // Fallback local toggle
      setGlobalPause(!globalPause);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`mb-6 p-4 rounded-xl border flex items-center justify-between transition-all ${
        globalPause
          ? 'bg-amber-950/40 border-amber-600/50 text-amber-200'
          : 'bg-emerald-950/30 border-emerald-600/40 text-emerald-200'
      }`}
    >
      <div className="flex items-center space-x-3">
        {globalPause ? (
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
        ) : (
          <Play className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        )}
        <div>
          <span className="font-semibold text-sm">
            {globalPause ? 'Global Emergency Pause is ACTIVE' : 'System Publishing is LIVE'}
          </span>
          <p className="text-xs opacity-80">
            {globalPause
              ? 'External Buffer submissions are blocked. Local drafting and research remain active.'
              : 'Approved posts can be dispatched to connected Buffer channels.'}
          </p>
        </div>
      </div>

      <button
        onClick={togglePause}
        disabled={loading}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm ${
          globalPause
            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            : 'bg-rose-600 hover:bg-rose-500 text-white'
        }`}
      >
        {globalPause ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        <span>{globalPause ? 'Resume Live Publishing' : 'Activate Emergency Pause'}</span>
      </button>
    </div>
  );
}
