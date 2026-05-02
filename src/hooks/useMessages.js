// hooks/useMessages.js
// Production: Supabase Realtime subscriptions — zero polling, no rate limit hits
import { useState, useEffect, useCallback, useRef } from 'react';
import { request } from '../api';
import { supabase } from '../config/supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// useMessages — per-booking chat with Realtime sync
// ─────────────────────────────────────────────────────────────────────────────
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

  // ── Debounced batch mark-read ─────────────────────────────────────────────
  const scheduleBatchMarkRead = useCallback((ids) => {
    pendingUnreadRef.current = [...new Set([...pendingUnreadRef.current, ...ids])];
    if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    markReadTimerRef.current = setTimeout(async () => {
      const toMark = [...pendingUnreadRef.current];
      pendingUnreadRef.current = [];
      if (!toMark.length) return;
      try {
        await request({
          method: 'post',
          url: '/messages/mark-read',
          data: { messageIds: toMark, bookingId },
        });
      } catch (err) {
        console.error('[markAsRead]', err.message);
      }
    }, 2000);
  }, [bookingId]);

  // ── Initial / manual fetch ────────────────────────────────────────────────
  const fetchMessages = useCallback(async (silent = false) => {
    if (!bookingId) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await request({ method: 'get', url: `/messages/${bookingId}` });
      const data = res.data;
      const msgs = data?.messages || [];
      setMessages(msgs);
      currentUserRef.current = data?.currentUserId;
      if (data?.agentName)   setAgentName(data.agentName);
      if (data?.packageName) setPackageName(data.packageName);

      const unreadIds = msgs
        .filter(m => !m.is_read && m.sender_id !== data?.currentUserId)
        .map(m => m.id);
      if (unreadIds.length) scheduleBatchMarkRead(unreadIds);
    } catch (err) {
      console.error('[fetchMessages]', err.message);
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [bookingId, scheduleBatchMarkRead]);

  // ── 30s fallback polling (only when Realtime is unavailable) ─────────────
  const startSlowPolling = useCallback(() => {
    if (slowPollRef.current) return;
    console.warn('[Messages] Realtime unavailable — using 30s polling fallback');
    slowPollRef.current = setInterval(() => fetchMessages(true), 30_000);
  }, [fetchMessages]);

  const stopSlowPolling = useCallback(() => {
    if (slowPollRef.current) {
      clearInterval(slowPollRef.current);
      slowPollRef.current = null;
    }
  }, []);

  // ── Supabase Realtime subscription ───────────────────────────────────────
  // CRITICAL: build the full channel with .on() BEFORE calling .subscribe()
  // Using a unique channel name per bookingId+mount avoids the
  // "cannot add callbacks after subscribe()" error on remount.
  const subscribeRealtime = useCallback(() => {
    if (!bookingId || !supabase) {
      startSlowPolling();
      return;
    }

    // Tear down any existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Unique name prevents collision on remount (StrictMode, hot reload, etc.)
    const channelName = `messages:${bookingId}:${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      // New message → append (deduped, replaces optimistic)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
        ({ new: msg }) => {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            const clean = prev.filter(
              m => !(m.is_optimistic && m.message === msg.message)
            );
            return [...clean, msg];
          });
          if (msg.sender_id !== currentUserRef.current) {
            scheduleBatchMarkRead([msg.id]);
          }
        }
      )
      // Message updated (read_at, etc.) → patch in place
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
        ({ new: msg }) =>
          setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, ...msg } : m)))
      )
      // Typing indicators via broadcast (no DB writes)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === currentUserRef.current) return;
        setTypingUsers(prev =>
          payload.isTyping
            ? [...new Set([...prev, payload.userId])]
            : prev.filter(id => id !== payload.userId)
        );
        setTimeout(
          () => setTypingUsers(prev => prev.filter(id => id !== payload.userId)),
          3000
        );
      });

    // subscribe() MUST come AFTER all .on() registrations
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        stopSlowPolling();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        startSlowPolling();
      }
    });

    channelRef.current = channel;
  }, [bookingId, scheduleBatchMarkRead, startSlowPolling, stopSlowPolling]);

  // ── Cleanup helper ────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (channelRef.current && supabase) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    stopSlowPolling();
    if (markReadTimerRef.current) {
      clearTimeout(markReadTimerRef.current);
      markReadTimerRef.current = null;
    }
  }, [stopSlowPolling]);

  // ── Send typing indicator ─────────────────────────────────────────────────
  const sendTyping = useCallback((isTyping) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { isTyping, userId: currentUserRef.current },
    });
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (message, imageUrls = []) => {
    if (!bookingId || !message?.trim()) return false;

    const tempId = `temp_${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: tempId,
        booking_id: bookingId,
        message: message.trim(),
        image_urls: imageUrls,
        created_at: new Date().toISOString(),
        is_optimistic: true,
        sender_id: currentUserRef.current,
      },
    ]);

    try {
      const res = await request({
        method: 'post',
        url: '/messages',
        data: { bookingId, message, imageUrls },
      });
      if (res.data?.success) {
        // Realtime INSERT handles dedup; patch optimistic as belt-and-suspenders
        setMessages(prev =>
          prev.map(m =>
            m.id === tempId ? { ...res.data.message, is_optimistic: false } : m
          )
        );
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
    return cleanup;
  }, [bookingId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally only re-run when bookingId changes.
  // subscribeRealtime/fetchMessages/cleanup are stable refs.

  return {
    messages,
    loading,
    error,
    agentName,
    packageName,
    sendMessage,
    sendTyping,
    typingUsers,
    onlineStatus,
    currentUserId: currentUserRef.current,
    refetch: () => fetchMessages(false),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// useAgentConversations — sidebar conversation list with Realtime refresh
// ─────────────────────────────────────────────────────────────────────────────
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

    // Tear down any stale channel before creating a new one.
    // This prevents the "cannot add callbacks after subscribe()" crash
    // that occurs when StrictMode / hot-reload remounts the component.
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Unique name per mount — avoids collisions with previous subscriptions
    // that may still be tearing down in Supabase's internal registry.
    const channelName = `agent-conversations:${Date.now()}`;

    // Register ALL .on() handlers BEFORE calling .subscribe()
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchConversations(true)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => fetchConversations(true)
      );

    // subscribe() comes LAST
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
};