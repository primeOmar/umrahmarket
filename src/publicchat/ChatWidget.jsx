import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  X,
  Send,
  ChevronDown,
  User,
  Phone,
  Headset,
  Clock,
  CheckCheck,
  Check,
  AlertCircle,
} from 'lucide-react';

/**
 * ChatWidget — visitor ↔ agent live chat for Umrah Market.
 *
 * AGENT-DIRECT FLOW (FAQ auto-answering removed):
 *   1. Visitor fills the pre-chat form -> POST /api/chat/conversations
 *   2. Every message the visitor sends -> POST /api/chat/conversations/:id/messages
 *   3. The widget polls GET /api/chat/conversations/:id/messages every 4s so
 *      agent replies from the superadmin dashboard appear live.
 *
 * THIS REVISION FIXES / ADDS:
 *   • DUPLICATE-BUBBLE FIX — the optimistic local bubble uses a temp id, and
 *     the server stores the same message under its own UUID, so the old merge
 *     kept BOTH (one "delivered", one stuck on the clock icon). The merge now
 *     accepts a dropIds list: on a successful send the temp bubble is removed
 *     in the same state update that applies the server's copy.
 *   • FAILED SENDS are now marked status 'failed' (red icon + "Not sent")
 *     instead of being left on 'sending' forever.
 *   • TYPING INDICATOR — the poll response now carries `agent_typing`
 *     (backend keeps an agent_typing_at timestamp, fresh for a few seconds);
 *     an animated three-dot bubble is shown while it's true. The widget also
 *     pings POST /chat/conversations/:id/typing (throttled) while the visitor
 *     types, so the agent dashboard can show "Visitor is typing…".
 *   • NEW-MESSAGE SOUND — a short soft ding plays whenever an agent reply
 *     lands (open or minimised), via a persistent AudioContext that unlocks
 *     on the visitor's first real gesture.
 *   • RESTORED-THREAD HYDRATION GUARD — the first fetch of a restored
 *     conversation sets the baseline silently, so old messages no longer
 *     count as "unread" or trigger the ding.
 *
 * NOTE: polling means the typing indicator / sound can lag by up to one poll
 * interval (~4s). Supabase Realtime or websockets would make both instant.
 */

// ─── API base ────────────────────────────────────────────────────────────────
const _base =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const BASE_API = _base.endsWith('/publicchat') ? _base : `${_base}/publicchat`;

