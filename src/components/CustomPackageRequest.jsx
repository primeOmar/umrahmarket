import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, Send, Users, CheckCircle2, X, Search, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getInquiryAgents, createCustomRequest, getMyCustomRequests, closeCustomRequest, decideOffer,
} from './agent/packages/services/inquiriesApi';

const GROUPS = [
  { v: 'family', l: 'Family' }, { v: 'friends', l: 'Friends' }, { v: 'couple', l: 'Couple' },
  { v: 'solo', l: 'Solo' }, { v: 'group', l: 'Larger group' }, { v: 'other', l: 'Other' },
];
const ROUTES = [
  { v: '', l: 'Not sure yet' }, { v: 'makkah', l: 'Makkah only' },
  { v: 'makkah_madinah', l: 'Makkah & Madinah' }, { v: 'makkah_madinah_jeddah', l: 'Makkah, Madinah & Jeddah' },
];

const nextMonths = () => {
  const out = []; const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    out.push({
      v: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      l: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    });
  }
  return out;
};

const summarise = (d = {}) => [
  d.travel_month && new Date(`${d.travel_month}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  d.adults != null && `${d.adults} adult${d.adults === 1 ? '' : 's'}${d.children ? `, ${d.children} child${d.children === 1 ? '' : 'ren'}` : ''}${d.infants ? `, ${d.infants} infant${d.infants === 1 ? '' : 's'}` : ''}`,
  d.group_type && GROUPS.find((g) => g.v === d.group_type)?.l,
  d.nights && `${d.nights} nights`,
  d.route && ROUTES.find((r) => r.v === d.route)?.l,
].filter(Boolean).join(' · ') || 'Fully flexible request';

const bookingQueryFromRequest = (requestId, packageId, details = {}) => {
  const adults = Number(details.adults);
  const children = Number(details.children);
  const infants = Number(details.infants);
  const safe = (n, fallback = 0) => (Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback);
  const params = new URLSearchParams({
    tab: 'custom',
    request: requestId,
    bookPackage: packageId,
    adults: String(Math.max(1, safe(adults, 1))),
    children: String(safe(children)),
    minor_children: '0',
    infants: String(safe(infants)),
  });
  return `/client/dashboard?${params.toString()}`;
};

const CustomPackageRequest = ({ darkMode }) => {
  const card = darkMode ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-white border-gray-100 text-gray-900';
  const input = `w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`;
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';

  const [form, setForm] = useState({
    travel_month: '', flexible_dates: false, adults: 2, children: 0, infants: 0, group_type: 'family',
    route: '', nights: '', makkah_stars: '', madinah_stars: '', hotel_preference: '',
    budget: '', budget_currency: 'USD', budget_per_person: true, notes: '',
  });
  const [audience, setAudience] = useState('all');
  const [agents, setAgents] = useState([]);
  const [picked, setPicked] = useState([]);
  const [agentQuery, setAgentQuery] = useState('');
  const [mine, setMine] = useState([]);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const months = useMemo(() => nextMonths(), []);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const loadMine = useCallback(async () => {
    try { setMine((await getMyCustomRequests()).requests ?? []); } catch { /* list is non-critical */ }
  }, []);

  useEffect(() => { loadMine(); }, [loadMine]);
  useEffect(() => {
    if (audience === 'selected' && agents.length === 0) {
      getInquiryAgents().then((r) => setAgents(r.agents ?? [])).catch(() => setMsg({ ok: false, text: 'Could not load agents.' }));
    }
  }, [audience, agents.length]);

  const shownAgents = agents.filter((a) => a.name.toLowerCase().includes(agentQuery.toLowerCase()));

  const submit = async () => {
    if (audience === 'selected' && picked.length === 0) return setMsg({ ok: false, text: 'Select at least one agent.' });
    setBusy(true); setMsg(null);
    try {
      const num = (v) => (v === '' ? undefined : Number(v));
      const res = await createCustomRequest({
        audience, agent_ids: audience === 'selected' ? picked : undefined,
        details: {
          ...form, adults: num(form.adults), children: num(form.children), infants: num(form.infants),
          nights: num(form.nights), makkah_stars: num(form.makkah_stars), madinah_stars: num(form.madinah_stars),
          budget: num(form.budget), travel_month: form.travel_month || undefined, route: form.route || undefined,
        },
      });
      setMsg({ ok: true, text: `Sent to ${res.notified_agents} agent${res.notified_agents === 1 ? '' : 's'}. Their offers will appear below.` });
      setForm((p) => ({ ...p, notes: '', hotel_preference: '' }));
      loadMine();
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.data?.message || e.message || 'Could not send your request.' });
    } finally { setBusy(false); }
  };

  const close = async (id) => { try { await closeCustomRequest(id); loadMine(); } catch { /* ignore */ } };
  const decide = async (reqId, rcpId, decision) => {
    try { await decideOffer(reqId, rcpId, decision); loadMine(); }
    catch (e) { setMsg({ ok: false, text: e?.response?.data?.message || 'Could not save your response.' }); }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <div className="flex items-center space-x-2 mb-1"><Sparkles className="h-5 w-5" /><h2 className="text-xl font-bold">Request a custom package</h2></div>
        <p className="text-sm text-white/90">
          Can't find the right package? Tell agents what you want — for family, friends or just yourself. Every field is optional.
          Your name and contact details are never shared; agents reply here in your dashboard.
        </p>
      </div>

      <div className={`rounded-2xl border p-5 space-y-5 ${card}`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block"><span className={`text-xs ${muted}`}>Travel month</span>
            <select className={input} value={form.travel_month} onChange={set('travel_month')}>
              <option value="">Any / not decided</option>
              {months.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </label>
          <label className="block"><span className={`text-xs ${muted}`}>Travelling as</span>
            <select className={input} value={form.group_type} onChange={set('group_type')}>
              {GROUPS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
            </select>
          </label>
          <label className="flex items-end space-x-2 pb-2 text-sm">
            <input type="checkbox" checked={form.flexible_dates} onChange={set('flexible_dates')} /><span>My dates are flexible</span>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[['adults', 'Adults (12+)'], ['children', 'Children (2-11)'], ['infants', 'Infants (<2)']].map(([k, l]) => (
            <label key={k} className="block"><span className={`text-xs ${muted}`}>{l}</span>
              <input type="number" min="0" max="100" className={input} value={form[k]} onChange={set(k)} /></label>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <label className="block sm:col-span-2"><span className={`text-xs ${muted}`}>Route</span>
            <select className={input} value={form.route} onChange={set('route')}>{ROUTES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></label>
          <label className="block"><span className={`text-xs ${muted}`}>Nights</span>
            <input type="number" min="1" max="60" className={input} placeholder="e.g. 10" value={form.nights} onChange={set('nights')} /></label>
          <label className="block"><span className={`text-xs ${muted}`}>Hotel stars (Makkah)</span>
            <select className={input} value={form.makkah_stars} onChange={set('makkah_stars')}>
              <option value="">Any</option>{[5, 4, 3].map((n) => <option key={n} value={n}>{n}★</option>)}</select></label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block"><span className={`text-xs ${muted}`}>Hotel wishes (e.g. walking distance to Haram)</span>
            <input className={input} maxLength={150} value={form.hotel_preference} onChange={set('hotel_preference')} /></label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block col-span-2"><span className={`text-xs ${muted}`}>Budget</span>
              <input type="number" min="0" className={input} value={form.budget} onChange={set('budget')} /></label>
            <label className="block"><span className={`text-xs ${muted}`}>&nbsp;</span>
              <select className={input} value={form.budget_currency} onChange={set('budget_currency')}><option>USD</option><option>KES</option></select></label>
          </div>
        </div>

        <label className="block"><span className={`text-xs ${muted}`}>Anything else? (elderly relatives, wheelchair, private transport, special occasion…)</span>
          <textarea rows={3} maxLength={1500} className={input} value={form.notes} onChange={set('notes')}
            placeholder="Please don't include phone numbers or emails — they're removed automatically." /></label>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Who should receive this?</p>
          <div className="flex flex-wrap gap-2">
            {[['all', 'All agents'], ['selected', 'Choose specific agents']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setAudience(v)}
                className={`px-4 py-2 rounded-lg text-sm border ${audience === v ? 'bg-emerald-600 text-white border-emerald-600' : darkMode ? 'border-gray-700' : 'border-gray-200'}`}>{l}</button>
            ))}
          </div>
          {audience === 'selected' && (
            <div className={`border rounded-xl p-3 space-y-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="relative"><Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                <input className={`${input} pl-9`} placeholder="Search agents" value={agentQuery} onChange={(e) => setAgentQuery(e.target.value)} /></div>
              <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1">
                {shownAgents.map((a) => (
                  <label key={a.id} className="flex items-center space-x-2 text-sm px-2 py-1.5 rounded hover:bg-emerald-50/50 cursor-pointer">
                    <input type="checkbox" checked={picked.includes(a.id)}
                      onChange={() => setPicked((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))} />
                    <span className="truncate">{a.name}</span>
                  </label>
                ))}
                {agents.length === 0 && <p className={`text-xs ${muted}`}>Loading agents…</p>}
              </div>
              <p className={`text-xs ${muted}`}>{picked.length} selected</p>
            </div>
          )}
        </div>

        {msg && <p className={`text-sm rounded-lg p-3 ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</p>}

        <button onClick={submit} disabled={busy}
          className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span>Send request</span>
        </button>
      </div>

      {mine.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">My requests</h3>
          {mine.map((r) => (
            <div key={r.id} className={`rounded-2xl border p-4 space-y-3 ${card}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Request #{r.ref} <span className={`font-normal ${muted}`}>· {new Date(r.created_at).toLocaleDateString()}</span></p>
                  <p className={`text-xs ${muted}`}>{summarise(r.details)}</p>
                  <p className={`text-xs mt-1 ${muted}`}><Users className="h-3 w-3 inline mr-1" />Sent to {r.sent_to} · viewed by {r.viewed_by} · {r.responses.length} offer{r.responses.length === 1 ? '' : 's'}</p>
                </div>
                {r.status === 'open'
                  ? <button onClick={() => close(r.id)} className="text-xs text-gray-500 hover:text-red-600 flex items-center space-x-1"><X className="h-3 w-3" /><span>Close</span></button>
                  : <span className="text-xs text-gray-400">{r.status === 'accepted' ? 'Accepted' : 'Closed'}</span>}
              </div>
              {r.responses.map((o) => {
                const of = o.offer || {};
                const decided = o.client_decision;
                return (
                <div key={o.id} className={`rounded-xl p-3 text-sm space-y-2 ${darkMode ? 'bg-gray-800' : 'bg-emerald-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center space-x-1"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span>{o.agent_name}</span></span>
                    {o.price && <span className="font-bold text-emerald-700">${Number(o.price).toLocaleString()} <span className="text-[10px] font-normal">/ adult</span></span>}
                  </div>
                  {(of.route || of.nights || of.departure_date) && (
                    <p className={`text-xs ${muted}`}>
                      {[of.route && ROUTES.find((x) => x.v === of.route)?.l, of.nights && `${of.nights} nights`,
                        of.departure_date && `${of.departure_date}${of.return_date ? ` → ${of.return_date}` : ''}`].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {(of.makkah_hotel || of.madinah_hotel) && (
                    <p className="text-xs">🏨 {[of.makkah_hotel && `Makkah: ${of.makkah_hotel}${of.makkah_stars ? ` (${of.makkah_stars}★)` : ''}`,
                      of.madinah_hotel && `Madinah: ${of.madinah_hotel}${of.madinah_stars ? ` (${of.madinah_stars}★)` : ''}`].filter(Boolean).join(' · ')}</p>
                  )}
                  {(of.child_price || of.infant_price) && (
                    <p className="text-xs">{[of.child_price && `Child $${Number(of.child_price).toLocaleString()}`, of.infant_price && `Infant $${Number(of.infant_price).toLocaleString()}`].filter(Boolean).join(' · ')}</p>
                  )}
                  {of.inclusions?.length > 0 && <p className="text-xs"><b>Included:</b> {of.inclusions.join(', ')}</p>}
                  {of.exclusions?.length > 0 && <p className="text-xs"><b>Not included:</b> {of.exclusions.join(', ')}</p>}
                  {o.message && <p className="whitespace-pre-wrap"><MessageSquare className="h-3 w-3 inline mr-1 text-gray-400" />{o.message}</p>}
                  {decided === 'accepted' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-emerald-700 font-semibold text-xs">You accepted this offer</span>
                      {o.package_id
                        ? <button
                            onClick={() => navigate(bookingQueryFromRequest(r.id, o.package_id, r.details))}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
                          >
                            Continue to passport upload &amp; payment
                          </button>
                        : <span className={`text-xs ${muted}`}>The agent will share your booking link shortly.</span>}
                    </div>
                  ) : decided === 'declined' ? (
                    <span className={`text-xs ${muted}`}>You declined this offer</span>
                  ) : r.status === 'open' && (
                    <div className="flex gap-2">
                      <button onClick={() => decide(r.id, o.id, 'accept')} className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700">Accept offer</button>
                      <button onClick={() => decide(r.id, o.id, 'decline')} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Decline</button>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomPackageRequest;
