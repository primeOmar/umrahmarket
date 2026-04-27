// hooks/useMessages.js
// Production: Supabase Realtime subscriptions — zero polling, no rate limit hits
import { useState, useEffect, useCallback, useRef } from 'react';
import { request } from '../api';
import { supabase } from '../config/supabaseClient'; // your frontend supabase client

export const useMessages = (bookingId) => {
  const [messages, setMessages]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [typingUsers, setTypingUsers]   = useState([]);
  const [onlineStatus, setOnlineStatus] = useState({});
  const [agentName, setAgentName]       = useState('Agent');
  const [packageName, setPackageName]   = useState('Package');

  const channelRef       = useRef(null);
  const currentUserRef   = useRef(null);
  const markReadTimerRef = useRef(null);
  const pendingUnreadRef = useRef([]);
  const slowPollRef      = useRef(null);

  // ── Initial fetch ─────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (silent = false) => {
    if (!bookingId) return;
    if (!silent) setLoading(true);
    try {
      const res = await request({ method: 'get', url: `/messages/${bookingId}` });
      const data = res.data;
      const msgs = data?.messages || [];
      setMessages(msgs);
      currentUserRef.current = data?.currentUserId;
      if (data?.agentName)   setAgentName(data.agentName);
      if (data?.packageName) setPackageName(data.packageName);

      // Batch mark-as-read with debounce
      const unreadIds = msgs
        .filter(m => !m.is_read && m.sender_id !== data?.currentUserId)
        .map(m => m.id);
      if (unreadIds.length) scheduleBatchMarkRead(unreadIds);

      setError(null);
    } catch (err) {
      console.error('[fetchMessages]', err.message);
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [bookingId]); // eslint-disable-line

  // ── Debounced batch mark-read (1 request per 2s max) ─────────────────────
  const scheduleBatchMarkRead = (ids) => {
    pendingUnreadRef.current = [...new Set([...pendingUnreadRef.current, ...ids])];
    if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    markReadTimerRef.current = setTimeout(async () => {
      const toMark = [...pendingUnreadRef.current];
      pendingUnreadRef.current = [];
      if (!toMark.length) return;
      try {
        await request({ method: 'post', url: '/messages/mark-read', data: { messageIds: toMark, bookingId } });
      } catch (err) {
        console.error('[markAsRead]', err.message);
      }
    }, 2000);
  };

  // ── 30s fallback polling (only if Realtime fails) ────────────────────────
  const startSlowPolling = useCallback(() => {
    if (slowPollRef.current) return;
    console.warn('[Messages] Realtime unavailable — using 30s polling fallback');
    slowPollRef.current = setInterval(() => fetchMessages(true), 30_000);
  }, [fetchMessages]);

  // ── Supabase Realtime subscription ───────────────────────────────────────
  const subscribeRealtime = useCallback(() => {
    if (!bookingId || !supabase) { startSlowPolling(); return; }
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    channelRef.current = supabase
      .channel(`messages:${bookingId}`)
      // New message → append (deduplicated, replaces optimistic)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
        ({ new: msg }) => {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            const clean = prev.filter(m => !(m.is_optimistic && m.message === msg.message));
            return [...clean, msg];
          });
          if (msg.sender_id !== currentUserRef.current) scheduleBatchMarkRead([msg.id]);
        }
      )
      // Message updated (e.g. read_at set) → patch in place
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
        ({ new: msg }) => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m))
      )
      // Typing broadcasts (no DB hits)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === currentUserRef.current) return;
        setTypingUsers(prev =>
          payload.isTyping ? [...new Set([...prev, payload.userId])] : prev.filter(id => id !== payload.userId)
        );
        setTimeout(() => setTypingUsers(prev => prev.filter(id => id !== payload.userId)), 3000);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') startSlowPolling();
      });
  }, [bookingId, startSlowPolling]); // eslint-disable-line

  // ── Send typing indicator via Realtime broadcast (free, no API call) ─────
  const sendTyping = useCallback((isTyping) => {
    channelRef.current?.send({
      type: 'broadcast', event: 'typing',
      payload: { isTyping, userId: currentUserRef.current },
    });
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (message, imageUrls = []) => {
    if (!bookingId || !message.trim()) return false;

    const tempId = `temp_${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, booking_id: bookingId, message: message.trim(),
      image_urls: imageUrls, created_at: new Date().toISOString(),
      is_optimistic: true, sender_id: currentUserRef.current,
    }]);

    try {
      const res = await request({ method: 'post', url: '/messages', data: { bookingId, message, imageUrls } });
      if (res.data?.success) {
        // Realtime INSERT will handle dedup; also patch optimistic as fallback
        setMessages(prev => prev.map(m => m.id === tempId ? { ...res.data.message, is_optimistic: false } : m));
        return true;
      }
      setMessages(prev => prev.filter(m => m.id !== tempId));
      return false;
    } catch (err) {
      console.error('[sendMessage]', err.message);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setError(err.message);
      return false;
    }
  }, [bookingId]);

  // ── Mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return;
    fetchMessages();
    subscribeRealtime();
    return () => {
      if (channelRef.current) supabase?.removeChannel(channelRef.current);
      if (slowPollRef.current) clearInterval(slowPollRef.current);
      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    };
  }, [bookingId, fetchMessages, subscribeRealtime]);

  return {
    messages, loading, error, agentName, packageName,
    sendMessage, sendTyping, typingUsers, onlineStatus,
    currentUserId: currentUserRef.current,
    refetch: () => fetchMessages(false),
  };
};

// ── Agent conversations list — Realtime, no polling ──────────────────────────
export const useAgentConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading]             = useState(false);
  const channelRef = useRef(null);

  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await request({ method: 'get', url: '/messages/agent/conversations' });
      setConversations(res.data?.conversations || []);
    } catch (err) {
      console.error('[useAgentConversations]', err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    if (!supabase) return;

    // Any new message → refresh conversation list (last message / unread count)
    channelRef.current = supabase
      .channel('agent-conversations-watcher')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchConversations(true)
      )
      .subscribe();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
};