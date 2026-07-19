import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HelpCircle, Plus, Pencil, Trash2, Search, RefreshCw, Loader, X,
  ToggleLeft, ToggleRight, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

/**
 * FaqsTab — superadmin manager for the public ChatWidget FAQ knowledge base.
 *
 * Lets the admin create / edit / delete / toggle FAQ entries so the public
 * chat can answer visitors without a human. Mirrors the FAQ shape used by
 * ChatFaqs.jsx on the public site:
 *   { id, question, answer, keywords[], strongKeywords[], phrases[], active }
 *
 * BACKEND endpoints (TODO — implement in superadmin_routes.js):
 *   GET    /superadmin/faqs
 *   POST   /superadmin/faqs                { question, answer, keywords, strongKeywords, phrases, active }
 *   PUT    /superadmin/faqs/:id            same body
 *   DELETE /superadmin/faqs/:id
 *   PATCH  /superadmin/faqs/:id/toggle
 *
 * Until those exist, the tab shows a friendly "backend not wired" notice
 * instead of crashing. Token refresh is owned by the main dashboard's
 * saFetch; here a 401 simply bounces to the superadmin login.
 */

// ─── API base + superadmin-scoped fetch (self-contained) ─────────────────────
const _base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const BASE_API = _base.endsWith('/api') ? _base : `${_base}/api`;

