import React, { useEffect, useMemo, useState } from 'react';
import {
  Sparkles, Loader2, Send, Users, CheckCircle2, Search, Phone, Mail, ShieldCheck, ArrowLeft,
} from 'lucide-react';
import {
  sendGuestOtp, verifyGuestOtp, createGuestCustomRequest, getGuestInquiryAgents,
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public, unauthenticated custom-package request page.
 * Flow: WhatsApp + email -> OTP sent via Twilio Verify -> code confirms
 * identity -> a short-lived guest token lets the visitor submit one
 * customization request without ever creating an account. Agent replies
 * are pushed back out over WhatsApp + email — there is no dashboard to
 * check, so this page never looks up or lists past requests.
 */
const GuestCustomPackageRequest = ({ darkMode }) => {
  const card = darkMode ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-white border-gray-100 text-gray-900';
  const input = `w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`;
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const months = useMemo(() => nextMonths(), []);

  const [step, setStep] = useState('contact'); // contact -> otp -> form -> done
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  const [form, setForm] = useState({
    travel_month: '', flexible_dates: false, adults: 2, children: 0, infants: 0, group_type: 'family',
    route: '', nights: '', makkah_stars: '', madinah_stars: '', hotel_preference: '',
    budget: '', budget_currency: 'USD', budget_per_person: true, notes: '',
  });
  const [audience, setAudience] = useState('all');
  const [agents, setAgents] = useState([]);
  const [picked, setPicked] = useState([]);
  const [agentQuery, setAgentQuery] = useState('');
  const [result, setResult] = useState(null);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  useEffect(() => {
    if (audience === 'selected' && agents.length === 0) {
      getGuestInquiryAgents().then((r) => setAgents(r.agents ?? [])).catch(() => setMsg({ ok: false, text: 'Could not load agents.' }));
    }
  }, [audience, agents.length]);

  const shownAgents = agents.filter((a) => a.name.toLowerCase().includes(agentQuery.toLowerCase()));

  const requestOtp = async () => {
    if (!whatsapp.trim()) return setMsg({ ok: false, text: 'Enter your WhatsApp number, including country code (e.g. +254712345678).' });
    if (!EMAIL_RE.test(email.trim())) return setMsg({ ok: false, text: 'Enter a valid email address.' });
    setBusy(true); setMsg(null);
    try {
      await sendGuestOtp(whatsapp.trim());
      setMsg({ ok: true, text: 'We sent a verification code to your WhatsApp number.' });
      setStep('otp');
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.data?.message || e.message || 'Could not send the verification code.' });
    } finally { setBusy(false); }
  };

  const confirmOtp = async () => {
    if (!/^\d{4,10}$/.test(code.trim())) return setMsg({ ok: false, text: 'Enter the verification code you received.' });
    setBusy(true); setMsg(null);
    try {
      const r = await verifyGuestOtp(whatsapp.trim(), code.trim());
      setToken(r.token);
      setMsg(null);
      setStep('form');
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.data?.message || e.message || 'That code is incorrect or has expired.' });
    } finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true); setMsg(null);
    try {
      await sendGuestOtp(whatsapp.trim());
      setMsg({ ok: true, text: 'A new code was sent to your WhatsApp number.' });
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.data?.message || e.message || 'Could not resend the code.' });
    } finally { setBusy(false); }
  };

  const submit = async () => {
    if (audience === 'selected' && picked.length === 0) return setMsg({ ok: false, text: 'Select at least one agent.' });
    setBusy(true); setMsg(null);
    try {
      const num = (v) => (v === '' ? undefined : Number(v));
      const res = await createGuestCustomRequest({
        token, email: email.trim(),
        audience, agent_ids: audience === 'selected' ? picked : undefined,
        details: {
          ...form, adults: num(form.adults), children: num(form.children), infants: num(form.infants),
          nights: num(form.nights), makkah_stars: num(form.makkah_stars), madinah_stars: num(form.madinah_stars),
          budget: num(form.budget), travel_month: form.travel_month || undefined, route: form.route || undefined,
        },
      });
      setResult(res);
      setStep('done');
    } catch (e) {
      const status = e?.response?.status;
      const text = e?.response?.data?.message || e.message || 'Could not send your request.';
      setMsg({ ok: false, text });
      // 409 means the verification token expired while filling the form — send them back to re-verify.
      if (status === 409) setStep('otp');
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4">
      <div className="rounded-2xl p-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <div className="flex items-center space-x-2 mb-1"><Sparkles className="h-5 w-5" /><h2 className="text-xl font-bold">Request a custom Umrah package</h2></div>
        <p className="text-sm text-white/90">
          Can't find exactly what you need? Tell our agents what you're planning — for family, friends, or just yourself.
          You don't need an account. We'll verify your WhatsApp number so agents can reply directly to you; we never share it as part of the request itself.
        </p>
      </div>

      {step === 'contact' && (
        <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
          <p className="text-sm font-semibold flex items-center space-x-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /><span>Step 1 of 3 — Verify it's you</span></p>
          <label className="block"><span className={`text-xs ${muted}`}>WhatsApp number (with country code)</span>
            <div className="relative"><Phone className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
              <input className={`${input} pl-9`} placeholder="+254712345678" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
          </label>
          <label className="block"><span className={`text-xs ${muted}`}>Email address</span>
            <div className="relative"><Mail className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
              <input type="email" className={`${input} pl-9`} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </label>
          <p className={`text-xs ${muted}`}>We'll text a one-time code to confirm this WhatsApp number belongs to you, and use your email as a backup way to reach you with agent replies.</p>
          {msg && <p className={`text-sm rounded-lg p-3 ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</p>}
          <button onClick={requestOtp} disabled={busy}
            className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            <span>Send verification code</span>
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
          <button onClick={() => setStep('contact')} className={`text-xs flex items-center space-x-1 ${muted}`}><ArrowLeft className="h-3 w-3" /><span>Change number</span></button>
          <p className="text-sm font-semibold flex items-center space-x-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /><span>Step 2 of 3 — Enter the code</span></p>
          <p className={`text-xs ${muted}`}>Sent to {whatsapp}</p>
          <label className="block"><span className={`text-xs ${muted}`}>Verification code</span>
            <input inputMode="numeric" maxLength={10} className={input} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} /></label>
          {msg && <p className={`text-sm rounded-lg p-3 ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</p>}
          <div className="flex items-center space-x-3">
            <button onClick={confirmOtp} disabled={busy}
              className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>Verify</span>
            </button>
            <button onClick={resend} disabled={busy} className={`text-sm ${muted} hover:underline`}>Resend code</button>
          </div>
        </div>
      )}

      {step === 'form' && (
        <div className={`rounded-2xl border p-5 space-y-5 ${card}`}>
          <p className="text-sm font-semibold flex items-center space-x-2"><Sparkles className="h-4 w-4 text-emerald-600" /><span>Step 3 of 3 — Tell us about your trip (every field optional)</span></p>

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
      )}

      {step === 'done' && (
        <div className={`rounded-2xl border p-6 space-y-3 text-center ${card}`}>
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-bold">Request sent!</h3>
          <p className={`text-sm ${muted}`}>
            <Users className="h-3.5 w-3.5 inline mr-1" />
            We notified {result?.notified_agents ?? 'our'} agent{result?.notified_agents === 1 ? '' : 's'} about your request (ref {result?.ref}).
          </p>
          <p className={`text-sm ${muted}`}>
            When an agent replies, we'll message you on WhatsApp at {whatsapp} and email {email} — no account or dashboard needed.
          </p>
        </div>
      )}
    </div>
  );
};

export default GuestCustomPackageRequest;
