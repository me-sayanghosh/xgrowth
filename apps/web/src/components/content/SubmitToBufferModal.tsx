import { useState, useEffect } from 'react';
import { Send, X, RefreshCw, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';

interface SubmitToBufferModalProps {
  item: {
    _id: string;
    text: string;
    scheduledFor?: string;
    buffer?: {
      channelId?: string;
    };
  };
  onClose: () => void;
  onSubmitted: () => void;
}

export function SubmitToBufferModal({ item, onClose, onSubmitted }: SubmitToBufferModalProps) {
  const { globalPause, apiFetch } = useApp();
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedChannel, setSelectedChannel] = useState(item.buffer?.channelId || '');
  const [schedulingType, setSchedulingType] = useState<'addToQueue' | 'scheduled' | 'publishNow'>(
    item.scheduledFor ? 'scheduled' : 'addToQueue',
  );
  const [dueAt, setDueAt] = useState(
    item.scheduledFor ? new Date(item.scheduledFor).toISOString().slice(0, 16) : '',
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/buffer/channels')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setChannels(data);
          if (!selectedChannel) {
            setSelectedChannel(data[0].id);
          }
        }
      })
      .catch(() => {});
  }, [apiFetch, selectedChannel]);

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const payload: Record<string, unknown> = {
        contentItemId: item._id,
        channelId: selectedChannel || 'mock-channel-x-01',
        schedulingType,
      };
      if (schedulingType === 'scheduled' && dueAt) {
        payload.dueAt = new Date(dueAt).toISOString();
      }

      const res = await apiFetch('/api/buffer/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Buffer submission failed.');
        return;
      }
      onSubmitted();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Network error submitting to Buffer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-sky-400">
            <Send className="w-5 h-5" />
            <h3 className="font-bold text-white text-lg">Dispatch Approved Post to Buffer</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {globalPause && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg flex items-start space-x-2 text-xs text-rose-200">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>
              Global Emergency Pause is currently <strong>ACTIVE</strong>. Disable the pause banner at the top of the screen before dispatching to Buffer.
            </span>
          </div>
        )}

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-sm text-slate-200 max-h-32 overflow-y-auto">
          {item.text}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Target X Channel
            </label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {channels.length === 0 && <option value="mock-channel-x-01">Default X Channel</option>}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Buffer Scheduling Mode
            </label>
            <select
              value={schedulingType}
              onChange={(e) => setSchedulingType(e.target.value as 'addToQueue' | 'scheduled' | 'publishNow')}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="addToQueue">Add to Buffer Queue (Next Available Slot)</option>
              <option value="scheduled">Custom Scheduled Timestamp</option>
              <option value="publishNow">Share Now (Immediate Publish)</option>
            </select>
          </div>

          {schedulingType === 'scheduled' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Target Date &amp; Time (Local)
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || globalPause || (schedulingType === 'scheduled' && !dueAt)}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md disabled:opacity-40"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{loading ? 'Dispatching...' : 'Submit to Buffer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
