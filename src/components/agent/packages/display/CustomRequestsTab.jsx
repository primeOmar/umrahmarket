import React, { useCallback, useEffect, useState } from 'react';
import { Inbox, Loader2, RefreshCw, Users, Calendar } from 'lucide-react';
import { getIncomingRequests, markRequestViewed } from '../services/inquiriesApi';
import OfferEditor from './OfferEditor';

const ROUTE_LABEL = { makkah: 'Makkah only', makkah_madinah: 'Makkah & Madinah', makkah_madinah_jeddah: 'Makkah, Madinah & Jeddah' };
const GROUP_LABEL = { family: 'Family', friends: 'Friends', couple: 'Couple', solo: 'Solo', group: 'Larger group', other: 'Other' };

const Row = ({ label, children }) => children ? (
  <div className="flex text-sm"><span className="w-32 text-gray-400 flex-shrink-0">{label}</span><span className="text-gray-800">{children}</span></div>
) : null;

const RequestCard = ({ r, onChanged }) => {
  const d = r.details || {};
  const [open, setOpen] = useState(false);
  const closed = r.request_status !== 'open';

  const toggle = async () => {
    setOpen((o) => !o);
    if (!open && r.my_status === 'new') { try { await markRequestViewed(r.recipient_id); onChanged(); } catch { /* non-critical */ } }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <button onClick={toggle} className="w-full text-left p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            Request #{r.ref}
            {r.my_status === 'new' && !closed && <span className="ml-2 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full">NEW</span>}
            {r.my_status === 'responded' && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Offer sent</span>}
            {r.my_status === 'declined' && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Declined</span>}
            {closed && r.request_status !== 'accepted' && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Closed</span>}
            {r.client_decision === 'accepted' && <span className="ml-2 text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">Accepted</span>}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            <Users className="h-3 w-3 inline mr-1" />{d.adults ?? '?'} adults{d.children ? `, ${d.children} children` : ''}
            {d.travel_month && <><Calendar className="h-3 w-3 inline ml-3 mr-1" />{d.travel_month}</>}
            {d.nights && ` · ${d.nights} nights`}
          </p>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">{new Date(r.received_at).toLocaleDateString()}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
          <Row label="Travelling as">{GROUP_LABEL[d.group_type]}</Row>
          <Row label="Month">{d.travel_month}{d.flexible_dates ? ' (flexible)' : ''}</Row>
          <Row label="Travellers">{[d.adults != null && `${d.adults} adults`, d.children && `${d.children} children`, d.infants && `${d.infants} infants`].filter(Boolean).join(', ')}</Row>
          <Row label="Route">{ROUTE_LABEL[d.route]}</Row>
          <Row label="Nights">{d.nights}</Row>
          <Row label="Hotel stars">{d.makkah_stars && `${d.makkah_stars}★ Makkah`}</Row>
          <Row label="Hotel wishes">{d.hotel_preference}</Row>
          <Row label="Budget">{d.budget && `${d.budget_currency} ${Number(d.budget).toLocaleString()} ${d.budget_per_person ? 'per person' : 'total'}`}</Row>
          <Row label="Notes"><span className="whitespace-pre-wrap">{d.notes}</span></Row>
          {!d.travel_month && !d.nights && !d.route && !d.notes && !d.budget && (
            <p className="text-sm text-gray-500">The client left details open — propose what you think suits them best.</p>
          )}

          {!closed && r.my_status !== 'declined' && !r.client_decision && <OfferEditor r={r} onChanged={onChanged} />}
          {r.client_decision === 'accepted' && <p className="text-sm font-semibold text-emerald-700">The client accepted your offer 🎉{r.my_package_id ? '' : ' — link a package or contact them to proceed.'}</p>}
          {r.client_decision === 'declined' && <p className="text-sm text-gray-500">The client declined this offer.</p>}
        </div>
      )}
    </div>
  );
};

const CustomRequestsTab = ({ onUnreadChange }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getIncomingRequests();
      setList(res.requests ?? []); setError('');
      onUnreadChange?.(res.unread ?? 0);
    } catch (e) { setError(e?.response?.data?.message || e.message || 'Failed to load requests.'); }
    finally { setLoading(false); }
  }, [onUnreadChange]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Custom Requests</h2>
          <p className="text-sm text-gray-500">Clients asking for a package that isn't listed. Client identity stays private; your offer goes to their dashboard.</p>
        </div>
        <button onClick={load} className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50"><RefreshCw className="h-4 w-4" /></button>
      </div>
      {loading ? <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
        : error ? <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
        : list.length === 0 ? <div className="py-16 text-center text-gray-400"><Inbox className="h-10 w-10 mx-auto mb-2" />No requests yet</div>
        : list.map((r) => <RequestCard key={r.recipient_id} r={r} onChanged={load} />)}
    </div>
  );
};

export default CustomRequestsTab;
