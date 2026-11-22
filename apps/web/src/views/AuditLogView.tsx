import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, Search, Filter, AlertCircle, Download } from 'lucide-react';

interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

export function AuditLogView() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (actionFilter) params.append('action', actionFilter);
      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
        }
      }
    } catch {
      // Offline or network error
    } finally {
      setLoading(false);
    }
  }, [actionFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredEvents = events.filter((ev) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      ev.action.toLowerCase().includes(term) ||
      ev.actor.toLowerCase().includes(term) ||
      (ev.targetId && ev.targetId.toLowerCase().includes(term))
    );
  });

  const handleExportCsv = () => {
    const url = actionFilter
      ? `/api/audit-logs/export?action=${encodeURIComponent(actionFilter)}`
      : '/api/audit-logs/export';
    window.location.href = url;
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'APPROVAL_GRANTED':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'APPROVAL_INVALIDATED':
        return 'bg-rose-950 text-rose-400 border-rose-800';
      case 'BUFFER_SUBMISSION':
        return 'bg-sky-950 text-sky-400 border-sky-800';
      case 'PAUSE_TOGGLED':
        return 'bg-amber-950 text-amber-400 border-amber-800';
      case 'SETTINGS_UPDATED':
        return 'bg-purple-950 text-purple-400 border-purple-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-sky-400" />
            Security &amp; Audit Log
          </h1>
          <p className="text-sm text-slate-400">
            Immutable ledger tracking all approvals, invalidations, configuration changes, and external submissions.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by actor, target ID, or action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>
        <div className="relative w-full sm:w-64">
          <Filter className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">All Action Types</option>
            <option value="APPROVAL_GRANTED">APPROVAL_GRANTED</option>
            <option value="APPROVAL_INVALIDATED">APPROVAL_INVALIDATED</option>
            <option value="BUFFER_SUBMISSION">BUFFER_SUBMISSION</option>
            <option value="PAUSE_TOGGLED">PAUSE_TOGGLED</option>
            <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
            <option value="CONTENT_CREATED">CONTENT_CREATED</option>
            <option value="CONTENT_EDITED">CONTENT_EDITED</option>
            <option value="CONTENT_REJECTED">CONTENT_REJECTED</option>
          </select>
        </div>
      </div>

      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-slate-600" />
                      <span>No audit records found matching criteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-850 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-slate-400">
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs border font-medium ${getActionBadgeColor(ev.action)}`}>
                        {ev.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-slate-300">
                      {ev.actor}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-400">
                      {ev.targetId ? (
                        <span>
                          <span className="text-slate-500">{ev.targetType || 'target'}:</span>{' '}
                          <span className="font-mono text-slate-300">{ev.targetId.slice(0, 12)}...</span>
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-400 max-w-xs truncate">
                      {ev.metadata && Object.keys(ev.metadata).length > 0 ? (
                        JSON.stringify(ev.metadata)
                      ) : (
                        <span className="text-slate-600">none</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
