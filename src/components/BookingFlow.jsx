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
  Loader2, Lock, Globe, ChevronLeft, ChevronRight, Info, Copy, CreditCard,
  Minus, Plus, Users,
} from 'lucide-react';
import { request, getPassportStatus, getPassportStatusBatch, paymentGuard, tokenStore, refreshToken } from '../api';
import PassportVerificationModal from './PassportVerificationModal';
import { persistBookingFlow, readPendingBookingFlow, clearPendingBookingFlow } from '../utils/bookingResume';

// ─── constants ────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS  = 4_000;
const POLL_MAX_ATTEMPTS = 18;          // 72 s total

// Age-tier pricing — mirrors the tiers agents set on the package (see
// createpackages.controller.js) and the cap enforced server-side in
// services/pricing.service.js. At least one adult is required per booking.
const TRAVELER_TIERS = [
  { key: 'adult',       label: 'Adults',         sub: '12+ yrs',   min: 1 },
  { key: 'child',       label: 'Children',       sub: '7–11 yrs',  min: 0 },
  { key: 'minor_child', label: 'Young children', sub: '2–6 yrs',   min: 0 },
  { key: 'infant',      label: 'Infants',        sub: 'Under 2 yrs', min: 0 },
];
const MAX_TRAVELERS = 30;

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
const BookingModal = ({ pkg, user, onClose, onSuccess, onRequireAuth }) => {

  // step machine:
  // 'travelers' (pick counts) → 'passport-check' (loading, checks EVERY
  //   traveler at once) → 'passport' (current traveler in travelerQueue needs
  //   verification, repeats until all are done) → 'select' → 'card' | 'mpesa' | 'bank'
  // any method → 'processing' → 'success' | 'error'
  // 'mpesa' → 'polling' → 'success' | 'error'
  const [step,     setStep]     = useState('travelers');
  const [errorMsg, setErrorMsg] = useState('');

  // travelers — how many people this booking is for, broken down by age
  // tier. Defaults to a single adult ("book alone"), the most common case.
  const [travelers, setTravelers] = useState({ adult: 1, child: 0, minor_child: 0, infant: 0 });
  const [travelersError, setTravelersError] = useState('');

  // Every traveler on the booking gets their OWN passport verified — not
  // just the account holder's. travelerQueue is built from `travelers` once
  // counts are confirmed: one entry per person, in adult → child →
  // minor_child → infant order, each carrying a stable `index` (0-based)
  // that identifies its passport_verifications row on the backend.
  const [travelerQueue, setTravelerQueue] = useState([]);       // [{ index, tierKey, tierLabel }]
  const [travelerPos,   setTravelerPos]   = useState(0);        // position in travelerQueue currently being verified
  // Keyed by traveler index — each traveler's in-progress modal state
  // (form/photo/result/step) must stay isolated from every other traveler's,
  // otherwise advancing to the next person can resume straight into the
  // PREVIOUS traveler's finished 'success' screen, skip their actual scan
  // entirely, and loop forever once the backend (correctly) reports that
  // traveler as still unverified. See advanceTravelerVerification below.
  const [passportResumeStates, setPassportResumeStates] = useState({});

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

  // booking returned by the backend on success — held here and only handed
  // to the parent (onSuccess) when the user clicks "Continue", so the
  // confirmation screen always gets shown before any navigation/close happens
  const [successBooking, setSuccessBooking] = useState(null);

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

  useEffect(() => {
    if (!user?.id || !pkg?.id) return;
    const pending = readPendingBookingFlow(user.id);
    if (!pending || String(pending.packageId) !== String(pkg.id)) return;
    if (Array.isArray(pending.travelerQueue) && pending.travelerQueue.length) {
      setTravelerQueue(pending.travelerQueue);
      const restoredPos = Math.max(0, Math.min(Number(pending.travelerPos ?? 0), pending.travelerQueue.length - 1));
      setTravelerPos(restoredPos);
      setPassportResumeStates(pending.passportResumeStates ?? {});
      if (pending.step === 'passport') {
        setStep('passport');
      } else if (pending.step === 'passport-check') {
        setStep('passport-check');
      } else if (pending.step === 'select') {
        setStep('select');
      } else if (pending.step === 'travelers') {
        setStep('travelers');
      }
    }
  }, [pkg?.id, user?.id]);

  useEffect(() => {
    if (!user?.id || !pkg?.id || !travelerQueue.length) return;
    if (['success', 'processing', 'card-waiting', 'polling'].includes(step)) {
      clearPendingBookingFlow(user.id);
      return;
    }
    persistBookingFlow(user.id, {
      packageId: pkg.id,
      packageTitle: pkg.title,
      packageImage: pkg.image,
      step,
      travelerQueue,
      travelerPos,
      passportResumeStates,
    });
  }, [pkg?.id, passportResumeStates, step, travelerPos, travelerQueue, user?.id]);

  // Defense-in-depth: BookingFlow should never be reached without a logged-in
  // user (callers gate "Book Now" behind AuthModal already), but sessions can
  // expire between the click and this mount. If there's no user/token, bounce
  // straight to auth instead of firing an unauthenticated request.
  useEffect(() => {
    if (!user?.id && !tokenStore.get()) {
      onClose?.();
      onRequireAuth?.();
    }
  }, [user, onClose, onRequireAuth]);

  // Passport must be verified for EVERY traveler on THIS booking before
  // payment is allowed — not just the account holder's own passport. Only
  // runs once traveler counts are confirmed (travelerQueue is built), since
  // we can't know how many passports to check before that. That confirmed,
  // authenticated response is also the proof of an active session — the
  // 'passport' step must only ever be reached via a *successful* response;
  // nothing here is allowed to fall back into it.
  const checkPassportBatch = useCallback(async (queue) => {
    if (!user?.id && !tokenStore.get()) return; // handled by the session guard above
    setStep('passport-check');
    try {
      const data = await getPassportStatusBatch(pkg.id, queue.length);
      if (data?.allCanProceed) {
        setStep('select');
        return;
      }
      const nextIdx = Number.isInteger(data?.nextIncompleteIndex) ? data.nextIncompleteIndex : 0;
      setTravelerPos(nextIdx);
      setStep('passport');
    } catch (err) {
      if (err?.response?.status === 401) {
        // Session actually expired mid-flow — send to login. Do NOT fall
        // through to the passport step without a confirmed active session.
        onClose?.();
        onRequireAuth?.();
        return;
      }
      // Any other failure (network, 5xx, etc.) — we couldn't confirm session
      // or verification status either way, so stay out of the passport step
      // and let the user retry rather than silently granting/denying access.
      setStep('passport-check-error');
    }
  }, [pkg.id, user, onClose, onRequireAuth]);

  // Called when a single traveler's passport just came back verified/
  // manual_review — advances to the next unverified traveler in the queue,
  // or on to payment once everyone's done.
  const advanceTravelerVerification = useCallback(async (result, travelerIndex) => {
    const completedIndex = Number.isInteger(travelerIndex) ? travelerIndex : travelerPos;
    console.info('[passport-handoff]', {
      action: 'advance-traveler',
      completedTravelerIndex: completedIndex,
      queueLength: travelerQueue.length,
      currentStep: step,
    });

    // Drop the finished traveler's resume snapshot — it recorded a
    // terminal 'success'/'review' step, and MUST NOT be reused as the
    // initial state for whichever traveler comes up next.
    setPassportResumeStates((prev) => {
      if (!(completedIndex in prev)) return prev;
      const next = { ...prev };
      delete next[completedIndex];
      return next;
    });

    await checkPassportBatch(travelerQueue);
  }, [checkPassportBatch, step, travelerPos, travelerQueue]);

  // lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Escape to close (when safe)
  const canClose = !['polling', 'processing'].includes(step);  // card-waiting is closeable

  // Any close path (X, backdrop, Escape) must behave the same as "Continue":
  // if a booking just succeeded, the parent still needs onSuccess called so
  // it refreshes bookings / navigates to the dashboard — not just onClose.
  // Suppress the hard session-expiry redirect for the ENTIRE risky window:
  // M-Pesa STK push polling, card processing/waiting, AND the success screen
  // itself (which auto-continues to navigate('/client/dashboard') a few
  // seconds later — ClientDashboard's first data fetches land right after
  // that navigate, and a token that expired during the wait would otherwise
  // hard-kick the user to '/' right as they land on the dashboard). Only
  // truly released on unmount (component actually closing/navigating away).
  useEffect(() => {
    if (['card-waiting', 'processing', 'polling', 'success'].includes(step)) {
      paymentGuard.start();
    } else {
      paymentGuard.end();
    }
    return () => paymentGuard.end();
  }, [step]);

  // Best-effort: proactively refresh the access token the moment payment
  // succeeds, so ClientDashboard's first mount-time requests (bookings,
  // favourites, onboarding status) land with a fresh token instead of
  // whatever's left of the one that's been sitting around through the
  // whole payment wait. Silent — if this fails, the normal 401-triggered
  // refresh (still shielded by paymentGuard above) covers it.
  useEffect(() => {
    if (step !== 'success') return;
    refreshToken().catch(() => {});
  }, [step]);

  const handleClose = useCallback(() => {
    if (step === 'success') onSuccess?.(successBooking);
    onClose?.();
  }, [step, successBooking, onSuccess, onClose]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && canClose) handleClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [canClose, handleClose]);

  const goBack = () => {
    clearInterval(pollRef.current);
    setStep('select');
    setErrorMsg('');
    setPhoneErr('');
    setCardLoading(false);
    setOrderTrackingId(null);
  };

  const pkgRef = `UMRAH-${pkg.id.slice(-8).toUpperCase()}`;

  // ── traveler-derived pricing ────────────────────────────────────────────
  // Falls back to the package's flat `price` for any tier the agent didn't
  // set, so this works even for packages saved before per-tier pricing
  // existed. This total is advisory only — the backend recomputes it fresh
  // from price_tiers on every initiate() call and never trusts this number.
  const tierPrices = pkg.priceTiers || {
    adult: pkg.price, child: pkg.price, minor_child: pkg.price, infant: pkg.price,
  };
  const totalTravelers = TRAVELER_TIERS.reduce((sum, t) => sum + (travelers[t.key] || 0), 0);
  const totalUSD = TRAVELER_TIERS.reduce(
    (sum, t) => sum + (travelers[t.key] || 0) * Number(tierPrices[t.key] ?? pkg.price ?? 0),
    0
  );

  const setTravelerCount = (key, delta) => {
    setTravelersError('');
    setTravelers((prev) => {
      const tier = TRAVELER_TIERS.find((t) => t.key === key);
      const next = Math.max(tier?.min ?? 0, (prev[key] || 0) + delta);
      const prospectiveTotal = TRAVELER_TIERS.reduce(
        (sum, t) => sum + (t.key === key ? next : (prev[t.key] || 0)), 0
      );
      if (prospectiveTotal > MAX_TRAVELERS) return prev; // silently clamp at the cap
      return { ...prev, [key]: next };
    });
  };

  const confirmTravelers = () => {
    if (totalTravelers < 1) {
      setTravelersError('At least one adult is required to book.');
      return;
    }
    setTravelersError('');

    // Build one queue entry per person, in a stable adult → child →
    // minor_child → infant order, so `index` reliably identifies the same
    // person's passport row across re-renders and re-confirmations.
    const queue = [];
    TRAVELER_TIERS.forEach((tier) => {
      for (let i = 0; i < (travelers[tier.key] || 0); i++) {
        queue.push({ index: queue.length, tierKey: tier.key, tierLabel: tier.label });
      }
    });
    setTravelerQueue(queue);
    setTravelerPos(0);
    checkPassportBatch(queue);
  };

  // live-rate-derived amounts — null until the fx rate has loaded
  const totalKes    = fxRate ? Math.round(totalUSD * fxRate) : null;
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
        data:   { packageId: pkg.id, currency, amountKes: totalKes, travelers },
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
      if (res.data.booking) setSuccessBooking(res.data.booking);

    } catch (err) {
      setCardLoading(false);
      setErrorMsg(err.response?.data?.message || err.message || 'Payment verification failed. Contact support if you were charged.');
      setStep('error');
    }
  };

  const pollAttemptsRef = useRef(0);

  const pollCardStatus = useCallback(async () => {
    if (!orderTrackingId) return;
    pollAttemptsRef.current += 1;
    try {
      const res = await request({
        method: 'post',
        url:    '/payments/card/verify',
        data:   { orderTrackingId, packageId: pkg.id },
      });
      if (res.data?.success && res.data.status !== 'PENDING') {
        setStep('success');
        if (res.data.booking) setSuccessBooking(res.data.booking);
      }
    } catch {
      // Ignore — likely still pending or a transient error. Next poll retries,
      // up to the attempt cap below.
    }
  }, [orderTrackingId, pkg.id]);

  useEffect(() => {
    if (step !== 'card-waiting' || !orderTrackingId) return;
    pollAttemptsRef.current = 0;
    // Give the user real time to actually finish paying on Pesapal before we
    // start checking — an early check can catch a transient non-COMPLETED
    // status, which the backend used to lock in as permanent FAILED (see
    // Cardcontroller.js verify()). 20s initial delay, then every 10s, capped
    // at 20 attempts (~3.5 min) so an abandoned payment doesn't poll forever
    // — the "I've paid" button still works manually after that.
    const MAX_ATTEMPTS = 20;
    const tick = () => {
      if (pollAttemptsRef.current >= MAX_ATTEMPTS) return;
      pollCardStatus();
    };
    const first = setTimeout(tick, 20000);
    const interval = setInterval(tick, 10000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [step, orderTrackingId, pollCardStatus]);

  // Auto-continue a few seconds after success, so confirming the booking
  // doesn't require an extra click — falls through to the same handleClose()
  // → onSuccess() → dashboard redirect as the manual "Continue" button.
  useEffect(() => {
    if (step !== 'success') return;
    const t = setTimeout(() => handleClose(), 4000);
    return () => clearTimeout(t);
  }, [step, handleClose]);

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
        data: { packageId: pkg.id, phone: normPhone, currency, amountKes: totalKes, travelers },
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
          if (booking) setSuccessBooking(booking);
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
        data: { packageId: pkg.id, currency, amountKes: totalKes, travelers },
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to record bank transfer');
      setStep('success');
      if (res.data.booking) setSuccessBooking(res.data.booking);
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

  // Stable handler for the passport modal's progress snapshots. MUST be
  // memoized — an inline arrow here gets a new identity on every render,
  // which (via the modal's persistProgress -> useEffect chain) re-fires the
  // modal's effect every render, which calls this again, which updates state
  // here, which re-renders this component, which recreates the inline arrow
  // again — an infinite "Maximum update depth exceeded" loop. Keying off
  // travelerQueue/travelerPos (which only change on real traveler handoffs)
  // keeps this identity stable across incidental re-renders.
  const handlePassportProgressChange = useCallback((nextState) => {
    const idx = travelerQueue[travelerPos]?.index ?? travelerPos ?? 0;
    setPassportResumeStates((prev) => {
      const prevForIdx = prev[idx];
      // Skip the update entirely if nothing actually changed — avoids
      // triggering a re-render (and therefore another persist round-trip)
      // for no-op snapshots.
      if (prevForIdx && JSON.stringify(prevForIdx) === JSON.stringify(nextState)) return prev;
      return { ...prev, [idx]: nextState };
    });
  }, [travelerPos, travelerQueue]);

  // ── render ────────────────────────────────────────────────────────────────
  // Passport must be verified — one traveler at a time — before the payment
  // shell ever shows. travelerQueue/travelerPos identify who's up next; see
  // confirmTravelers() and advanceTravelerVerification() above.
  if (step === 'passport') {
    const current = travelerQueue[travelerPos];
    return (
      <PassportVerificationModal
        // Force a full remount per traveler — otherwise React reuses the
        // same instance across travelerIndex changes and the modal's own
        // internal state (step/form/photo/result) leaks from the previous
        // traveler's completed "success" screen instead of resetting to
        // a fresh "details" form for the next person.
        key={current?.index ?? 0}
        pkg={pkg}
        user={user}
        travelerIndex={current?.index ?? 0}
        travelerLabel={
          travelerQueue.length > 1
            ? `${current?.tierLabel || 'Traveler'} · ${travelerPos + 1} of ${travelerQueue.length}`
            : undefined
        }
        initialState={passportResumeStates[current?.index ?? 0] ?? null}
        onProgressChange={handlePassportProgressChange}
        onClose={handleClose}
        onVerified={advanceTravelerVerification}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="bm-title"
      onClick={(e) => { if (e.target === e.currentTarget && canClose) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">

        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h2 id="bm-title" className="text-lg font-bold text-gray-900">Book Package</h2>
          {canClose && (
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Close">
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
                {step !== 'travelers' && (
                  <button
                    type="button"
                    onClick={() => setStep('travelers')}
                    className="text-[11px] font-medium text-emerald-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Users className="h-3 w-3" />
                    {totalTravelers} traveler{totalTravelers === 1 ? '' : 's'} · Edit
                  </button>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-emerald-600">{fmtSelected(totalUSD)}</p>
                <p className="text-xs text-gray-400">
                  {currency === 'USD' ? fmtKes(totalUSD) : fmtUsd(totalUSD)}
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

          {/* ══ PASSPORT CHECK (loading) ══ */}
          {step === 'passport-check' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
              <p className="text-sm text-gray-500">
                {travelerQueue.length > 1
                  ? `Checking passport verification for ${travelerQueue.length} travelers…`
                  : 'Checking your passport verification…'}
              </p>
            </div>
          )}

          {/* ══ PASSPORT CHECK — couldn't confirm active session/status ══ */}
          {step === 'passport-check-error' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Couldn't verify your session</p>
                <p className="text-sm text-gray-500 mt-1">We couldn't confirm you're signed in. Please retry, or sign in again.</p>
              </div>
              <div className="flex gap-3 w-full max-w-xs">
                <button onClick={() => checkPassportBatch(travelerQueue)}
                  className="flex-1 py-3 font-bold text-white rounded-xl"
                  style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
                  Retry
                </button>
                <button onClick={onClose} className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ══ TRAVELERS — how many people, by age tier ══ */}
          {step === 'travelers' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-semibold text-gray-900">Who's traveling?</p>
              </div>
              <p className="text-xs text-gray-500 -mt-2">
                Book for yourself alone, or add family/group members. Each age tier is priced separately.
              </p>

              <div className="space-y-2.5">
                {TRAVELER_TIERS.map((tier) => {
                  const count = travelers[tier.key] || 0;
                  const unitPrice = Number(tierPrices[tier.key] ?? pkg.price ?? 0);
                  return (
                    <div key={tier.key} className="flex items-center justify-between p-3 rounded-2xl border-2 border-gray-100">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{tier.label}</p>
                        <p className="text-xs text-gray-500">{tier.sub} · {fmtSelected(unitPrice)} each</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setTravelerCount(tier.key, -1)}
                          disabled={count <= tier.min}
                          className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-500 transition-colors"
                          aria-label={`Decrease ${tier.label}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-5 text-center font-bold text-gray-900 tabular-nums">{count}</span>
                        <button
                          type="button"
                          onClick={() => setTravelerCount(tier.key, 1)}
                          disabled={totalTravelers >= MAX_TRAVELERS}
                          className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-30 transition-colors"
                          aria-label={`Increase ${tier.label}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {travelersError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{travelersError}
                </p>
              )}

              <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-100 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{totalTravelers} traveler{totalTravelers === 1 ? '' : 's'} total</span>
                  <span className="font-bold text-emerald-700 text-base">{fmtSelected(totalUSD)}</span>
                </div>
                <p className="text-xs text-gray-400">
                  {currency === 'USD' ? fmtKes(totalUSD) : fmtUsd(totalUSD)}
                </p>
              </div>

              <button
                onClick={confirmTravelers}
                className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all"
                style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}
              >
                Continue to payment — {fmtSelected(totalUSD)}
              </button>
            </div>
          )}

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
                    : <><Lock className="h-4 w-4" /> Pay {fmtSelected(totalUSD)} via Pesapal</>
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
                <p className="text-xs text-gray-400 mt-2">We'll confirm automatically — or click below once you're done.</p>
              </div>
              <div className="w-full space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Checking payment status…
                </div>
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
                {fxRate ? `Send STK Push — ${fmtKes(totalUSD)}` : 'Loading rate…'}
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
                <h3 className="text-2xl font-bold text-gray-900">Payment confirmed!</h3>
                <p className="text-gray-500 mt-1 text-sm">Your Umrah package is booked. A confirmation has been sent to your email.</p>
                <p className="text-gray-400 mt-1 text-xs">Taking you to your dashboard to finish setup…</p>
              </div>
              <div className="w-full bg-gray-50 rounded-2xl p-4 space-y-2 text-left">
                {[
                  ['Package', pkg.title],
                  ['Travelers', `${totalTravelers} ${totalTravelers === 1 ? 'person' : 'people'}`],
                  ['Booking ref', pkgRef],
                  ['Amount paid', `$${fmt(totalUSD)}`],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-sm">
                    <span className="text-gray-500">{l}</span>
                    <span className={`font-semibold text-gray-900 ${l === 'Booking ref' ? 'font-mono' : ''}`}>{v}</span>
                  </div>
                ))}
              </div>
              <button
      onClick={handleClose}
      className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-md hover:brightness-110 transition-all"
      style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}
    >
      Continue →
    </button>
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