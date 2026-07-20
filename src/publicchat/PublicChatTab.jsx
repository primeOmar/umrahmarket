import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  MessagesSquare, Search, RefreshCw, Loader, X, AlertTriangle, Send,
  Headset, User, Mail, Clock, Globe, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

/**
 * PublicChatTab — superadmin view for conversations started from the public
 * website's ChatWidget (visitor ↔ FAQ bot ↔ human agent).
 *
 * Conversation shape expected from the backend:
 *   { id, visitorName, visitorEmail, status ('open'|'closed'), escalated,
 *     messageCount, lastMessage, lastActivity, pageUrl, createdAt }
 *
 * Message shape:
 *   { id, sender ('visitor'|'agent'|'system'), text, created_at }
 *   (matches the public ChatWidget's message shape exactly)
 *
 * BACKEND endpoints (TODO — implement in superadmin_routes.js; these pair
 * with the public widget's /api/chat/* touchpoints):
 *   GET  /superadmin/public-chats
 *   GET  /superadmin/public-chats/:id/messages
 *   POST /superadmin/public-chats/:id/messages   { text }   -> stored as sender 'agent'
 *   POST /superadmin/public-chats/:id/close      { reason }
 *
 * While a thread is open, messages are polled every 5s (same pattern as
 * the booking ChatsTab). Until the routes exist, the tab shows a friendly
 * "backend not wired" notice. Token refresh is owned by the main
 * dashboard's saFetch; here a 401 simply bounces to the superadmin login.
 */

// ─── API base + superadmin-scoped fetch (self-contained) ─────────────────────
const _base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const BASE_API = _base.endsWith('/api') ? _base : `${_base}/api`;

