import { useState, useEffect, useMemo } from 'react';
import { Check, X, ShieldAlert, Search, Eye, Edit3, AlertTriangle, Sparkles } from 'lucide-react';
import { ApprovalModal } from '../components/content/ApprovalModal.js';
import { XPostPreview } from '../components/content/XPostPreview.js';
import { ThreadVisualizer } from '../components/content/ThreadVisualizer.js';

interface ContentItem {
  _id: string;
  status: string;
  format: string;
  text: string;
  threadParts?: string[];
  topicPillar?: string;
  qualityFlags?: string[];
  riskFlags?: string[];
  contentHash?: string;
}

type StatusFilter = 'needs_review' | 'approved' | 'rejected' | 'all';
type ViewMode = 'editor' | 'preview';

const BANNED_BUZZWORDS = [
  'game-changer',
  'mind-blowing',
  'revolutionize',
  'secret sauce',
  '10x developer',
  'growth hack',
  'cheat code',
  'passive income',
];

const ENGAGEMENT_BAIT_PHRASES = [
  'like if you agree',
  'repost to share',
  'rt if',
  'comment below for',
  'drop a comment',
  'follow me for more',
];

export function ReviewQueueView() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [editedText, setEditedText] = useState('');
  const [editedThreadParts, setEditedThreadParts] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('needs_review');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchItems = () => {
    const url = statusFilter === 'all' ? '/api/content/items' : `/api/content/items?status=${statusFilter}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setItems(data);
          if (data.length > 0) {
            setSelectedItem(data[0]);
            setEditedText(data[0].text);
            setEditedThreadParts(data[0].threadParts || []);
          } else {
            setSelectedItem(null);
            setEditedText('');
            setEditedThreadParts([]);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchItems();
  }, [statusFilter]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.text.toLowerCase().includes(q) ||
        (item.topicPillar && item.topicPillar.toLowerCase().includes(q)) ||
        item.format.toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  const handleSelect = (item: ContentItem) => {
    setSelectedItem(item);
    setEditedText(item.text);
    setEditedThreadParts(item.threadParts || []);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    const payload: { text: string; threadParts?: string[] } = { text: editedText };
    if (selectedItem.format === 'thread_draft' || editedThreadParts.length > 0) {
      payload.threadParts = editedThreadParts;
    }
    const res = await fetch(`/api/content/items/${selectedItem._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-xgrowth-csrf': '1' },
      body: JSON.stringify(payload),
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

  // Real-time Tone Linter
  const liveLinter = useMemo(() => {
    const textLower = editedText.toLowerCase();
    const detectedBuzzwords = BANNED_BUZZWORDS.filter((word) => textLower.includes(word));
    const detectedBait = ENGAGEMENT_BAIT_PHRASES.filter((phrase) => textLower.includes(phrase));
    const isOverLimit = editedText.length > 280;
    const warnings: string[] = [];

    if (isOverLimit && selectedItem?.format !== 'thread_draft') {
      warnings.push(`Post exceeds 280 characters (${editedText.length} chars). It will fail X publishing validation.`);
    }
    if (detectedBuzzwords.length > 0) {
      warnings.push(`Avoided buzzword detected: "${detectedBuzzwords.join(', ')}". Replace with technical substance.`);
    }
    if (detectedBait.length > 0) {
      warnings.push(`Engagement bait detected: "${detectedBait.join(', ')}". Prohibited under platform conduct policy.`);
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      charCount: editedText.length,
      isOverLimit,
    };
  }, [editedText, selectedItem]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Review &amp; Approval Queue</h1>
          <p className="text-sm text-slate-400">Review generated drafts, inspect character counts, and approve snapshots</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {(['needs_review', 'approved', 'rejected', 'all'] as StatusFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === tab
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Queue List with Search */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search drafts by text or pillar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold uppercase tracking-wider">
            <span>Drafts ({filteredItems.length})</span>
            {statusFilter !== 'all' && <span>Filter: {statusFilter.replace('_', ' ')}</span>}
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <div
                key={item._id}
                onClick={() => handleSelect(item)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedItem?._id === item._id
                    ? 'bg-slate-800 border-sky-500 shadow-sm'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                    {item.format}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                      item.status === 'approved'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : item.status === 'rejected'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-200 line-clamp-3">{item.text}</p>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-500 text-sm">
                No drafts found matching filter criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right: Split-Pane Editor & Live Preview */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          {selectedItem ? (
            <>
              {/* Header with Topic Pillar and View Mode Switcher */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold px-2.5 py-1 bg-sky-950 text-sky-400 border border-sky-800 rounded-full">
                    {selectedItem.topicPillar || 'Technical Post'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Format: {selectedItem.format}
                  </span>
                </div>

                <div className="flex items-center space-x-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setViewMode('editor')}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                      viewMode === 'editor' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                      viewMode === 'preview' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live X Preview</span>
                  </button>
                </div>
              </div>

              {/* View Mode Content */}
              {viewMode === 'editor' ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Draft Content
                      </label>
                      <span
                        className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                          liveLinter.isOverLimit
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {liveLinter.charCount}/280 chars
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Thread parts editor if thread format */}
                  {(selectedItem.format === 'thread_draft' || editedThreadParts.length > 0) && (
                    <ThreadVisualizer
                      parts={editedThreadParts.length > 0 ? editedThreadParts : [editedText]}
                      onChange={(parts) => setEditedThreadParts(parts)}
                    />
                  )}
                </div>
              ) : (
                <div className="py-2 flex justify-center">
                  {selectedItem.format === 'thread_draft' || editedThreadParts.length > 1 ? (
                    <ThreadVisualizer
                      parts={editedThreadParts.length > 0 ? editedThreadParts : [editedText]}
                      onChange={(parts) => setEditedThreadParts(parts)}
                      readOnly
                    />
                  ) : (
                    <XPostPreview text={editedText} />
                  )}
                </div>
              )}

              {/* In-Line Real-Time Tone Linter Banner */}
              {!liveLinter.isValid ? (
                <div className="p-3 bg-amber-950/40 border border-amber-800 rounded-lg space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Live Quality &amp; Tone Warnings:</span>
                  </div>
                  {liveLinter.warnings.map((warn, i) => (
                    <p key={i} className="text-xs text-amber-200 pl-5">
                      • {warn}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-950/30 border border-emerald-900/60 rounded-lg flex items-center space-x-2 text-xs text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Quality Check Passed: Complies with brand voice and character constraints.</span>
                </div>
              )}

              {/* Stored Risk Flags if any */}
              {selectedItem.riskFlags && selectedItem.riskFlags.length > 0 && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-300">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Original Generation Risk Flags:</span>
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
                  disabled={selectedItem.status === 'rejected'}
                  className="px-4 py-2 bg-rose-900/40 hover:bg-rose-800 text-rose-300 rounded-lg text-xs font-semibold flex items-center space-x-1 disabled:opacity-40"
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
                  {selectedItem.status !== 'approved' && (
                    <button
                      onClick={() => setShowApprovalModal(true)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Draft</span>
                    </button>
                  )}
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
          item={{ ...selectedItem, text: editedText, threadParts: editedThreadParts }}
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
