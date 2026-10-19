import React, { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { INCLUSION_OPTIONS, EXCLUSION_OPTIONS, OptionGrid } from '../creation/CreatePackageModal';
import { getAgentPackages } from '../services/packagesApi';
import { respondToRequest } from '../services/inquiriesApi';

const ROUTES = [
  { v: 'makkah', l: 'Makkah only' },
  { v: 'makkah_madinah', l: 'Makkah & Madinah' },
  { v: 'makkah_madinah_jeddah', l: 'Makkah, Madinah & Jeddah' },
];

const field = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const Label = ({ children }) => <label className="block text-xs font-medium text-gray-500 mb-1">{children}</label>;

// Pre-fills from what the client asked for, so the agent only edits the differences.
const seed = (r) => {
  const d = r.details || {};
  const o = r.my_offer || {};
  return {
    route: o.route ?? d.route ?? 'makkah_madinah',
    nights: o.nights ?? d.nights ?? '',
    departure_date: o.departure_date ?? '',
    return_date: o.return_date ?? '',
    makkah_hotel: o.makkah_hotel ?? '',
    madinah_hotel: o.madinah_hotel ?? '',
    makkah_stars: o.makkah_stars ?? d.makkah_stars ?? '',
    madinah_stars: o.madinah_stars ?? d.madinah_stars ?? '',
    adult_price: o.adult_price ?? r.my_price ?? '',
    child_price: o.child_price ?? '',
    infant_price: o.infant_price ?? '',
    inclusions: o.inclusions ?? [],
    exclusions: o.exclusions ?? [],
    package_id: r.my_package_id ?? '',
    message: r.my_message ?? '',
  };
};

const OfferEditor = ({ r, onChanged }) => {
  const d = r.details || {};
  const [f, setF] = useState(() => seed(r));
  const [pkgs, setPkgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const hasMadinah = f.route !== 'makkah';

  useEffect(() => {
    getAgentPackages()
      .then((data) => setPkgs(Array.isArray(data) ? data : (data.packages ?? data.data ?? [])))
      .catch(() => {});
  }, []);

  const nightsFromDates = f.departure_date && f.return_date
    ? Math.round((new Date(f.return_date) - new Date(f.departure_date)) / 86400000) : null;

  const send = async (decline) => {
    setBusy(true); setErr('');
    try {
      const nights = nightsFromDates > 0 ? nightsFromDates : f.nights;
      await respondToRequest(r.recipient_id, decline ? { decline: true } : {
        message: f.message,
        package_id: f.package_id || undefined,
        offer: {
          route: f.route, nights, departure_date: f.departure_date || undefined, return_date: f.return_date || undefined,
          makkah_hotel: f.makkah_hotel, madinah_hotel: hasMadinah ? f.madinah_hotel : '',
          makkah_stars: f.makkah_stars, madinah_stars: hasMadinah ? f.madinah_stars : '',
          adult_price: f.adult_price, child_price: f.child_price, infant_price: f.infant_price,
          inclusions: f.inclusions, exclusions: f.exclusions,
        },
      });
      onChanged();
    } catch (e) { setErr(e?.response?.data?.message || e.message || 'Failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 pt-2 border-t border-gray-100">
      <p className="text-sm font-semibold text-gray-800">{r.my_status === 'responded' ? 'Edit your offer' : 'Build your offer'}</p>
      <p className="text-xs text-gray-500">Pre-filled from the client's request — change anything to fit what you can provide.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2"><Label>Route</Label>
          <select className={field} value={f.route} onChange={set('route')}>{ROUTES.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}</select></div>
        <div><Label>Departure</Label><input type="date" className={field} value={f.departure_date} onChange={set('departure_date')} /></div>
        <div><Label>Return</Label><input type="date" className={field} value={f.return_date} min={f.departure_date} onChange={set('return_date')} /></div>
        <div className="col-span-2">
          <Label>Nights {nightsFromDates > 0 ? '(from dates)' : ''}</Label>
          <input type="number" min="1" max="60" className={field} disabled={nightsFromDates > 0}
            value={nightsFromDates > 0 ? nightsFromDates : f.nights} onChange={set('nights')} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex gap-2">
          <div className="flex-1"><Label>Makkah hotel</Label><input className={field} value={f.makkah_hotel} onChange={set('makkah_hotel')} placeholder="Hotel name" /></div>
          <div className="w-20"><Label>Stars</Label><input type="number" min="1" max="5" className={field} value={f.makkah_stars} onChange={set('makkah_stars')} /></div>
        </div>
        {hasMadinah && (
          <div className="flex gap-2">
            <div className="flex-1"><Label>Madinah hotel</Label><input className={field} value={f.madinah_hotel} onChange={set('madinah_hotel')} placeholder="Hotel name" /></div>
            <div className="w-20"><Label>Stars</Label><input type="number" min="1" max="5" className={field} value={f.madinah_stars} onChange={set('madinah_stars')} /></div>
          </div>
        )}
      </div>

      <div>
        <Label>Price per person (USD){d.budget ? ` — client budget: ${d.budget_currency} ${Number(d.budget).toLocaleString()} ${d.budget_per_person ? 'pp' : 'total'}` : ''}</Label>
        <div className="grid grid-cols-3 gap-3">
          <div><input type="number" min="1" className={field} placeholder="Adult" value={f.adult_price} onChange={set('adult_price')} />{d.adults != null && <span className="text-[10px] text-gray-400">{d.adults} adult(s)</span>}</div>
          <div><input type="number" min="1" className={field} placeholder="Child" value={f.child_price} onChange={set('child_price')} />{d.children ? <span className="text-[10px] text-gray-400">{d.children} child(ren)</span> : null}</div>
          <div><input type="number" min="1" className={field} placeholder="Infant" value={f.infant_price} onChange={set('infant_price')} />{d.infants ? <span className="text-[10px] text-gray-400">{d.infants} infant(s)</span> : null}</div>
        </div>
      </div>

      <div><Label>Inclusions</Label><OptionGrid options={INCLUSION_OPTIONS} selected={f.inclusions} onChange={(v) => setF((p) => ({ ...p, inclusions: v }))} color="green" /></div>
      <div><Label>Exclusions</Label><OptionGrid options={EXCLUSION_OPTIONS} selected={f.exclusions} onChange={(v) => setF((p) => ({ ...p, exclusions: v }))} color="red" /></div>

      <div>
        <Label>Link one of your packages (lets the client book directly after accepting)</Label>
        <select className={field} value={f.package_id} onChange={set('package_id')}>
          <option value="">None</option>
          {pkgs.map((p) => <option key={p.id} value={p.id}>{p.title || p.name}</option>)}
        </select>
      </div>

      <div><Label>Message to client</Label>
        <textarea rows={3} maxLength={1500} className={field} value={f.message} onChange={set('message')}
          placeholder="Anything else the client should know…" /></div>

      <div className="flex items-center gap-2">
        <button onClick={() => send(false)} disabled={busy || !(Number(f.adult_price) > 0)}
          className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span>{r.my_status === 'responded' ? 'Update offer' : 'Send offer'}</span>
        </button>
        {r.my_status !== 'responded' && (
          <button onClick={() => send(true)} disabled={busy} className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Not for me</button>
        )}
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
};

export default OfferEditor;
