import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  MessagesSquare, Search, RefreshCw, Loader, X, AlertTriangle, Send,
  Headset, User, Mail, Phone, Clock, Globe, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

/**
 * PublicChatTab — superadmin view for conversations started from the public
 * website's ChatWidget.
 *
 * THIS REVISION ADDS:
 *   • VISITOR-TYPING INDICATOR — the thread endpoint now returns
 *     `visitor_typing` (fresh visitor_typing_at on the row); an animated
 *     "Visitor is typing…" bubble shows in the open thread.
 *   • AGENT TYPING PINGS — while the agent composes a reply the tab sends a
 *     throttled POST /superadmin/public-chats/:id/typing so the visitor's
 *     widget can show its typing bubble.
 *   • NEW-MESSAGE SOUND — a soft ding plays when (a) a new visitor message
 *     lands in the open thread, or (b) the silent list refresh finds more
 *     "Needs reply" conversations than before.
 *   • If the poll finds the conversation was closed elsewhere, the composer
 *     hides automatically.
 *
 * Backend endpoints (public_chat_routes.js):
 *   GET  /superadmin/public-chats
 *   GET  /superadmin/public-chats/:id/messages        -> + visitor_typing
 *   POST /superadmin/public-chats/:id/messages        { text }
 *   POST /superadmin/public-chats/:id/typing          (agent typing ping)
 *   POST /superadmin/public-chats/:id/close           { reason }
 */

// ─── API base + superadmin-scoped fetch (self-contained) ─────────────────────
const _base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const BASE_API = _base.endsWith('/publicchat') ? _base : `${_base}/publicchat`;

const pcFetch = async (url, options = {}) => {
  const res = await fetch(`${BASE_API}${url}`, {
    ...options,
    credentials: 'include',
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
  if (res.status === 204) return {};
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

const THREAD_POLL_MS = 5000;
const LIST_POLL_MS = 15000;
const TYPING_PING_MS = 2500; // min gap between "agent is typing" pings

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
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [showCloseForm, setShowCloseForm] = useState(false);

  const pollRef = useRef(null);
  const bottomRef = useRef(null);

  // Notification-sound bookkeeping
  const audioCtxRef = useRef(null);
  const threadCountRef = useRef(0); // messages seen in the open thread
  const escalatedBaselineRef = useRef(null); // "Needs reply" count baseline
  const lastTypingPingRef = useRef(0);

  // ── Sound: soft ding when a visitor message lands ─────────────────────────
  const playPing = async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch { /* still locked */ }
      }
      if (ctx.state !== 'running') return; // needs one user gesture first
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5 — distinct from the widget
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.55);
    } catch {
      /* audio must never break the dashboard */
    }
  };

  // ── Conversation list ─────────────────────────────────────────────────────
  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await pcFetch('/superadmin/public-chats');
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setConversations(list);
      setError(null);

      // Ding when the number of "Needs reply" conversations grows.
      const escalated = list.filter(c => c.escalated && c.status !== 'closed').length;
      if (escalatedBaselineRef.current !== null && escalated > escalatedBaselineRef.current) {
        playPing();
      }
      escalatedBaselineRef.current = escalated;
    } catch (e) {
      if (!silent) setError(e.message || 'Failed to load public chats');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Silent list refresh so new visitor messages / badges show up live
  useEffect(() => {
    const id = setInterval(() => fetchConversations(true), LIST_POLL_MS);
    return () => clearInterval(id);
  }, [fetchConversations]);

  // ── Open thread ───────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (conversationId, silent = false) => {
    if (!conversationId) return;
    if (!silent) setThreadLoading(true);
    try {
      const data = await pcFetch(`/superadmin/public-chats/${conversationId}/messages`);
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.messages) ? data.messages : []);

      // Ding for visitor messages that arrived since the last poll.
      if (silent) {
        const fresh = list.slice(threadCountRef.current);
        if (fresh.some(m => m.sender === 'visitor')) playPing();
      }
      threadCountRef.current = list.length;

      setMessages(list);
      setVisitorTyping(Boolean(data?.visitor_typing) && data?.status !== 'closed');

      // If it was closed elsewhere, hide the composer live.
      if (data?.status === 'closed') {
        setSelected(s => (s && s.id === conversationId ? { ...s, status: 'closed' } : s));
        setVisitorTyping(false);
      }
    } catch (e) {
      if (!silent) toast.error(e.message || 'Failed to load messages');
    } finally {
      if (!silent) setThreadLoading(false);
    }
  }, []);

  // Poll the open thread every 5s so new visitor messages + typing appear live
  useEffect(() => {
    if (!selected) return undefined;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchMessages(selected.id, true), THREAD_POLL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [selected, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, visitorTyping]);

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
        c.visitorPhone?.toLowerCase().includes(q) ||
        c.lastMessage?.toLowerCase().includes(q)
      );
    });
  }, [conversations, search, filterStatus]);

  const openThread = async (conv) => {
    setSelected(conv);
    setMessages([]);
    setVisitorTyping(false);
    setReply('');
    setShowCloseForm(false);
    setCloseReason('');
    threadCountRef.current = 0; // first (non-silent) load sets the baseline
    await fetchMessages(conv.id);
  };

  const closeModal = () => {
    setSelected(null);
    setMessages([]);
    setVisitorTyping(false);
    setReply('');
    setShowCloseForm(false);
    setCloseReason('');
    fetchConversations(true); // keep list badges in sync after replying
  };

  // ── Agent typing pings (throttled) ───────────────────────────────────────
  const sendTypingPing = () => {
    if (!selected || selected.status === 'closed') return;
    const now = Date.now();
    if (now - lastTypingPingRef.current < TYPING_PING_MS) return;
    lastTypingPingRef.current = now;
    pcFetch(`/superadmin/public-chats/${selected.id}/typing`, { method: 'POST' })
      .catch(() => { /* best-effort */ });
  };

  const handleReplyChange = (e) => {
    setReply(e.target.value);
    if (e.target.value.trim()) sendTypingPing();
  };

  const handleSendReply = async () => {
    const text = reply.trim();
    if (!text || !selected) return;
    setSending(true);
    try {
      const data = await pcFetch(`/superadmin/public-chats/${selected.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setReply('');
      if (Array.isArray(data?.messages)) {
        threadCountRef.current = data.messages.length;
        setMessages(data.messages);
      } else {
        await fetchMessages(selected.id, true);
      }
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
            Website visitor conversations · {counts.open} open · {counts.escalated} awaiting a reply
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
            <option value="escalated">Needs reply</option>
            <option value="closed">Closed</option>
          </select>
          <button
            onClick={() => fetchConversations()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p className="font-medium">Could not load public chats: {error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 flex items-center justify-center">
          <Loader className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        /* THREE cards per row on xl screens (1 on mobile, 2 on md) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(conv => {
            const isClosed = conv.status === 'closed';
            return (
              <button
                key={conv.id}
                onClick={() => openThread(conv)}
                className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col h-full"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessagesSquare className={`h-4 w-4 flex-shrink-0 ${isClosed ? 'text-gray-400' : 'text-blue-500'}`} />
                    <p className="font-semibold text-gray-900 truncate">{conv.visitorName || 'Visitor'}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${isClosed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                    {isClosed ? 'Closed' : 'Open'}
                  </span>
                </div>

                {conv.escalated && !isClosed && (
                  <span className="mt-2 self-start inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="h-3 w-3" /> Needs reply
                  </span>
                )}

                {conv.lastMessage && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {conv.lastSender === 'agent' ? 'You: ' : ''}{conv.lastMessage}
                  </p>
                )}

                <div className="mt-auto pt-3 flex flex-col gap-1 text-xs text-gray-400">
                  {conv.visitorPhone && (
                    <span className="inline-flex items-center gap-1 truncate"><Phone className="h-3 w-3 flex-shrink-0" /> {conv.visitorPhone}</span>
                  )}
                  {conv.visitorEmail && (
                    <span className="inline-flex items-center gap-1 truncate"><Mail className="h-3 w-3 flex-shrink-0" /> {conv.visitorEmail}</span>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span>{conv.messageCount ?? 0} messages</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {conv.lastActivity ? formatDistanceToNow(new Date(conv.lastActivity)) + ' ago' : '—'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && !error && (
            <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-10 text-center">
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
                    {selected.visitorPhone && <p className="text-sm text-gray-500">{selected.visitorPhone}</p>}
                    {selected.visitorEmail && <p className="text-sm text-gray-500">{selected.visitorEmail}</p>}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${selected.status === 'closed' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                    {selected.status === 'closed' ? 'Closed' : 'Open'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{messages.length || selected.messageCount || 0} messages</span>
                  <span>Started {selected.createdAt ? format(new Date(selected.createdAt), 'MMM d, yyyy HH:mm') : '—'}</span>
                  {selected.pageUrl && (
                    <span className="inline-flex items-center gap-1 truncate max-w-full">
                      <Globe className="h-3 w-3 flex-shrink-0" /> {selected.pageUrl}
                    </span>
                  )}
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

                {/* Visitor is typing… */}
                {!threadLoading && visitorTyping && selected.status !== 'closed' && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl p-3 bg-slate-100">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <User className="h-3 w-3" />
                        <span>{selected.visitorName || 'Visitor'} is typing</span>
                        <span className="flex items-center gap-1">
                          {[0, 1, 2].map(i => (
                            <span
                              key={i}
                              className="h-1 w-1 rounded-full bg-slate-400 animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
                            />
                          ))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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
                    onChange={handleReplyChange}
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