const pcFetch = async (url, options = {}) => {
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

const POLL_MS = 5000;

// ─── Component ───────────────────────────────────────────────────────────────
const PublicChatTab = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Thread modal
  const [selected, setSelected] = useState(null); // conversation or null
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [showCloseForm, setShowCloseForm] = useState(false);

  const pollRef = useRef(null);
  const bottomRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pcFetch('/superadmin/public-chats');
      setConversations(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load public chats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const fetchMessages = useCallback(async (conversationId, silent = false) => {
    if (!conversationId) return;
    if (!silent) setThreadLoading(true);
    try {
      const data = await pcFetch(`/superadmin/public-chats/${conversationId}/messages`);
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.messages) ? data.messages : []);
      setMessages(list);
    } catch (e) {
      if (!silent) toast.error(e.message || 'Failed to load messages');
    } finally {
      if (!silent) setThreadLoading(false);
    }
  }, []);

  // Poll the open thread every 5s so new visitor messages appear live
  useEffect(() => {
    if (!selected) return undefined;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchMessages(selected.id, true), POLL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [selected, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const counts = useMemo(() => ({
    open: conversations.filter(c => c.status !== 'closed').length,
    escalated: conversations.filter(c => c.escalated && c.status !== 'closed').length,
  }), [conversations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter(c => {
      if (filterStatus === 'open' && c.status === 'closed') return false;
      if (filterStatus === 'closed' && c.status !== 'closed') return false;
      if (filterStatus === 'escalated' && !c.escalated) return false;
      if (!q) return true;
      return (
        c.visitorName?.toLowerCase().includes(q) ||
        c.visitorEmail?.toLowerCase().includes(q) ||
        c.lastMessage?.toLowerCase().includes(q)
      );
    });
  }, [conversations, search, filterStatus]);

  const openThread = async (conv) => {
    setSelected(conv);
    setMessages([]);
    setReply('');
    setShowCloseForm(false);
    setCloseReason('');
    await fetchMessages(conv.id);
  };

  const closeModal = () => {
    setSelected(null);
    setMessages([]);
    setReply('');
    setShowCloseForm(false);
    setCloseReason('');
  };

  const handleSendReply = async () => {
    const text = reply.trim();
    if (!text || !selected) return;
    setSending(true);
    try {
      await pcFetch(`/superadmin/public-chats/${selected.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setReply('');
      await fetchMessages(selected.id, true);
    } catch (e) {
      toast.error(e.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleCloseConversation = async () => {
    if (!selected || !closeReason.trim()) { toast.error('Please provide a reason'); return; }
    setClosing(true);
    try {
      await pcFetch(`/superadmin/public-chats/${selected.id}/close`, {
        method: 'POST',
        body: JSON.stringify({ reason: closeReason.trim() }),
      });
      toast.success('Conversation closed');
      closeModal();
      fetchConversations();
    } catch (e) {
      toast.error(e.message || 'Failed to close conversation');
    } finally {
      setClosing(false);
    }
  };

  const handleReplyKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Public Chat</h1>
          <p className="text-sm text-gray-500 mt-1">
            Website visitor conversations · {counts.open} open · {counts.escalated} awaiting a human reply
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search visitors…"
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
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="escalated">Escalated</option>
            <option value="closed">Closed</option>
          </select>
          <button
            onClick={fetchConversations}
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
            <p className="font-medium">Could not load public chats: {error}</p>
            <p className="text-xs mt-1">
              If the backend route <code>/superadmin/public-chats</code> is not implemented yet, this is
              expected — the tab will work as soon as it is.
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
          {filtered.map(conv => {
            const isClosed = conv.status === 'closed';
            return (
              <button
                key={conv.id}
                onClick={() => openThread(conv)}
                className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow w-full"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MessagesSquare className={`h-4 w-4 flex-shrink-0 ${isClosed ? 'text-gray-400' : 'text-blue-500'}`} />
                      <p className="font-semibold text-gray-900 truncate">{conv.visitorName || 'Visitor'}</p>
                      {conv.escalated && !isClosed && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="h-3 w-3" /> Needs human reply
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-sm text-gray-600 mt-1.5 line-clamp-1">{conv.lastMessage}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                      {conv.visitorEmail && (
                        <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {conv.visitorEmail}</span>
                      )}
                      <span>{conv.messageCount ?? 0} messages</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {conv.lastActivity ? formatDistanceToNow(new Date(conv.lastActivity)) + ' ago' : '—'}
                      </span>
                      {conv.pageUrl && (
                        <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                          <Globe className="h-3 w-3" /> {conv.pageUrl}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${isClosed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                      {isClosed ? 'Closed' : 'Open'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && !error && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-sm text-gray-400">
                {search || filterStatus !== 'all' ? 'No conversations match your filters' : 'No public chat conversations yet'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Thread modal ── */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
              <h2 className="font-semibold text-gray-900">Public Chat Thread</h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Visitor</p>
                    <p className="text-base font-semibold text-gray-900">{selected.visitorName || 'Visitor'}</p>
                    {selected.visitorEmail && <p className="text-sm text-gray-500">{selected.visitorEmail}</p>}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${selected.status === 'closed' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                    {selected.status === 'closed' ? 'Closed' : 'Open'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{selected.messageCount ?? messages.length} messages</span>
                  <span>Started {selected.createdAt ? format(new Date(selected.createdAt), 'MMM d, yyyy HH:mm') : '—'}</span>
                  {selected.pageUrl && <span className="truncate max-w-full">From: {selected.pageUrl}</span>}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                {threadLoading && (
                  <div className="text-center py-10 text-sm text-gray-500">Loading messages…</div>
                )}
                {!threadLoading && messages.length === 0 && (
                  <div className="text-center py-10 text-sm text-gray-500">No messages found for this conversation.</div>
                )}
                {!threadLoading && messages.map(msg => {
                  if (msg.sender === 'system') {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full text-center">{msg.text}</span>
                      </div>
                    );
                  }
                  const isAgent = msg.sender === 'agent';
                  return (
                    <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-3 ${isAgent ? 'bg-blue-50' : 'bg-slate-100'}`}>
                        <div className="flex items-center gap-2 mb-1 text-xs text-slate-500">
                          {isAgent ? <Headset className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          <span>{isAgent ? 'Agent' : (selected.visitorName || 'Visitor')}</span>
                          <span>· {msg.created_at ? format(new Date(msg.created_at), 'MMM d, HH:mm') : '—'}</span>
                        </div>
                        <p className="text-sm text-slate-900 whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Composer + close controls */}
            <div className="border-t border-gray-200 p-4 flex-shrink-0 space-y-3">
              {selected.status !== 'closed' && (
                <div className="flex items-end gap-2">
                  <textarea
                    rows={1}
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={handleReplyKeyDown}
                    placeholder="Reply to the visitor as an agent…"
                    className="flex-1 resize-none max-h-28 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={sending || !reply.trim()}
                    aria-label="Send reply"
                    className="h-10 w-10 flex-shrink-0 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                  >
                    {sending ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {selected.status !== 'closed' && !showCloseForm && (
                <button
                  onClick={() => setShowCloseForm(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline"
                >
                  <XCircle className="h-3.5 w-3.5" /> Close this conversation
                </button>
              )}

              {showCloseForm && (
                <div className="space-y-2">
                  <textarea
                    value={closeReason}
                    onChange={e => setCloseReason(e.target.value)}
                    rows={2}
                    placeholder="Reason for closing this conversation…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowCloseForm(false); setCloseReason(''); }}
                      className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCloseConversation}
                      disabled={closing || !closeReason.trim()}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {closing && <Loader className="h-4 w-4 animate-spin" />} Close Conversation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicChatTab;