// components/AgentMessagesTab.jsx
// World-class split-panel chat interface for agents
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import {
  Search, MessageCircle, Check, CheckCheck, Loader,
  User, Phone, Video, MoreVertical, ChevronDown,
  RefreshCw, Send, Paperclip, Smile, X, Info,
  CheckCircle, Clock, XCircle, Users
} from 'lucide-react';
import { useMessages, useAgentConversations } from '../hooks/useMessages';
import MessageInput from './MessageInput';

// ── Booking status badge ──────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    confirmed: { bg: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    pending:   { bg: 'bg-amber-100 text-amber-700',    icon: Clock },
    cancelled: { bg: 'bg-red-100 text-red-700',        icon: XCircle },
    completed: { bg: 'bg-blue-100 text-blue-700',      icon: CheckCircle },
  };
  const { bg, icon: Icon } = map[status?.toLowerCase()] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${bg}`}>
      <Icon className="h-2.5 w-2.5" />
      {status || 'pending'}
    </span>
  );
};

// ── Conversation list item ────────────────────────────────────────────────────
const ConversationItem = ({ conv, isActive, onClick }) => {
  const timeLabel = conv.lastTime
    ? isToday(new Date(conv.lastTime))
      ? format(new Date(conv.lastTime), 'h:mm a')
      : isYesterday(new Date(conv.lastTime))
      ? 'Yesterday'
      : format(new Date(conv.lastTime), 'MMM d')
    : '';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b transition-colors flex items-start gap-3 ${
        isActive
          ? 'bg-emerald-50 border-l-2 border-l-emerald-500 border-b-gray-100'
          : 'hover:bg-gray-50 border-b-gray-100 border-l-2 border-l-transparent'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
          {conv.clientName?.charAt(0) || 'C'}
        </div>
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1">
            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-sm font-semibold truncate ${isActive ? 'text-emerald-700' : 'text-gray-900'}`}>
            {conv.clientName || 'Client'}
          </span>
          <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{timeLabel}</span>
        </div>
        <p className="text-xs text-gray-500 truncate mb-1">{conv.packageName}</p>
        <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
          {conv.lastMessage?.replace(/\*/g, '').substring(0, 60)}
          {(conv.lastMessage?.length || 0) > 60 ? '…' : ''}
        </p>
      </div>
    </button>
  );
};

// ── Date separator ────────────────────────────────────────────────────────────
const DateSeparator = ({ date }) => {
  const label = isToday(new Date(date))
    ? 'Today'
    : isYesterday(new Date(date))
    ? 'Yesterday'
    : format(new Date(date), 'EEEE, MMMM d');

  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[11px] text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
};