const faqFetch = async (url, options = {}) => {
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toList = (value) =>
  String(value || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

const fromList = (arr) => (Array.isArray(arr) ? arr.join(', ') : '');

const EMPTY_FORM = {
  question: '',
  answer: '',
  strongKeywords: '',
  keywords: '',
  phrases: '',
  active: true,
};

// ─── Component ───────────────────────────────────────────────────────────────
const FaqsTab = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modal state: null | { mode: 'create' } | { mode: 'edit', faq }
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await faqFetch('/superadmin/faqs');
      setFaqs(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFaqs(); }, [fetchFaqs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(f =>
      f.question?.toLowerCase().includes(q) ||
      f.answer?.toLowerCase().includes(q)
    );
  }, [faqs, search]);

  // ── Editor open/close ──────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditor({ mode: 'create' });
  };

  const openEdit = (faq) => {
    setForm({
      question: faq.question || '',
      answer: faq.answer || '',
      strongKeywords: fromList(faq.strongKeywords),
      keywords: fromList(faq.keywords),
      phrases: fromList(faq.phrases),
      active: faq.active !== false,
    });
    setEditor({ mode: 'edit', faq });
  };

  const closeEditor = () => { setEditor(null); setForm(EMPTY_FORM); };

  // ── Save (create or update) ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.question.trim()) { toast.error('Question is required'); return; }
    if (!form.answer.trim()) { toast.error('Answer is required'); return; }

    const strong = toList(form.strongKeywords);
    const weak = toList(form.keywords);
    const phrases = toList(form.phrases);
    if (strong.length === 0 && weak.length === 0 && phrases.length === 0) {
      toast.error('Add at least one keyword or phrase so the matcher can find this FAQ');
      return;
    }

    const body = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      strongKeywords: strong,
      keywords: weak,
      phrases,
      active: !!form.active,
    };

    setSaving(true);
    try {
      if (editor?.mode === 'edit') {
        await faqFetch(`/superadmin/faqs/${editor.faq.id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.success('FAQ updated');
      } else {
        await faqFetch('/superadmin/faqs', { method: 'POST', body: JSON.stringify(body) });
        toast.success('FAQ created');
      }
      closeEditor();
      fetchFaqs();
    } catch (e) {
      toast.error(e.message || 'Failed to save FAQ');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await faqFetch(`/superadmin/faqs/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('FAQ deleted');
      setDeleteTarget(null);
      fetchFaqs();
    } catch (e) {
      toast.error(e.message || 'Failed to delete FAQ');
    } finally {
      setDeleting(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggle = async (faq) => {
    setTogglingId(faq.id);
    try {
      await faqFetch(`/superadmin/faqs/${faq.id}/toggle`, { method: 'PATCH' });
      setFaqs(prev => prev.map(f => f.id === faq.id ? { ...f, active: !(f.active !== false) } : f));
      toast.success(faq.active !== false ? 'FAQ deactivated' : 'FAQ activated');
    } catch (e) {
      toast.error(e.message || 'Failed to toggle FAQ');
    } finally {
      setTogglingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FAQs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Knowledge base powering the public chat's instant answers · {faqs.length} entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search FAQs…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>
          <button
            onClick={fetchFaqs}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> New FAQ
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Could not load FAQs: {error}</p>
            <p className="text-xs mt-1">
              If the backend route <code>/superadmin/faqs</code> is not implemented yet, this is expected —
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
          {filtered.map(faq => {
            const isActive = faq.active !== false;
            return (
              <div key={faq.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <HelpCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <p className="font-semibold text-gray-900">{faq.question}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1.5 line-clamp-2 whitespace-pre-wrap">{faq.answer}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(faq.strongKeywords || []).map(k => (
                        <span key={`s-${k}`} className="px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-blue-700 font-medium">{k}</span>
                      ))}
                      {(faq.keywords || []).map(k => (
                        <span key={`w-${k}`} className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-600">{k}</span>
                      ))}
                      {(faq.phrases || []).map(p => (
                        <span key={`p-${p}`} className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-50 text-indigo-700 italic">"{p}"</span>
                      ))}
                    </div>
                    {faq.updatedAt && (
                      <p className="text-xs text-gray-400 mt-2">Updated {format(new Date(faq.updatedAt), 'MMM d, yyyy HH:mm')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(faq)}
                      disabled={togglingId === faq.id}
                      title={isActive ? 'Deactivate' : 'Activate'}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {togglingId === faq.id
                        ? <Loader className="h-4 w-4 animate-spin text-gray-400" />
                        : isActive
                          ? <ToggleRight className="h-5 w-5 text-green-600" />
                          : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => openEdit(faq)}
                      title="Edit"
                      className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(faq)}
                      title="Delete"
                      className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && !error && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-sm text-gray-400">
                {search ? 'No FAQs match your search' : 'No FAQs yet — create the first one'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit modal ── */}
      {editor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && closeEditor()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">{editor.mode === 'edit' ? 'Edit FAQ' : 'New FAQ'}</h2>
              <button onClick={closeEditor} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-5rem)] space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.question}
                  onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                  placeholder="e.g. Do you process the Umrah visa for me?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Answer <span className="text-red-500">*</span></label>
                <textarea
                  rows={5}
                  value={form.answer}
                  onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                  placeholder="The full reply visitors will receive in the chat…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Strong keywords</label>
                <input
                  type="text"
                  value={form.strongKeywords}
                  onChange={e => setForm(f => ({ ...f, strongKeywords: e.target.value }))}
                  placeholder="visa, evisa, nusuk"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Comma-separated. Distinctive words — ONE of these alone is enough to trigger this answer (2 points each).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                <input
                  type="text"
                  value={form.keywords}
                  onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                  placeholder="permit, process, processing"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Comma-separated. Generic words that need reinforcement from other hits (1 point each).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phrases</label>
                <input
                  type="text"
                  value={form.phrases}
                  onChange={e => setForm(f => ({ ...f, phrases: e.target.value }))}
                  placeholder="umrah visa, visa processing, visa requirements"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Comma-separated multi-word phrases — most specific match of all (3 points each).
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Active — visible to the public chat matcher
              </label>

              <div className="flex gap-3 pt-2">
                <button onClick={closeEditor} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader className="h-4 w-4 animate-spin" />}
                  {editor.mode === 'edit' ? 'Save changes' : 'Create FAQ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Delete FAQ</h2>
              <button onClick={() => setDeleteTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-6">
                Permanently delete <strong>"{deleteTarget.question}"</strong>? The public chat will no longer
                answer this question automatically. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting && <Loader className="h-4 w-4 animate-spin" />} Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaqsTab;