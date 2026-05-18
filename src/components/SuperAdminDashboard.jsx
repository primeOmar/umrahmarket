import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Users, MessageCircle, FileText, Package, Settings,
  LogOut, Search, Menu, X, Shield, Activity, TrendingUp, Briefcase,
  Download, RefreshCw, CheckCircle, XCircle, Loader, AlertTriangle,
  Eye, EyeOff, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

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
  const [stats,     setStats]     = useState(null);

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
    try {
      const [statsRes, agentsRes, clientsRes, chatsRes, docsRes, pkgsRes, logsRes] = await Promise.all([
        saApi.get('/superadmin/stats'),
        saApi.get('/superadmin/agents'),
        saApi.get('/superadmin/clients'),
        saApi.get('/superadmin/chats'),
        saApi.get('/superadmin/documents'),
        saApi.get('/superadmin/packages'),
        saApi.get('/superadmin/audit-logs?limit=50'),
      ]);

      const [statsData, agentsData, clientsData, chatsData, docsData, pkgsData, logsData] = await Promise.all([
        statsRes.json(), agentsRes.json(), clientsRes.json(),
        chatsRes.json(), docsRes.json(),   pkgsRes.json(), logsRes.json(),
      ]);

      setStats(statsData?.data ?? statsData);
      setAgents(agentsData?.data ?? agentsData ?? []);
      setClients(clientsData?.data ?? clientsData ?? []);
      setChats(chatsData?.data ?? chatsData ?? []);
      setDocuments(docsData?.data ?? docsData ?? []);
      setPackages(pkgsData?.data ?? pkgsData ?? []);
      setAuditLogs(logsData?.data ?? logsData ?? []);
    } catch (e) {
      toast.error(e.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    saStore.clear();
    navigate('/superadmin/login');
  };

  const handleCloseChat = async () => {
    if (!selectedChat || !closeReason.trim()) { toast.error('Please provide a reason'); return; }
    setActionLoading(true);
    try {
      await saJson(await saApi.post(`/superadmin/chats/${selectedChat.id}/close`, { reason: closeReason }));
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
      toast.success(`Document ${status}`);
      setShowDocumentModal(false); setVerificationNotes(''); fetchAll();
    } catch (e) { toast.error(e.message || 'Failed to verify document'); }
    finally { setActionLoading(false); }
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

  const navItems = [
    { id: 'overview',  label: 'Dashboard',  icon: LayoutDashboard },
    { id: 'agents',    label: 'Agents',      icon: Briefcase,     count: agents.filter(a => a.status === 'pending').length },
    { id: 'clients',   label: 'Clients',     icon: Users },
    { id: 'chats',     label: 'Chats',       icon: MessageCircle, count: chats.filter(c => c.status === 'active').length },
    { id: 'documents', label: 'Documents',   icon: FileText,      count: documents.filter(d => d.status === 'pending').length },
    { id: 'packages',  label: 'Packages',    icon: Package },
    { id: 'audit',     label: 'Audit Logs',  icon: Activity },
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
          {activeTab === 'agents'    && <AgentsTab   agents={agents} searchQuery={searchQuery} />}
          {activeTab === 'clients'   && <ClientsTab  clients={clients} searchQuery={searchQuery} />}
          {activeTab === 'chats'     && (
            <ChatsTab
              chats={chats}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectChat={c => { setSelectedChat(c); setShowChatModal(true); }}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab
              documents={documents}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              onSelectDocument={d => { setSelectedDocument(d); setShowDocumentModal(true); }}
            />
          )}
          {activeTab === 'packages'  && (
            <PackagesTab packages={packages} onSelectPackage={p => { setSelectedPackage(p); setShowPackageModal(true); }} />
          )}
          {activeTab === 'audit'     && <AuditTab logs={auditLogs} />}
          {activeTab === 'settings'  && <SettingsTab superadmin={superadmin} onLogout={handleLogout} />}
        </main>
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────── */}

      {showChatModal && (
        <Modal title="Close Chat" onClose={() => { setShowChatModal(false); setCloseReason(''); }}>
          <p className="text-sm text-gray-600 mb-4">
            Chat between <strong>{selectedChat?.clientName}</strong> and <strong>{selectedChat?.agentName}</strong>
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
          <textarea
            value={closeReason}
            onChange={e => setCloseReason(e.target.value)}
            rows={3}
            placeholder="Enter reason for closing this chat…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setShowChatModal(false); setCloseReason(''); }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={handleCloseChat}
              disabled={actionLoading || !closeReason.trim()}
              className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {actionLoading && <Loader className="h-4 w-4 animate-spin" />} Close Chat
            </button>
          </div>
        </Modal>
      )}

      {showDocumentModal && (
        <Modal title="Verify Document" onClose={() => { setShowDocumentModal(false); setVerificationNotes(''); }}>
          <p className="text-sm text-gray-600 mb-1">Agent: <strong>{selectedDocument?.agentName}</strong></p>
          <div className="flex flex-wrap gap-2 my-3">
            {selectedDocument?.incorporationDoc && <Badge color="blue">Incorporation</Badge>}
            {selectedDocument?.tourismDoc        && <Badge color="green">Tourism</Badge>}
            {selectedDocument?.kraPin            && <Badge color="purple">KRA PIN</Badge>}
          </div>
          {/* Document links */}
          {(selectedDocument?.incorporationDoc || selectedDocument?.tourismDoc || selectedDocument?.kraPin) && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">View Documents</p>
              {selectedDocument?.incorporationDoc && (
                <a href={selectedDocument.incorporationDoc} target="_blank" rel="noreferrer"
                   className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <FileText className="h-3.5 w-3.5" /> Incorporation Certificate
                </a>
              )}
              {selectedDocument?.tourismDoc && (
                <a href={selectedDocument.tourismDoc} target="_blank" rel="noreferrer"
                   className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <FileText className="h-3.5 w-3.5" /> Tourism License
                </a>
              )}
              {selectedDocument?.kraPin && (
                <a href={selectedDocument.kraPin} target="_blank" rel="noreferrer"
                   className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <FileText className="h-3.5 w-3.5" /> KRA PIN Certificate
                </a>
              )}
            </div>
          )}
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={verificationNotes}
            onChange={e => setVerificationNotes(e.target.value)}
            rows={3}
            placeholder="Verification notes (optional)…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setShowDocumentModal(false); setVerificationNotes(''); }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => handleVerifyDocument('rejected')}
              disabled={actionLoading}
              className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading && <Loader className="h-4 w-4 animate-spin" />} Reject
            </button>
            <button
              onClick={() => handleVerifyDocument('approved')}
              disabled={actionLoading}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading && <Loader className="h-4 w-4 animate-spin" />} Approve
            </button>
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
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
      <div className="flex items-center justify-between p-5 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5">{children}</div>
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

const AgentsTab = ({ agents, searchQuery }) => {
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
              <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                <Td><span className="font-medium text-gray-900">{agent.name}</span></Td>
                <Td>{agent.email}</Td>
                <Td><StatusBadge status={agent.status} /></Td>
                <Td>{agent.packageCount ?? 0}</Td>
                <Td>{agent.clientCount ?? 0}</Td>
                <Td className="text-gray-400">{agent.createdAt ? format(new Date(agent.createdAt), 'MMM d, yyyy') : '—'}</Td>
              </tr>
            ))}
            {filtered.length === 0 && <EmptyRow colSpan={6} message="No agents found" />}
          </tbody>
        </table>
      </TableWrapper>
    </div>
  );
};

