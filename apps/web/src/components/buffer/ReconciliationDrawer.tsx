import { useState } from 'react';
import { AlertCircle, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface ReconciliationDrawerProps {
  contentItemId: string;
  onClose: () => void;
  onReconciled: () => void;
}

export function ReconciliationDrawer({ contentItemId, onClose, onReconciled }: ReconciliationDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleReconcile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/buffer/reconcile/${contentItemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-xgrowth-csrf': '1' },
      });
      const data = await res.json();
      if (data.success) {
        setResult(`Reconciliation resolved status to: ${data.item.status}`);
        setTimeout(() => onReconciled(), 1500);
      } else {
        setResult('Could not ascertain status from provider.');
      }
    } catch (err) {
      setResult(`Reconciliation error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 shadow-2xl flex flex-col justify-between">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2 text-amber-400">
            <AlertCircle className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white">Submission Reconciliation</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-amber-950/40 border border-amber-800 rounded-xl space-y-2 text-xs text-amber-200">
          <div className="flex items-center space-x-1.5 font-bold text-amber-300">
            <ShieldAlert className="w-4 h-4" />
            <span>Ambiguous State Protection Active</span>
          </div>
          <p>
            This submission resulted in an unexpected timeout or ambiguous network response. To prevent accidental duplicate posts on X, automatic retry is locked until status is reconciled with Buffer.
          </p>
        </div>

        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1 text-slate-400">
          <p className="font-semibold text-slate-200">Content Item ID:</p>
          <p className="font-mono">{contentItemId}</p>
        </div>

        {result && (
          <div className="p-3 bg-slate-800 rounded-lg text-xs text-sky-300 border border-slate-700">
            {result}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={handleReconcile}
          disabled={loading}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Reconciling...' : 'Reconcile Status Now'}</span>
        </button>
      </div>
    </div>
  );
}
