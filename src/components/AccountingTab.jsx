/**
 * AccountingTab.jsx
 * Drop-in replacement for the AccountingTab component in SuperAdminDashboard.jsx
 *
 * USAGE – replace the existing AccountingTab const and add the new state/handlers
 * to the parent SuperAdminDashboard component as shown in the integration comments.
 *
 * Features:
 *  - Summary cards: Total Revenue, Total Profit, Pending Disbursements, Disbursed
 *  - Per-transaction status: Client Paid / Agent Not Yet Received vs Disbursed
 *  - Disburse action with confirmation modal (no window.confirm)
 *  - Download PDF receipt, Preview in new tab, Email receipt
 *  - Filter by disbursement status + date range
 *  - Export accounting CSV
 *  - Responsive table with sticky header
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  DollarSign, TrendingUp, Clock, CheckCircle2, Download, Mail,
  Eye, ArrowDownCircle, Filter, Search, RefreshCw, ChevronDown,
  AlertCircle, X, FileText, Loader2, Calendar
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (kes) => {
  if (kes == null || Number.isNaN(Number(kes))) return '—';
  return `KES ${Number(kes).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
};

const fmtWithUsd = (kes, fxRate) => {
  if (kes == null) return '—';
  const kesStr = `KES ${Number(kes).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  if (fxRate && fxRate > 0) {
    const usd = kes / fxRate;
    return `${kesStr} (~$${usd.toFixed(2)})`;
  }
  return kesStr;
};

const fmtDate = (v) => {
  if (!v) return '—';
  try { return format(new Date(v), 'dd MMM yyyy, HH:mm'); }
  catch { return String(v); }
};

const shortId = (id) => (id ? String(id).slice(0, 8).toUpperCase() : '—');

// ─── Summary Card ────────────────────────────────────────────────────────────

const SummaryCard = ({ icon: Icon, label, value, sub, color, pulse }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4`}>
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-5 h-5 text-white" />
      {pulse && <span className="absolute w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping top-0 right-0" />}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Disbursement Status Badge ────────────────────────────────────────────────

const DisbursementBadge = ({ tx }) => {
  if (tx.disbursed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        Disbursed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3 h-3" />
      Awaiting Disbursement
    </span>
  );
};

// ─── Confirm Modal ────────────────────────────────────────────────────────────

const ConfirmDisburseModal = ({ tx, onConfirm, onCancel, loading }) => {
  if (!tx) return null;
  const agentShare = tx.amount - (tx.profit ?? 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Confirm Disbursement</h3>
              <p className="text-xs text-gray-400">This action cannot be undone</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Transaction</span>
            <span className="font-mono font-semibold text-gray-700">{shortId(tx.id)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Package</span>
            <span className="font-medium text-gray-700 truncate max-w-[160px]">{tx.packageName || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Agent</span>
            <span className="font-medium text-gray-700 truncate max-w-[160px]">{tx.agentName || tx.agentEmail || '—'}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Client Paid</span>
              <span className="font-semibold text-gray-800">{fmt(tx.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Platform Profit ({tx.percentage ?? 0}%)</span>
              <span className="font-semibold text-emerald-700">{fmt(tx.profit)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1">
              <span className="text-gray-700 font-semibold">Disbursing to Agent</span>
              <span className="font-bold text-blue-700 text-base">{fmt(agentShare)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => onConfirm(tx)} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownCircle className="w-4 h-4" />}
            Disburse Funds
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Receipt Preview Modal ─────────────────────────────────────────────────────

const ReceiptPreviewModal = ({ tx, onClose, onDownload, onEmail, previewLoading }) => {
  const [emailInput, setEmailInput] = useState(tx?.agentEmail || tx?.clientEmail || '');
  const [showEmailInput, setShowEmailInput] = useState(false);

  if (!tx) return null;
  const agentShare = tx.amount - (tx.profit ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Receipt Preview</h3>
              <p className="text-xs text-gray-400 font-mono">{shortId(tx.id)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Receipt card */}
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 space-y-4 font-mono text-sm">
          <div className="text-center border-b border-gray-200 pb-3">
            <p className="text-base font-bold text-gray-900">UMRAH MARKET</p>
            <p className="text-xs text-gray-400">Official Agent Disbursement Receipt</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Receipt ID</span>
              <span className="font-semibold text-gray-800">{shortId(tx.id)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Date</span>
              <span className="text-gray-700">{fmtDate(tx.disbursedAt || tx.paidAt)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Package</span>
              <span className="text-gray-700 text-right max-w-[180px] truncate">{tx.packageName || '—'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Client</span>
              <span className="text-gray-700">{tx.clientName || tx.clientEmail || '—'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Agent</span>
              <span className="text-gray-700">{tx.agentName || tx.agentEmail || '—'}</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Package Revenue</span>
              <span className="text-gray-800 font-semibold">{fmt(tx.amount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Platform Fee ({tx.percentage ?? 0}%)</span>
              <span className="text-gray-500">- {fmt(tx.profit)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-300 pt-2">
              <span className="text-gray-900">Agent Disbursement</span>
              <span className="text-blue-700">{fmt(agentShare)}</span>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              {tx.disbursed ? '✓ Funds have been disbursed to the agent' : '⏳ Disbursement pending'}
            </p>
          </div>
        </div>

        {/* Email input */}
        {showEmailInput && (
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="recipient@email.com"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => { onEmail(tx, emailInput); setShowEmailInput(false); }}
              disabled={!emailInput}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => onDownload(tx, true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
            <Eye className="w-4 h-4" /> Open PDF
          </button>
          <button onClick={() => onDownload(tx, false)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Download
          </button>
          <button onClick={() => setShowEmailInput(v => !v)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors">
            <Mail className="w-4 h-4" /> Email
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main AccountingTab ───────────────────────────────────────────────────────

export const AccountingTab = ({
  transactions = [],
  loading = false,
  onDisburse,
  onDownloadReceipt,
  onEmailReceipt,
  onRefresh,
  onExportCsv,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | disbursed
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [confirmTx, setConfirmTx] = useState(null);
  const [previewTx, setPreviewTx] = useState(null);
  const [disburseLoading, setDisburseLoading] = useState(false);

  // ── Derived summary ───────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalRevenue   = transactions.reduce((s, t) => s + Number(t.amount  ?? 0), 0);
    const totalProfit    = transactions.reduce((s, t) => s + Number(t.profit  ?? 0), 0);
    const pendingCount   = transactions.filter(t => !t.disbursed).length;
    const pendingAmount  = transactions.filter(t => !t.disbursed).reduce((s, t) => s + Number(t.amount ?? 0) - Number(t.profit ?? 0), 0);
    const disbursedCount = transactions.filter(t => t.disbursed).length;
    const disbursedAmt   = transactions.filter(t => t.disbursed).reduce((s, t) => s + Number(t.amount ?? 0) - Number(t.profit ?? 0), 0);
    return { totalRevenue, totalProfit, pendingCount, pendingAmount, disbursedCount, disbursedAmt };
  }, [transactions]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...transactions];
    if (statusFilter === 'pending')   list = list.filter(t => !t.disbursed);
    if (statusFilter === 'disbursed') list = list.filter(t => t.disbursed);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t =>
        String(t.id).toLowerCase().includes(q) ||
        (t.packageName || '').toLowerCase().includes(q) ||
        (t.clientName  || t.clientEmail  || '').toLowerCase().includes(q) ||
        (t.agentName   || t.agentEmail   || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom) list = list.filter(t => t.paidAt && new Date(t.paidAt) >= new Date(dateFrom));
    if (dateTo)   list = list.filter(t => t.paidAt && new Date(t.paidAt) <= new Date(dateTo + 'T23:59:59'));
    return list;
  }, [transactions, statusFilter, search, dateFrom, dateTo]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleConfirmDisburse = useCallback(async (tx) => {
    setDisburseLoading(true);
    try {
      await onDisburse(tx);
      setConfirmTx(null);
    } finally {
      setDisburseLoading(false);
    }
  }, [onDisburse]);

  const handleDownload = useCallback(async (tx, preview = false) => {
    await onDownloadReceipt(tx, preview);
  }, [onDownloadReceipt]);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track client payments, platform revenue, profits, and agent disbursements
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onExportCsv && (
            <button onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
          <button onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={DollarSign}
          label="Total Revenue"
          value={fmt(summary.totalRevenue)}
          sub={`${transactions.length} transactions`}
          color="bg-indigo-600"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Platform Profit"
          value={fmt(summary.totalProfit)}
          sub="From package % fees"
          color="bg-emerald-600"
        />
        <SummaryCard
          icon={Clock}
          label="Pending Disbursement"
          value={fmt(summary.pendingAmount)}
          sub={`${summary.pendingCount} agent(s) awaiting`}
          color="bg-amber-500"
          pulse={summary.pendingCount > 0}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Disbursed to Agents"
          value={fmt(summary.disbursedAmt)}
          sub={`${summary.disbursedCount} completed`}
          color="bg-blue-600"
        />
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, package, client, agent…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Transactions</option>
              <option value="pending">Awaiting Disbursement</option>
              <option value="disbursed">Disbursed</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Clear dates">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {statusFilter === 'pending' && summary.pendingCount > 0 && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700 font-medium">
              {summary.pendingCount} agent{summary.pendingCount > 1 ? 's have' : ' has'} not yet received their funds.
              Total pending: <strong>{fmt(summary.pendingAmount)}</strong>
            </p>
          </div>
        )}
      </div>

      {/* ── Transactions Table ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">
            Transactions
            <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-500">
              {filtered.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-400">Loading transactions…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Txn ID', 'Package', 'Client', 'Agent', 'Revenue', 'Profit', 'Agent Receives', 'Payment Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(tx => {
                  const agentShare = Number(tx.amount ?? 0) - Number(tx.profit ?? 0);
                  return (
                    <tr key={tx.id}
                      className={`hover:bg-gray-50 transition-colors ${!tx.disbursed ? 'bg-amber-50/30' : ''}`}>
                      {/* ID */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                          {shortId(tx.id)}
                        </span>
                      </td>
                      {/* Package */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-800 max-w-[140px] truncate block">
                          {tx.packageName || '—'}
                        </span>
                      </td>
                      {/* Client */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 max-w-[120px] truncate block">
                          {tx.clientName || tx.clientEmail || '—'}
                        </span>
                        {tx.clientEmail && tx.clientName && (
                          <span className="text-xs text-gray-400 truncate block max-w-[120px]">{tx.clientEmail}</span>
                        )}
                      </td>
                      {/* Agent */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 max-w-[120px] truncate block">
                          {tx.agentName || tx.agentEmail || '—'}
                        </span>
                        {tx.agentEmail && tx.agentName && (
                          <span className="text-xs text-gray-400 truncate block max-w-[120px]">{tx.agentEmail}</span>
                        )}
                      </td>
                      {/* Revenue */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">{fmt(tx.amount)}</span>
                      </td>
                      {/* Profit */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-emerald-700 whitespace-nowrap">
                          {fmt(tx.profit)}
                        </span>
                        {tx.percentage != null && (
                          <span className="text-xs text-gray-400 block">{tx.percentage}% fee</span>
                        )}
                      </td>
                      {/* Agent Receives */}
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold whitespace-nowrap ${tx.disbursed ? 'text-blue-700' : 'text-amber-700'}`}>
                          {fmt(agentShare)}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(tx.paidAt)}</span>
                        {tx.disbursedAt && (
                          <span className="text-xs text-emerald-600 block whitespace-nowrap">
                            Paid: {fmtDate(tx.disbursedAt)}
                          </span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <DisbursementBadge tx={tx} />
                        {!tx.disbursed && (
                          <p className="text-xs text-amber-600 mt-1">Agent not paid</p>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {!tx.disbursed && (
                            <button
                              onClick={() => setConfirmTx(tx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
                            >
                              <ArrowDownCircle className="w-3 h-3" />
                              Disburse
                            </button>
                          )}
                          <button
                            onClick={() => setPreviewTx(tx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors whitespace-nowrap"
                          >
                            <FileText className="w-3 h-3" />
                            Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {confirmTx && (
        <ConfirmDisburseModal
          tx={confirmTx}
          onConfirm={handleConfirmDisburse}
          onCancel={() => setConfirmTx(null)}
          loading={disburseLoading}
        />
      )}

      {previewTx && (
        <ReceiptPreviewModal
          tx={previewTx}
          onClose={() => setPreviewTx(null)}
          onDownload={handleDownload}
          onEmail={onEmailReceipt}
        />
      )}
    </div>
  );
};

export default AccountingTab;