// ── System message ────────────────────────────────────────────────────────────
const SystemMessage = ({ message }) => (
  <div className="flex justify-center my-2">
    <div className="max-w-sm px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        <Info className="h-3 w-3 text-amber-600" />
        <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">System</span>
      </div>
      <p className="text-xs text-amber-800 leading-relaxed whitespace-pre-wrap">
        {message.message}
      </p>
    </div>
  </div>
);

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ message, isOwn, agentName, clientName, showAvatar }) => {
  const [showTime, setShowTime] = useState(false);
  const isOptimistic = message.is_optimistic;

  const senderName = isOwn ? agentName : clientName;

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-0.5`}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      <div className={`flex items-end gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isOwn && (
          <div
            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold bg-blue-100 text-blue-700 transition-opacity ${
              showAvatar ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {clientName?.charAt(0) || 'C'}
          </div>
        )}

        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {!isOwn && showAvatar && (
            <span className="text-[11px] font-medium text-gray-500 mb-0.5 ml-1">{clientName}</span>
          )}
          <div className={`px-3.5 py-2.5 rounded-2xl break-words ${
            isOwn
              ? `bg-blue-600 text-white rounded-br-sm ${isOptimistic ? 'opacity-60' : ''}`
              : 'bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100'
          }`}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
            {message.image_urls?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {message.image_urls.map((url, i) => (
                  <img key={i} src={url} alt="attachment"
                    className="max-w-[160px] max-h-[120px] rounded-lg object-cover cursor-pointer hover:opacity-90"
                    onClick={() => window.open(url, '_blank')} />
                ))}
              </div>
            )}
          </div>
          <div className={`flex items-center gap-1 mt-0.5 transition-opacity ml-1 ${
            showTime ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          } ${isOwn ? 'flex-row-reverse' : ''}`}>
            <span className="text-[10px] text-gray-400">
              {format(new Date(message.created_at), 'h:mm a')}
            </span>
            {isOwn && (
              isOptimistic
                ? <Loader className="h-3 w-3 text-gray-400 animate-spin" />
                : message.read_at
                ? <CheckCheck className="h-3 w-3 text-blue-400" />
                : <Check className="h-3 w-3 text-gray-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = ({ name }) => (
  <div className="flex items-end gap-2 mb-1">
    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-700 flex-shrink-0">
      {name?.charAt(0) || 'C'}
    </div>
    <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white shadow-sm border border-gray-100">
      <div className="flex gap-1 items-center h-4">
        {[0, 150, 300].map(d => (
          <div key={d} className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyChatPane = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
      <MessageCircle className="h-10 w-10 text-emerald-300" />
    </div>
    <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a conversation</h3>
    <p className="text-sm text-gray-400 max-w-xs">
      Choose a client conversation from the list to start messaging
    </p>
  </div>
);

// ── Active chat pane ──────────────────────────────────────────────────────────
const ChatPane = ({ conv, agentUser }) => {
  const {
    messages, loading, error, sendMessage, sendTyping, typingUsers, onlineStatus, refetch
  } = useMessages(conv?.bookingId);

  const endRef           = useRef(null);
  const scrollRef        = useRef(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const clientOnline = onlineStatus[conv?.clientId] === 'online';

  useEffect(() => {
    if (isNearBottom) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]); // eslint-disable-line

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setIsNearBottom(near);
    setShowScrollBtn(!near);
  };

  // Build grouped messages
  const grouped = [];
  let lastDate = null, lastSender = null;
  for (const msg of messages) {
    const d = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (d !== lastDate) {
      grouped.push({ type: 'date', date: msg.created_at, key: `d-${d}` });
      lastDate = d; lastSender = null;
    }
    const showAvatar = msg.sender_id !== lastSender && msg.sender_type === 'client';
    grouped.push({ type: 'msg', msg, showAvatar });
    lastSender = msg.sender_id;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
              {conv.clientName?.charAt(0) || 'C'}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
              clientOnline ? 'bg-emerald-500' : 'bg-gray-300'
            }`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">{conv.clientName}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">{conv.packageName}</p>
              <StatusBadge status={conv.bookingStatus} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {error && (
            <button onClick={refetch} className="p-2 rounded-lg hover:bg-gray-100 text-red-400">
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Phone className="h-4 w-4" /></button>
          <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><MoreVertical className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50"
        style={{ scrollbarWidth: 'thin' }}
      >
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No messages yet</p>
          </div>
        ) : (
          grouped.map(item => {
            if (item.type === 'date') return <DateSeparator key={item.key} date={item.date} />;
            const { msg, showAvatar } = item;
            const isOwn = msg.sender_type === 'agent' || (agentUser && msg.sender_id === agentUser.id);
            if (msg.sender_type === 'system') return <SystemMessage key={msg.id} message={msg} />;
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                agentName={agentUser?.agencyName || agentUser?.firstName || 'You'}
                clientName={conv.clientName}
                showAvatar={showAvatar}
              />
            );
          })
        )}
        {typingUsers.length > 0 && <TypingIndicator name={conv.clientName} />}
        <div ref={endRef} />
      </div>

      {showScrollBtn && (
        <div className="relative">
          <button
            onClick={() => endRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute bottom-20 right-4 z-10 bg-white border border-gray-200 rounded-full p-2 shadow-md hover:shadow-lg transition-all"
          >
            <ChevronDown className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      )}

      {/* Input */}
      <MessageInput
        onSend={sendMessage}
        onTyping={sendTyping}
        disabled={!conv?.bookingId}
        darkMode={false}
      />
    </div>
  );
};

// ── Main AgentMessagesTab ─────────────────────────────────────────────────────
const AgentMessagesTab = ({ user }) => {
  const { conversations, loading, refetch } = useAgentConversations();
  const [selectedConv, setSelectedConv] = useState(null);
  const [search, setSearch] = useState('');

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedConv && conversations.length > 0) {
      setSelectedConv(conversations[0]);
    }
  }, [conversations]); // eslint-disable-line

  const filtered = conversations.filter(c =>
    !search ||
    c.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    c.packageName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
          {totalUnread > 0 && (
            <span className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
              {totalUnread} new
            </span>
          )}
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden" style={{ height: '620px' }}>
        <div className="flex h-full">

          {/* ── Conversation Sidebar ───────────────────────────────────────── */}
          <div className={`border-r border-gray-200 flex flex-col flex-shrink-0 w-full md:w-80 ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                  <Users className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">
                    {search ? 'No conversations match' : 'No conversations yet'}
                  </p>
                  {!search && (
                    <p className="text-xs text-gray-400 mt-1">
                      Conversations appear when clients book your packages
                    </p>
                  )}
                </div>
              ) : (
                filtered.map(conv => (
                  <ConversationItem
                    key={conv.bookingId}
                    conv={conv}
                    isActive={selectedConv?.bookingId === conv.bookingId}
                    onClick={() => setSelectedConv(conv)}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400 text-center">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* ── Chat Area ─────────────────────────────────────────────────── */}
          <div className={`flex flex-col flex-1 min-w-0 overflow-hidden ${selectedConv ? 'flex' : 'hidden md:flex'}`}>
            {selectedConv ? (
              <div className="flex flex-col h-full">
                {/* Mobile back button */}
                <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-white flex-shrink-0">
                  <button onClick={() => setSelectedConv(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="h-4 w-4 text-gray-600" />
                  </button>
                  <span className="text-sm font-medium text-gray-700">Back to conversations</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ChatPane conv={selectedConv} agentUser={user} />
                </div>
              </div>
            ) : (
              <EmptyChatPane />
            )}
          </div>
        </div>
      </div>
    </div>
  
  );
};

export default AgentMessagesTab;