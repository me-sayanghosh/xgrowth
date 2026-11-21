import { useState, useEffect } from 'react';
import { Check, X, ShieldAlert } from 'lucide-react';
import { ApprovalModal } from '../components/content/ApprovalModal.js';

interface ContentItem {
  _id: string;
  status: string;
  format: string;
  text: string;
  topicPillar?: string;
  qualityFlags?: string[];
  riskFlags?: string[];
  contentHash?: string;
}

export function ReviewQueueView() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [editedText, setEditedText] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const fetchItems = () => {
    fetch('/api/content/items?status=needs_review')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setItems(data);
          if (data.length > 0 && !selectedItem) {
            setSelectedItem(data[0]);
            setEditedText(data[0].text);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSelect = (item: ContentItem) => {
    setSelectedItem(item);
    setEditedText(item.text);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    const res = await fetch(`/api/content/items/${selectedItem._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-xgrowth-csrf': '1' },
      body: JSON.stringify({ text: editedText }),
    });
    const updated = await res.json();
    setSelectedItem(updated);
    fetchItems();
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    await fetch(`/api/content/items/${selectedItem._id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-xgrowth-csrf': '1' },
      body: JSON.stringify({ reason: 'Rejected from queue' }),
    });
    setSelectedItem(null);
    fetchItems();
  };

  const charLength = editedText.length;
  const isOverLimit = charLength > 280;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Review &amp; Approval Queue</h1>
        <p className="text-sm text-slate-400">Review generated drafts, inspect character counts, and approve snapshots</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Queue List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Review ({items.length})</h2>
          {items.map((item) => (
            <div
              key={item._id}
              onClick={() => handleSelect(item)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedItem?._id === item._id
                  ? 'bg-slate-800 border-sky-500 shadow-sm'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                {item.format}
              </span>
              <p className="mt-2 text-sm text-slate-200 line-clamp-3">{item.text}</p>
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-500 text-sm">
              Review queue is empty!
            </div>
          )}
        </div>

        {/* Right: Split-Pane Editor */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          {selectedItem ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 bg-sky-950 text-sky-400 border border-sky-800 rounded-full">
                  {selectedItem.topicPillar || 'Technical Post'}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    isOverLimit
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  {charLength}/280 chars
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Draft Content
                </label>
                <textarea
                  rows={6}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Quality & Risk Warnings */}
              {selectedItem.riskFlags && selectedItem.riskFlags.length > 0 && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-300">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Policy & Quality Warnings:</span>
                  </div>
                  {selectedItem.riskFlags.map((flag, idx) => (
                    <p key={idx} className="text-xs text-rose-200 pl-5">• {flag}</p>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-rose-900/40 hover:bg-rose-800 text-rose-300 rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setShowApprovalModal(true)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Draft</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-slate-500">
              Select an item from the queue to review and approve.
            </div>
          )}
        </div>
      </div>

      {showApprovalModal && selectedItem && (
        <ApprovalModal
          item={{ ...selectedItem, text: editedText }}
          onClose={() => setShowApprovalModal(false)}
          onApproved={() => {
            setShowApprovalModal(false);
            setSelectedItem(null);
            fetchItems();
          }}
        />
      )}
    </div>
  );
}