const apiFetch = async (url, options = {}) => {
  const res = await fetch(`${BASE_API}${url}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
};

const BELL_DELAY_MS = 4000; // first welcome-bell attempt after mount
const BELL_WINDOW_MS = 30000; // chime allowed only within this window
const BELL_SESSION_KEY = 'um_chat_bell_played'; // once-per-visit flag
const CONVERSATION_SESSION_KEY = 'um_chat_conversation'; // { id, name }
const ICON_SWAP_MS = 5000; // launcher alternates icon <-> "MESSAGE US"
const POLL_MS = 4000; // agent-reply polling interval
const TYPING_PING_MS = 2500; // min gap between "visitor is typing" pings

// Allows optional leading +, then 7-15 digits, with spaces/hyphens/parens
// permitted as separators. Rejects letters and other junk.
const PHONE_REGEX = /^\+?[0-9][0-9\s\-()]{6,18}[0-9]$/;

// Strip anything that isn't a digit, space, +, -, ( or ) as the user types.
const sanitizePhoneInput = (value) => value.replace(/[^\d\s+\-()]/g, '');

const readStoredConversation = () => {
  try {
    const raw = sessionStorage.getItem(CONVERSATION_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const ChatWidget = () => {
  const stored = useRef(readStoredConversation()).current;

  const [isOpen, setIsOpen] = useState(false);

  // 'prechat' -> visitor identifies themselves, 'chat' -> conversation view
  const [stage, setStage] = useState(stored ? 'chat' : 'prechat');

  // Launcher alternation: true -> icon, false -> "MESSAGE US" text (sm+ only)
  const [showIcon, setShowIcon] = useState(true);

  // Pre-chat form
  const [visitorName, setVisitorName] = useState(stored?.name || '');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [starting, setStarting] = useState(false);

  // Conversation state
  const [conversationId, setConversationId] = useState(stored?.id || null);
  const [conversationClosed, setConversationClosed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [agentTyping, setAgentTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Bell bookkeeping (refs so audio logic never triggers re-renders)
  const bellPlayedRef = useRef(false);
  const mountTimeRef = useRef(Date.now());

  // Persistent AudioContext for the new-message ping (separate from the
  // one-shot welcome bell). Created lazily; resumed inside gesture handlers.
  const audioCtxRef = useRef(null);

  // Polling bookkeeping
  const isOpenRef = useRef(isOpen);
  const serverCountRef = useRef(0); // server messages seen so far
  const hydratedRef = useRef(false); // first server payload applied yet?
  const lastTypingPingRef = useRef(0);
  const conversationIdRef = useRef(conversationId);
  const conversationClosedRef = useRef(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);
  useEffect(() => {
    conversationClosedRef.current = conversationClosed;
  }, [conversationClosed]);

  // ---------------------------------------------------------------
  // Launcher icon <-> "MESSAGE US" alternation (every 5 seconds)
  // ---------------------------------------------------------------

  useEffect(() => {
    const intervalId = setInterval(() => {
      setShowIcon((prev) => !prev);
    }, ICON_SWAP_MS);

    return () => clearInterval(intervalId);
  }, []);

  // ---------------------------------------------------------------
  // Audio — shared helpers
  // ---------------------------------------------------------------

  /** Lazily create (and try to resume) the persistent AudioContext. */
  const getAudioCtx = async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          /* still locked — caller checks state */
        }
      }
      return ctx.state === 'running' ? ctx : null;
    } catch {
      return null;
    }
  };

  /** Short soft ding when an agent reply lands. */
  const playMessagePing = async () => {
    const ctx = await getAudioCtx();
    if (!ctx) return; // autoplay still locked — badge/typing UI still inform
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now); // C6 — soft notification tone
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch {
      /* never let audio break the chat */
    }
  };

  // ---------------------------------------------------------------
  // Welcome bell chime — synthesized with Web Audio, once per visit
  // ---------------------------------------------------------------

  const bellAlreadyPlayedThisVisit = () => {
    if (bellPlayedRef.current) return true;
    try {
      return sessionStorage.getItem(BELL_SESSION_KEY) === '1';
    } catch {
      return bellPlayedRef.current;
    }
  };

  const markBellPlayed = () => {
    bellPlayedRef.current = true;
    try {
      sessionStorage.setItem(BELL_SESSION_KEY, '1');
    } catch {
      /* sessionStorage unavailable — ref still guards */
    }
  };

  /**
   * Attempt to ring the welcome bell.
   * @returns {Promise<boolean>} true if it actually played.
   */
  const playBell = async () => {
    if (bellAlreadyPlayedThisVisit()) return true;
    const ctx = await getAudioCtx();
    if (!ctx) return false; // still blocked — caller may retry on a gesture
    try {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.35, now);
      master.connect(ctx.destination);

      // Two-strike "ding-ding" bell: fundamental + shimmer partial per strike
      [0, 0.28].forEach((offset) => {
        [[1318.5, 0.3], [1975.5, 0.12]].forEach(([freq, vol]) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + offset);
          gain.gain.setValueAtTime(vol, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.9);
          osc.connect(gain);
          gain.connect(master);
          osc.start(now + offset);
          osc.stop(now + offset + 1);
        });
      });

      markBellPlayed();
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (bellAlreadyPlayedThisVisit()) return undefined; // once per visit

    const withinWindow = () => Date.now() - mountTimeRef.current < BELL_WINDOW_MS;

    // ONLY real user-activation gestures — 'scroll' does NOT unlock audio.
    const interactionEvents = ['pointerdown', 'keydown', 'touchstart'];
    let disarmTimer = null;

    const cleanupListeners = () => {
      interactionEvents.forEach((evt) =>
        window.removeEventListener(evt, onInteraction)
      );
      if (disarmTimer) clearTimeout(disarmTimer);
    };

    // Keep listeners armed until the bell ACTUALLY plays (or window closes).
    async function onInteraction() {
      if (!withinWindow() || bellAlreadyPlayedThisVisit()) {
        cleanupListeners();
        return;
      }
      const played = await playBell();
      if (played) cleanupListeners();
      // If it didn't play, stay armed for the next gesture.
    }

    const timer = setTimeout(async () => {
      if (bellAlreadyPlayedThisVisit() || !withinWindow()) return;
      const played = await playBell(); // may succeed if autoplay is allowed
      if (!played) {
        interactionEvents.forEach((evt) =>
          window.addEventListener(evt, onInteraction)
        );
        // Disarm once the 30s window closes
        disarmTimer = setTimeout(cleanupListeners, BELL_WINDOW_MS - BELL_DELAY_MS);
      }
    }, BELL_DELAY_MS);

    return () => {
      clearTimeout(timer);
      cleanupListeners();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, isOpen, agentTyping]);

  useEffect(() => {
    if (isOpen && stage === 'chat' && !conversationClosed) inputRef.current?.focus();
  }, [isOpen, stage, conversationClosed]);

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const toggleOpen = () => {
    setIsOpen((v) => !v);
  };

  const handlePhoneChange = (e) => {
    setVisitorPhone(sanitizePhoneInput(e.target.value));
  };

  /** Throttled "visitor is typing" ping so the agent dashboard can show it. */
  const sendTypingPing = () => {
    const id = conversationIdRef.current;
    if (!id || conversationClosedRef.current) return;
    const now = Date.now();
    if (now - lastTypingPingRef.current < TYPING_PING_MS) return;
    lastTypingPingRef.current = now;
    apiFetch(`/chat/conversations/${id}/typing`, { method: 'POST' }).catch(() => {
      /* best-effort — never surfaces to the visitor */
    });
  };

  const handleDraftChange = (e) => {
    setDraft(e.target.value);
    if (e.target.value.trim()) sendTypingPing();
  };

  /**
   * Merge the server's message list with locally pending/failed bubbles.
   *
   * DUPLICATE FIX: `dropIds` lists local temp ids whose server copy is known
   * to be inside `serverMessages` (i.e. a send just succeeded). Those temp
   * bubbles are removed in the SAME state update that applies the server
   * list, so the message can never appear twice.
   */
  const applyServerMessages = useCallback((serverMessages, dropIds = []) => {
    if (!Array.isArray(serverMessages)) return;
    const drop = new Set(dropIds);

    setMessages((prev) => {
      const serverIds = new Set(serverMessages.map((m) => m.id));
      const localOnly = prev.filter(
        (m) =>
          (m.status === 'sending' || m.status === 'failed') &&
          !serverIds.has(m.id) &&
          !drop.has(m.id)
      );
      const delivered = serverMessages.map((m) =>
        m.sender === 'visitor' ? { ...m, status: 'delivered' } : m
      );
      return [...delivered, ...localOnly];
    });

    // First payload after mount/restore just sets the baseline — old
    // messages must not count as unread or ring the ping.
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      serverCountRef.current = serverMessages.length;
      return;
    }

    const fresh = serverMessages.slice(serverCountRef.current);
    const newAgentReplies = fresh.filter((m) => m.sender === 'agent').length;
    if (newAgentReplies > 0) {
      playMessagePing(); // audible whether the panel is open or minimised
      if (!isOpenRef.current) setUnreadCount((c) => c + newAgentReplies);
    }
    serverCountRef.current = serverMessages.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------
  // BACKEND: poll for agent replies + typing every 4s
  // ---------------------------------------------------------------
  const fetchThread = useCallback(async () => {
    if (!conversationId) return;
    try {
      const data = await apiFetch(`/chat/conversations/${conversationId}/messages`);
      applyServerMessages(data.messages);
      if (data.status === 'closed') {
        setConversationClosed(true);
        setAgentTyping(false);
      } else {
        setAgentTyping(Boolean(data.agent_typing));
      }
    } catch {
      /* transient network error — next poll will retry */
    }
  }, [conversationId, applyServerMessages]);

  useEffect(() => {
    if (!conversationId) return undefined;
    fetchThread(); // load immediately (also restores a stored conversation)
    if (conversationClosed) return undefined; // closed thread — stop polling
    const intervalId = setInterval(fetchThread, POLL_MS);
    return () => clearInterval(intervalId);
  }, [conversationId, conversationClosed, fetchThread]);

  // ---------------------------------------------------------------
  // BACKEND: start a conversation
  // ---------------------------------------------------------------
  const startConversation = async (e) => {
    e?.preventDefault?.();
    if (starting) return;

    const cleanName = visitorName.trim();
    const cleanPhone = sanitizePhoneInput(visitorPhone).trim();
    const cleanEmail = visitorEmail.trim();

    if (!cleanName) {
      setFormError('Please enter your name so an agent knows who they are speaking with.');
      return;
    }
    if (!PHONE_REGEX.test(cleanPhone)) {
      setFormError('Please enter a valid phone number.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Please enter a valid email so we can follow up if you go offline.');
      return;
    }
    setFormError('');
    setVisitorPhone(cleanPhone);
    setStarting(true);

    try {
      const data = await apiFetch('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          page_url: typeof window !== 'undefined' ? window.location.href : null,
        }),
      });

      setConversationId(data.conversation_id);
      hydratedRef.current = true; // greeting is the baseline, not "new"
      serverCountRef.current = Array.isArray(data.messages) ? data.messages.length : 0;
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setConversationClosed(false);
      setAgentTyping(false);
      setStage('chat');

      try {
        sessionStorage.setItem(
          CONVERSATION_SESSION_KEY,
          JSON.stringify({ id: data.conversation_id, name: cleanName })
        );
      } catch {
        /* sessionStorage unavailable — thread just won't survive navigation */
      }
    } catch (err) {
      setFormError(err.message || 'Could not start the chat. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  // ---------------------------------------------------------------
  // BACKEND: send a visitor message (agents are notified server-side)
  // ---------------------------------------------------------------
  const sendMessage = async (e) => {
    e?.preventDefault?.();
    const text = draft.trim();
    if (!text || !conversationId || conversationClosed) return;

    const tempId = `local-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender: 'visitor',
        text,
        created_at: new Date().toISOString(),
        status: 'sending',
      },
    ]);
    setDraft('');

    try {
      const data = await apiFetch(`/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      // Server response is the source of truth. The temp bubble is dropped in
      // the same update that applies the server copy — no more duplicates.
      applyServerMessages(data.messages, [tempId]);
    } catch (err) {
      if (/closed/i.test(err.message || '')) {
        setConversationClosed(true);
      }
      // Mark the bubble as failed so the visitor knows to retype/resend.
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewConversation = () => {
    try {
      sessionStorage.removeItem(CONVERSATION_SESSION_KEY);
    } catch {
      /* ignore */
    }
    serverCountRef.current = 0;
    hydratedRef.current = false;
    setConversationId(null);
    setConversationClosed(false);
    setAgentTyping(false);
    setMessages([]);
    setDraft('');
    setStage('prechat');
  };

  // ---------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------

  const StatusIcon = ({ status }) => {
    if (status === 'failed') return <AlertCircle className="h-3 w-3 text-red-300" />;
    if (status === 'sending') return <Clock className="h-3 w-3 text-gray-300" />;
    if (status === 'sent') return <Check className="h-3 w-3 text-gray-300" />;
    return <CheckCheck className="h-3 w-3 text-green-300" />;
  };

  const MessageBubble = ({ msg }) => {
    if (msg.sender === 'system') {
      return (
        <div className="flex justify-center my-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full text-center">
            {msg.text}
          </span>
        </div>
      );
    }

    const isVisitor = msg.sender === 'visitor';
    return (
      <div className={`flex ${isVisitor ? 'justify-end' : 'justify-start'} mb-3`}>
        {!isVisitor && (
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-2 self-end">
            <Headset className="h-4 w-4 text-green-700" />
          </div>
        )}
        <div
          className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
            isVisitor
              ? 'bg-green-600 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-800 rounded-bl-md'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
          <div
            className={`flex items-center gap-1 mt-1 text-[10px] ${
              isVisitor ? 'text-green-100 justify-end' : 'text-gray-400'
            }`}
          >
            <span>{formatTime(msg.created_at)}</span>
            {isVisitor && <StatusIcon status={msg.status} />}
            {isVisitor && msg.status === 'failed' && (
              <span className="text-red-200 font-medium">Not sent</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  /** Animated "agent is typing" bubble (three bouncing dots). */
  const TypingBubble = () => (
    <div className="flex justify-start mb-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-2 self-end">
        <Headset className="h-4 w-4 text-green-700" />
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
          />
        ))}
      </div>
    </div>
  );

  // ---------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------

  return (
    <>
      {/* Wave burst animation borrowed from the PYO chat launcher */}
      <style>{`
        @keyframes wave-burst-outer {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
          70% { box-shadow: 0 0 0 20px rgba(22, 163, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }
        @keyframes wave-burst-middle {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(22, 163, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }
        @keyframes wave-burst-inner {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(22, 163, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }
        .bursting-launcher {
          position: relative;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        @media (min-width: 640px) {
          .bursting-launcher {
            width: 100px;
            height: 100px;
          }
        }
        .wave-outer, .wave-middle, .wave-inner {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 50%;
          pointer-events: none;
        }
        .wave-outer { animation: wave-burst-outer 2.5s infinite; }
        .wave-middle { animation: wave-burst-middle 2s infinite; }
        .wave-inner { animation: wave-burst-inner 1.5s infinite; }
        @media (prefers-reduced-motion: reduce) {
          .wave-outer, .wave-middle, .wave-inner { animation: none; }
        }
      `}</style>

      {/* Floating launcher button — bursting waves + icon/text alternation */}
      <div className="fixed bottom-6 right-6 z-[90]">
        {!isOpen ? (
          <button
            onClick={toggleOpen}
            aria-label="Chat with an agent"
            className="relative border-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 rounded-full"
          >
            <div className="bursting-launcher bg-green-100 shadow-lg shadow-green-600/40 hover:bg-green-200 transition-colors">
              <div className="wave-outer"></div>
              <div className="wave-middle"></div>
              <div className="wave-inner"></div>

              {/* Mobile: always the icon — same green-400 as desktop */}
              <MessageCircle className="text-green-400 sm:hidden h-6 w-6" />

              {/* Desktop: alternate every 5s between the icon and MESSAGE US */}
              {showIcon ? (
                <MessageCircle className="text-green-400 hidden sm:block h-7 w-7" />
              ) : (
                <span className="hidden sm:inline text-green-400 text-xs font-bold tracking-wide text-center leading-tight px-2">
                  MESSAGE US
                </span>
              )}

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </button>
        ) : (
          <button
            onClick={toggleOpen}
            aria-label="Close chat"
            className="h-14 w-14 rounded-full bg-green-600 text-white shadow-lg shadow-green-600/40 flex items-center justify-center hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 transition-colors"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-[90] w-[calc(100vw-2rem)] max-w-sm h-[520px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                  <Headset className="h-5 w-5" />
                </div>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-gray-900" />
              </div>
              <div>
                <p className="font-semibold text-sm">Umrah Market Support</p>
                <p className="text-xs text-gray-400">
                  {stage === 'chat'
                    ? conversationClosed
                      ? 'Conversation closed'
                      : agentTyping
                        ? 'Agent is typing…'
                        : 'Live agents · typically replies in minutes'
                    : 'Typically replies in minutes'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Minimize chat"
              className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          {stage === 'prechat' ? (
            <form
              onSubmit={startConversation}
              className="flex-1 flex flex-col justify-center px-6 py-6 gap-4 overflow-y-auto"
            >
              <div className="text-center mb-2">
                <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <MessageCircle className="h-6 w-6 text-green-700" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Talk to our team</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Tell us who you are and an agent will pick up your chat.
                </p>
              </div>

              <div>
                <label htmlFor="chat-name" className="block text-xs font-medium text-gray-600 mb-1">
                  Your name
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="chat-name"
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="e.g. Amina Hassan"
                    className="text-black w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="chat-phone" className="block text-xs font-medium text-gray-600 mb-1">
                  Phone number
                </label>
                <div className="relative">
                  <Phone className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="chat-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={visitorPhone}
                    onChange={handlePhoneChange}
                    placeholder="e.g. +254 700 000000"
                    className="text-black w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="chat-email" className="block text-xs font-medium text-gray-600 mb-1">
                  Email address
                </label>
                <input
                  id="chat-email"
                  type="email"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="text-black w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={starting}
                className="cursor-pointer w-full bg-green-600 text-white font-semibold text-sm py-2.5 rounded-lg hover:bg-green-700 disabled:bg-green-300 disabled:cursor-wait transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              >
                {starting ? 'Connecting…' : 'Start chat'}
              </button>

              <p className="text-[11px] text-gray-400 text-center">
                We only use your phone and email to continue this conversation.
              </p>
            </form>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 bg-white">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {agentTyping && !conversationClosed && <TypingBubble />}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="border-t border-gray-200 px-3 py-3 bg-white">
                {conversationClosed ? (
                  <div className="text-center space-y-2">
                    <p className="text-xs text-gray-500">
                      This conversation has been closed by our team.
                    </p>
                    <button
                      onClick={startNewConversation}
                      className="cursor-pointer text-sm font-semibold text-green-700 hover:underline"
                    >
                      Start a new conversation
                    </button>
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={draft}
                      onChange={handleDraftChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message…"
                      className="flex-1 text-black resize-none max-h-28 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!draft.trim()}
                      aria-label="Send message"
                      className="cursor-pointer h-10 w-10 flex-shrink-0 rounded-lg bg-green-600 text-white flex items-center justify-center hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;