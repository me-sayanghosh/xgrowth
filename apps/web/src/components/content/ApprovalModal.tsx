import { useState, useEffect } from 'react';
import { Check, X, ShieldCheck, Hash } from 'lucide-react';

interface ApprovalModalProps {
  item: {
    _id: string;
    text: string;
    format: string;
    topicPillar?: string;
    threadParts?: string[];
  };
  onClose: () => void;
  onApproved: () => void;
}

export function ApprovalModal({ item, onClose, onApproved }: ApprovalModalProps) {
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/buffer/channels')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setChannels(data);
          setSelectedChannel(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content/items/${item._id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-xgrowth-csrf': '1' },
        body: JSON.stringify({ channelId: selectedChannel }),
      });
      const data = await res.json();
      if (data.success) {
        onApproved();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="font-bold text-white text-lg">Approve Content Snapshot</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-sm text-slate-200">
          <p className="font-mono text-xs text-slate-400 mb-1">SNAPSHOT PREVIEW:</p>
          <p>{item.text}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Target Publishing Channel
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
            {channels.length === 0 && <option value="default-chan">Default X Channel</option>}
          </select>
        </div>

        <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
          <div className="flex items-center space-x-1.5 font-semibold text-sky-400">
            <Hash className="w-3.5 h-3.5" />
            <span>Cryptographic Invariant:</span>
          </div>
          <p>
            An immutable SHA-256 hash will be calculated over this exact text snapshot. Any future edit will automatically invalidate this approval.
          </p>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? 'Approving...' : 'Confirm & Lock Hash'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
