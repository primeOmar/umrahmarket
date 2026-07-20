import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Flag, Search, RefreshCw, Loader, X, AlertTriangle, CheckCircle,
  Clock, Mail, User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

/**
 * ComplaintsTab — superadmin view for complaints ("Complains") raised by
 * clients, agents, or public visitors.
 *
 * Complaint shape expected from the backend:
 *   { id, name, email, role ('client'|'agent'|'visitor'), subject, message,
 *     status ('open'|'in_progress'|'resolved'), createdAt,
 *     resolutionNotes, resolvedAt, resolvedBy }
 *
 * BACKEND endpoints (TODO — implement in superadmin_routes.js):
 *   GET  /superadmin/complaints
 *   POST /superadmin/complaints/:id/status   { status, notes }
 *     -> should persist notes + resolvedAt/resolvedBy and audit-log the action
 *
 * Until those exist, the tab shows a friendly "backend not wired" notice.
 * Token refresh is owned by the main dashboard's saFetch; here a 401
 * simply bounces to the superadmin login.
 */

// ─── API base + superadmin-scoped fetch (self-contained) ─────────────────────
const _base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const BASE_API = _base.endsWith('/api') ? _base : `${_base}/api`;

const cFetch = async (url, options = {}) => {
  const res = await fetch(`${BASE_API}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${localStorage.getItem('superadmin_token')}`,
    },
  });
  if (res.status === 401) {
    window.location.href = '/superadmin/login';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

// ─── Small presentational helpers ────────────────────────────────────────────
const STATUS_META = {
  open:        { label: 'Open',        cls: 'bg-red-100 text-red-700' },
  in_progress: { label: 'In Progress', cls: 'bg-yellow-100 text-yellow-800' },
  resolved:    { label: 'Resolved',    cls: 'bg-green-100 text-green-700' },
};

const ComplaintStatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || { label: status || '—', cls: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}>{meta.label}</span>;
};

const RoleBadge = ({ role }) => {
  const map = {
    client:  'bg-blue-100 text-blue-700',
    agent:   'bg-purple-100 text-purple-700',
    visitor: 'bg-gray-100 text-gray-600',
  };
  if (!role) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${map[role] || map.visitor}`}>
      {role}
    </span>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────
const ComplaintsTab = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [selected, setSelected] = useState(null); // complaint object or null
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cFetch('/superadmin/complaints');
      setComplaints(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const counts = useMemo(() => ({
    open: complaints.filter(c => c.status === 'open').length,
    in_progress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  }), [complaints]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return complaints.filter(c => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (!q) return true;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q) ||
        c.message?.toLowerCase().includes(q)
      );
    });
  }, [complaints, search, filterStatus]);

  const openComplaint = (c) => {
    setSelected(c);
    setNotes(c.resolutionNotes || '');
  };

  const closeModal = () => { setSelected(null); setNotes(''); };

  const updateStatus = async (status) => {
    if (!selected) return;
    if (status === 'resolved' && !notes.trim()) {
      toast.error('Add resolution notes before marking as resolved');
      return;
    }
    setActionLoading(true);
    try {
      await cFetch(`/superadmin/complaints/${selected.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, notes: notes.trim() }),
      });
      toast.success(
        status === 'resolved' ? 'Complaint resolved'
        : status === 'in_progress' ? 'Marked as in progress'
        : 'Complaint reopened'
      );
      closeModal();
      fetchComplaints();
    } catch (e) {
      toast.error(e.message || 'Failed to update complaint');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complains</h1>
          <p className="text-sm text-gray-500 mt-1">
            {counts.open} open · {counts.in_progress} in progress · {counts.resolved} resolved
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search complains…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <button
            onClick={fetchComplaints}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Could not load complains: {error}</p>
            <p className="text-xs mt-1">
              If the backend route <code>/superadmin/complaints</code> is not implemented yet, this is expected —
              the tab will work as soon as it is.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 flex items-center justify-center">
          <Loader className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => openComplaint(c)}
              className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow w-full"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Flag className={`h-4 w-4 flex-shrink-0 ${c.status === 'resolved' ? 'text-green-500' : 'text-red-500'}`} />
                    <p className="font-semibold text-gray-900 truncate">{c.subject || 'No subject'}</p>
                    <RoleBadge role={c.role} />
                  </div>
                  <p className="text-sm text-gray-600 mt-1.5 line-clamp-2 whitespace-pre-wrap">{c.message}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {c.name || 'Anonymous'}</span>
                    {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {c.createdAt ? formatDistanceToNow(new Date(c.createdAt)) + ' ago' : '—'}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <ComplaintStatusBadge status={c.status} />
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && !error && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-sm text-gray-400">
                {search || filterStatus !== 'all' ? 'No complains match your filters' : 'No complains — all quiet!'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Detail / resolve modal ── */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Complain Details</h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-5rem)] space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-600">From</p>
                    <p className="text-base font-semibold text-gray-900">{selected.name || 'Anonymous'}</p>
                    {selected.email && <p className="text-sm text-gray-500">{selected.email}</p>}
                  </div>
                  <div className="text-right space-y-1">
                    <ComplaintStatusBadge status={selected.status} />
                    <div><RoleBadge role={selected.role} /></div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Received {selected.createdAt ? format(new Date(selected.createdAt), 'MMM d, yyyy HH:mm') : '—'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Subject</p>
                <p className="text-sm text-gray-900 bg-gray-50 rounded-lg px-3 py-2">{selected.subject || '—'}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Message</p>
                <p className="text-sm text-gray-900 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{selected.message}</p>
              </div>

              {selected.status === 'resolved' && selected.resolvedAt && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800 flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Resolved on {format(new Date(selected.resolvedAt), 'MMM d, yyyy HH:mm')}
                    {selected.resolvedBy ? ` by ${selected.resolvedBy}` : ''}.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution notes {selected.status !== 'resolved' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="What was done to address this complain…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button onClick={closeModal} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Close
                </button>
                {selected.status !== 'in_progress' && selected.status !== 'resolved' && (
                  <button
                    onClick={() => updateStatus('in_progress')}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading && <Loader className="h-4 w-4 animate-spin" />} Mark In Progress
                  </button>
                )}
                {selected.status !== 'resolved' ? (
                  <button
                    onClick={() => updateStatus('resolved')}
                    disabled={actionLoading || !notes.trim()}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Resolve
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatus('open')}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading && <Loader className="h-4 w-4 animate-spin" />} Reopen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsTab;