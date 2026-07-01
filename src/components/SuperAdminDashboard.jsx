import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LayoutDashboard, Users, MessageCircle, FileText, Package, Settings,
  LogOut, Search, Menu, X, Shield, Activity, TrendingUp, Briefcase,
  Download, RefreshCw, CheckCircle, XCircle, Loader, AlertTriangle,
  Eye, EyeOff, Lock, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AccountingTab } from './AccountingTab';
import ResourcesTab from './Resorces/ResourcesTab';
// ─── API base (no trailing /api duplication) ──────────────────────────────────
const _base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const BASE_API = _base.endsWith('/api') ? _base : `${_base}/api`;

// ─── Superadmin-scoped token store ────────────────────────────────────────────
const saStore = {
  getToken:  ()    => localStorage.getItem('superadmin_token'),
  getUser:   ()    => { try { return JSON.parse(localStorage.getItem('superadmin_user')); } catch { return null; } },
  clear:     ()    => {
    ['superadmin_token','superadmin_refresh_token','superadmin_user'].forEach(k => localStorage.removeItem(k));
  },
};

// ─── Fetch wrapper with auto-refresh ─────────────────────────────────────────
let _refreshing = false;
let _queue = [];

const processQueue = (err, token) => {
  _queue.forEach(({ resolve, reject }) => err ? reject(err) : resolve(token));
  _queue = [];
};

const saFetch = async (url, options = {}) => {
  const doRequest = (token) => fetch(`${BASE_API}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  let token = saStore.getToken();
  let res = await doRequest(token);

  if (res.status !== 401) return res;

  // 401 → try refresh
  if (_refreshing) {
    return new Promise((resolve, reject) => {
      _queue.push({
        resolve: (newToken) => resolve(doRequest(newToken)),
        reject,
      });
    });
  }

  _refreshing = true;
  try {
    const refreshToken = localStorage.getItem('superadmin_refresh_token');
    if (!refreshToken) throw new Error('No refresh token');

    const refreshRes = await fetch(`${BASE_API}/superadmin/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshRes.ok) throw new Error('Refresh failed');
    const data = await refreshRes.json();
    const newToken = data?.data?.accessToken || data?.accessToken;
    if (!newToken) throw new Error('No new token in refresh response');

    localStorage.setItem('superadmin_token', newToken);
    processQueue(null, newToken);
    return doRequest(newToken);
  } catch (err) {
    processQueue(err, null);
    saStore.clear();
    window.location.href = '/superadmin/login';
    throw err;
  } finally {
    _refreshing = false;
  }
};

const saApi = {
  get:    (url)          => saFetch(url, { method: 'GET' }),
  post:   (url, body)    => saFetch(url, { method: 'POST',   body: JSON.stringify(body) }),
  delete: (url, body)    => saFetch(url, { method: 'DELETE', body: JSON.stringify(body) }),
};

const saJson = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

// ─── Per-item "viewed" helpers ────────────────────────────────────────────────
// Each category stores a JSON array of IDs in localStorage so badge counts
// only clear when the admin has individually opened every pending item.
// ─── Document item definitions ───────────────────────────────────────────────
// Drives the per-document review cards in the document modal. `urlField`
// matches the field name the backend returns in GET /superadmin/documents
// (see superadmin_routes.js normalized response).
//
// `required` MUST match REQUIRED_DOC_KEYS in superadmin_routes.js exactly.
// director_id is required — DocumentsTab.jsx (the agent's upload UI)
// confirms a real "Director / Manager ID" upload card exists.
// office_photo remains optional — some agencies are home-based.
const DOCUMENT_ITEM_DEFS = [
  { key: 'incorporation', label: 'Incorporation Certificate', urlField: 'incorporationDoc', required: true },
  { key: 'tourism',       label: 'Tourism License',           urlField: 'tourismDoc',        required: true },
  { key: 'krapin',        label: 'KRA PIN Certificate',        urlField: 'kraPin',            required: true },
  { key: 'director_id',   label: 'Director ID',                urlField: 'directorIdDoc',     required: true },
  { key: 'office_photo',  label: 'Office Photo',               urlField: 'officePhoto',       required: false },
];

const VIEWED_KEY = (category) => `superadmin_viewed_ids_${category}`;

const loadViewedIds = (category) => {
  try {
    const raw = localStorage.getItem(VIEWED_KEY(category));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const persistViewedIds = (category, set) => {
  try {
    localStorage.setItem(VIEWED_KEY(category), JSON.stringify([...set]));
  } catch {
    // quota exceeded — silently ignore
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// ROOT COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [superadmin, setSuperadmin] = useState(null);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [agents,    setAgents]    = useState([]);
  const [clients,   setClients]   = useState([]);
  const [chats,     setChats]     = useState([]);
  const [documents, setDocuments] = useState([]);
  const [packages,  setPackages]  = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [accountingTransactions, setAccountingTransactions] = useState([]);
  const [accountingLoading, setAccountingLoading] = useState(false);
  const [stats,     setStats]     = useState(null);
  const [documentsError, setDocumentsError] = useState(null);

  // ── Per-item viewed tracking (Set of IDs persisted in localStorage) ──────
  // Count only drops when the admin has individually opened each item.
  const [viewedAgentIds,    setViewedAgentIds]    = useState(() => loadViewedIds('agents'));
  const [viewedClientIds,   setViewedClientIds]   = useState(() => loadViewedIds('clients'));
  const [viewedChatIds,     setViewedChatIds]     = useState(() => loadViewedIds('chats'));
  const [viewedDocumentIds, setViewedDocumentIds] = useState(() => loadViewedIds('documents'));

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const refreshTimerRef = useRef(null);

  // Modals
  const [selectedChat,     setSelectedChat]     = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedPackage,  setSelectedPackage]  = useState(null);
  const [showChatModal,     setShowChatModal]     = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showPackageModal,  setShowPackageModal]  = useState(false);
  const [confirmModal,      setConfirmModal]      = useState(null); // { title, body, onConfirm }

  // Forms
  const [closeReason,       setCloseReason]       = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  // Per-document note drafts, keyed by doc type ('incorporation', 'tourism', …).
  // Each document is reviewed independently now, so each needs its own
  // notes field rather than one shared textarea for the whole bundle.
  const [itemNotes, setItemNotes] = useState({});
  // Tracks which single doc-type button is mid-request, e.g. 'incorporation',
  // so only that row shows a spinner instead of disabling the whole modal.
  const [itemActionLoading, setItemActionLoading] = useState(null);
  const [filterStatus,      setFilterStatus]      = useState('all');
  const [actionLoading,     setActionLoading]     = useState(false);

  // ── init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = saStore.getToken();
    const user  = saStore.getUser();
    if (!token || !user) { navigate('/superadmin/login'); return; }
    setSuperadmin(user);
    fetchAll();
  }, [navigate]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    let documentsList = [];
    try {
      const [statsData, agentsData, clientsData, chatsData, docsData, pkgsData, acctData, logsData] = await Promise.all([
        saJson(await saApi.get('/superadmin/stats')),
        saJson(await saApi.get('/superadmin/agents')),
        saJson(await saApi.get('/superadmin/clients')),
        saJson(await saApi.get('/superadmin/chats')),
        saJson(await saApi.get('/superadmin/documents')),
        saJson(await saApi.get('/superadmin/packages')),
        // accounting transactions (backend should implement /superadmin/accounting/transactions)
        saApi.get('/superadmin/accounting/transactions?limit=200')
          .then(r => saJson(r))
          .catch(() => ({ data: [] })),
        saJson(await saApi.get('/superadmin/audit-logs?limit=50')),
      ]);

      setStats(statsData?.data ?? statsData);
      setAgents(Array.isArray(agentsData?.data) ? agentsData.data : []);
      setClients(Array.isArray(clientsData?.data) ? clientsData.data : []);
      setChats(Array.isArray(chatsData?.data) ? chatsData.data : []);
      
      // Documents with error handling
      let fetchedDocuments = [];
      try {
        fetchedDocuments = Array.isArray(docsData?.data) ? docsData.data : [];
        setDocuments(fetchedDocuments);
        documentsList = fetchedDocuments;
        setDocumentsError(null);
        if (fetchedDocuments.length > 0) {
          toast.success(`Loaded ${fetchedDocuments.length} document(s)`);
        }
      } catch (docErr) {
        console.error('Failed to fetch documents:', docErr);
        setDocumentsError(docErr.message);
        toast.error('Could not load documents. Check console.');
      }
      
      setPackages(Array.isArray(pkgsData?.data) ? pkgsData.data : []);
      // acctData may be wrapped in { data: [...] }
      setAccountingTransactions(Array.isArray(acctData?.data) ? acctData.data : (Array.isArray(acctData) ? acctData : []));
      setAuditLogs(Array.isArray(logsData?.data) ? logsData.data : []);
    } catch (e) {
      const msg = e.message || 'Failed to load dashboard data';
      console.error('Dashboard load error:', msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
    return documentsList;
  }, []);

  const handleLogout = () => {
    saStore.clear();
    navigate('/superadmin/login');
  };

  // Accounting helpers
  const formatCurrency = (v) => {
    if (v == null) return '—';
    try { return `KES ${Number(v).toLocaleString()}`; } catch { return String(v); }
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
  };

  const handleDisburseTransaction = async (tx) => {
    if (!tx || !tx.id) return;
    if (!window.confirm(`Mark transaction ${tx.id} as disbursed to ${tx.agentName || 'agent'} for ${formatCurrency(tx.amount)}?`)) return;
    setActionLoading(true);
    try {
      const res = await saApi.post(`/superadmin/accounting/transactions/${tx.id}/disburse`, { });
      const data = await saJson(res);
      toast.success(data?.message || 'Marked as disbursed');
      await fetchAll();
    } catch (e) {
      toast.error(e.message || 'Failed to disburse');
    } finally { setActionLoading(false); }
  };

  const handleDownloadReceipt = async (tx, preview = false) => {
  if (!tx?.id) return;
  try {
    const url = preview
      ? `/superadmin/accounting/transactions/${tx.id}/receipt?inline=1`
      : `/superadmin/accounting/transactions/${tx.id}/receipt`;

    const res = await saFetch(url, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch receipt');
    const blob = await res.blob();

    if (preview) {
      window.open(window.URL.createObjectURL(blob), '_blank');
      toast.success('Receipt opened in new tab');
    } else {
      downloadBlob(blob, `receipt-${tx.id.slice(0, 8)}.pdf`);
      toast.success('Receipt downloaded');
    }
  } catch (e) {
    toast.error(e.message || 'Failed to get receipt');
  }
};

  const handleEmailReceipt = async (tx) => {
    if (!tx || !tx.id) return;
    const email = window.prompt('Enter recipient email', tx.agentEmail || tx.clientEmail || '');
    if (!email) return;
    setActionLoading(true);
    try {
      const res = await saJson(await saApi.post(`/superadmin/accounting/transactions/${tx.id}/email`, { email }));
      toast.success(res?.message || 'Email queued');
    } catch (e) {
      toast.error(e.message || 'Failed to email receipt');
    } finally { setActionLoading(false); }
  };

  // ── Per-item viewed tracking ─────────────────────────────────────────────
  // Badge counts only reach 0 once every individual pending item has been opened.
  // Clicking a sidebar tab no longer clears counts; only opening each item does.
  const markItemViewed = useCallback((category, id) => {
    if (id == null) return;
    const strId = String(id);
    const setters = {
      agents:    setViewedAgentIds,
      clients:   setViewedClientIds,
      chats:     setViewedChatIds,
      documents: setViewedDocumentIds,
    };
    const setter = setters[category];
    if (!setter) return;
    setter(prev => {
      if (prev.has(strId)) return prev; // already viewed, no re-render
      const next = new Set(prev);
      next.add(strId);
      persistViewedIds(category, next);
      return next;
    });
  }, []);

  const fetchChatMessages = useCallback(async (bookingId, silent = false) => {
    if (!bookingId) return;
    if (!silent) setChatMessages([]);
    if (!silent) setChatLoading(true);
    try {
      const res = await saApi.get(`/superadmin/chats/${bookingId}/messages`);
      const data = await res.json();
      const messages = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.messages)
          ? data.messages
          : Array.isArray(data?.messages?.data)
            ? data.messages.data
            : [];
      setChatMessages(messages);
    } catch (e) {
      toast.error(e.message || 'Failed to load chat messages');
    } finally {
      if (!silent) setChatLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showChatModal || !selectedChat) return;
    const bookingId = selectedChat.bookingId || selectedChat.booking_id || selectedChat.id;
    if (!bookingId) return;
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(() => fetchChatMessages(bookingId, true), 5000);
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [showChatModal, selectedChat, fetchChatMessages]);

  const handleOpenChat = async (chat) => {
    setSelectedChat(chat);
    setShowChatModal(true);
    // Mark this specific chat as viewed so its badge count drops
    markItemViewed('chats', chat.id ?? chat.bookingId ?? chat.booking_id);
    await fetchChatMessages(chat.bookingId || chat.booking_id || chat.id);
  };

  const handleCloseChat = async () => {
    if (!selectedChat || !closeReason.trim()) { toast.error('Please provide a reason'); return; }
    setActionLoading(true);
    try {
      const bookingId = selectedChat.bookingId || selectedChat.booking_id || selectedChat.id;
      await saJson(await saApi.post(`/superadmin/chats/${bookingId}/close`, { reason: closeReason }));
      toast.success('Chat closed');
      setShowChatModal(false); setCloseReason(''); fetchAll();
    } catch (e) { toast.error(e.message || 'Failed to close chat'); }
    finally { setActionLoading(false); }
  };

  const handleVerifyDocument = async (status) => {
    if (!selectedDocument) return;
    setActionLoading(true);
    try {
      await saJson(await saApi.post(`/superadmin/documents/${selectedDocument.id}/verify`, { status, notes: verificationNotes }));
      // Refresh only documents
      const docsData = await saJson(await saApi.get('/superadmin/documents'));
      const refreshedDocs = Array.isArray(docsData?.data) ? docsData.data : [];
      setDocuments(refreshedDocs);
      const refreshed = refreshedDocs.find((doc) => doc.id === selectedDocument.id);
      if (refreshed) setSelectedDocument(refreshed);
      setVerificationNotes('');
      toast.success(`Document ${status} successfully`);
    } catch (e) {
      toast.error(e.message || 'Failed to verify document');
    } finally {
      setActionLoading(false);
    }
  };

  // Approves/rejects ONE document type (e.g. just "tourism") within the
  // bundle, independent of the others. The backend recomputes the overall
  // bundle status (and the agent's ability to post packages) after each
  // call — see recomputeOverallStatus in superadmin_routes.js.
  const handleVerifyDocumentItem = async (docType, status) => {
    if (!selectedDocument) return;
    setItemActionLoading(docType);
    try {
      const notes = itemNotes[docType] || '';
      const res = await saJson(
        await saApi.post(`/superadmin/documents/${selectedDocument.id}/verify-item`, { docType, status, notes })
      );

      // Refresh the full documents list so other tabs (Agents, badge
      // counts) reflect the new overall status immediately, not just
      // this modal.
      const docsData = await saJson(await saApi.get('/superadmin/documents'));
      const refreshedDocs = Array.isArray(docsData?.data) ? docsData.data : [];
      setDocuments(refreshedDocs);
      const refreshed = refreshedDocs.find((doc) => doc.id === selectedDocument.id);
      if (refreshed) setSelectedDocument(refreshed);

      setItemNotes(prev => ({ ...prev, [docType]: '' }));

      const overall = res?.data?.overallStatus;
      const label = docType.replace('_', ' ');
      if (overall === 'approved') {
        toast.success(`${label} approved — agent is now fully verified and can post packages.`);
      } else if (status === 'rejected') {
        toast.error(`${label} marked not genuine.`);
      } else {
        toast.success(`${label} approved.`);
      }
    } catch (e) {
      toast.error(e.message || 'Failed to verify document');
    } finally {
      setItemActionLoading(null);
    }
  };

  const handleDeletePackage = async () => {
    if (!selectedPackage || !closeReason.trim()) { toast.error('Please provide a reason'); return; }
    setConfirmModal({
      title: 'Delete Package',
      body: `Are you sure you want to permanently delete "${selectedPackage.name}"? This cannot be undone.`,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await saJson(await saApi.delete(`/superadmin/packages/${selectedPackage.id}`, { reason: closeReason }));
          toast.success('Package deleted');
          setShowPackageModal(false); setCloseReason(''); fetchAll();
        } catch (e) { toast.error(e.message || 'Failed to delete package'); }
        finally { setActionLoading(false); setConfirmModal(null); }
      },
    });
  };

  const handleExport = async (dataType) => {
    try {
      const res = await saFetch(`/superadmin/export/${dataType}`, { method: 'GET' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${dataType}-${Date.now()}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Exported successfully');
    } catch (e) { toast.error(e.message || 'Export failed'); }
  };

  // Badge counts: pending/active items whose individual ID has NOT yet been opened.
  // Counts only drop when the admin opens each specific item — never on tab click.
  const newPendingAgentsCount    = useMemo(
    () => agents.filter(a => a?.status === 'pending' && !viewedAgentIds.has(String(a.id))).length,
    [agents, viewedAgentIds],
  );
  const newPendingClientsCount   = useMemo(
    () => clients.filter(c => c?.status === 'pending' && !viewedClientIds.has(String(c.id))).length,
    [clients, viewedClientIds],
  );
  const newActiveChatsCount      = useMemo(
    () => chats.filter(ch => ch?.status !== 'closed' && !viewedChatIds.has(String(ch.id ?? ch.bookingId))).length,
    [chats, viewedChatIds],
  );
  const newPendingDocumentsCount = useMemo(
    () => documents.filter(d => d?.status === 'pending' && !viewedDocumentIds.has(String(d.id))).length,
    [documents, viewedDocumentIds],
  );

const navItems = [
  { id: 'overview',  label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'agents',    label: 'Agents',      icon: Briefcase,     count: newPendingAgentsCount },
  { id: 'clients',   label: 'Clients',     icon: Users,         count: newPendingClientsCount },
  { id: 'chats',     label: 'Chats',       icon: MessageCircle, count: newActiveChatsCount },
  { id: 'documents', label: 'Documents',   icon: FileText,      count: newPendingDocumentsCount },
  { id: 'packages',  label: 'Packages',    icon: Package },
  { id: 'resources', label: 'Resources',   icon: BookOpen },
  { id: 'audit',     label: 'Audit Logs',  icon: Activity },
  { id: 'accounting',label: 'Accounting',  icon: TrendingUp },
  { id: 'settings',  label: 'Settings',    icon: Settings },
];

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-sm text-gray-500">Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <div
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`
          fixed inset-y-0 left-0 z-30 bg-slate-900 flex flex-col
          transition-all duration-300 ease-in-out overflow-hidden
          ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          lg:translate-x-0
          ${sidebarHovered ? 'lg:w-64 lg:shadow-2xl' : 'lg:w-16'}
        `}
      >
        <div className="h-16 flex items-center gap-3 px-3 border-b border-slate-700 flex-shrink-0">
          <div className="w-10 h-10 min-w-[2.5rem] rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className={`transition-all duration-200 overflow-hidden ${sidebarHovered ? 'lg:opacity-100 lg:w-auto' : 'lg:opacity-0 lg:w-0'}`}>
            <p className="font-bold text-white text-sm whitespace-nowrap">Superadmin</p>
            <p className="text-slate-400 text-xs whitespace-nowrap truncate max-w-[140px]">{superadmin?.email}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-0.5">
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  title={!sidebarHovered ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    activeTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <item.icon className="h-5 w-5" />
                    {item.count > 0 && !sidebarHovered && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full hidden lg:block" />
                    )}
                  </div>
                  <span className={`font-medium text-sm flex-1 text-left whitespace-nowrap transition-all duration-200 ${sidebarHovered ? 'lg:opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'}`}>
                    {item.label}
                  </span>
                  {item.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 bg-amber-400 text-slate-900 transition-all duration-200 ${!sidebarHovered ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden lg:px-0' : ''}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-2 border-t border-slate-700 flex-shrink-0">
          <button
            onClick={handleLogout}
            title={!sidebarHovered ? 'Logout' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-red-900/40 hover:text-red-400 rounded-xl transition-colors"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className={`font-medium text-sm whitespace-nowrap transition-all duration-200 ${sidebarHovered ? 'lg:opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'}`}>
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <div className="transition-all duration-300 lg:ml-16">

        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="relative hidden sm:block w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search agents, clients, packages…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={fetchAll} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
                <RefreshCw className="h-5 w-5 text-gray-500" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {superadmin?.email?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900 leading-none">{superadmin?.username || 'Admin'}</p>
                  <p className="text-xs text-blue-600 font-medium mt-0.5">Superadmin</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          {activeTab === 'overview'  && <OverviewTab stats={stats} auditLogs={auditLogs} onExport={handleExport} />}
          {activeTab === 'agents'    && <AgentsTab   agents={agents} searchQuery={searchQuery} onViewAgent={id => markItemViewed('agents', id)} />}
          {activeTab === 'clients'   && <ClientsTab  clients={clients} searchQuery={searchQuery} onViewClient={id => markItemViewed('clients', id)} />}
          {activeTab === 'resources' && <ResourcesTab />}
          {activeTab === 'chats'     && (
            <ChatsTab
              chats={chats}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectChat={handleOpenChat}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab
              documents={documents}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              onRefreshDocuments={fetchAll}
              onSelectDocument={d => { setSelectedDocument(d); setShowDocumentModal(true); markItemViewed('documents', d.id); }}
              error={documentsError}
            />
          )}
          {activeTab === 'packages'  && (
            <PackagesTab packages={packages} onSelectPackage={p => { setSelectedPackage(p); setShowPackageModal(true); }} />
          )}
          {activeTab === 'audit'     && <AuditTab logs={auditLogs} />}
         {activeTab === 'accounting' && (
  <AccountingTab
    transactions={accountingTransactions}
    loading={accountingLoading}
    onDisburse={handleDisburseTransaction}
    onDownloadReceipt={handleDownloadReceipt}
    onEmailReceipt={handleEmailReceipt}
    onRefresh={fetchAll}
    onExportCsv={() => {
      saFetch('/superadmin/accounting/export', { method: 'GET' })
        .then(r => r.blob())
        .then(blob => downloadBlob(blob, `accounting-${Date.now()}.csv`))
        .catch(e => toast.error(e.message));
    }}
  />
)}
          {activeTab === 'settings'  && <SettingsTab superadmin={superadmin} onLogout={handleLogout} />}
        </main>
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────── */}

      {showChatModal && (
        <Modal title="Chat Thread" onClose={() => { setShowChatModal(false); setCloseReason(''); setChatMessages([]); }}>
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
              <p className="text-sm text-gray-600">Chat between</p>
              <p className="text-base font-semibold text-gray-900">{selectedChat?.clientName || 'Client'}</p>
              <p className="text-base font-semibold text-gray-900">and {selectedChat?.agentName || 'Agent'}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Badge color={selectedChat?.status === 'closed' ? 'red' : 'green'}>{selectedChat?.status === 'closed' ? 'Closed' : 'Active'}</Badge>
                <span className="text-slate-500">{selectedChat?.messageCount ?? 0} messages</span>
                <span className="text-slate-500">Last activity: {selectedChat?.lastActivity ? formatDistanceToNow(new Date(selectedChat.lastActivity)) + ' ago' : '—'}</span>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
              {chatLoading && (
                <div className="text-center py-10 text-sm text-gray-500">Loading messages…</div>
              )}
              {!chatLoading && chatMessages.length === 0 && (
                <div className="text-center py-10 text-sm text-gray-500">No messages found for this chat.</div>
              )}
              {!chatLoading && chatMessages.map(msg => (
                <div key={msg.id} className={`rounded-2xl p-3 ${msg.senderType === 'agent' ? 'bg-blue-50 text-slate-900' : msg.senderType === 'client' ? 'bg-slate-100 text-slate-900' : 'bg-gray-100 text-slate-900'}`}>
                  <div className="flex items-center justify-between gap-3 mb-2 text-xs text-slate-500">
                    <span>{msg.senderName}</span>
                    <span>{msg.createdAt ? format(new Date(msg.createdAt), 'MMM d, yyyy HH:mm') : '—'}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))}
            </div>

            <label className="block text-sm font-medium text-gray-700">Reason for closing chat <span className="text-red-500">*</span></label>
            <textarea
              value={closeReason}
              onChange={e => setCloseReason(e.target.value)}
              rows={3}
              placeholder="Enter reason for closing this chat…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />

            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowChatModal(false); setCloseReason(''); setChatMessages([]); }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleCloseChat}
                disabled={actionLoading || !closeReason.trim() || selectedChat?.status === 'closed'}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader className="h-4 w-4 animate-spin" />} Close Chat
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showDocumentModal && (
        <Modal title="Verify Agent Documents" onClose={() => { setShowDocumentModal(false); setVerificationNotes(''); setItemNotes({}); }}>
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">Agent</p>
                  <p className="text-base font-semibold text-gray-900">{selectedDocument?.agentName || 'Unknown Agent'}</p>
                  {selectedDocument?.agentEmail && <p className="text-sm text-gray-500">{selectedDocument.agentEmail}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Overall status</p>
                  <StatusBadge status={selectedDocument?.status || 'pending'} />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Each document is checked individually. The agent is confirmed genuine — and can post packages —
                only once every required document below is approved.
              </p>
              {selectedDocument?.reviewRequestedAt && (
                <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  Agent requested a priority review on {format(new Date(selectedDocument.reviewRequestedAt), 'MMM d, yyyy HH:mm')}.
                </div>
              )}
            </div>

            {/* ── Per-document review cards ── */}
            <div className="space-y-3">
              {DOCUMENT_ITEM_DEFS.map(({ key, label, urlField, required }) => {
                const url = selectedDocument?.[urlField];
                const item = selectedDocument?.items?.[key] || { status: 'pending', notes: null, reviewedAt: null };
                const isOfficePhoto = key === 'office_photo';
                const photos = isOfficePhoto
                  ? (Array.isArray(url) ? url : (url ? [url] : []))
                  : null;
                const isUploaded = isOfficePhoto ? photos.length > 0 : !!url;
                const isLoading = itemActionLoading === key;

                return (
                  <div key={key} className="bg-white rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900 text-sm">{label}</span>
                        {required
                          ? <span className="text-[10px] uppercase tracking-wide text-gray-400">Required</span>
                          : <span className="text-[10px] uppercase tracking-wide text-gray-400">Optional</span>}
                      </div>
                      <StatusBadge status={isUploaded ? item.status : 'pending'} />
                    </div>

                    {!isUploaded ? (
                      <p className="text-sm text-gray-400 mt-2">Not uploaded yet.</p>
                    ) : (
                      <>
                        {/* Link(s) to the actual file(s) */}
                        <div className="mt-2">
                          {isOfficePhoto ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {photos.map((photo, idx) => (
                                <a key={idx} href={photo.publicUrl || photo} target="_blank" rel="noreferrer"
                                   className="text-sm text-blue-600 hover:underline truncate break-words">
                                  Photo {idx + 1}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <a href={url} target="_blank" rel="noreferrer"
                               className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                              <FileText className="h-3.5 w-3.5" /> View document
                            </a>
                          )}
                        </div>

                        {/* Prior review note for this specific document, if any */}
                        {item.status !== 'pending' && item.notes && (
                          <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2">
                            {item.notes}
                          </p>
                        )}

                        {/* Note field + approve/reject — only meaningful once uploaded */}
                        <textarea
                          value={itemNotes[key] || ''}
                          onChange={e => setItemNotes(prev => ({ ...prev, [key]: e.target.value }))}
                          rows={2}
                          placeholder={`Notes about this ${label.toLowerCase()}…`}
                          className="w-full mt-3 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />

                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleVerifyDocumentItem(key, 'rejected')}
                            disabled={isLoading || item.status === 'rejected'}
                            className="flex-1 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                          >
                            {isLoading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                            Not genuine
                          </button>
                          <button
                            onClick={() => handleVerifyDocumentItem(key, 'approved')}
                            disabled={isLoading || item.status === 'approved'}
                            className="flex-1 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                          >
                            {isLoading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                            Approve
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => { setShowDocumentModal(false); setVerificationNotes(''); setItemNotes({}); }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showPackageModal && (
        <Modal title="Delete Package" onClose={() => { setShowPackageModal(false); setCloseReason(''); }}>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800">This action cannot be undone</p>
          </div>
          <p className="text-sm text-gray-600 mb-1">Package: <strong>{selectedPackage?.name}</strong></p>
          <p className="text-sm text-gray-600 mb-4">Price: <strong>KES {selectedPackage?.price?.toLocaleString()}</strong></p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
          <textarea
            value={closeReason}
            onChange={e => setCloseReason(e.target.value)}
            rows={3}
            placeholder="Enter reason for deletion…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setShowPackageModal(false); setCloseReason(''); }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={handleDeletePackage}
              disabled={actionLoading || !closeReason.trim()}
              className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {actionLoading && <Loader className="h-4 w-4 animate-spin" />} Delete Package
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm modal (replaces window.confirm) */}
      {confirmModal && (
        <Modal title={confirmModal.title} onClose={() => setConfirmModal(null)}>
          <p className="text-sm text-gray-600 mb-6">{confirmModal.body}</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmModal(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={confirmModal.onConfirm}
              disabled={actionLoading}
              className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading && <Loader className="h-4 w-4 animate-spin" />} Confirm
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES
// ═════════════════════════════════════════════════════════════════════════════

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 overflow-y-auto max-h-[calc(90vh-5rem)]">{children}</div>
    </div>
  </div>
);

const Badge = ({ color, children }) => {
  const colors = {
    blue:   'bg-blue-100 text-blue-700',
    green:  'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    yellow: 'bg-yellow-100 text-yellow-800',
    red:    'bg-red-100 text-red-700',
    gray:   'bg-gray-100 text-gray-600',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>{children}</span>;
};

const StatusBadge = ({ status }) => {
  const map = {
    active:    { color: 'green',  label: 'Active' },
    inactive:  { color: 'gray',   label: 'Inactive' },
    pending:   { color: 'yellow', label: 'Pending' },
    approved:  { color: 'green',  label: 'Approved' },
    rejected:  { color: 'red',    label: 'Rejected' },
    suspended: { color: 'red',    label: 'Suspended' },
    closed:    { color: 'gray',   label: 'Closed' },
  };
  const { color, label } = map[status] || { color: 'gray', label: status ?? '—' };
  return <Badge color={color}>{label}</Badge>;
};

const StatCard = ({ title, value, icon: Icon, color, trend, sub }) => {
  const bg = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber:  'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          {trend != null && (
            <p className={`text-xs font-medium mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last week
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${bg[color] || bg.blue}`}><Icon className="h-6 w-6" /></div>
      </div>
    </div>
  );
};

const SectionHeader = ({ title, action }) => (
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    {action}
  </div>
);

const TableWrapper = ({ children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="overflow-x-auto">{children}</div>
  </div>
);

const Th = ({ children }) => (
  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">{children}</th>
);

const Td = ({ children, className = '' }) => (
  <td className={`px-5 py-4 text-sm text-gray-700 ${className}`}>{children}</td>
);

const EmptyRow = ({ colSpan, message = 'No data found' }) => (
  <tr><td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-gray-400">{message}</td></tr>
);

/**
 * ObservedRow — a <tr> that calls onViewed(id) once when the row scrolls
 * into the viewport (threshold 0.5, 600 ms dwell).
 * Only fires for items where isPending=true and onViewed is provided.
 * This lets agents/clients badge counts drop row-by-row as the admin
 * actually sees them in the table, rather than on tab click.
 */
const ObservedRow = ({ id, isPending, onViewed, children }) => {
  const rowRef = React.useRef(null);
  const firedRef = React.useRef(false);

  React.useEffect(() => {
    if (!isPending || !onViewed || firedRef.current) return;
    const el = rowRef.current;
    if (!el) return;

    let timer = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Require 600 ms of visibility so a quick scroll-past doesn't count
          timer = setTimeout(() => {
            if (!firedRef.current) {
              firedRef.current = true;
              onViewed(id);
            }
            observer.disconnect();
          }, 600);
        } else {
          clearTimeout(timer);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [id, isPending, onViewed]);

  return (
    <tr ref={rowRef} className="hover:bg-gray-50 transition-colors">
      {children}
    </tr>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// TAB COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

const OverviewTab = ({ stats, auditLogs, onExport }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
      <p className="text-sm text-gray-500 mt-1">Full system monitoring & control</p>
    </div>

    {stats && (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Agents"      value={stats.totalAgents}      icon={Briefcase}     color="blue"   trend={stats.agentsTrend} />
        <StatCard title="Total Clients"     value={stats.totalClients}     icon={Users}         color="green"  trend={stats.clientsTrend} />
        <StatCard title="Active Chats"      value={stats.activeChats}      icon={MessageCircle} color="purple" trend={stats.chatsTrend} />
        <StatCard title="Pending Documents" value={stats.pendingDocuments} icon={FileText}      color="amber"  trend={stats.docsTrend} />
      </div>
    )}

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <SectionHeader title="Export Data" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['agents', 'clients', 'bookings', 'packages'].map(type => (
          <button
            key={type}
            onClick={() => onExport(type)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-sm rounded-xl transition-colors"
          >
            <Download className="h-4 w-4" />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
    </div>

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <SectionHeader title="Recent Activity" />
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {auditLogs.slice(0, 20).map(log => (
          <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{log.action}</p>
              <p className="text-xs text-gray-400">{log.resourceType} · {log.reason || '—'}</p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
              {log.createdAt ? formatDistanceToNow(new Date(log.createdAt)) + ' ago' : '—'}
            </span>
          </div>
        ))}
        {auditLogs.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No activity yet</p>}
      </div>
    </div>
  </div>
);

const AgentsTab = ({ agents, searchQuery, onViewAgent }) => {
  const filtered = agents.filter(a =>
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
        <p className="text-sm text-gray-500 mt-1">{agents.length} registered agencies</p>
      </div>
      <TableWrapper>
        <table className="w-full">
          <thead><tr><Th>Agent</Th><Th>Email</Th><Th>Status</Th><Th>Packages</Th><Th>Clients</Th><Th>Joined</Th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(agent => (
              <ObservedRow key={agent.id} id={agent.id} isPending={agent.status === 'pending'} onViewed={onViewAgent}>
                <Td><span className="font-medium text-gray-900">{agent.name}</span></Td>
                <Td>{agent.email}</Td>
                <Td><StatusBadge status={agent.status} /></Td>
                <Td>{agent.packageCount ?? 0}</Td>
                <Td>{agent.clientCount ?? 0}</Td>
                <Td className="text-gray-400">{agent.createdAt ? format(new Date(agent.createdAt), 'MMM d, yyyy') : '—'}</Td>
              </ObservedRow>
            ))}
            {filtered.length === 0 && <EmptyRow colSpan={6} message="No agents found" />}
          </tbody>
        </table>
      </TableWrapper>
    </div>
  );
};

const ClientsTab = ({ clients, searchQuery, onViewClient }) => {
  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="text-sm text-gray-500 mt-1">{clients.length} registered pilgrims</p>
      </div>
      <TableWrapper>
        <table className="w-full">
          <thead><tr><Th>Client</Th><Th>Email</Th><Th>Status</Th><Th>Bookings</Th><Th>Joined</Th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(client => (
              <ObservedRow key={client.id} id={client.id} isPending={client.status === 'pending'} onViewed={onViewClient}>
                <Td><span className="font-medium text-gray-900">{client.name}</span></Td>
                <Td>{client.email}</Td>
                <Td><StatusBadge status={client.status} /></Td>
                <Td>{client.bookingCount ?? 0}</Td>
                <Td className="text-gray-400">{client.createdAt ? format(new Date(client.createdAt), 'MMM d, yyyy') : '—'}</Td>
              </ObservedRow>
            ))}
            {filtered.length === 0 && <EmptyRow colSpan={5} message="No clients found" />}
          </tbody>
        </table>
      </TableWrapper>
    </div>
  );
};

const ChatsTab = ({ chats, searchQuery, setSearchQuery, onSelectChat }) => {
  const filtered = chats.filter(c =>
    c.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.agentName?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
          <p className="text-sm text-gray-500 mt-1">{chats.filter(c => c.status === 'active').length} active conversations</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
        </div>
      </div>
      <TableWrapper>
        <table className="w-full">
          <thead><tr><Th>Client</Th><Th>Agent</Th><Th>Messages</Th><Th>Status</Th><Th>Last Activity</Th><Th>Actions</Th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(chat => (
              <tr key={chat.id} onClick={() => onSelectChat(chat)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                <Td><span className="font-medium text-gray-900">{chat.clientName}</span></Td>
                <Td>{chat.agentName}</Td>
                <Td>{chat.messageCount ?? 0}</Td>
                <Td><StatusBadge status={chat.status} /></Td>
                <Td className="text-gray-400">{chat.lastActivity ? formatDistanceToNow(new Date(chat.lastActivity)) + ' ago' : '—'}</Td>
                <Td>
                  <button onClick={(e) => { e.stopPropagation(); onSelectChat(chat); }} className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline">
                    View
                  </button>
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && <EmptyRow colSpan={6} message="No chats found" />}
          </tbody>
        </table>
      </TableWrapper>
    </div>
  );
};

const DocumentsTab = ({ documents, filterStatus, setFilterStatus, onRefreshDocuments, onSelectDocument, error }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Documents</h1>
        <p className="text-sm text-gray-500 mt-1">Review uploaded documents and confirm whether the agent is genuine.</p>
        <p className="text-sm text-gray-500 mt-1">{documents.filter(d => d.status === 'pending').length} pending verification</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefreshDocuments}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white hover:bg-gray-50 text-gray-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
    </div>

    {error && (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        Failed to load documents: {error}
      </div>
    )}

    <div className="grid grid-cols-1 gap-3">
      {documents.map(doc => {
        const requiredKeys = DOCUMENT_ITEM_DEFS.filter(d => d.required).map(d => d.key);
        const approvedCount = requiredKeys.filter(k => doc.items?.[k]?.status === 'approved').length;
        return (
          <div key={doc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{doc.agentName}</p>
                  {doc.reviewRequestedAt && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="h-3 w-3" /> Review requested
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Submitted {doc.submittedAt ? format(new Date(doc.submittedAt), 'MMM d, yyyy') : '—'} · {approvedCount}/{requiredKeys.length} required docs approved
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {DOCUMENT_ITEM_DEFS.map(({ key, label, urlField }) => {
                    const uploaded = key === 'office_photo'
                      ? (Array.isArray(doc[urlField]) ? doc[urlField].length > 0 : !!doc[urlField])
                      : !!doc[urlField];
                    if (!uploaded) return null;
                    const itemStatus = doc.items?.[key]?.status || 'pending';
                    const color = itemStatus === 'approved' ? 'green' : itemStatus === 'rejected' ? 'red' : 'blue';
                    return <Badge key={key} color={color}>{label}</Badge>;
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <StatusBadge status={doc.status} />
                <button
                  onClick={() => onSelectDocument(doc)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {documents.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-400">No documents found</p>
        </div>
      )}
    </div>
  </div>
);

const PackagesTab = ({ packages, onSelectPackage }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Packages</h1>
      <p className="text-sm text-gray-500 mt-1">{packages.length} total packages</p>
    </div>
    <TableWrapper>
      <table className="w-full">
        <thead><tr><Th>Package</Th><Th>Type</Th><Th>Price</Th><Th>Bookings</Th><Th>Created By</Th><Th>Actions</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {packages.map(pkg => (
            <tr key={pkg.id} className="hover:bg-gray-50 transition-colors">
              <Td><span className="font-medium text-gray-900">{pkg.name}</span></Td>
              <Td>{pkg.type}</Td>
              <Td>KES {pkg.price?.toLocaleString()}</Td>
              <Td>{pkg.bookingCount ?? 0}</Td>
              <Td>{pkg.createdByName || '—'}</Td>
              <Td>
                <button onClick={() => onSelectPackage(pkg)} className="text-red-600 hover:text-red-700 text-sm font-medium hover:underline">
                  Delete
                </button>
              </Td>
            </tr>
          ))}
          {packages.length === 0 && <EmptyRow colSpan={6} message="No packages" />}
        </tbody>
      </table>
    </TableWrapper>
  </div>
);

const AuditTab = ({ logs }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
      <p className="text-sm text-gray-500 mt-1">All admin actions are tracked here</p>
    </div>
    <TableWrapper>
      <table className="w-full">
        <thead><tr><Th>Admin</Th><Th>Action</Th><Th>Resource</Th><Th>Reason</Th><Th>Status</Th><Th>Timestamp</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {logs.map(log => (
            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
              <Td><span className="font-medium text-gray-900">{log.superadminUsername}</span></Td>
              <Td>{log.action}</Td>
              <Td className="text-gray-400">{log.resourceType} #{log.resourceId}</Td>
              <Td className="text-gray-400 max-w-[180px] truncate">{log.reason || '—'}</Td>
              <Td><StatusBadge status={log.status === 'success' ? 'approved' : 'rejected'} /></Td>
              <Td className="text-gray-400 whitespace-nowrap">
                {log.createdAt ? format(new Date(log.createdAt), 'MMM d, yyyy HH:mm') : '—'}
              </Td>
            </tr>
          ))}
          {logs.length === 0 && <EmptyRow colSpan={6} message="No logs yet" />}
        </tbody>
      </table>
    </TableWrapper>
  </div>
);


const SettingsTab = ({ superadmin, onLogout }) => (
  <div className="space-y-6 max-w-xl">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="text-sm text-gray-500 mt-1">Account & security preferences</p>
    </div>

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <h2 className="font-semibold text-gray-900 mb-4">Account Info</h2>
      {[
        { label: 'Username',  value: superadmin?.username },
        { label: 'Email',     value: superadmin?.email },
        { label: 'Full Name', value: superadmin?.fullName || '—' },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
          <span className="text-sm text-gray-500">{label}</span>
          <span className="text-sm font-medium text-gray-900">{value}</span>
        </div>
      ))}
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-500">2FA</span>
        <Badge color="green">Enabled</Badge>
      </div>
    </div>

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Security</h2>
      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
        <Lock className="h-4 w-4" /> Change Password
      </button>
    </div>

    <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
      <h2 className="font-semibold text-red-900 mb-3">Sign Out</h2>
      <p className="text-sm text-red-700 mb-4">You will be redirected to the login page.</p>
      <button
        onClick={onLogout}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </div>
  </div>
);

export default SuperAdminDashboard;