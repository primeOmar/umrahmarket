// Superadmin → Lipa Mdogo Mdogo: headline numbers, surplus requests to
// action (refund via M-Pesa / arrange extras), savers and recent ledger.
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { PiggyBank, RefreshCw, Loader, CheckCircle, XCircle, Users, Wallet, Clock, Gift } from 'lucide-react';

const _base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const BASE_API = _base.endsWith('/api') ? _base : `${_base}/api`;

const saFetch = async (url, options = {}) => {
  const token = localStorage.getItem('superadmin_token');
  const res = await fetch(`${BASE_API}/superadmin/savings${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
};

const kes = (n) => `KES ${Math.round(Number(n) || 0).toLocaleString('en-KE')}`;
const when = (iso) => (iso ? format(new Date(iso), 'dd MMM yyyy, HH:mm') : '—');

const SERVICE_LABELS = {
  meals: 'Meals', ziyarah: 'Ziyarah tours', airport_transfer: 'Airport transfers', hotel_upgrade: 'Hotel upgrade',
  travel_insurance: 'Travel insurance', wheelchair: 'Wheelchair', zamzam: 'Zamzam', other: 'Other',
};

const STATUS = {
  SUCCESS: 'bg-emerald-50 text-emerald-700', PENDING: 'bg-amber-50 text-amber-700',
  FAILED: 'bg-red-50 text-red-700', CANCELLED: 'bg-gray-100 text-gray-600',
  COMPLETED: 'bg-emerald-50 text-emerald-700', REJECTED: 'bg-red-50 text-red-700',
};

const Stat = ({ icon: Icon, label, value, sub }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-4">
    <div className="flex items-center gap-2 text-xs font-medium text-gray-500"><Icon className="h-4 w-4" /> {label}</div>
    <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    {sub && <p className="text-xs text-gray-400">{sub}</p>}
  </div>
);

export default function SavingsAdminTab() {
  const [overview, setOverview] = useState(null);
  const [requests, setRequests] = useState([]);
  const [reqFilter, setReqFilter] = useState('PENDING');
  const [savers, setSavers] = useState([]);
  const [txs, setTxs] = useState([]);
  const [view, setView] = useState('requests');
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null); // { request, status }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, r, s, t] = await Promise.all([
        saFetch('/overview'),
        saFetch(`/surplus-requests?status=${reqFilter}`),
        saFetch('/savers?limit=100'),
        saFetch('/transactions?limit=100'),
      ]);
      setOverview(o.data);
      setRequests(r.data || []);
      setSavers(s.data || []);
      setTxs(t.data || []);
    } catch (err) {
      toast.error(err.message || 'Could not load savings data');
    } finally {
      setLoading(false);
    }
  }, [reqFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white"><PiggyBank className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Lipa Mdogo Mdogo</h2>
            <p className="text-xs text-gray-500">Pilgrim Umrah savings</p>
          </div>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {overview && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={Wallet} label="Savings held" value={kes(overview.balanceHeldKes)} sub={`${kes(overview.totalDepositedKes)} deposited all-time`} />
          <Stat icon={Users} label="Active savers" value={overview.savers} />
          <Stat icon={PiggyBank} label="Deposits today" value={kes(overview.depositsTodayKes)} sub={`${overview.depositsTodayCount} deposits · ${kes(overview.depositsMonthKes)} this month`} />
          <Stat icon={Gift} label="Surplus to action" value={overview.pendingSurplusCount} sub={kes(overview.pendingSurplusKes)} />
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200">
        {[['requests', 'Surplus requests'], ['savers', 'Savers'], ['transactions', 'Transactions']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setView(id)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${view === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && !overview ? (
        <div className="flex justify-center py-12"><Loader className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : view === 'requests' ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            {['PENDING', 'COMPLETED', 'REJECTED', 'ALL'].map((s) => (
              <button key={s} type="button" onClick={() => setReqFilter(s)} className={`rounded-full px-3 py-1 text-xs font-semibold ${reqFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{s.toLowerCase()}</button>
            ))}
          </div>
          {requests.length === 0 && <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">No requests.</p>}
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{r.type === 'REFUND' ? 'Refund' : 'Extra services'} · {kes(r.amount_kes)}</p>
                  <p className="text-sm text-gray-600">{r.saver?.name} · {r.saver?.email} · {r.saver?.phone || '—'}</p>
                  {r.type === 'REFUND' && <p className="mt-1 text-sm text-gray-700">Send to M-Pesa: <strong>{r.payout_phone}</strong></p>}
                  {r.type === 'EXTRAS' && (
                    <p className="mt-1 text-sm text-gray-700">
                      Services: <strong>{(r.services || []).map((s) => SERVICE_LABELS[s] || s).join(', ')}</strong>
                      {r.package && <> · for <strong>{r.package.name}</strong> ({r.package.agent_name})</>}
                    </p>
                  )}
                  {r.note && <p className="mt-1 text-sm italic text-gray-500">“{r.note}”</p>}
                  <p className="mt-1 text-xs text-gray-400">Requested {when(r.created_at)}{r.processed_at ? ` · resolved ${when(r.processed_at)} by ${r.processed_by}` : ''}</p>
                  {r.admin_note && <p className="mt-1 text-xs text-gray-500">Admin note: {r.admin_note}{r.payout_ref ? ` · ref ${r.payout_ref}` : ''}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[r.status] || ''}`}>{r.status.toLowerCase()}</span>
                  {r.status === 'PENDING' && (
                    <>
                      <button type="button" onClick={() => setResolving({ request: r, status: 'COMPLETED' })} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"><CheckCircle className="h-3.5 w-3.5" /> Mark done</button>
                      <button type="button" onClick={() => setResolving({ request: r, status: 'REJECTED' })} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : view === 'savers' ? (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr><th className="px-4 py-3">Pilgrim</th><th className="px-4 py-3">Balance</th><th className="px-4 py-3">Deposited</th><th className="px-4 py-3">Deposits</th><th className="px-4 py-3">Passport</th><th className="px-4 py-3">Last deposit</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {savers.map((s) => (
                <tr key={s.userId}>
                  <td className="px-4 py-3"><p className="font-medium text-gray-900">{s.name}</p><p className="text-xs text-gray-500">{s.email} · {s.phone || '—'}</p></td>
                  <td className="px-4 py-3 font-semibold">{kes(s.balanceKes)}</td>
                  <td className="px-4 py-3">{kes(s.totalDepositedKes)}</td>
                  <td className="px-4 py-3">{s.depositCount}</td>
                  <td className="px-4 py-3 text-xs">{s.passportStatus ? s.passportStatus.replace('_', ' ') : 'none'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{when(s.lastDepositAt)}</td>
                </tr>
              ))}
              {savers.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No savers yet.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Pilgrim</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Receipt / ref</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {txs.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{when(t.paid_at || t.created_at)}</td>
                  <td className="px-4 py-3"><p className="font-medium text-gray-900">{t.saver?.name}</p><p className="text-xs text-gray-500">{t.phone || t.saver?.phone || ''}</p></td>
                  <td className="px-4 py-3 text-xs">{t.type.replace('_', ' ').toLowerCase()}{t.method && t.method !== 'INTERNAL' ? ` · ${t.method}` : ''}</td>
                  <td className={`px-4 py-3 font-semibold ${t.direction === 'CREDIT' ? 'text-emerald-700' : 'text-gray-900'}`}>{t.direction === 'CREDIT' ? '+' : '−'}{kes(t.amount_kes)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[t.status] || ''}`}>{t.status.toLowerCase()}</span>{t.result_desc && t.status !== 'SUCCESS' && <p className="mt-1 max-w-[220px] truncate text-[11px] text-gray-400" title={t.result_desc}>{t.result_desc}</p>}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.receipt_no}{t.mpesa_ref ? <><br />{t.mpesa_ref}</> : null}</td>
                </tr>
              ))}
              {txs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No transactions yet.</td></tr>}
            </tbody>
          </table>
          {overview?.pendingDeposits > 0 && (
            <p className="flex items-center gap-2 border-t border-gray-100 px-4 py-3 text-xs text-gray-500"><Clock className="h-3.5 w-3.5" /> {overview.pendingDeposits} deposit(s) awaiting provider confirmation — checked automatically every 3 minutes.</p>
          )}
        </div>
      )}

      {resolving && (
        <ResolveDialog
          {...resolving}
          onClose={() => setResolving(null)}
          onDone={() => { setResolving(null); load(); }}
        />
      )}
    </div>
  );
}

