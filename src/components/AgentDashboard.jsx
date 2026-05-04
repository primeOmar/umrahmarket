import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutGrid, Users, Calendar, Package, Settings,
  LogOut, Bell, Search, Menu, X, ChevronDown, Download, Upload,
  TrendingUp, MessageCircle, FileText, Shield, CreditCard,
  Globe, Clock, CheckCircle, AlertCircle, Plus, Filter,
  MoreVertical, Edit, Trash2, Eye, Mail, Phone, User,
  Home, BarChart3, PieChart, Target, Award, Briefcase,
  BookOpen, Headphones, Image, Video, Camera, Lock,
  Printer, Share2, Copy, Check, RefreshCw,
  Send, Paperclip, Smile, ChevronUp, Info, CheckCheck,
  Loader, Circle, ArrowLeft
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import CreatePackageModal from './agent/packages/creation/CreatePackageModal';
import PackagesTab from './agent/packages/display/PackagesTab';
import { useMessages, useAgentConversations } from '../hooks/useMessages';
import { useAgentClients } from '../hooks/useAgentClients';
import { getAgentPackages } from './agent/packages/services/packagesApi';
import DocumentsTab from './agent/documents/DocumentsTab';
import { getMe } from '../services/api';

// ==================== CHAT SYSTEM COMPONENTS ====================

