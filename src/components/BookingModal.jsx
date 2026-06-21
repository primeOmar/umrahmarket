// BookingModal.jsx
// Drop-in booking popup for ClientDashboard.
// Payment methods: Card (real backend), M-Pesa STK push (Daraja), Bank Transfer.
//
// Usage:
//   import BookingModal from './BookingModal';
//   <BookingModal pkg={selectedPkg} user={user} onClose={() => setSelectedPkg(null)} onSuccess={handleBookingSuccess} />

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Shield, CheckCircle, AlertCircle,
  Loader2, Lock, Globe, ChevronLeft, ChevronRight, Info, Copy, CreditCard
} from 'lucide-react';
import { request } from '../api';

// ─── constants ────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS  = 4_000;
const POLL_MAX_ATTEMPTS = 18;          // 72 s total

// ─── helpers ──────────────────────────────────────────────────────────────────
// NOTE: KES conversion no longer uses a hardcoded rate — see fxRate state below,
// populated live from GET /api/fx/rate on mount.
const fmt = (n) => Number(n).toLocaleString('en-US');

function normalisePhone(raw) {
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('254') && d.length === 12) return d;
  if (d.startsWith('0')   && d.length === 10) return '254' + d.slice(1);
  if ((d.startsWith('7') || d.startsWith('1')) && d.length === 9) return '254' + d;
  return null;
}
const SAFARICOM_RE = /^254[17]\d{8}$/;

// ─── tiny shared UI ───────────────────────────────────────────────────────────
const inputCls = (err) =>
  `w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 ${
    err ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-emerald-500'
  }`;

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    {children}
    {error && (
      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />{error}
      </p>
    )}
  </div>
);

