import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Send,
  AlertTriangle,
  Settings,
  Plus,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react';

interface CalendarSlotDto {
  date: string;
  timeWindow: string;
  targetDateTime: string;
  item?: {
    id: string;
    text: string;
    status: string;
    format: string;
    topicPillar?: string;
  };
  isConflict: boolean;
  conflictReason?: string;
}

interface DayScheduleSummary {
  date: string;
  totalScheduled: number;
  maxAllowed: number;
  isOverLimit: boolean;
  slots: CalendarSlotDto[];
}

interface ApprovedDraft {
  _id: string;
  text: string;
  format: string;
  topicPillar?: string;
}

export function EditorialCalendarView() {
  const [days, setDays] = useState<DayScheduleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Configuration Modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configWindows, setConfigWindows] = useState<string[]>(['09:00', '13:00', '19:00']);
  const [newWindowTime, setNewWindowTime] = useState('');
  const [configMaxPosts, setConfigMaxPosts] = useState(3);
  const [savingConfig, setSavingConfig] = useState(false);

  // Assign Slot Modal state
  const [assignTargetSlot, setAssignTargetSlot] = useState<CalendarSlotDto | null>(null);
  const [approvedDrafts, setApprovedDrafts] = useState<ApprovedDraft[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchSlots = () => {
    setLoading(true);
    fetch('/api/calendar/slots?days=7')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDays(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchSettings = () => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.preferredWindows && Array.isArray(data.preferredWindows)) {
          setConfigWindows(data.preferredWindows);
        }
        if (typeof data.maxPostsPerDay === 'number') {
          setConfigMaxPosts(data.maxPostsPerDay);
        }
      })
      .catch(() => {});
  };

  const fetchApprovedDrafts = () => {
    fetch('/api/content/items?status=approved')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setApprovedDrafts(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchSlots();
    fetchSettings();
  }, []);

  const handleOpenAssignModal = (slot: CalendarSlotDto) => {
    setAssignTargetSlot(slot);
    fetchApprovedDrafts();
  };

  const handleAssignDraft = async (draftId: string) => {
    if (!assignTargetSlot) return;
    setAssignLoading(true);
    try {
      const res = await fetch('/api/calendar/assign-slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xgrowth-csrf': '1',
        },
        body: JSON.stringify({
          contentItemId: draftId,
          scheduledFor: assignTargetSlot.targetDateTime,
        }),
      });
      if (res.ok) {
        setAssignTargetSlot(null);
        fetchSlots();
      }
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassignSlot = async (itemId: string) => {
    try {
      const res = await fetch('/api/calendar/unassign-slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-xgrowth-csrf': '1',
        },
        body: JSON.stringify({ contentItemId: itemId }),
      });
      if (res.ok) {
        fetchSlots();
      }
    } catch {
      // ignore
    }
  };

  const handleAddWindow = () => {
    if (!newWindowTime || configWindows.includes(newWindowTime)) return;
    setConfigWindows([...configWindows, newWindowTime].sort());
    setNewWindowTime('');
  };

  const handleRemoveWindow = (win: string) => {
    setConfigWindows(configWindows.filter((w) => w !== win));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-xgrowth-csrf': '1',
        },
        body: JSON.stringify({
          preferredWindows: configWindows,
          maxPostsPerDay: configMaxPosts,
        }),
      });
      if (res.ok) {
        setShowConfigModal(false);
        fetchSlots();
      }
    } finally {
      setSavingConfig(false);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (dateStr === tomorrow) return 'Tomorrow';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Editorial Publishing Calendar</h1>
          <p className="text-sm text-slate-400">Scheduled queue windows, target publication slots, and conflict guards</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Settings className="w-3.5 h-3.5 text-sky-400" />
            <span>Configure Slots ({configWindows.join(', ')})</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          Loading publishing calendar slots...
        </div>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <div key={day.date} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4 text-sky-400" />
                    <span className="text-base font-bold text-white">
                      {formatDisplayDate(day.date)}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">({day.date})</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      day.isOverLimit
                        ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Scheduled: {day.totalScheduled} / {day.maxAllowed} Max
                  </span>
                </div>
              </div>

              {/* Day Limit Conflict Warning Banner */}
              {day.isOverLimit && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg flex items-center space-x-2 text-xs text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    Warning: Scheduled posts on this day exceed the configured maximum limit of {day.maxAllowed} posts per day.
                  </span>
                </div>
              )}

              {/* Slots List */}
              <div className="grid grid-cols-1 gap-3">
                {day.slots.map((slot, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition ${
                      slot.isConflict
                        ? 'bg-amber-950/20 border-amber-800/80'
                        : slot.item
                        ? 'bg-slate-950 border-slate-800'
                        : 'bg-slate-950/50 border-dashed border-slate-800'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {slot.timeWindow} UTC
                        </span>

                        {slot.isConflict && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 font-medium flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>{slot.conflictReason}</span>
                          </span>
                        )}
                      </div>

                      {slot.item ? (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 font-semibold border border-slate-700">
                              {slot.item.status.toUpperCase()}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">
                              {slot.item.topicPillar || 'Technical'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-200 line-clamp-2">{slot.item.text}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">Slot open and unassigned.</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {slot.item ? (
                        <>
                          <span className="text-xs font-semibold px-2.5 py-1 bg-sky-950 text-sky-400 border border-sky-800 rounded-lg flex items-center space-x-1">
                            <Send className="w-3 h-3" />
                            <span>Buffer Synced</span>
                          </span>
                          <button
                            onClick={() => handleUnassignSlot(slot.item!.id)}
                            className="text-xs text-slate-400 hover:text-rose-400 underline px-2 py-1"
                          >
                            Unassign
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenAssignModal(slot)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Assign Draft</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Window / Capacity Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-semibold text-white">Publishing Schedule Settings</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Max Posts Per Day
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={configMaxPosts}
                  onChange={(e) => setConfigMaxPosts(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Triggers visual conflict warnings if more posts are queued on a single day.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Preferred Time Windows (UTC)
                </label>
                <div className="space-y-2 mb-3">
                  {configWindows.map((win) => (
                    <div
                      key={win}
                      className="flex items-center justify-between px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                    >
                      <span>{win} UTC</span>
                      {configWindows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveWindow(win)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="time"
                    value={newWindowTime}
                    onChange={(e) => setNewWindowTime(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddWindow}
                    disabled={!newWindowTime}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold rounded-lg disabled:opacity-40"
                  >
                    Add Window
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow disabled:opacity-50"
                >
                  {savingConfig ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Draft Modal */}
      {assignTargetSlot && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-semibold text-white">
                  Assign Draft to {assignTargetSlot.date} at {assignTargetSlot.timeWindow} UTC
                </h3>
              </div>
              <button
                onClick={() => setAssignTargetSlot(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select an approved draft snapshot to schedule into this publication window:
            </p>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
              {approvedDrafts.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs italic">
                  No approved drafts available. Review and approve drafts in the Review Queue first.
                </div>
              ) : (
                approvedDrafts.map((draft) => (
                  <div
                    key={draft._id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                          {draft.format}
                        </span>
                        <span className="text-xs text-slate-400 truncate">
                          {draft.topicPillar || 'Technical'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 line-clamp-2">{draft.text}</p>
                    </div>

                    <button
                      onClick={() => handleAssignDraft(draft._id)}
                      disabled={assignLoading}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shrink-0 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                      <span>Select</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
