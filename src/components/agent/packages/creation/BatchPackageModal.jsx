import React, { useMemo, useRef, useState } from 'react';
import {
  X, Loader2, CalendarPlus, CheckCircle2, Trash2, Info, ChevronDown, ChevronUp, Copy, Plus, Upload,
} from 'lucide-react';
import { createPackageBatch, confirmBatchPricing } from '../services/packagesApi';
import { DateRangePicker } from './Packageformcomponents';
import {
  OptionGrid, CITY_PRESET_OPTIONS, HIGHLIGHT_OPTIONS, INCLUSION_OPTIONS, EXCLUSION_OPTIONS,
  COUNTRY_PRICING_OPTIONS, AGE_TIER_FIELDS, computeAutoTierPrice, normalizeCityValue, cityLabelFromValue,
} from './CreatePackageModal';
import { processPackageImages } from './imageProcessing';
import toast from './Toast';

// Keep in sync with the backend (utils/packageActivation.js)
const ACTIVATION_LEAD_DAYS = 150; // ~5 months
const MAX_DEPARTURES = 60;
const MAX_IMAGES = 10;
const QUICK_NIGHTS = [7, 10, 14, 21];

const DAY_MS = 86400000;
const toIso = (d) => d.toISOString().slice(0, 10);
const parse = (s) => new Date(`${s}T00:00:00Z`);
const addDays = (s, n) => toIso(new Date(parse(s).getTime() + n * DAY_MS));
const today = () => toIso(new Date());
const nightsBetween = (a, b) => (a && b ? Math.round((parse(b) - parse(a)) / DAY_MS) : 0);
const fmt = (s) => parse(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const uid = () => Math.random().toString(36).slice(2, 10);

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
    {children}
  </label>
);

const emptyHotel = (rating = '') => ({ name: '', rating, distance: '', address: '', check_in_date: '', check_out_date: '' });
const hotelStars = [5, 4, 3, 2];

const deriveLocationFromCities = (cityList = []) => {
  if (cityList.includes('jeddah')) return 'makkah_madinah_jeddah';
  if (cityList.includes('madinah')) return 'makkah_madinah';
  return 'makkah';
};

// Departure/return dates and total nights are derived from the per-city stays.
const deriveStay = (hotels = {}, cityList = []) => {
  const ins = cityList.map((c) => hotels[c]?.check_in_date).filter(Boolean).sort();
  const outs = cityList.map((c) => hotels[c]?.check_out_date).filter(Boolean).sort();
  const date = ins[0] || '';
  const return_date = outs.length ? outs[outs.length - 1] : '';
  return { date, return_date };
};

const buildRowHotels = (cityList = ['makkah']) =>
  Object.fromEntries(cityList.map((city) => [city, emptyHotel('')]));
const NEW_ROW = (cityList = ['makkah'], date = '', returnDate = '') => ({
  id: uid(), date, return_date: returnDate, expanded: true, hotels: buildRowHotels(cityList), adult: '',
});

const emptyTiers = () => ({ adult: '', child: '', minor_child: '', infant: '' });
const INITIAL_COUNTRY = () => Object.fromEntries(COUNTRY_PRICING_OPTIONS.map(({ code }) => [code, { on: false, ...emptyTiers() }]));

// Blank tiers follow the adult price automatically (same percentages as single-package creation).
const resolveTiers = (t) => {
  const adult = Number(t.adult) || 0;
  const pick = (key, field) => {
    if (t[key] !== '') return Number(t[key]);
    const auto = computeAutoTierPrice(adult, AGE_TIER_FIELDS.find((x) => x.key === key).percent);
    return auto === '' ? 0 : Number(auto);
  };
  return { adult, child: pick('child'), minor_child: pick('minor_child'), infant: pick('infant') };
};

const TierInputs = ({ value, onChange, adultLabel = 'Adult (12+) *' }) => {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const auto = (percent) => computeAutoTierPrice(value.adult, percent);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Field label={adultLabel}><input type="number" min="0" className={inputCls} value={value.adult} onChange={set('adult')} /></Field>
      {AGE_TIER_FIELDS.map(({ key, label, sub, percent }) => (
        <Field key={key} label={`${label} (${sub})`}>
          <input type="number" min="0" className={inputCls} placeholder={auto(percent) || 'auto'} value={value[key]} onChange={set(key)} />
        </Field>
      ))}
    </div>
  );
};

