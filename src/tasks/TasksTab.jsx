import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ClipboardList, Plus, X, Clock, AlertTriangle, CheckCircle2, Circle,
  Bell, Trash2, UserPlus, UserMinus, Loader, RotateCcw, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow, isPast } from 'date-fns';

// ─── API (mirrors the dashboard's saFetch/token pattern; self-contained so
// this file can be dropped in without importing internals from the parent) ──
const _base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const BASE_API = _base.endsWith('/api') ? _base : `${_base}/api`;

const tFetch = async (url, options = {}) => {
  const token = localStorage.getItem('superadmin_token');
  const res = await fetch(`${BASE_API}/superadmin/tasks${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
};
const tApi = {
  get: (url) => tFetch(url),
  post: (url, body) => tFetch(url, { method: 'POST', body: JSON.stringify(body || {}) }),
  put: (url, body) => tFetch(url, { method: 'PUT', body: JSON.stringify(body || {}) }),
  del: (url) => tFetch(url, { method: 'DELETE' }),
};

// ─── local UI primitives (styled to match the rest of the dashboard) ────────
const Badge = ({ color = 'gray', children }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-700', green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-700', gray: 'bg-gray-100 text-gray-600',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>;
};

const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-hidden`}>
      <div className="flex items-center justify-between p-5 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 overflow-y-auto max-h-[calc(90vh-5rem)]">{children}</div>
    </div>
  </div>
);

const StatCard = ({ title, value, icon: Icon, color }) => {
  const bg = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600' };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div><p className="text-sm font-medium text-gray-500">{title}</p><p className="text-2xl font-bold text-gray-900 mt-1">{value}</p></div>
        <div className={`p-2.5 rounded-xl ${bg[color] || bg.blue}`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
};

const ProgressBar = ({ value }) => (
  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full transition-all ${value >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
      style={{ width: `${Math.min(value || 0, 100)}%` }}
    />
  </div>
);

const deadlineMeta = (task) => {
  const d = new Date(task.deadline);
  if (task.status === 'completed') return { label: 'Completed', color: 'green' };
  if (task.status === 'cancelled') return { label: 'Cancelled', color: 'gray' };
  if (isPast(d)) return { label: `Overdue by ${formatDistanceToNow(d)}`, color: 'red' };
  return { label: `Due in ${formatDistanceToNow(d)}`, color: d - Date.now() < 24 * 3600 * 1000 ? 'amber' : 'blue' };
};

// ═══════════════════════════════════════════════════════════════════════
// NOTIFICATION BELL
// ═══════════════════════════════════════════════════════════════════════
const NotificationBell = ({ onOpenTask }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await tApi.get('/notifications/list?limit=20');
      setItems(res.data?.notifications || []);
      setUnread(res.data?.unreadCount || 0);
    } catch { /* silent — notifications are non-critical */ }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAllRead = async () => {
    try { await tApi.post('/notifications/read-all'); setUnread(0); setItems(prev => prev.map(n => ({ ...n, is_read: true }))); }
    catch (e) { toast.error(e.message); }
  };

  const openItem = async (n) => {
    if (!n.is_read) {
      try { await tApi.post(`/notifications/${n.id}/read`); setUnread(u => Math.max(0, u - 1)); setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x)); } catch {}
    }
    setOpen(false);
    if (n.task_id) onOpenTask(n.task_id);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
        <Bell className="h-5 w-5 text-gray-500" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-sm text-gray-900">Task Notifications</p>
            {unread > 0 && <button onClick={markAllRead} className="text-xs text-blue-600 font-medium hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No notifications</p>}
            {items.map(n => (
              <button key={n.id} onClick={() => openItem(n)} className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                <p className="text-[11px] text-gray-400 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// CREATE TASK MODAL
// ═══════════════════════════════════════════════════════════════════════
const OFFSET_PRESETS = [
  { label: '3 days before', hours: 72 },
  { label: '1 day before', hours: 24 },
  { label: '3 hours before', hours: 3 },
];

const CreateTaskModal = ({ admins, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [offsets, setOffsets] = useState([72, 24, 3]);
  const [stages, setStages] = useState([{ title: '', weightPercent: '' }]);
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const weightSum = useMemo(() => stages.reduce((s, x) => s + (Number(x.weightPercent) || 0), 0), [stages]);

  const updateStage = (i, patch) => setStages(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const addStage = () => setStages(prev => [...prev, { title: '', weightPercent: '' }]);
  const removeStage = (i) => setStages(prev => prev.filter((_, idx) => idx !== i));
  const evenSplit = () => {
    const n = stages.length;
    const base = Math.floor((100 / n) * 100) / 100;
    setStages(prev => prev.map((s, i) => ({ ...s, weightPercent: i === n - 1 ? (100 - base * (n - 1)).toFixed(2) : base.toFixed(2) })));
  };

  const toggleOffset = (h) => setOffsets(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h].sort((a, b) => b - a));
  const toggleAssignee = (id) => setAssigneeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const submit = async () => {
    if (!title.trim()) return toast.error('Title is required');
    if (!deadline) return toast.error('Deadline is required');
    if (stages.some(s => !s.title.trim() || !s.weightPercent)) return toast.error('Every stage needs a title and a weight');
    if (Math.abs(weightSum - 100) > 0.01) return toast.error(`Stage weights must total 100% (currently ${weightSum}%)`);
    if (assigneeIds.length === 0) return toast.error('Assign at least one admin');

    setSaving(true);
    try {
      await tApi.post('', {
        title, description, deadline: new Date(deadline).toISOString(),
        reminderOffsetsHours: offsets,
        stages: stages.map(s => ({ title: s.title, weightPercent: Number(s.weightPercent) })),
        assigneeIds,
      });
      toast.success('Task created');
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e.message || 'Failed to create task');
    } finally { setSaving(false); }
  };

  return (
    <Modal title="New Task" onClose={onClose} wide>
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Publish October landing pages" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Description (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Deadline</label>
          <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Email reminders</label>
          <div className="flex flex-wrap gap-2">
            {OFFSET_PRESETS.map(p => (
              <button key={p.hours} type="button" onClick={() => toggleOffset(p.hours)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${offsets.includes(p.hours) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase">Stages ({weightSum}% of 100%)</label>
            <button type="button" onClick={evenSplit} className="text-xs text-blue-600 font-medium hover:underline">Split evenly</button>
          </div>
          <div className="space-y-2">
            {stages.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={s.title} onChange={e => updateStage(i, { title: e.target.value })} placeholder={`Stage ${i + 1} title`} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input value={s.weightPercent} onChange={e => updateStage(i, { weightPercent: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="%" className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => removeStage(i)} disabled={stages.length === 1} className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addStage} className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline">
            <Plus className="h-4 w-4" /> Add stage
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Assign to</label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            {admins.map(a => (
              <label key={a.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer transition-colors ${assigneeIds.includes(a.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="checkbox" checked={assigneeIds.includes(a.id)} onChange={() => toggleAssignee(a.id)} className="rounded" />
                <span className="truncate">{a.full_name || a.username}</span>
              </label>
            ))}
          </div>
        </div>

        <button onClick={submit} disabled={saving} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors">
          {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Task
        </button>
      </div>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// TASK DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════
const TaskDetailModal = ({ task, me, onClose, onChanged }) => {
  const [busyStage, setBusyStage] = useState(null);
  const isManager = me.task_role === 'task_manager';
  const isAssignee = task.assignees.some(a => a.id === me.id);
  const canAct = isManager || isAssignee;
  const meta = deadlineMeta(task);

  const completeStage = async (stageId) => {
    setBusyStage(stageId);
    try {
      await tApi.post(`/${task.id}/stages/${stageId}/complete`, {});
      toast.success('Stage marked complete');
      onChanged();
    } catch (e) { toast.error(e.message); } finally { setBusyStage(null); }
  };

  const reopenStage = async (stageId) => {
    setBusyStage(stageId);
    try {
      await tApi.post(`/${task.id}/stages/${stageId}/reopen`, {});
      toast.success('Stage reopened');
      onChanged();
    } catch (e) { toast.error(e.message); } finally { setBusyStage(null); }
  };

  const cancelTask = async () => {
    if (!window.confirm(`Cancel "${task.title}"?`)) return;
    try { await tApi.del(`/${task.id}`); toast.success('Task cancelled'); onChanged(); onClose(); }
    catch (e) { toast.error(e.message); }
  };

  const removeAssignee = async (adminId) => {
    try { await tApi.del(`/${task.id}/assignees/${adminId}`); toast.success('Assignee removed'); onChanged(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <Modal title={task.title} onClose={onClose} wide>
      <div className="space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge color={meta.color}>{meta.label}</Badge>
          <span className="text-xs text-gray-400">Due {format(new Date(task.deadline), 'MMM d, yyyy · HH:mm')}</span>
        </div>

        {task.description && <p className="text-sm text-gray-600">{task.description}</p>}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase">Progress</span>
            <span className="text-sm font-bold text-gray-900">{task.progress_percent}%</span>
          </div>
          <ProgressBar value={task.progress_percent} />
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Stages</p>
          <div className="space-y-2">
            {task.stages.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                <button
                  onClick={() => s.status === 'completed'
                    ? (isManager && reopenStage(s.id))
                    : (canAct && task.status === 'active' && completeStage(s.id))}
                  disabled={busyStage === s.id || (s.status === 'completed' ? !isManager : !canAct || task.status !== 'active')}
                  className="flex-shrink-0"
                  title={s.status === 'completed' ? (isManager ? 'Reopen' : 'Completed') : 'Mark complete'}
                >
                  {busyStage === s.id
                    ? <Loader className="h-5 w-5 animate-spin text-blue-500" />
                    : s.status === 'completed'
                      ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                      : <Circle className="h-5 w-5 text-gray-300 hover:text-blue-400 transition-colors" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${s.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{s.title}</p>
                  {s.status === 'completed' && s.completed_at && (
                    <p className="text-[11px] text-gray-400">Done {formatDistanceToNow(new Date(s.completed_at), { addSuffix: true })}</p>
                  )}
                </div>
                <Badge color="gray">{s.weight_percent}%</Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Assigned to</p>
          <div className="flex flex-wrap gap-2">
            {task.assignees.map(a => (
              <span key={a.id} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                {a.fullName || a.username}
                {isManager && (
                  <button onClick={() => removeAssignee(a.id)} className="p-0.5 hover:text-red-500 transition-colors"><UserMinus className="h-3 w-3" /></button>
                )}
              </span>
            ))}
          </div>
        </div>

        {isManager && task.status === 'active' && (
          <button onClick={cancelTask} className="text-sm text-red-600 font-medium hover:underline">Cancel task</button>
        )}
      </div>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// TASK LIST CARD
// ═══════════════════════════════════════════════════════════════════════
const TaskCard = ({ task, onOpen }) => {
  const meta = deadlineMeta(task);
  return (
    <button onClick={() => onOpen(task)} className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge color={meta.color}>{meta.label}</Badge>
            <span className="text-xs text-gray-400">{task.assignees.length} assignee{task.assignees.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <span className="text-lg font-bold text-gray-900 flex-shrink-0">{task.progress_percent}%</span>
      </div>
      <div className="mt-3"><ProgressBar value={task.progress_percent} /></div>
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// ROOT — TasksTab
// ═══════════════════════════════════════════════════════════════════════
const TasksTab = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [me, setMe] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [filter, setFilter] = useState('active');
  const [showCreate, setShowCreate] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [ctxRes, tasksRes] = await Promise.all([tApi.get('/context'), tApi.get('')]);
      setMe(ctxRes.data.me);
      setAdmins(ctxRes.data.admins || []);
      setTasks(tasksRes.data || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load tasks');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isManager = me?.task_role === 'task_manager';
  const openTask = tasks.find(t => t.id === openTaskId);

  const counts = useMemo(() => ({
    active: tasks.filter(t => t.status === 'active').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.status === 'active' && isPast(new Date(t.deadline))).length,
  }), [tasks]);

  const filtered = useMemo(() => {
    if (filter === 'all') return tasks;
    if (filter === 'overdue') return tasks.filter(t => t.status === 'active' && isPast(new Date(t.deadline)));
    return tasks.filter(t => t.status === filter);
  }, [tasks, filter]);

  if (loading) return (
    <div className="flex items-center justify-center py-20"><Loader className="h-6 w-6 animate-spin text-blue-600" /></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">{isManager ? 'Assign work and track progress across the team' : 'Tasks assigned to you'}</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell onOpenTask={setOpenTaskId} />
          {isManager && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
              <Plus className="h-4 w-4" /> New Task
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Active" value={counts.active} icon={ClipboardList} color="blue" />
        <StatCard title="Completed" value={counts.completed} icon={CheckCircle2} color="green" />
        <StatCard title="Overdue" value={counts.overdue} icon={AlertTriangle} color="red" />
      </div>

      <div className="flex items-center gap-2">
        {[
          { id: 'active', label: 'Active' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'completed', label: 'Completed' },
          { id: 'all', label: 'All' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f.id ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(t => <TaskCard key={t.id} task={t} onOpen={(task) => setOpenTaskId(task.id)} />)}
        {filtered.length === 0 && (
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-sm text-gray-400">No tasks here</p>
          </div>
        )}
      </div>

      {showCreate && <CreateTaskModal admins={admins} onClose={() => setShowCreate(false)} onCreated={load} />}
      {openTask && me && <TaskDetailModal task={openTask} me={me} onClose={() => setOpenTaskId(null)} onChanged={load} />}
    </div>
  );
};

export default TasksTab;