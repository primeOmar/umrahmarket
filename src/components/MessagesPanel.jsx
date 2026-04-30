// components/MessagesPanel.jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import {
  Loader, Check, CheckCheck, User, Phone, Video,
  MoreVertical, MessageCircle, ChevronDown, Image as ImageIcon,
  RefreshCw, Wifi, WifiOff, Info
} from 'lucide-react';
import MessageInput from './MessageInput';
import { useMessages } from '../hooks/useMessages';

// ── Date separator label ──────────────────────────────────────────────────────
const DateSeparator = ({ date, darkMode }) => {
  const label = isToday(new Date(date))
    ? 'Today'
    : isYesterday(new Date(date))
    ? 'Yesterday'
    : format(new Date(date), 'EEEE, MMMM d');

  return (
    <div className="flex items-center gap-3 my-4">
      <div className={`flex-1 h-px ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
      <span className={`text-[11px] font-medium px-3 py-1 rounded-full ${
        darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
      }`}>
        {label}
      </span>
      <div className={`flex-1 h-px ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
    </div>
  );
};

// ── System message (booking confirmation, etc.) ───────────────────────────────
const SystemMessage = ({ message, darkMode }) => (
  <div className="flex justify-center my-3">
    <div className={`max-w-sm px-4 py-3 rounded-2xl text-center ${
      darkMode
        ? 'bg-emerald-900/40 border border-emerald-800/60 text-emerald-300'
        : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
    }`}>
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Info className="h-3.5 w-3.5 opacity-70" />
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">System</span>
      </div>
      <p className="text-xs leading-relaxed whitespace-pre-wrap">{message.message}</p>
    </div>
  </div>
);

// ── Single message bubble ─────────────────────────────────────────────────────
const MessageBubble = ({ message, isOwn, darkMode, senderName, showAvatar }) => {
  const [showTime, setShowTime] = useState(false);
  const isOptimistic = message.is_optimistic;

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-1`}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      <div className={`flex items-end gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar — only for non-own messages */}
        {!isOwn && (
          <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-opacity ${
            showAvatar ? 'opacity-100' : 'opacity-0'
          } ${darkMode ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
            {senderName?.charAt(0) || 'A'}
          </div>
        )}

        <div className={`relative ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
          {/* Sender name */}
          {!isOwn && showAvatar && (
            <span className={`text-[11px] font-medium mb-1 ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {senderName}
            </span>
          )}

          {/* Bubble */}
          <div className={`px-3.5 py-2.5 rounded-2xl break-words transition-all ${
            isOwn
              ? `bg-emerald-600 text-white rounded-br-sm ${isOptimistic ? 'opacity-70' : 'opacity-100'}`
              : darkMode
              ? 'bg-gray-700 text-gray-100 rounded-bl-sm'
              : 'bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100'
          }`}
          style={{ maxWidth: '100%' }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>

            {/* Image attachments */}
            {message.image_urls?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {message.image_urls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt="Attachment"
                    className="max-w-[180px] max-h-[140px] rounded-xl cursor-pointer hover:opacity-90 transition object-cover"
                    onClick={() => window.open(url, '_blank')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Timestamp + read status */}
          <div className={`flex items-center gap-1 mt-0.5 transition-opacity ${
            showTime ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          } ${isOwn ? 'justify-end' : 'justify-start'} ml-1`}>
            <span className="text-[10px] text-gray-400">
              {format(new Date(message.created_at), 'h:mm a')}
            </span>
            {isOwn && (
              isOptimistic
                ? <Loader className="h-3 w-3 text-gray-400 animate-spin" />
                : message.read_at
                ? <CheckCheck className="h-3 w-3 text-emerald-400" />
                : <Check className="h-3 w-3 text-gray-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = ({ name, darkMode }) => (
  <div className="flex items-end gap-2 mb-1">
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
      darkMode ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'
    }`}>
      {name?.charAt(0) || 'A'}
    </div>
    <div className={`px-4 py-2.5 rounded-2xl rounded-bl-sm ${
      darkMode ? 'bg-gray-700' : 'bg-white shadow-sm border border-gray-100'
    }`}>
      <div className="flex gap-1 items-center h-4">
        {[0, 150, 300].map(delay => (
          <div
            key={delay}
            className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-gray-400' : 'bg-gray-400'}`}
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  </div>
);

// ── Scroll-to-bottom button ───────────────────────────────────────────────────
const ScrollToBottomButton = ({ onClick, darkMode, unread }) => (
  <button
    onClick={onClick}
    className={`absolute bottom-20 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg text-xs font-medium transition-all ${
      darkMode
        ? 'bg-gray-700 text-white hover:bg-gray-600'
        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
    }`}
  >
    {unread > 0 && (
      <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
        {unread}
      </span>
    )}
    <ChevronDown className="h-3.5 w-3.5" />
  </button>
);

// ── Main MessagesPanel ────────────────────────────────────────────────────────
const MessagesPanel = ({ booking, currentUserId, darkMode = false, agentNameOverride, fullHeight = false }) => {
  const {
    messages,
    loading,
    error,
    sendMessage,
    sendTyping,
    typingUsers,
    onlineStatus,
    agentName: fetchedAgentName,
    refetch,
  } = useMessages(booking?.id);

  const messagesEndRef    = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn]   = useState(false);
  const [unreadBelow, setUnreadBelow]       = useState(0);
  const [isNearBottom, setIsNearBottom]     = useState(true);

  const agentName = agentNameOverride || fetchedAgentName || booking?.package?.agent_name || 'Agent';
  const agentId   = booking?.package?.created_by;
  const isAgentOnline = onlineStatus[agentId] === 'online';

  // Auto-scroll when new messages arrive (only if near bottom)
  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadBelow(0);
    } else {
      setUnreadBelow(prev => prev + 1);
    }
  }, [messages.length]); // eslint-disable-line

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distFromBottom < 120;
    setIsNearBottom(near);
    setShowScrollBtn(!near);
    if (near) setUnreadBelow(0);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadBelow(0);
  };

  // Group messages by date for separators
  const groupedMessages = [];
  let lastDate = null;
  let lastSenderId = null;

  for (const msg of messages) {
    const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (msgDate !== lastDate) {
      groupedMessages.push({ type: 'date', date: msg.created_at, key: `date-${msgDate}` });
      lastDate = msgDate;
      lastSenderId = null;
    }
    const showAvatar = msg.sender_id !== lastSenderId && msg.sender_id !== currentUserId;
    groupedMessages.push({ type: 'message', msg, showAvatar });
    lastSenderId = msg.sender_id;
  }

  if (loading && messages.length === 0) {
    return (
      <div className={`flex flex-col h-full items-center justify-center ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <Loader className="h-8 w-8 animate-spin text-emerald-500 mb-3" />
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading conversation…</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0 ${
        darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
              darkMode ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {agentName.charAt(0)}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
              darkMode ? 'border-gray-800' : 'border-white'
            } ${isAgentOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          </div>
          <div>
            <p className={`text-sm font-semibold leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {agentName}
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {isAgentOnline ? '🟢 Online' : '⚫ Offline'} · Usually replies in minutes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {error && (
            <button
              onClick={refetch}
              title="Retry"
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-500'}`}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          <button className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <Phone className="h-4 w-4" />
          </button>
          <button className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <Video className="h-4 w-4" />
          </button>
          <button className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Messages List ──────────────────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto px-4 py-3 relative ${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
              darkMode ? 'bg-gray-800' : 'bg-emerald-50'
            }`}>
              <MessageCircle className={`h-8 w-8 ${darkMode ? 'text-gray-600' : 'text-emerald-400'}`} />
            </div>
            <p className={`font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              No messages yet
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Send a message to start your conversation
            </p>
          </div>
        ) : (
          groupedMessages.map((item, idx) => {
            if (item.type === 'date') {
              return <DateSeparator key={item.key} date={item.date} darkMode={darkMode} />;
            }
            const { msg, showAvatar } = item;
            const isOwn = msg.sender_id === currentUserId;

            if (msg.sender_type === 'system') {
              return <SystemMessage key={msg.id} message={msg} darkMode={darkMode} />;
            }

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                darkMode={darkMode}
                senderName={agentName}
                showAvatar={showAvatar}
              />
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <TypingIndicator name={agentName} darkMode={darkMode} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <div className="relative">
          <ScrollToBottomButton onClick={scrollToBottom} darkMode={darkMode} unread={unreadBelow} />
        </div>
      )}

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <MessageInput
        onSend={sendMessage}
        onTyping={sendTyping}
        disabled={!booking?.id}
        darkMode={darkMode}
      />
    </div>
  );
};

export default MessagesPanel;