import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Clock, CheckCircle, RefreshCw, AlertCircle,
  Loader, ChevronDown, ChevronUp, Search,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

// Agents think in USD (what they were "sold" the package for) — that's the
// primary figure here. KES is shown as a small secondary line since that's
// what Safaricom/Pesapal actually settled.
const fmtUsd = (n) =>
  n == null ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtKes = (n) =>
  n == null ? '—' : `KES ${Number(n).toLocaleString('en-US')}`;

const SummaryCard = ({ icon: Icon, label, value, sub, loading, accent }) => (
  <div className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4`}>
    <div className={`p-3 rounded-xl ${accent}`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {loading
        ? <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
        : <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
      }
      {sub && !loading && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const StatusBadge = ({ disbursed }) =>
  disbursed
    ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle className="h-3 w-3" />Paid</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Clock className="h-3 w-3" />Pending</span>;

export default function AgentAccountingTab() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');      // 'all' | 'pending' | 'disbursed'
  const [search, setSearch] = useState('');
  const [sortDesc, setSortDesc] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, txRes] = await Promise.all([
        fetch(`${API}/agent_accounting/summary`, { credentials: 'include' }),
        fetch(`${API}/agent_accounting/transactions?limit=200`, { credentials: 'include' }),
      ]);

      if (!sumRes.ok || !txRes.ok) throw new Error('Failed to fetch accounting data');

      const sumJson = await sumRes.json();
      const txJson  = await txRes.json();

      if (!sumJson.success) throw new Error(sumJson.message);
      if (!txJson.success)  throw new Error(txJson.message);

      setSummary(sumJson.data);
      setTransactions(txJson.data ?? []);
    } catch (err) {
      setError(err.message || 'Failed to load accounting data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Client-side filter + search
  const visible = transactions
    .filter(t => {
      if (filter === 'pending')   return !t.disbursed;
      if (filter === 'disbursed') return  t.disbursed;
      return true;
    })
    .filter(t => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        t.packageName.toLowerCase().includes(q) ||
        t.clientName.toLowerCase().includes(q) ||
        (t.mpesaRef ?? '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const da = new Date(a.paidAt).getTime();
      const db = new Date(b.paidAt).getTime();
      return sortDesc ? db - da : da - db;
    });

  const totalEarnedUsd = (summary?.pendingAmountUsd ?? 0) + (summary?.disbursedAmountUsd ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Accounting</h2>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards — USD primary, KES sub-line */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={DollarSign}
          label="Total Earned (All Time)"
          value={fmtUsd(totalEarnedUsd)}
          sub={`${fmtKes((summary?.pendingAmount ?? 0) + (summary?.disbursedAmount ?? 0))} · ${(summary?.pendingCount ?? 0) + (summary?.disbursedCount ?? 0)} bookings`}
          loading={loading}
          accent="bg-gradient-to-br from-blue-500 to-indigo-600"
        />
        <SummaryCard
          icon={Clock}
          label="Pending Disbursement"
          value={fmtUsd(summary?.pendingAmountUsd)}
          sub={`${fmtKes(summary?.pendingAmount)} · ${summary?.pendingCount ?? 0} booking${summary?.pendingCount !== 1 ? 's' : ''}`}
          loading={loading}
          accent="bg-gradient-to-br from-amber-400 to-orange-500"
        />
        <SummaryCard
          icon={CheckCircle}
          label="Total Disbursed"
          value={fmtUsd(summary?.disbursedAmountUsd)}
          sub={`${fmtKes(summary?.disbursedAmount)} · ${summary?.disbursedCount ?? 0} booking${summary?.disbursedCount !== 1 ? 's' : ''}`}
          loading={loading}
          accent="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <SummaryCard
          icon={DollarSign}
          label="Pending Transactions"
          value={String(summary?.pendingCount ?? 0)}
          sub="awaiting disbursement"
          loading={loading}
          accent="bg-gradient-to-br from-purple-500 to-pink-500"
        />
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search package, client, ref…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-1.5">
            {['all', 'pending', 'disbursed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 ml-auto">{visible.length} record{visible.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-6 text-red-600">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Failed to load accounting data</p>
              <p className="text-xs text-red-400 mt-0.5">{error}</p>
            </div>
            <button onClick={fetchData} className="ml-auto text-xs underline">Retry</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !error && (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/5" />
                <div className="h-4 bg-gray-200 rounded w-1/6 ml-auto" />
                <div className="h-6 bg-gray-100 rounded-full w-16" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <DollarSign className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-500">No transactions found</p>
            <p className="text-xs text-gray-400 mt-1">
              {transactions.length > 0 ? 'Try changing filters' : 'Earnings will appear once clients book your packages'}
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && visible.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-semibold">Package</th>
                  <th className="px-4 py-3 text-left font-semibold">Client</th>
                  <th className="px-4 py-3 text-right font-semibold">Booking Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">Your Share</th>
                  <th
                    className="px-4 py-3 text-left font-semibold cursor-pointer select-none"
                    onClick={() => setSortDesc(v => !v)}
                  >
                    <span className="inline-flex items-center gap-1">
                      Date {sortDesc ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900 truncate max-w-[180px]">{t.packageName}</p>
                      {t.mpesaRef && (
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{t.mpesaRef}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{t.clientName}</td>
                    <td className="px-4 py-3.5 text-right text-gray-700 font-medium">
                      {fmtUsd(t.amountUsd)}
                      <p className="text-[11px] text-gray-400 font-normal">{fmtKes(t.amount)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-bold ${t.disbursed ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {fmtUsd(t.agentShareUsd)}
                      </span>
                      <p className="text-[11px] text-gray-400 font-normal">{fmtKes(t.agentShare)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 whitespace-nowrap">
                      {t.paidAt
                        ? new Date(t.paidAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                      {t.disbursed && t.disbursedAt && (
                        <p className="text-[11px] text-emerald-500 mt-0.5">
                          Paid {new Date(t.disbursedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge disbursed={t.disbursed} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}