const ClientsTab = ({ clients, searchQuery }) => {
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
              <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                <Td><span className="font-medium text-gray-900">{client.name}</span></Td>
                <Td>{client.email}</Td>
                <Td><StatusBadge status={client.status} /></Td>
                <Td>{client.bookingCount ?? 0}</Td>
                <Td className="text-gray-400">{client.createdAt ? format(new Date(client.createdAt), 'MMM d, yyyy') : '—'}</Td>
              </tr>
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
              <tr key={chat.id} className="hover:bg-gray-50 transition-colors">
                <Td><span className="font-medium text-gray-900">{chat.clientName}</span></Td>
                <Td>{chat.agentName}</Td>
                <Td>{chat.messageCount ?? 0}</Td>
                <Td><StatusBadge status={chat.status} /></Td>
                <Td className="text-gray-400">{chat.lastActivity ? formatDistanceToNow(new Date(chat.lastActivity)) + ' ago' : '—'}</Td>
                <Td>
                  {chat.status !== 'closed' && (
                    <button onClick={() => onSelectChat(chat)} className="text-red-600 hover:text-red-700 text-sm font-medium hover:underline">
                      Close
                    </button>
                  )}
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

const DocumentsTab = ({ documents, filterStatus, setFilterStatus, onSelectDocument }) => {
  const filtered = documents.filter(d => filterStatus === 'all' || d.status === filterStatus);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Documents</h1>
          <p className="text-sm text-gray-500 mt-1">{documents.filter(d => d.status === 'pending').length} pending review</p>
        </div>
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
      <div className="grid grid-cols-1 gap-3">
        {filtered.map(doc => (
          <div key={doc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{doc.agentName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Submitted {doc.submittedAt ? format(new Date(doc.submittedAt), 'MMM d, yyyy') : '—'}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {doc.incorporationDoc && <Badge color="blue">Incorporation</Badge>}
                  {doc.tourismDoc       && <Badge color="green">Tourism</Badge>}
                  {doc.kraPin          && <Badge color="purple">KRA PIN</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <StatusBadge status={doc.status} />
                <button
                  onClick={() => onSelectDocument(doc)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Review
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-sm text-gray-400">No documents found</p>
          </div>
        )}
      </div>
    </div>
  );
};

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