function ResolveDialog({ request, status, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const isRefund = request.type === 'REFUND';
  const done = status === 'COMPLETED';

  const submit = async () => {
    if (!done && !note.trim()) return toast.error('Add a reason for rejecting');
    setBusy(true);
    try {
      await saFetch(`/surplus-requests/${request.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ status, adminNote: note.trim() || undefined, payoutRef: ref.trim() || undefined }),
      });
      toast.success(done ? 'Marked as done — pilgrim notified' : 'Rejected — money returned to their savings');
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900">{done ? 'Complete request' : 'Reject request'}</h3>
        <p className="mt-1 text-sm text-gray-600">
          {done
            ? (isRefund ? `Confirm you have sent ${kes(request.amount_kes)} to ${request.payout_phone}.` : `Confirm the extras worth ${kes(request.amount_kes)} are arranged with the agent.`)
            : `${kes(request.amount_kes)} will be returned to ${request.saver?.name}'s savings balance.`}
        </p>
        {done && isRefund && (
          <>
            <label className="mt-4 block text-xs font-semibold text-gray-600" htmlFor="rs-ref">M-Pesa transaction code</label>
            <input id="rs-ref" value={ref} onChange={(e) => setRef(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="e.g. TKB12XYZ90" />
          </>
        )}
        <label className="mt-4 block text-xs font-semibold text-gray-600" htmlFor="rs-note">{done ? 'Note (optional)' : 'Reason (shown to the pilgrim)'}</label>
        <textarea id="rs-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700">Cancel</button>
          <button type="button" onClick={submit} disabled={busy} className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${done ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {busy ? 'Saving…' : done ? 'Mark done' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