const BatchPackageModal = ({ onClose, onDone }) => {
  const [phase, setPhase] = useState('setup'); // setup → review
  const [type, setType] = useState('umrah');
  const [cities, setCities] = useState(['makkah']);
  const [customCity, setCustomCity] = useState('');
  const [tiers, setTiers] = useState(emptyTiers());
  const [country, setCountry] = useState(INITIAL_COUNTRY);
  const [highlights, setHighlights] = useState([]);
  const [inclusions, setInclusions] = useState([]);
  const [exclusions, setExclusions] = useState([]);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [rows, setRows] = useState(() => [NEW_ROW(['makkah'])]);
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); // { batch_ids, packages, skipped_duplicates }
  const [prices, setPrices] = useState({});
  const fileRef = useRef(null);
  const cutoffDate = useMemo(() => addDays(today(), ACTIVATION_LEAD_DAYS), []);
  const cityName = (c) => cityLabelFromValue(c);
  const blankHotelForCity = () => emptyHotel('');
  const resetCurrentBuilder = () => {
    setType('umrah');
    setCities(['makkah']);
    setCustomCity('');
    setTiers(emptyTiers());
    setCountry(INITIAL_COUNTRY());
    setHighlights([]);
    setInclusions([]);
    setExclusions([]);
    setDescription('');
    setImages([]);
    setPreviews([]);
    setRows([NEW_ROW(['makkah'])]);
    setError('');
  };
  const buildPayloadFromState = ({ type: sType, cities: sCities, tiers: sTiers, country: sCountry, description: sDescription, highlights: sHighlights, inclusions: sInclusions, exclusions: sExclusions, rows: sRows }) => {
    const countryPricing = {};
    COUNTRY_PRICING_OPTIONS.forEach(({ code }) => {
      if (sCountry[code].on) countryPricing[code] = resolveTiers(sCountry[code]);
    });
    const template = {
      type: sType,
      cities: sCities,
      location: deriveLocationFromCities(sCities),
      duration: Math.max(2, ...sRows.map((r) => nightsBetween(r.date, r.return_date)).filter((n) => n > 0)),
      price_tiers: resolveTiers(sTiers),
      country_pricing: countryPricing,
      description: sDescription,
      highlights: sHighlights,
      inclusions: sInclusions,
      exclusions: sExclusions,
    };
    const departures = sRows.map((r) => ({
      date: r.date,
      return_date: r.return_date,
      hotels: Object.fromEntries(sCities.map((c) => {
        const h = r.hotels[c] || blankHotelForCity(c);
        return [c, {
          name: h.name || '', rating: Number(h.rating) || undefined, distance: h.distance || '', address: h.address || '',
          check_in_date: h.check_in_date || '', check_out_date: h.check_out_date || '',
        }];
      })),
    }));
    return { template, departures };
  };
  const hasCurrentChanges = () =>
    images.length > 0 ||
    description.trim().length > 0 ||
    highlights.length > 0 ||
    inclusions.length > 0 ||
    exclusions.length > 0 ||
    cities.length > 1 ||
    rows.some((r) =>
      r.date || r.return_date || r.adult ||
      Object.values(r.hotels || {}).some((h) => h?.name || h?.rating || h?.distance || h?.address || h?.check_in_date));
  // ── cities ──
  const toggleCity = (value) => {
    const c = normalizeCityValue(value);
    if (!c || c === 'makkah') return;
    if (cities.includes(c)) {
      const rest = cities.filter((x) => x !== c);
      setCities(rest);
      setRows((p) => p.map((r) => { const h = { ...r.hotels }; delete h[c]; return { ...r, hotels: h, ...deriveStay(h, rest) }; }));
    } else {
      setCities((p) => [...p, c]);
      setRows((p) => p.map((r) => ({ ...r, hotels: { ...r.hotels, [c]: blankHotelForCity(c) } })));
    }
  };
  const addCustomCity = () => {
    const c = normalizeCityValue(customCity);
    setCustomCity('');
    if (c && c !== 'makkah' && !cities.includes(c)) toggleCity(c);
  };
  // ── departures ──
  const updateRow = (id, patch) => setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const setRowHotel = (id, c, patch) => setRows((p) => p.map((r) => {
    if (r.id !== id) return r;
    const hotels = { ...r.hotels, [c]: { ...blankHotelForCity(c), ...r.hotels[c], ...patch } };
    // Chain stays: the next city starts when this one ends.
    if ('check_out_date' in patch) {
      const next = cities[cities.indexOf(c) + 1];
      const old = r.hotels[c]?.check_out_date;
      if (next) {
        const nh = { ...blankHotelForCity(next), ...hotels[next] };
        if (!nh.check_in_date || nh.check_in_date === old) nh.check_in_date = patch.check_out_date;
        if (nh.check_out_date && nh.check_out_date <= nh.check_in_date) nh.check_out_date = '';
        hotels[next] = nh;
      }
    }
    return { ...r, hotels, ...deriveStay(hotels, cities) };
  }));
  const removeRow = (id) => setRows((p) => (p.length > 1 ? p.filter((r) => r.id !== id) : p));
  const addRow = () => {
    if (rows.length >= MAX_DEPARTURES) return setError(`A batch can hold at most ${MAX_DEPARTURES} departures.`);
    setError('');
    setRows((p) => [...p, NEW_ROW(cities)]);
  };
  const duplicateRow = (r) => {
    if (rows.length >= MAX_DEPARTURES) return setError(`A batch can hold at most ${MAX_DEPARTURES} departures.`);
    setError('');
    const hotels = Object.fromEntries(Object.entries(r.hotels).map(([c, h]) => [c, {
      ...h,
      check_in_date: h.check_in_date ? addDays(h.check_in_date, 7) : '',
      check_out_date: h.check_out_date ? addDays(h.check_out_date, 7) : '',
    }]));
    setRows((p) => [...p, { ...r, id: uid(), expanded: true, hotels, ...deriveStay(hotels, cities) }]);
  };

  // ── images ──
  const addFiles = async (fileList) => {
    const incoming = Array.from(fileList).filter(
      (f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 10_485_760);
    const room = MAX_IMAGES - images.length;
    if (!incoming.length) return;
    if (room <= 0) return toast.warning(`You've reached the ${MAX_IMAGES} photo limit.`);
    setProcessing(true);
    try {
      const { results, failedCount } = await processPackageImages(incoming.slice(0, room));
      setImages((p) => [...p, ...results.map((r) => r.file)]);
      setPreviews((p) => [...p, ...results.map((r) => r.previewUrl)]);
      if (failedCount > 0) toast.error(`Couldn't process ${failedCount} photo${failedCount > 1 ? 's' : ''}.`);
    } finally { setProcessing(false); }
  };
  const removeImage = (i) => {
    URL.revokeObjectURL(previews[i]);
    setPreviews((p) => p.filter((_, x) => x !== i));
    setImages((p) => p.filter((_, x) => x !== i));
  };

  const validate = () => {
    if (!(Number(tiers.adult) > 0)) return 'Enter the adult price in the package pricing section.';
    for (const { code, label } of COUNTRY_PRICING_OPTIONS) {
      if (country[code].on && !(Number(country[code].adult) > 0)) return `Enter an adult price for ${label}, or switch it off.`;
    }
    if (!images.length) return 'Add at least one package photo.';
    const seen = new Set();
    for (const [i, r] of rows.entries()) {
      const tag = `Departure ${i + 1}`;
      if (r.date <= today()) return `${tag}: departure must be in the future.`;
      if (seen.has(r.date)) return `${tag}: ${fmt(r.date)} is listed twice.`;
      seen.add(r.date);
      const n = nightsBetween(r.date, r.return_date);
      if (n < 2 || n > 60) return `${tag}: trip must be between 2 and 60 nights.`;
      for (const c of cities) {
        const h = r.hotels[c] || {};
        if (!h.check_in_date || !h.check_out_date) return `${tag}: pick check-in and check-out for ${cityName(c)}.`;
        if (nightsBetween(h.check_in_date, h.check_out_date) < 1) return `${tag}: ${cityName(c)} check-out must be after check-in.`;
        if (!h.name) return `${tag}: add a hotel name for ${cityName(c)}.`;
        if (!h.rating) return `${tag}: add a star rating for ${cityName(c)}.`;
      }
    }
    return '';
  };

  const saveDraft = () => {
    const v = validate();
    if (v) return setError(v);
    const payload = buildPayloadFromState({
      type, cities, tiers, country, description, highlights, inclusions, exclusions, rows,
    });
    const summary = `${type === 'hajj' ? 'Hajj' : 'Umrah'} • ${cities.map(cityName).join(', ')} • ${rows.length} departure${rows.length === 1 ? '' : 's'}`;
    setSavedDrafts((p) => [...p, {
      id: uid(),
      summary,
      departuresCount: rows.length,
      images: [...images],
      previews: [...previews],
      payload,
    }]);
    resetCurrentBuilder();
    toast.success('Package draft saved. You can now continue with another package.');
  };

  const removeSavedDraft = (id) => {
    setSavedDrafts((prev) => {
      const found = prev.find((x) => x.id === id);
      if (found) found.previews.forEach((src) => URL.revokeObjectURL(src));
      return prev.filter((x) => x.id !== id);
    });
  };

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const queue = [];
      if (savedDrafts.length > 0) {
        if (hasCurrentChanges()) {
          setBusy(false);
          return setError('You have changes in the current package. Save it as draft first, or clear it, then batch create.');
        }
        savedDrafts.forEach((d) => queue.push({ template: d.payload.template, departures: d.payload.departures, images: d.images }));
      } else {
        const v = validate();
        if (v) {
          setBusy(false);
          return setError(v);
        }
        const payload = buildPayloadFromState({
          type, cities, tiers, country, description, highlights, inclusions, exclusions, rows,
        });
        queue.push({ template: payload.template, departures: payload.departures, images });
      }

      const combined = { batch_ids: [], packages: [], skipped_duplicates: [] };
      for (const item of queue) {
        const res = await createPackageBatch(item.template, item.departures, item.images);
        if (res.batch_id) combined.batch_ids.push(res.batch_id);
        if (Array.isArray(res.packages)) combined.packages.push(...res.packages);
        if (Array.isArray(res.skipped_duplicates)) combined.skipped_duplicates.push(...res.skipped_duplicates);
      }
      setCreated(combined);
      setPrices(Object.fromEntries(combined.packages.map((p) => [p.id, String(p.price_tiers?.adult ?? p.price)])));
      setPhase('review');
      if (savedDrafts.length > 0) {
        savedDrafts.forEach((d) => d.previews.forEach((src) => URL.revokeObjectURL(src)));
        setSavedDrafts([]);
      }
      onDone?.();
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e.message || 'Failed to create packages.');
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      // Only send price overrides the agent actually changed; scale other tiers proportionally.
      const overridesByBatch = {};
      created.packages.forEach((p) => {
        const next = Number(prices[p.id]);
        const cur = Number(p.price_tiers?.adult ?? p.price);
        if (next > 0 && next !== cur) {
          const ratio = next / cur;
          const t = p.price_tiers || {};
          const patch = {
            adult: next,
            child: Math.round((t.child ?? cur) * ratio),
            minor_child: Math.round((t.minor_child ?? cur) * ratio),
            infant: Math.round((t.infant ?? cur) * ratio),
          };
          const b = p.batch_id || created.batch_id || 'single';
          overridesByBatch[b] = { ...(overridesByBatch[b] || {}), [p.id]: patch };
        }
      });
      const batchIds = Array.isArray(created.batch_ids) && created.batch_ids.length
        ? created.batch_ids
        : (created.batch_id ? [created.batch_id] : ['single']);
      for (const batchId of batchIds) {
        await confirmBatchPricing({
          batchId: batchId === 'single' ? created.batch_id : batchId,
          prices: overridesByBatch[batchId] || {},
        });
      }
      onDone?.();
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to confirm pricing.');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center space-x-2">
            <CalendarPlus className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-gray-900">
              {phase === 'setup' ? 'Batch create packages' : 'Review pricing & schedule'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
          <div className="flex items-start space-x-2 bg-blue-50 text-blue-800 text-xs rounded-lg p-3">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Set up the package once, then add as many departures as you need — even several in the same month with different hotels.
              Packages are created as drafts with automatic SEO names. Once you confirm pricing, each goes live {ACTIVATION_LEAD_DAYS} days before its own departure.
            </span>
          </div>

          {phase === 'setup' && (
            <>
              {savedDrafts.length > 0 && (
                <section className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-3 space-y-2">
                  <p className="text-sm font-semibold text-emerald-800">Saved package drafts ({savedDrafts.length})</p>
                  <div className="space-y-2">
                    {savedDrafts.map((d, i) => (
                      <div key={d.id} className="flex items-center justify-between gap-3 bg-white border border-emerald-100 rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">#{i + 1} {d.summary}</p>
                          <p className="text-xs text-gray-500">{d.departuresCount} departure{d.departuresCount === 1 ? '' : 's'} · {d.images.length} image{d.images.length === 1 ? '' : 's'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSavedDraft(d.id)}
                          className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <p className="text-sm font-semibold">Package</p>
                <div className="max-w-[12rem]">
                  <Field label="Type">
                    <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="umrah">Umrah</option><option value="hajj">Hajj</option>
                    </select>
                  </Field>
                </div>
                <div className="space-y-2">
                  <span className="block text-xs font-medium text-gray-600">Cities (Makkah is always included)</span>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-700 text-white">Makkah</span>
                    {CITY_PRESET_OPTIONS.map((o) => {
                      const on = cities.includes(o.value);
                      return (
                        <button key={o.value} type="button" onClick={() => toggleCity(o.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${on ? 'bg-amber-500 text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                          {o.icon} {o.label}
                        </button>
                      );
                    })}
                    {cities.filter((c) => !CITY_PRESET_OPTIONS.some((o) => o.value === c) && c !== 'makkah').map((c) => (
                      <button key={c} type="button" onClick={() => toggleCity(c)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500 text-white inline-flex items-center gap-1">
                        {cityName(c)} <X className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 max-w-sm">
                    <input className={inputCls} placeholder="Add custom city (e.g. Abu Dhabi)" value={customCity} maxLength={40}
                      onChange={(e) => setCustomCity(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCity(); } }} />
                    <button type="button" onClick={addCustomCity} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Add</button>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-sm font-semibold">Default price tiers (per person)</p>
                <TierInputs value={tiers} onChange={setTiers} />
                <p className="text-[11px] text-gray-400 -mt-1">Child and infant prices fill in automatically from the adult price — type over any of them to override. Each departure can set its own adult price below.</p>

                {COUNTRY_PRICING_OPTIONS.map(({ code, label, flag }) => (
                  <div key={code} className="border border-gray-100 rounded-xl p-3 space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <input type="checkbox" checked={country[code].on}
                        onChange={(e) => setCountry((p) => ({ ...p, [code]: { ...p[code], on: e.target.checked } }))} />
                      <span>{flag} Different price for {label} pilgrims</span>
                    </label>
                    {country[code].on && (
                      <TierInputs adultLabel={`${label} adult (12+) *`} value={country[code]}
                        onChange={(v) => setCountry((p) => ({ ...p, [code]: { ...v, on: true } }))} />
                    )}
                  </div>
                ))}
              </section>

              <section className="space-y-3">
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">Highlights (tap to select)</span>
                  <OptionGrid options={HIGHLIGHT_OPTIONS} selected={highlights} onChange={setHighlights} color="gold" />
                </div>
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">Inclusions</span>
                  <OptionGrid options={INCLUSION_OPTIONS} selected={inclusions} onChange={setInclusions} color="green" />
                </div>
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">Exclusions</span>
                  <OptionGrid options={EXCLUSION_OPTIONS} selected={exclusions} onChange={setExclusions} color="red" />
                </div>
                <Field label="Short description (optional)">
                  <input className={inputCls} maxLength={1200} value={description} onChange={(e) => setDescription(e.target.value)} />
                </Field>
              </section>

              <section className="space-y-2">
                <p className="text-sm font-semibold">Package photos <span className="text-xs font-normal text-gray-400">· shared by every departure · up to {MAX_IMAGES}</span></p>
                <div className="flex flex-wrap gap-2">
                  {previews.map((src, i) => (
                    <div key={src} className="relative group w-[72px] h-[72px] rounded-xl overflow-hidden border border-gray-200">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={processing || images.length >= MAX_IMAGES}
                    className="w-[72px] h-[72px] rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-emerald-500 disabled:opacity-50">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-5 w-5" />}
                  </button>
                  <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                </div>
              </section>

              <section className="border border-gray-100 rounded-xl p-3 space-y-3">
                <p className="text-sm font-semibold">Departures</p>
                <p className="text-xs text-gray-500">Each departure has its own hotel names and stars. Expand/collapse with the arrow on the right.</p>
                <div className="space-y-3">
                  {rows.map((r, idx) => {
                    const n = nightsBetween(r.date, r.return_date);
                    const nearTerm = !!r.date && r.date <= cutoffDate;
                    return (
                      <div key={r.id} className="rounded-lg border border-gray-200">
                        <div className="p-2.5 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500 w-6">#{idx + 1}</span>
                            <div className="flex-1 min-w-0 text-sm">
                              {r.date && r.return_date ? (
                                <span className="font-medium text-gray-800">{fmt(r.date)} → {fmt(r.return_date)}</span>
                              ) : (
                                <span className="text-gray-400">Pick hotel dates below</span>
                              )}
                              {n > 0 && <span className="ml-2 text-xs font-semibold text-amber-600">🌙 {n} nights · {n + 1} days</span>}
                            </div>
                            <button type="button" title="Duplicate (+7 days)" onClick={() => duplicateRow(r)} className="p-1.5 hover:bg-gray-100 rounded">
                              <Copy className="h-4 w-4 text-gray-500" />
                            </button>
                            <button type="button" onClick={() => updateRow(r.id, { expanded: !r.expanded })} className="p-1.5 hover:bg-gray-100 rounded">
                              {r.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                            <button type="button" onClick={() => removeRow(r.id)} disabled={rows.length === 1}
                              className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded disabled:opacity-30">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {nearTerm && <p className="text-xs text-amber-700 pl-8">goes live immediately on confirm</p>}
                        </div>
                        {r.expanded && (
                          <div className="px-2.5 pb-3 space-y-3 border-t border-gray-100 pt-2">
                            <p className="text-[11px] text-gray-500">Pick check-in and check-out for each hotel — nights per city and the package duration are calculated automatically.</p>
                            {cities.map((c) => {
                              const o = r.hotels[c] || {};
                              const cn = nightsBetween(o.check_in_date, o.check_out_date);
                              return (
                                <div key={c} className="space-y-2 border border-gray-100 rounded-lg p-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold">{cityName(c)}</p>
                                    {cn > 0 && <span className="text-xs font-semibold text-amber-600">🌙 {cn} night{cn === 1 ? '' : 's'} in {cityName(c)}</span>}
                                  </div>
                                  <DateRangePicker checkIn={o.check_in_date} checkOut={o.check_out_date}
                                    onChangeCheckIn={(v) => setRowHotel(r.id, c, { check_in_date: v })}
                                    onChangeCheckOut={(v) => setRowHotel(r.id, c, { check_out_date: v })} />
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <input className={inputCls} placeholder={`${cityName(c)} hotel name`} value={o.name || ''}
                                      onChange={(e) => setRowHotel(r.id, c, { name: e.target.value })} />
                                    <select className={inputCls} value={o.rating || ''} onChange={(e) => setRowHotel(r.id, c, { rating: e.target.value })}>
                                      <option value="">Stars</option>{hotelStars.map((s) => <option key={s} value={s}>{s}★</option>)}
                                    </select>
                                    <input className={inputCls} placeholder="Distance (optional)" value={o.distance || ''}
                                      onChange={(e) => setRowHotel(r.id, c, { distance: e.target.value })} />
                                    <input className={inputCls} placeholder="Address (optional)" value={o.address || ''}
                                      onChange={(e) => setRowHotel(r.id, c, { address: e.target.value })} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={addRow}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50">
                  <Plus className="h-4 w-4" /> Add departure
                </button>
                <p className="text-xs text-gray-500">{rows.length} departure{rows.length === 1 ? '' : 's'} → {rows.length} package{rows.length === 1 ? '' : 's'}</p>
              </section>
            </>
          )}

          {phase === 'review' && created && (
            <>
              {created.skipped_duplicates?.length > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
                  Skipped existing departures: {created.skipped_duplicates.map(fmt).join(', ')}
                </p>
              )}
              <div className="divide-y border border-gray-100 rounded-xl">
                {created.packages.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate" title={p.name}>{p.name}</p>
                      <p className="text-xs text-gray-500">
                        Departs {fmt(p.available_from)} · goes live {p.activates_at <= today() ? 'immediately' : fmt(p.activates_at)}
                      </p>
                    </div>
                    <input type="number" min="1" value={prices[p.id] ?? ''} aria-label="Adult price"
                      onChange={(e) => setPrices((s) => ({ ...s, [p.id]: e.target.value }))}
                      className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right" />
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
        </div>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            {phase === 'review' ? 'Confirm later' : 'Cancel'}
          </button>
          {phase === 'setup' ? (
            <>
              <button
                onClick={saveDraft}
                disabled={busy || processing}
                className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
              >
                Save draft &amp; add another package
              </button>
              <button onClick={submit} disabled={busy || processing}
                className="flex items-center space-x-2 px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {savedDrafts.length > 0
                    ? `Batch create ${savedDrafts.length} saved package${savedDrafts.length === 1 ? '' : 's'}`
                    : `Create ${rows.length} draft${rows.length === 1 ? '' : 's'}`}
                </span>
              </button>
            </>
          ) : (
            <button onClick={confirm} disabled={busy}
              className="flex items-center space-x-2 px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>Confirm pricing &amp; schedule</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchPackageModal;