// ─── BookingModal ─────────────────────────────────────────────────────────────
const BookingModal = ({ pkg, user, onClose, onSuccess }) => {

  // step machine:
  // 'select' → 'card' | 'mpesa' | 'bank'
  // any method → 'processing' → 'success' | 'error'
  // 'mpesa' → 'polling' → 'success' | 'error'
  const [step,     setStep]     = useState('select');
  const [errorMsg, setErrorMsg] = useState('');

  // card (Flutterwave)
  const [cardLoading, setCardLoading] = useState(false);
  const [orderTrackingId, setOrderTrackingId] = useState(null);

  // mpesa
  const [phone,      setPhone]      = useState('');
  const [phoneErr,   setPhoneErr]   = useState('');
  const [checkoutId, setCheckoutId] = useState(null);
  const [pollCount,  setPollCount]  = useState(0);

  // copy feedback
  const [copied, setCopied] = useState(null);

  // live FX rate (USD → KES) + the currency the client wants to see/pay in
  const [fxRate,    setFxRate]    = useState(null);   // null until /api/fx/rate resolves
  const [fxLoading, setFxLoading] = useState(true);
  const [fxError,   setFxError]   = useState(false);
  const [currency,  setCurrency]  = useState('KES');  // 'KES' | 'USD'

  const pollRef   = useRef(null);
  const unmounted = useRef(false);

  useEffect(() => () => { unmounted.current = true; clearInterval(pollRef.current); }, []);

  // ── fetch live USD/KES rate on mount ────────────────────────────────────────
  const fetchFxRate = useCallback(async () => {
    setFxLoading(true);
    setFxError(false);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      const r    = await fetch(apiBase + '/fx/rate');
      const json = await r.json();
      if (!json?.success) throw new Error(json?.message || 'Rate fetch failed');
      setFxRate(json.usdKes);
    } catch (err) {
      console.error('[BookingModal] FX rate fetch failed:', err.message);
      setFxRate(130); // safe fallback so modal is usable
      setFxError(true);
    } finally {
      setFxLoading(false);
    }
  }, []);

  useEffect(() => { fetchFxRate(); }, [fetchFxRate]);

  // lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Escape to close (when safe)
  const canClose = !['polling', 'processing'].includes(step);  // card-waiting is closeable
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && canClose) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [canClose, onClose]);

  const goBack = () => {
    clearInterval(pollRef.current);
    setStep('select');
    setErrorMsg('');
    setPhoneErr('');
    setCardLoading(false);
    setOrderTrackingId(null);
  };

  const pkgRef = `UMRAH-${pkg.id.slice(-8).toUpperCase()}`;

  // live-rate-derived amounts — null until the fx rate has loaded
  const totalKes    = fxRate ? Math.round(pkg.price * fxRate) : null;
  const fmtKes       = (usd) => (fxRate ? `KES ${fmt(Math.round(usd * fxRate))}` : 'Loading rate…');
  const fmtUsd       = (usd) => `$${fmt(usd)}`;
  const fmtSelected  = (usd) => (currency === 'USD' ? fmtUsd(usd) : fmtKes(usd));

  // ── CARD (Pesapal Hosted Checkout) ────────────────────────────────────────
  // Flow:
  //   1. POST /api/payments/card/initiate → backend submits order to Pesapal
  //      → returns { redirectUrl, orderTrackingId }
  //   2. Frontend opens Pesapal hosted page in NEW TAB (user enters card there)
  //      Card data goes to Pesapal's PCI-DSS servers — never ours
  //   3. Pesapal redirects to PESAPAL_CALLBACK_URL with ?OrderTrackingId=xxx
  //      The callback page (your frontend /payment/callback route) calls verifyCard()
  //   4. POST /api/payments/card/verify → backend queries Pesapal server-to-server
  //   5. Booking created in Supabase

  const handleCardPay = async () => {
    if (!fxRate) {
      setErrorMsg('Exchange rate is still loading — please wait a moment and try again.');
      setStep('error');
      return;
    }
    setCardLoading(true);
    setStep('processing');
    try {
      const res = await request({
        method: 'post',
        url:    '/payments/card/initiate',
        data:   { packageId: pkg.id, currency, amountKes: totalKes },
      });

      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to initiate payment');

      const { redirectUrl, orderTrackingId: trackingId } = res.data;
      setOrderTrackingId(trackingId);

      // Fallback: store packageId in localStorage in case the path param is ever
      // unavailable (e.g. unusual browser redirect behaviour). The primary source
      // of truth is the /:packageId path segment in the callback URL.
      localStorage.setItem('pesapal_package_id', pkg.id);

      // Open Pesapal hosted checkout in a new tab
      // Card details are entered on Pesapal's PCI-DSS certified page
      window.open(redirectUrl, '_blank', 'noopener,noreferrer');

      // Show waiting screen — user completes payment in new tab
      setStep('card-waiting');
      setCardLoading(false);

    } catch (err) {
      setCardLoading(false);
      setErrorMsg(err.response?.data?.message || err.message || 'Could not start card payment. Please try again.');
      setStep('error');
    }
  };

  // Called after user returns from Pesapal and clicks "I've paid"
  const verifyCard = async () => {
    if (!orderTrackingId) return;
    setCardLoading(true);
    setStep('processing');
    try {
      const res = await request({
        method: 'post',
        url:    '/payments/card/verify',
        data:   { orderTrackingId, packageId: pkg.id },
      });

      if (!res.data?.success) throw new Error(res.data?.message || 'Verification failed');

      if (res.data.status === 'PENDING') {
        // Still processing — go back to waiting
        setStep('card-waiting');
        setCardLoading(false);
        return;
      }

      setStep('success');
      setCardLoading(false);
      if (onSuccess && res.data.booking) onSuccess(res.data.booking);

    } catch (err) {
      setCardLoading(false);
      setErrorMsg(err.response?.data?.message || err.message || 'Payment verification failed. Contact support if you were charged.');
      setStep('error');
    }
  };

  // ── MPESA ─────────────────────────────────────────────────────────────────
  const validatePhone = () => {
    if (!phone.trim()) { setPhoneErr('Phone number is required'); return null; }
    const norm = normalisePhone(phone);
    if (!norm || !SAFARICOM_RE.test(norm)) {
      setPhoneErr('Enter a valid Safaricom number (e.g. 0712 345 678)');
      return null;
    }
    setPhoneErr('');
    return norm;
  };

  const handleMpesaPay = async () => {
    const normPhone = validatePhone();
    if (!normPhone) return;
    if (!fxRate) {
      setErrorMsg('Exchange rate is still loading — please wait a moment and try again.');
      setStep('error');
      return;
    }
    setStep('processing');
    try {
      const res = await request({
        method: 'post',
        url: '/payments/mpesa/initiate',
        // M-Pesa STK push always settles in KES (Safaricom requirement) regardless
        // of the display currency picked above — we still send `currency` +
        // the live-rate `amountKes` for consistency/logging with the card flow.
        data: { packageId: pkg.id, phone: normPhone, currency, amountKes: totalKes },
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'STK push failed');
      setCheckoutId(res.data.checkoutRequestId);
      setPollCount(0);
      setStep('polling');
      startPolling(res.data.checkoutRequestId);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Could not send M-Pesa prompt. Try again.');
      setStep('error');
    }
  };

  const startPolling = useCallback((cid) => {
    clearInterval(pollRef.current);
    let count = 0;
    pollRef.current = setInterval(async () => {
      if (unmounted.current) { clearInterval(pollRef.current); return; }
      count += 1;
      setPollCount(count);
      if (count > POLL_MAX_ATTEMPTS) {
        clearInterval(pollRef.current);
        setErrorMsg('Payment timed out. If you were charged, please contact support with your M-Pesa message.');
        setStep('error');
        return;
      }
      try {
        const res = await request({ method: 'get', url: `/payments/mpesa/status/${cid}` });
        const { status, booking } = res.data;
        if (status === 'SUCCESS') {
          clearInterval(pollRef.current);
          setStep('success');
          if (onSuccess && booking) onSuccess(booking);
        } else if (status === 'FAILED' || status === 'CANCELLED') {
          clearInterval(pollRef.current);
          setErrorMsg(res.data.resultDesc || 'Payment was not completed.');
          setStep('error');
        }
      } catch { /* keep polling on transient network errors */ }
    }, POLL_INTERVAL_MS);
  }, [onSuccess]);

  // ── BANK TRANSFER ─────────────────────────────────────────────────────────
  const handleBankConfirm = async () => {
    setStep('processing');
    try {
      const res = await request({
        method: 'post',
        url: '/payments/bank/initiate',
        data: { packageId: pkg.id },
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to record bank transfer');
      setStep('success');
      if (onSuccess && res.data.booking) onSuccess(res.data.booking);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Could not record transfer. Please try again.');
      setStep('error');
    }
  };

  const copyText = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const BackBtn = () => (
    <button onClick={goBack} className="flex items-center gap-1 text-sm text-emerald-600 hover:underline mb-4">
      <ChevronLeft className="h-4 w-4" /> Back
    </button>
  );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="bm-title"
      onClick={(e) => { if (e.target === e.currentTarget && canClose) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">

        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h2 id="bm-title" className="text-lg font-bold text-gray-900">Book Package</h2>
          {canClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Close">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* package summary */}
        {step !== 'success' && (
          <div className="px-5 py-3 bg-gray-50 border-b flex-shrink-0 space-y-2">
            <div className="flex items-center gap-3">
              <img src={pkg.image} alt={pkg.title} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-gray-900 truncate">{pkg.title}</p>
                <p className="text-xs text-gray-500">{pkg.duration} days · {pkg.agencyName}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-emerald-600">{fmtSelected(pkg.price)}</p>
                <p className="text-xs text-gray-400">
                  {currency === 'USD' ? fmtKes(pkg.price) : fmtUsd(pkg.price)}
                </p>
              </div>
            </div>

            {/* currency toggle + live rate status */}
            <div className="flex items-center justify-between">
              <div className="inline-flex bg-gray-200/70 rounded-lg p-0.5">
                {['KES', 'USD'].map(c => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      currency === c ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {fxLoading && (
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Fetching live rate…
                </span>
              )}
              {!fxLoading && fxError && !fxRate && (
                <button onClick={fetchFxRate} className="text-[11px] text-red-500 underline">
                  Rate unavailable — retry
                </button>
              )}
              {!fxLoading && fxRate && (
                <span className="text-[11px] text-gray-400">1 USD ≈ {fmt(fxRate)} KES</span>
              )}
            </div>
          </div>
        )}

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* ══ SELECT METHOD ══ */}
          {step === 'select' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-1">Choose a payment method:</p>

              <button onClick={() => setStep('card')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all group text-left">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-100 group-hover:scale-105 transition-transform">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">Credit / Debit Card</p>
                  <p className="text-xs text-gray-500 mt-0.5">Visa, Mastercard, Amex — instant</p>
                </div>
                <div className="flex gap-1">
                  {['#1A1F71', '#EB001B', null].map((c, i) => (
                    <div key={i} className="w-7 h-5 rounded" style={{ background: i === 2 ? 'linear-gradient(135deg,#EB001B,#F79E1B)' : c, opacity: 0.85 }} />
                  ))}
                </div>
              </button>

              <button onClick={() => setStep('mpesa')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50/40 transition-all group text-left">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-100 group-hover:scale-105 transition-transform">
                  <span className="text-white font-black text-[10px] leading-none text-center">M<br />PESA</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">M-Pesa</p>
                  <p className="text-xs text-gray-500 mt-0.5">STK push to your phone — instant</p>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">Popular</span>
              </button>

              <button onClick={() => setStep('bank')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50/40 transition-all group text-left">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-100 group-hover:scale-105 transition-transform">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">Bank Transfer</p>
                  <p className="text-xs text-gray-500 mt-0.5">EFT / wire — 1–2 business days</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>

              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
                <Shield className="h-4 w-4 flex-shrink-0" />
                All payments are encrypted and processed securely.
              </div>
            </div>
          )}

          {/* ══ CARD (Pesapal Hosted Checkout) ══ */}
          {step === 'card' && (
            <div className="space-y-4">
              <BackBtn />

              {/* Card graphic */}
              <div className="relative h-40 rounded-2xl overflow-hidden select-none"
                style={{ background: 'linear-gradient(135deg,#1a1f71 0%,#2563eb 60%,#0ea5e9 100%)' }}>
                <div className="absolute inset-0 opacity-10"
                  style={{ backgroundImage: 'radial-gradient(circle at 20% 80%,white 1px,transparent 1px),radial-gradient(circle at 80% 20%,white 1px,transparent 1px)', backgroundSize: '30px 30px' }} />
                <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
                  <div className="w-8 h-6 rounded" style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }} />
                  <div className="flex gap-1.5">
                    {['#1A1F71','#EB001B',null].map((c,i) => (
                      <div key={i} className="w-7 h-5 rounded opacity-80" style={{ background: i===2 ? 'linear-gradient(135deg,#EB001B,#F79E1B)' : c }} />
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-5 left-5 right-5">
                  <div className="text-white/50 font-mono tracking-widest text-sm">•••• •••• •••• ••••</div>
                  <p className="text-white/40 text-xs mt-1">Secured by Pesapal · PCI-DSS Certified</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-blue-900">Secure hosted checkout</p>
                </div>
                <ul className="text-xs text-blue-700 space-y-1 ml-5 list-disc">
                  <li>Clicking "Pay" opens Pesapal's secure payment page in a new tab.</li>
                  <li>Your card details are entered on Pesapal's PCI-DSS certified servers — we <strong>never</strong> see them.</li>
                  <li>After paying, return here and click <strong>"I've paid"</strong> to confirm your booking.</li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {['Visa','Mastercard','M-Pesa','Airtel Money'].map(b => (
                  <span key={b} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">{b}</span>
                ))}
              </div>

              <button
                onClick={handleCardPay}
                disabled={cardLoading || !fxRate}
                className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}
              >
                {cardLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing checkout…</>
                  : !fxRate
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading rate…</>
                    : <><Lock className="h-4 w-4" /> Pay {fmtSelected(pkg.price)} via Pesapal</>
                }
              </button>
            </div>
          )}

          {/* ══ CARD WAITING — user has gone to Pesapal tab ══ */}
          {step === 'card-waiting' && (
            <div className="py-8 flex flex-col items-center gap-5 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                <CreditCard className="h-10 w-10 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">Complete payment in the new tab</p>
                <p className="text-sm text-gray-500 mt-1">Enter your card or M-Pesa details on the Pesapal page.</p>
                <p className="text-xs text-gray-400 mt-2">Once done, return here and click the button below.</p>
              </div>
              <div className="w-full space-y-3">
                <button
                  onClick={verifyCard}
                  disabled={cardLoading}
                  className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}
                >
                  {cardLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>
                    : <><CheckCircle className="h-4 w-4" /> I've paid — confirm my booking</>
                  }
                </button>
                <button onClick={goBack} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  Cancel and go back
                </button>
              </div>
            </div>
          )}

          {/* ══ MPESA ══ */}
          {step === 'mpesa' && (
            <div className="space-y-5">
              <BackBtn />
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 items-start">
                <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-[10px] leading-none text-center">M<br />PESA</span>
                </div>
                <div>
                  <p className="font-semibold text-green-900 text-sm">STK Push payment</p>
                  <p className="text-xs text-green-700 mt-0.5">A secure prompt will be sent to your Safaricom number. Enter your M-Pesa PIN on your phone to pay.</p>
                </div>
              </div>

              <Field label="Safaricom number" error={phoneErr}>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-semibold text-sm flex-shrink-0">
                    +254
                  </div>
                  <input value={phone}
                    onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 9)); setPhoneErr(''); }}
                    placeholder="7XX XXX XXX" inputMode="numeric"
                    className={`flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none font-mono text-gray-900 transition-colors ${phoneErr ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-green-500'}`} />
                </div>
                <p className="text-xs text-gray-400 mt-1">e.g. 0712 345 678 → enter 712345678</p>
              </Field>

              <div className="flex items-start gap-2 text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                Do <strong className="mx-0.5">not</strong> share your M-Pesa PIN with anyone.
              </div>

              <button onClick={handleMpesaPay} disabled={phone.length < 9 || !fxRate}
                className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
                {fxRate ? `Send STK Push — ${fmtKes(pkg.price)}` : 'Loading rate…'}
              </button>
            </div>
          )}

          {/* ══ BANK TRANSFER ══ */}
          {step === 'bank' && (
            <div className="space-y-4">
              <BackBtn />
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                Transfer the exact amount below and include your booking reference. Allow <strong>1–2 business days</strong> for confirmation.
              </div>
              <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                {[
                  ['Bank name',      'Equity Bank Kenya'],
                  ['Account name',   'Umrah Market Ltd'],
                  ['Account number', '0123456789'],
                  ['Branch',         'Nairobi, Kenyatta Ave'],
                  ['Swift / BIC',    'EQBLKENA'],
                  ['Amount',         totalKes ? `KES ${fmt(totalKes)}` : 'Loading…'],
                  ['Reference',      pkgRef],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center px-4 py-3 bg-white">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-gray-900 text-sm ${label === 'Reference' ? 'font-mono bg-gray-100 px-2 py-0.5 rounded' : ''}`}>
                        {value}
                      </span>
                      {['Account number', 'Reference', 'Amount'].includes(label) && (
                        <button onClick={() => copyText(value, label)} className="p-1 hover:bg-gray-100 rounded transition-colors" title="Copy">
                          {copied === label
                            ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleBankConfirm}
                className="w-full py-4 rounded-2xl font-bold text-white text-base"
                style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
                I've made the transfer
              </button>
            </div>
          )}

          {/* ══ POLLING ══ */}
          {step === 'polling' && (
            <div className="py-10 flex flex-col items-center gap-5 text-center">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-green-100" />
                <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
                <div className="absolute inset-3 rounded-full bg-green-50 flex items-center justify-center">
                  <span className="text-green-700 font-black text-sm leading-none text-center">M<br />PESA</span>
                </div>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">Check your phone</p>
                <p className="text-sm text-gray-500 mt-1">Enter your M-Pesa PIN when prompted</p>
                <p className="text-xs text-gray-400 mt-1">Sent to +254 {phone} · do not close this window</p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-green-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((pollCount / POLL_MAX_ATTEMPTS) * 100, 95)}%` }} />
              </div>
              <p className="text-xs text-gray-400">
                Didn't get the prompt?{' '}
                <button onClick={goBack} className="text-green-700 font-semibold underline">Go back and resend</button>
              </p>
            </div>
          )}

          {/* ══ PROCESSING ══ */}
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
                <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
                <div className="absolute inset-3 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 text-lg">Processing payment…</p>
                <p className="text-sm text-gray-500 mt-1">Please don't close this window</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* ══ SUCCESS ══ */}
          {step === 'success' && (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="h-12 w-12 text-emerald-600" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-emerald-200 flex items-center justify-center text-lg">✨</div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">All done!</h3>
                <p className="text-gray-500 mt-1 text-sm">Your Umrah package is booked. A confirmation has been sent to your email.</p>
              </div>
              <div className="w-full bg-gray-50 rounded-2xl p-4 space-y-2 text-left">
                {[['Package', pkg.title], ['Booking ref', pkgRef], ['Amount paid', `$${fmt(pkg.price)}`]].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-sm">
                    <span className="text-gray-500">{l}</span>
                    <span className={`font-semibold text-gray-900 ${l === 'Booking ref' ? 'font-mono' : ''}`}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 w-full pt-1">
                <button onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition">
                  Close
                </button>
                <button onClick={onClose}
                  className="flex-1 py-3 font-bold text-white rounded-xl transition"
                  style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
                  View Bookings
                </button>
              </div>
            </div>
          )}

          {/* ══ ERROR ══ */}
          {step === 'error' && (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-9 w-9 text-red-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">Payment Failed</p>
                <p className="text-sm text-gray-500 mt-1">{errorMsg}</p>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={goBack}
                  className="flex-1 py-3 font-bold text-white rounded-xl"
                  style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
                  Try Again
                </button>
                <button onClick={onClose} className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default BookingModal;