const DateSeparator = ({ date }) => {
  const label = isToday(new Date(date)) ? 'Today'
    : isYesterday(new Date(date)) ? 'Yesterday'
    : format(new Date(date), 'EEEE, MMMM d');
  return (
    <div className="flex items-center gap-3 my-4 select-none">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[11px] font-medium text-gray-400 px-3 py-1 bg-gray-100 rounded-full border border-gray-200">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
};

const SystemMessage = ({ text }) => (
  <div className="flex justify-center my-3">
    <div className="max-w-md px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Info className="h-3 w-3 text-amber-500" />
        <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Automated</span>
      </div>
      <p className="text-xs text-amber-800 leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  </div>
);

const TypingDots = () => (
  <div className="flex items-end gap-2 mb-1">
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">C</div>
    <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white shadow-sm border border-gray-100">
      <div className="flex gap-1">
        {[0, 150, 300].map(d => (
          <span key={d} className="w-2 h-2 rounded-full bg-gray-400 animate-bounce inline-block" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  </div>
);

const ChatBubble = ({ msg, isOwn, clientName, showAvatar, agentInitial }) => {
  const [hover, setHover] = useState(false);
  const isOptimistic = msg.is_optimistic;
  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-0.5`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className={`flex items-end gap-2 max-w-[72%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Client avatar */}
        {!isOwn && (
          <div className={`w-7 h-7 rounded-full flex-shrink-0 bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold transition-opacity ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
            {clientName?.charAt(0) || 'C'}
          </div>
        )}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {!isOwn && showAvatar && (
            <span className="text-[11px] font-medium text-gray-400 ml-1 mb-0.5">{clientName}</span>
          )}
          <div className={`px-3.5 py-2.5 rounded-2xl break-words leading-relaxed ${
            isOwn
              ? `bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-sm shadow-md ${isOptimistic ? 'opacity-60' : ''}`
              : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
          }`}>
            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
            {msg.image_urls?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {msg.image_urls.map((url, i) => (
                  <img key={i} src={url} alt="" className="max-w-[160px] max-h-[120px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition" onClick={() => window.open(url, '_blank')} />
                ))}
              </div>
            )}
          </div>
          <div className={`flex items-center gap-1 mt-0.5 transition-all ${hover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isOwn ? 'flex-row-reverse' : ''} ml-1`}>
            <span className="text-[10px] text-gray-400">{format(new Date(msg.created_at), 'h:mm a')}</span>
            {isOwn && (
              isOptimistic ? <Loader className="h-3 w-3 text-gray-400 animate-spin" />
              : msg.read_at ? <CheckCheck className="h-3 w-3 text-blue-400" />
              : <Check className="h-3 w-3 text-gray-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Inline chat input (no external MessageInput dep needed here)
const AgentChatInput = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled || sending) return;
    setSending(true);
    setText('');
    await onSend(trimmed, []);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t border-gray-100 bg-white">
      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
          onKeyDown={handleKey}
          placeholder="Type a reply… (Enter to send)"
          disabled={disabled || sending}
          className="w-full resize-none px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all overflow-hidden"
          style={{ minHeight: '42px', maxHeight: '120px' }}
        />
      </div>
      <button
        onClick={submit}
        disabled={!text.trim() || disabled || sending}
        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          text.trim() && !disabled && !sending
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg hover:scale-105'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {sending ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </button>
    </div>
  );
};

// The right-side chat pane for an active conversation
const AgentChatPane = ({ conv, agentUser }) => {
  const { messages, loading, sendMessage, sendTyping, typingUsers, refetch, currentUserId } = useMessages(conv.bookingId);
  const endRef = useRef(null);
  const scrollRef = useRef(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [unreadBelow, setUnreadBelow] = useState(0);

  // Server-verified ID beats the prop (prop may use a different field name)
  const agentId = currentUserId || agentUser?.id;

  useEffect(() => {
    if (isNearBottom) { endRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnreadBelow(0); }
    else setUnreadBelow(p => p + 1);
  }, [messages.length]); // eslint-disable-line

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setIsNearBottom(near);
    if (near) setUnreadBelow(0);
  };

  // Group messages with date separators
  const grouped = [];
  let lastDate = null, lastSender = null;
  for (const msg of messages) {
    const d = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (d !== lastDate) { grouped.push({ type: 'date', date: msg.created_at, key: `d-${d}` }); lastDate = d; lastSender = null; }
    const showAvatar = msg.sender_id !== lastSender && msg.sender_type === 'client';
    grouped.push({ type: 'msg', msg, showAvatar });
    lastSender = msg.sender_id;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
              {conv.clientName?.charAt(0) || 'C'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{conv.clientName}</p>
            <p className="text-xs text-gray-400">{conv.packageName} · <span className={`font-medium ${
              conv.bookingStatus === 'confirmed' ? 'text-emerald-600' :
              conv.bookingStatus === 'pending' ? 'text-amber-600' : 'text-gray-500'
            }`}>{conv.bookingStatus}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
            <RefreshCw className="h-4 w-4 text-gray-400" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Phone className="h-4 w-4 text-gray-400" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <MoreVertical className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50 space-y-0.5" style={{ scrollbarWidth: 'thin' }}>
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full"><Loader className="h-6 w-6 animate-spin text-blue-500" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-sm text-gray-400 font-medium">No messages yet</p>
            <p className="text-xs text-gray-300 mt-1">Send the first message to {conv.clientName}</p>
          </div>
        ) : (
          grouped.map(item => {
            if (item.type === 'date') return <DateSeparator key={item.key} date={item.date} />;
            const { msg, showAvatar } = item;
            const isOwn = msg.sender_type === 'agent' || (agentId && msg.sender_id === agentId);
            if (msg.sender_type === 'system') return <SystemMessage key={msg.id} text={msg.message} />;
            return <ChatBubble key={msg.id} msg={msg} isOwn={isOwn} clientName={conv.clientName} showAvatar={showAvatar} agentInitial={agentUser?.agencyName?.charAt(0) || 'A'} />;
          })
        )}
        {typingUsers.length > 0 && <TypingDots />}
        <div ref={endRef} />
      </div>

      {/* Scroll to bottom pill */}
      {unreadBelow > 0 && (
        <div className="relative">
          <button
            onClick={() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnreadBelow(0); }}
            className="absolute bottom-2 right-5 z-10 flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-full shadow-lg text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <span>{unreadBelow} new</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}

      <AgentChatInput onSend={sendMessage} disabled={!conv.bookingId} />
    </div>
  );
};

// Conversation list item
const ConvItem = ({ conv, isActive, onClick }) => {
  const time = conv.lastTime
    ? isToday(new Date(conv.lastTime)) ? format(new Date(conv.lastTime), 'h:mm a')
    : isYesterday(new Date(conv.lastTime)) ? 'Yesterday'
    : format(new Date(conv.lastTime), 'MMM d')
    : '';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-gray-100 transition-all flex items-start gap-3 group ${
        isActive ? 'bg-blue-50 border-l-[3px] border-l-blue-500' : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
          {conv.clientName?.charAt(0) || 'C'}
        </div>
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1">
            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-sm font-semibold truncate ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>{conv.clientName || 'Client'}</span>
          <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{time}</span>
        </div>
        <p className="text-xs text-gray-400 truncate mb-0.5">{conv.packageName}</p>
        <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
          {conv.lastMessage?.replace(/\*/g, '').substring(0, 55)}{(conv.lastMessage?.length || 0) > 55 ? '…' : ''}
        </p>
      </div>
    </button>
  );
};

// Full messages tab
const AgentMessagesTab = ({ user }) => {
  const { conversations, loading: convsLoading, refetch } = useAgentConversations();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'

  // Auto-select first on load (desktop only)
  useEffect(() => {
    if (!selected && conversations.length > 0) setSelected(conversations[0]);
  }, [conversations]); // eslint-disable-line

  const filtered = conversations.filter(c =>
    !search ||
    c.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    c.packageName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  const handleSelectConv = (conv) => {
    setSelected(conv);
    setMobileView('chat');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back button on mobile when in chat view */}
          {mobileView === 'chat' && (
            <button
              onClick={() => setMobileView('list')}
              className="sm:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Messages</h2>
          {totalUnread > 0 && (
            <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-full animate-pulse">{totalUnread}</span>
          )}
        </div>
        <button onClick={refetch} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden" style={{ height: 'min(640px, calc(100vh - 220px))' }}>
        {/* Desktop: side-by-side. Mobile: single panel at a time */}
        <div className="h-full flex">

          {/* ── Left sidebar: conversation list ── */}
          <div className={`${mobileView === 'chat' ? 'hidden' : 'flex'} sm:flex flex-col border-r border-gray-100 w-full sm:w-[280px] md:w-[300px] flex-shrink-0`}>
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search clients…"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {convsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader className="h-5 w-5 animate-spin text-blue-500" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 px-4 text-center">
                  <MessageCircle className="h-8 w-8 text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">{search ? 'No results' : 'No conversations yet'}</p>
                  {!search && <p className="text-xs text-gray-300 mt-1">Conversations appear after clients book</p>}
                </div>
              ) : (
                filtered.map(conv => (
                  <ConvItem key={conv.bookingId} conv={conv} isActive={selected?.bookingId === conv.bookingId} onClick={() => handleSelectConv(conv)} />
                ))
              )}
            </div>

            <div className="p-2.5 border-t border-gray-100 bg-gray-50 text-center">
              <p className="text-[11px] text-gray-400">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* ── Right: active chat ── */}
          <div className={`${mobileView === 'list' ? 'hidden' : 'flex'} sm:flex flex-col flex-1 overflow-hidden`}>
            {selected ? (
              <AgentChatPane conv={selected} agentUser={user} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center bg-gray-50">
                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-base font-semibold text-gray-500">Select a conversation</p>
                <p className="text-sm text-gray-400 mt-1">Choose a client from the list to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
// ==================== STATS CARD COMPONENT ====================
const StatCard = ({ icon: Icon, label, value, change, trend, color }) => (
  <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-10`}>
        <Icon className={`h-6 w-6 ${color.split(' ')[1]}`} />
      </div>
      {trend && (
        <span className={`flex items-center text-sm font-medium ${
          trend > 0 ? 'text-emerald-600' : 'text-red-600'
        }`}>
          <TrendingUp className={`h-4 w-4 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    {value === null
      ? <div className="h-8 w-16 bg-gray-200 rounded-lg animate-pulse mb-1" />
      : <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
    }
    <p className="text-sm text-gray-600">{label}</p>
    {change && (
      <p className="text-xs text-gray-500 mt-2">↑ {change} from last month</p>
    )}
  </div>
);

// ==================== CLIENT CARD COMPONENT ====================
const UMRAH_REQS = [
  { key: 'passport', label: 'Passport (6+ months validity)' },
  { key: 'visa', label: 'Saudi Umrah Visa' },
  { key: 'mahram', label: 'Mahram letter (women under 45)' },
  { key: 'vaccination', label: 'Meningitis vaccination certificate' },
  { key: 'flights', label: 'Flight tickets' },
  { key: 'photo', label: 'Passport-size photos (x6)' },
];

const HAJJ_REQS = [
  ...UMRAH_REQS,
  { key: 'hajj_permit', label: 'Hajj permit / quota slot' },
  { key: 'health_cert', label: 'Health fitness certificate' },
  { key: 'yellow_fever', label: 'Yellow fever vaccine (if applicable)' },
];

const ClientCard = ({ client, onView, onMessage }) => {
  const [expanded, setExpanded] = useState(false);
  const reqs = client.packageType === 'hajj' ? HAJJ_REQS : UMRAH_REQS;
  const travelDate = client.availableFrom
    ? new Date(client.availableFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {client.name.charAt(0)}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 leading-tight">{client.name}</h4>
              <p className="text-xs text-gray-500">{client.email}</p>
              {client.phone !== '—' && <p className="text-xs text-gray-400">{client.phone}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onMessage(client)} className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors" title="Message">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
            </button>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              client.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
              client.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              client.status === 'cancelled' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {client.status}
            </span>
          </div>
        </div>

        {/* Package info */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Package</span>
            <span className="text-xs font-medium text-gray-900 text-right max-w-[60%] truncate">{client.packageName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Type</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              client.packageType === 'hajj' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {client.packageType === 'hajj' ? 'Hajj' : 'Umrah'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="h-3 w-3" />Departure</span>
            <span className="text-xs font-medium text-gray-900">{travelDate}</span>
          </div>
          {client.duration && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" />Duration</span>
              <span className="text-xs font-medium text-gray-900">{client.duration} days</span>
            </div>
          )}
          {client.amountPaid > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-1"><CreditCard className="h-3 w-3" />Paid</span>
              <span className="text-xs font-semibold text-emerald-700">{client.currency} {Number(client.amountPaid).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Requirements section */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left"
        >
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-blue-500" />
            Preparation Requirements
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        {expanded && (
          <div className="px-5 pb-4 space-y-2">
            {reqs.map(r => (
              <div key={r.key} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
                <span className="text-xs text-gray-600">{r.label}</span>
              </div>
            ))}
            {client.notes && (
              <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs text-amber-800 font-medium mb-0.5">Client notes</p>
                <p className="text-xs text-amber-700">{client.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
        <button onClick={() => onView(client)} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
          View Full Details →
        </button>
      </div>
    </div>
  );
};

// ==================== MAIN DASHBOARD COMPONENT ====================
const AgentDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreatePackage, setShowCreatePackage] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [sidebarHovered, setSidebarHovered] = useState(false); // desktop hover expand
  const [searchQuery, setSearchQuery] = useState('');

  // ── Live agent profile fetched from DB ──────────────────────────
  const [agentProfile, setAgentProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getMe();
        const json = res?.data;
        if (json?.success && json?.data?.user) setAgentProfile(json.data.user);
      } catch (err) {
        console.error('[AgentDashboard] profile fetch failed:', err.message);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Merge: DB profile takes precedence over login-time prop
  const profile      = agentProfile || user;
  const displayName  = profile?.agentName  || profile?.agencyName  || profile?.firstName || 'Agency';
  const displayEmail = profile?.email || user?.email || '';
  const displayAgent = profile?.agentNumber || user?.agentNumber || '';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  // ────────────────────────────────────────────────────────────────

  // ── Clients ─────────────────────────────────────────────────────────────────
  const [clientSearch, setClientSearch] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState('all');
  const { clients, loading: clientsLoading, error: clientsError, refetch: refetchClients } = useAgentClients();

  // ── Conversations / unread count ─────────────────────────────────────────────
  const { conversations } = useAgentConversations();
  const unreadCount = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  // ── Package count (PackagesTab is self-fetching; we just need the count here) ─
  const [packageCount, setPackageCount] = useState(null);
  useEffect(() => {
    getAgentPackages()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.packages ?? data.data ?? []);
        setPackageCount(list.length);
      })
      .catch(() => setPackageCount(null));
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const activeClientsCount = clients.filter(c => c.status === 'confirmed').length;

  const stats = [
    { icon: Users,         label: 'Total Clients',   value: clientsLoading ? null : String(clients.length),         color: 'from-blue-500 to-indigo-600 text-blue-600' },
    { icon: CheckCircle,   label: 'Active Clients',  value: clientsLoading ? null : String(activeClientsCount),     color: 'from-emerald-500 to-teal-600 text-emerald-600' },
    { icon: Package,       label: 'My Packages',     value: packageCount === null ? null : String(packageCount),    color: 'from-purple-500 to-pink-600 text-purple-600' },
    { icon: MessageCircle, label: 'Unread Messages', value: String(unreadCount),                                    color: 'from-amber-500 to-orange-600 text-amber-600' },
  ];

  // Recent clients — live slice from fetched data
  const recentClients = clients.slice(0, 4).map(c => ({
    id: c.bookingId ?? c.id,
    name: c.name,
    email: c.email,
    package: c.packageName,
    status: c.status,
  }));

  const notifications = [
    { id: 1, title: 'New Booking Request', message: 'Fatima Hassan requested Hajj package', time: '5 min ago', read: false },
    { id: 2, title: 'Document Verified', message: 'Your license has been approved', time: '2 hours ago', read: true },
    { id: 3, title: 'Payment Received', message: '$4,500 from Ahmed Mohammed', time: '1 day ago', read: true }
  ];

  const menuItems = [
    { id: 'overview',  icon: Home,         label: 'Overview' },
    { id: 'clients',   icon: Users,         label: 'Clients',  count: clientsLoading ? null : (clients.length || null) },
    { id: 'packages',  icon: Package,       label: 'Packages', count: packageCount },
    { id: 'analytics', icon: BarChart3,     label: 'Analytics' },
    { id: 'documents', icon: FileText,      label: 'Documents' },
    { id: 'messages',  icon: MessageCircle, label: 'Messages', count: unreadCount || null },
    { id: 'settings',  icon: Settings,      label: 'Settings' },
  ];

  const handleViewClient = (client) => {
    console.log('View client:', client);
  };

  const handleMessageClient = (client) => {
    console.log('Message client:', client);
  };

  const handleEditClient = (client) => {
    console.log('Edit client:', client);
  };

  const handleEditPackage = (pkg) => {
    console.log('Edit package:', pkg);
  };

  const handleDuplicatePackage = (pkg) => {
    console.log('Duplicate package:', pkg);
  };

  const handleDeletePackage = (pkg) => {
    if (window.confirm('Are you sure you want to delete this package?')) {
      console.log('Delete package:', pkg);
    }
  };

  const handleDocumentUpload = async (files) => {
    console.log('Uploading documents:', files);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  const handleSavePackage = (packageData) => {
    console.log('Saving package:', packageData);
  };

  // Close mobile drawer after nav click; desktop uses hover — no click needed
  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setSidebarOpen(false); // always close mobile drawer
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Create Package Modal */}
      <CreatePackageModal
        isOpen={showCreatePackage}
        onClose={() => setShowCreatePackage(false)}
        onSave={handleSavePackage}
      />

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/*
        SIDEBAR
        • Mobile  : hidden off-screen, slides in as full drawer when sidebarOpen=true
        • Desktop (lg+): always visible as a 16px-wide icon rail; expands to 256px on hover
          — content is never pushed/shifted, sidebar floats over the page
      */}
      <div
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`
          fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200
          flex flex-col
          transition-all duration-300 ease-in-out
          overflow-hidden
          ${/* Mobile: off-screen unless drawer open */ ''}
          ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          lg:translate-x-0
          ${sidebarHovered ? 'lg:w-64 lg:shadow-2xl' : 'lg:w-16'}
        `}
      >
        {/* Agency Info */}
        <div className="p-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 min-w-[2.5rem] rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {profileLoading ? <Loader className="h-4 w-4 animate-spin" /> : avatarLetter}
            </div>
            {/* Show when sidebar expanded (hover on desktop, always on mobile) */}
            <div className={`transition-all duration-200 overflow-hidden flex-1 min-w-0 ${sidebarHovered ? 'lg:opacity-100 lg:w-auto' : 'lg:opacity-0 lg:w-0'}`}>
              <h3 className="font-semibold text-gray-900 text-sm truncate">{displayName}</h3>
              {displayAgent && <p className="text-xs text-gray-500 truncate font-mono">{displayAgent}</p>}
              <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px]">Verified</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-0.5">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavClick(item.id)}
                  title={!sidebarHovered ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {/* Icon — always visible */}
                  <div className="relative flex-shrink-0">
                    <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    {/* Dot badge on icon when collapsed */}
                    {item.count > 0 && !sidebarHovered && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full lg:block hidden" />
                    )}
                  </div>

                  {/* Label — on mobile always visible; on desktop only when hovered */}
                  <span className={`font-medium text-sm flex-1 text-left whitespace-nowrap transition-all duration-200 lg:${sidebarHovered ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                    {item.label}
                  </span>

                  {/* Count badge — on mobile always visible; on desktop only when hovered */}
                  {item.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 transition-all duration-200 ${
                      item.id === 'messages' ? 'bg-blue-600 text-white animate-pulse' : activeTab === item.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    } ${!sidebarHovered ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden lg:px-0' : ''}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Upgrade Banner — only when expanded */}
        <div className={`transition-all duration-200 flex-shrink-0 ${sidebarHovered ? 'opacity-100 max-h-40 p-3' : 'opacity-0 max-h-0 overflow-hidden p-0 lg:block'} lg:mx-2 lg:mb-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white`}>
          <h4 className="font-semibold text-sm mb-1">Upgrade to Premium</h4>
          <p className="text-[11px] opacity-90 mb-2">More features & higher commissions</p>
          <button className="w-full py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors">
            Learn More
          </button>
        </div>
        {/* Collapsed upgrade dot */}
        <div className={`hidden lg:flex items-center justify-center py-2 mb-1 ${sidebarHovered ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'} transition-all duration-200`}>
          <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" title="Upgrade to Premium" />
        </div>

        {/* Logout */}
        <div className="p-2 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onLogout}
            title={!sidebarHovered ? 'Logout' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className={`font-medium text-sm whitespace-nowrap transition-all duration-200 ${sidebarHovered ? 'lg:opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'}`}>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content
          Desktop: always offset by the collapsed rail width (lg:ml-16), never fully hidden
          Mobile: no offset (sidebar is overlay drawer)
      */}
      <div className="transition-all duration-300 lg:ml-16">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2 md:space-x-4 flex-1 min-w-0">
              {/* Hamburger — mobile only (desktop uses hover rail) */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              
              {/* Search */}
              <div className="relative w-full max-w-xs md:max-w-sm lg:max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients, bookings, packages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
              {/* Quick Actions */}
              <button
                onClick={() => setShowCreatePackage(true)}
                className="hidden sm:flex items-center space-x-2 px-3 md:px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium hidden md:inline">New Package</span>
              </button>

              {/* Mobile: New Package icon-only */}
              <button
                onClick={() => setShowCreatePackage(true)}
                className="sm:hidden p-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg"
              >
                <Plus className="h-4 w-4" />
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden sm:block"
                title="Upload Documents"
              >
                <Upload className="h-5 w-5 text-gray-600" />
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      <button className="text-xs text-blue-600 hover:text-blue-700">Mark all as read</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div key={notif.id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50/30' : ''}`}>
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="text-sm font-medium text-gray-900">{notif.title}</h4>
                            <span className="text-xs text-gray-500">{notif.time}</span>
                          </div>
                          <p className="text-sm text-gray-600">{notif.message}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 text-center border-t border-gray-200">
                      <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden md:block">
                  {profileLoading ? (
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
                      <div className="h-2.5 w-36 bg-gray-100 rounded animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900">{displayName}</p>
                      <p className="text-xs text-gray-500">{displayEmail}</p>
                      {displayAgent && (
                        <p className="text-[10px] text-gray-400 font-mono">{displayAgent}</p>
                      )}
                    </>
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                  {profileLoading ? <Loader className="h-4 w-4 animate-spin" /> : avatarLetter}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-4 md:p-8 pb-24 lg:pb-8">
          {activeTab === 'overview' && (
            <div className="space-y-6 md:space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <StatCard key={index} {...stat} />
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900">Revenue Overview</h3>
                    <select className="text-sm border border-gray-200 rounded-lg px-3 py-2">
                      <option>Last 7 days</option>
                      <option>Last 30 days</option>
                      <option>Last 3 months</option>
                    </select>
                  </div>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl">
                    <p className="text-gray-400">Chart visualization would go here</p>
                  </div>
                </div>

                {/* Booking Distribution */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900">Booking Distribution</h3>
                    <button className="text-sm text-emerald-600 hover:text-emerald-700">View Details →</button>
                  </div>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl">
                    <p className="text-gray-400">Chart visualization would go here</p>
                  </div>
                </div>
              </div>

              {/* Recent Clients & Bookings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Clients */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900">Recent Clients</h3>
                    <button onClick={() => setActiveTab('clients')} className="text-sm text-emerald-600 hover:text-emerald-700">
                      View All →
                    </button>
                  </div>
                  <div className="space-y-4">
                    {clientsLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-gray-200 rounded w-2/5" />
                            <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                          </div>
                          <div className="h-5 w-16 bg-gray-100 rounded-full" />
                        </div>
                      ))
                    ) : recentClients.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Users className="h-8 w-8 text-gray-200 mb-2" />
                        <p className="text-sm text-gray-400">No clients yet</p>
                      </div>
                    ) : (
                      recentClients.map((client) => (
                        <div key={client.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                              {client.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{client.name}</h4>
                              <p className="text-xs text-gray-500">{client.package}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            client.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                            client.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            client.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {client.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'clients' && (() => {
            const filteredClients = clients.filter(c => {
              const matchSearch = !clientSearch ||
                c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                c.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
                c.packageName.toLowerCase().includes(clientSearch.toLowerCase());
              const matchStatus = clientStatusFilter === 'all' || c.status === clientStatusFilter;
              return matchSearch && matchStatus;
            });

            return (
              <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">Client Management</h2>
                    {!clientsLoading && (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                        {clients.length} client{clients.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <button onClick={refetchClients} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, email, package…"
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                  <select
                    value={clientStatusFilter}
                    onChange={e => setClientStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {clientsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader className="h-8 w-8 animate-spin text-emerald-500" />
                  </div>
                ) : clientsError ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
                    <p className="text-sm font-medium text-gray-700">Failed to load clients</p>
                    <p className="text-xs text-gray-500 mt-1">{clientsError}</p>
                    <button onClick={refetchClients} className="mt-4 px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                      Retry
                    </button>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Users className="h-12 w-12 text-gray-200 mb-3" />
                    <p className="text-sm font-medium text-gray-600">
                      {clients.length === 0 ? 'No clients yet' : 'No clients match your search'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {clients.length === 0 ? 'Clients will appear once they book your packages' : 'Try adjusting your search or filters'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map(client => (
                      <ClientCard
                        key={client.bookingId}
                        client={client}
                        onView={handleViewClient}
                        onMessage={handleMessageClient}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === 'packages' && (
            <PackagesTab
              onCreatePackage={() => setShowCreatePackage(true)}
              onEditPackage={handleEditPackage}
              onDuplicatePackage={handleDuplicatePackage}
              onDeletePackage={handleDeletePackage}
            />
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Analytics & Reports</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4">Booking Trends</h3>
                  <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-400">Chart here</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4">Popular Packages</h3>
                  <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-400">Chart here</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4">Client Demographics</h3>
                  <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-400">Chart here</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Revenue Report</h3>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400">Detailed chart here</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <DocumentsTab agentId={profile?.id} />
          )}

          {activeTab === 'messages' && (
            <AgentMessagesTab user={user} />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Settings</h2>
              
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Profile Settings</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Agency Name</label>
                      <input
                        type="text"
                        defaultValue={user?.agencyName}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                      <input
                        type="text"
                        defaultValue={user?.licenseNumber}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        defaultValue={user?.email}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        defaultValue={user?.phone}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all">
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {[
          { id: 'overview', icon: Home, label: 'Home' },
          { id: 'clients', icon: Users, label: 'Clients' },
          { id: 'messages', icon: MessageCircle, label: 'Messages', count: unreadCount },
          { id: 'settings', icon: Settings, label: 'More' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === item.id ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {item.count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-0.5">
                  {item.count > 9 ? '9+' : item.count}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
            {activeTab === item.id && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default AgentDashboard;