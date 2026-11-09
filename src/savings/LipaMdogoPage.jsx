// /lipa-mdogo-mdogo — save for Umrah little by little.
//   signed out → explainer + "create account" (returns here after sign-up)
//   agent      → short notice (savings are for pilgrim accounts)
//   pilgrim    → deposit (M-Pesa / card), balance & goal, passport, book with
//                savings, surplus, history, notifications
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {  Smartphone, CreditCard, Loader2, CheckCircle2, XCircle, ShieldCheck,
  ShieldAlert, Bell, Download, Target, Pencil, ArrowRight, Plane, Utensils, Gift,
  RefreshCw, Sparkles, Wallet, History, Info,
} from 'lucide-react';
import KshIcon from './KshIcon';
import AuthModal from '../components/AuthModal';
import Seo from '../components/Seo';
import { setPostAuthRedirect } from '../utils/postAuthRedirect';
import SavingsPassportForm from './SavingsPassportForm';
import {
  getSavingsSummary, getSavingsPackages, startMpesaDeposit, startCardDeposit, getDepositStatus,
  updateSavingsGoal, redeemSavings, requestSurplus, getSavingsNotifications,
  markSavingsNotificationsRead, downloadSavingsReceipt, errorMessage, fmtKes, fmtUsd, SAVINGS_PATH,
} from './savingsApi';

const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://www.umrahmarket.net';
const QUICK_AMOUNTS = [500, 1000, 2000, 5000];
const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 120_000;

const ENCOURAGEMENTS = [
  { text: 'The most beloved of deeds to Allah are those that are consistent, even if they are small.', source: 'Sahih al-Bukhari 6464' },
  { text: 'Umrah is an expiation for the sins committed between it and the previous one.', source: 'Sahih al-Bukhari 1773' },
  { text: 'And complete the Hajj and Umrah for Allah.', source: "Qur'an 2:196" },
  { text: 'And whoever relies upon Allah, then He is sufficient for him.', source: "Qur'an 65:3" },
  { text: 'Indeed, Allah does not allow the reward of those who do good to be lost.', source: "Qur'an 9:120" },
];

const toLocalPhone = (raw) => {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('254') && d.length === 12) return `0${d.slice(3)}`;
  return d.length === 10 && d.startsWith('0') ? d : '';
};

const STATUS_STYLE = {
  SUCCESS: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  FAILED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
};
const TYPE_LABEL = {
  DEPOSIT: 'Deposit',
  REDEMPTION: 'Umrah package',
  SURPLUS_REFUND: 'Refund',
  SURPLUS_EXTRAS: 'Extra services',
  ADJUSTMENT: 'Adjustment',
};

const fmtDate = (iso) => (iso
  ? new Date(iso).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—');

// ─────────────────────────────────────────────────────────────────────────────
export default function LipaMdogoPage({ currentUser, authReady, onAuthSuccess }) {
  if (!authReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <>
      <Seo
        title="Lipa Mdogo Mdogo — Save for Umrah Little by Little | UmrahMarket"
        description="Save for your Umrah a little at a time with M-Pesa or card. Get a receipt on email and WhatsApp for every deposit, then book a verified Umrah package with your savings."
        canonical={`${SITE_ORIGIN}${SAVINGS_PATH}`}
      />
      {!currentUser && <Landing onAuthSuccess={onAuthSuccess} />}
      {currentUser && currentUser.role !== 'client' && <AgentNotice />}
      {currentUser?.role === 'client' && <SavingsDashboard user={currentUser} />}
    </>
  );
}

// ── Signed-out explainer ─────────────────────────────────────────────────────
function Landing({ onAuthSuccess }) {
  const [auth, setAuth] = useState(null); // 'register' | 'login' | null

  const open = (type) => {
    setPostAuthRedirect(SAVINGS_PATH);
    setAuth(type);
  };

  const steps = [
    { icon: Smartphone, title: 'Save any amount', body: 'Deposit from KES 100 by M-Pesa or bank card — daily, weekly, whenever you can.' },
    { icon: Bell, title: 'Receipt every time', body: 'Get a receipt by email and WhatsApp with your new balance and a word of encouragement.' },
    { icon: Plane, title: 'Book your Umrah', body: 'When you have enough, choose a verified package and agent. We deduct it from your savings.' },
  ];

  return (
    <div className="bg-gradient-to-b from-emerald-50/60 via-white to-white">
      <section className="container mx-auto px-4 sm:px-6 pt-10 pb-12 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
            <KshIcon className="h-4 w-4" /> Lipa Mdogo Mdogo
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Save for your Umrah, <span className="text-emerald-600">little by little</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-gray-600 sm:text-lg">
            Put aside a small amount whenever you can. When your savings reach the cost of a package — usually USD 1,000 to 1,500 — book your Umrah with a verified agent.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => open('register')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:shadow-xl sm:w-auto"
            >
              Create a free account & start saving <ArrowRight className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => open('login')} className="text-sm font-semibold text-emerald-700 hover:underline">
              I already have an account
            </button>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Icon className="h-5 w-5" /></span>
                <span className="text-xs font-bold text-gray-400">STEP {i + 1}</span>
              </div>
              <p className="mt-3 font-semibold text-gray-900">{title}</p>
              <p className="mt-1 text-sm text-gray-600">{body}</p>
            </div>
          ))}
        </div>

        <figure className="mx-auto mt-10 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-center">
          <blockquote className="text-base italic text-gray-800">“{ENCOURAGEMENTS[0].text}”</blockquote>
          <figcaption className="mt-2 text-xs text-gray-500">— Prophet Muhammad ﷺ, {ENCOURAGEMENTS[0].source}</figcaption>
        </figure>
      </section>

      {auth && (
        <AuthModal
          initialAuthType={auth}
          onClose={() => setAuth(null)}
          onAuthSuccess={(user) => {
            setAuth(null);
            onAuthSuccess?.(user);
          }}
        />
      )}
    </div>
  );
}

function AgentNotice() {
  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <KshIcon className="mx-auto h-10 w-10 text-emerald-600" />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Lipa Mdogo Mdogo is for pilgrims</h1>
      <p className="mx-auto mt-2 max-w-md text-gray-600">
        Savings accounts are available on pilgrim accounts. Pilgrims who save with us can book your packages directly from their savings.
      </p>
      <Link to="/agent/dashboard" className="mt-6 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white">Back to your dashboard</Link>
    </div>
  );
}

// ── Signed-in pilgrim ────────────────────────────────────────────────────────
function SavingsDashboard({ user }) {
  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [packages, setPackages] = useState(null);
  const [passportOpen, setPassportOpen] = useState(false);
  const [redeemTarget, setRedeemTarget] = useState(null);
  const [redeemResult, setRedeemResult] = useState(null);
  const [surplusOpen, setSurplusOpen] = useState(null); // { type, bookingId, amount }

  const load = useCallback(async () => {
    try {
      const r = await getSavingsSummary();
      setSummary(r.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load your savings.'));
    }
  }, []);

  const loadPackages = useCallback(async () => {
    try {
      const r = await getSavingsPackages();
      setPackages(r.data || []);
    } catch {
      setPackages([]);
    }
  }, []);

  useEffect(() => { load(); loadPackages(); }, [load, loadPackages]);

  const refreshAll = useCallback(() => { load(); loadPackages(); }, [load, loadPackages]);

  if (loadError && !summary) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-gray-700">{loadError}</p>
        <button type="button" onClick={load} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }
  if (!summary) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  const { account, progress, quote, passport } = summary;
  const hasSavingsBooking = (summary.savingsBookings || []).length > 0;

  return (
    <div className="bg-gradient-to-b from-emerald-50/50 to-gray-50 pb-16">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-10">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <KshIcon className="h-4 w-4" /> Lipa Mdogo Mdogo
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Assalamu Alaikum, {user.firstName || 'Pilgrim'}
            </h1>
            <p className="mt-1 text-sm text-gray-600">Every shilling brings you closer to the House of Allah.</p>
          </div>
          <NotificationsBell unread={summary.unreadNotifications} onRead={load} />
        </div>

        {!passport.onFile && (
          <button
            type="button"
            onClick={() => setPassportOpen(true)}
            className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:bg-amber-100"
          >
            <ShieldAlert className="h-6 w-6 flex-shrink-0 text-amber-600" />
            <span className="flex-1">
              <span className="block text-sm font-bold text-amber-900">Upload your passport</span>
              <span className="block text-xs text-amber-800">
                {passport.status === 'expired'
                  ? 'The passport on file has expired. Upload your new one so you can travel.'
                  : 'Do it now so you can book your Umrah the moment your savings are ready.'}
              </span>
            </span>
            <ArrowRight className="h-5 w-5 text-amber-700" />
          </button>
        )}

        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <DepositPanel summary={summary} onCredited={refreshAll} />
          </div>
          <div className="space-y-5 lg:col-span-2">
            <BalanceCard account={account} progress={progress} quote={quote} onGoalSaved={load} />
            <PassportCard passport={passport} onUpload={() => setPassportOpen(true)} />
          </div>
        </div>

        {summary.pendingSurplusRequest && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>
              Your {summary.pendingSurplusRequest.type === 'REFUND' ? 'refund' : 'extra services'} request for{' '}
              <strong>{fmtKes(summary.pendingSurplusRequest.amount_kes)}</strong> is being processed. We'll notify you when it's done.
            </p>
          </div>
        )}

        {hasSavingsBooking && account.balanceKes > 0 && !summary.pendingSurplusRequest && (
          <SurplusBanner
            balance={account.balanceKes}
            onRefund={() => setSurplusOpen({ type: 'REFUND', amount: account.balanceKes, bookingId: summary.savingsBookings[0].id })}
            onExtras={() => setSurplusOpen({ type: 'EXTRAS', amount: account.balanceKes, bookingId: summary.savingsBookings[0].id })}
          />
        )}

        <PackagesSection
          packages={packages}
          balance={account.balanceKes}
          onBook={setRedeemTarget}
        />

        <HistorySection transactions={summary.transactions} />
      </div>

      {passportOpen && (
        <SavingsPassportForm
          attemptsRemaining={passport.attemptsRemaining}
          onClose={() => { setPassportOpen(false); load(); }}
          onSaved={() => load()}
        />
      )}

      {redeemTarget && (
        <RedeemModal
          pkg={redeemTarget}
          balance={account.balanceKes}
          passportOnFile={passport.onFile}
          onUploadPassport={() => { setRedeemTarget(null); setPassportOpen(true); }}
          onClose={() => setRedeemTarget(null)}
          onDone={(result) => { setRedeemTarget(null); setRedeemResult(result); refreshAll(); }}
        />
      )}

      {redeemResult && (
        <RedeemSuccessModal
          result={redeemResult}
          onClose={() => setRedeemResult(null)}
          onSurplus={(type) => {
            setSurplusOpen({ type, amount: redeemResult.surplusKes, bookingId: redeemResult.booking.id });
            setRedeemResult(null);
          }}
        />
      )}

      {surplusOpen && (
        <SurplusModal
          initial={surplusOpen}
          balance={account.balanceKes}
          bookings={summary.savingsBookings}
          extraServices={summary.extraServices}
          registeredPhone={summary.registeredPhone}
          onClose={() => setSurplusOpen(null)}
          onDone={() => { setSurplusOpen(null); load(); }}
        />
      )}
    </div>
  );
}

// ── Deposit ──────────────────────────────────────────────────────────────────
function DepositPanel({ summary, onCredited }) {
  const { limits, passport } = summary;
  const [amount, setAmount] = useState('1000');
  const [method, setMethod] = useState('MPESA');
  const [phone, setPhone] = useState(() => toLocalPhone(summary.registeredPhone));
  const [phase, setPhase] = useState('idle'); // idle | sending | waiting | success | failed | timeout
  const [message, setMessage] = useState('');
  const [tx, setTx] = useState(null);
  const [balanceAfter, setBalanceAfter] = useState(null);
  const pollRef = useRef(null);
  const pollFnRef = useRef(null);
  const startedRef = useRef(0);
  const txIdRef = useRef(null);

  const stopPolling = () => { clearTimeout(pollRef.current); pollRef.current = null; };
  const schedulePoll = () => { pollRef.current = setTimeout(() => pollFnRef.current?.(), POLL_MS); };
  useEffect(() => stopPolling, []);

  const amountNum = Math.round(Number(amount) || 0);
  const max = method === 'MPESA' ? limits.maxMpesaDepositKes : limits.maxCardDepositKes;
  const amountError = !amountNum
    ? 'Enter an amount'
    : amountNum < limits.minDepositKes
      ? `Minimum is ${fmtKes(limits.minDepositKes)}`
      : amountNum > max ? `Maximum is ${fmtKes(max)} per ${method === 'MPESA' ? 'M-Pesa' : 'card'} payment` : null;

  const poll = useCallback(async () => {
    const id = txIdRef.current;
    if (!id) return;
    try {
      const r = await getDepositStatus(id);
      if (r.status === 'SUCCESS') {
        stopPolling();
        setTx(r.transaction);
        setBalanceAfter(r.balanceKes);
        setPhase('success');
        onCredited?.();
        return;
      }
      if (r.status === 'FAILED' || r.status === 'CANCELLED') {
        stopPolling();
        setPhase('failed');
        setMessage(r.status === 'CANCELLED'
          ? 'The M-Pesa prompt was cancelled. No money was taken.'
          : (r.transaction?.result_desc || 'The payment did not go through. No money was taken.'));
        return;
      }
    } catch { /* transient — keep polling */ }
    if (Date.now() - startedRef.current > POLL_TIMEOUT_MS) {
      stopPolling();
      setPhase('timeout');
      return;
    }
    schedulePoll();
  }, [onCredited]);

  useEffect(() => { pollFnRef.current = poll; }, [poll]);

  const submit = async (e) => {
    e.preventDefault();
    if (amountError) return;
    setMessage('');
    setPhase('sending');
    try {
      if (method === 'MPESA') {
        const r = await startMpesaDeposit({ amount: amountNum, phone });
        txIdRef.current = r.transactionId;
        startedRef.current = Date.now();
        setPhase('waiting');
        setMessage(r.message || 'Check your phone and enter your M-Pesa PIN.');
        schedulePoll();
      } else {
        const r = await startCardDeposit({ amount: amountNum });
        try { sessionStorage.setItem('lmm_card_tx', r.transactionId); } catch { /* ignore */ }
        window.location.assign(r.redirectUrl);
      }
    } catch (err) {
      setPhase('failed');
      setMessage(errorMessage(err, 'Could not start the payment.'));
    }
  };

  const reset = () => { stopPolling(); setPhase('idle'); setMessage(''); setTx(null); txIdRef.current = null; };
  const quoteLine = ENCOURAGEMENTS[(summary.account.depositCount || 0) % ENCOURAGEMENTS.length];

  return (
    <section id="save" className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7">
      {phase === 'success' ? (
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h2 className="mt-4 text-xl font-extrabold text-gray-900">Alhamdulillah! We've received your deposit</h2>
          <p className="mt-2 text-sm text-gray-600">
            <strong>{fmtKes(tx?.amount_kes)}</strong> has been added to your Lipa Mdogo Mdogo savings.
            Your receipt is on its way to your email and WhatsApp.
          </p>
          <div className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3 text-left">
            <div className="rounded-2xl bg-gray-50 p-3">
              <p className="text-[11px] font-semibold uppercase text-gray-500">Receipt</p>
              <p className="mt-0.5 text-sm font-bold text-gray-900">{tx?.receipt_no}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="text-[11px] font-semibold uppercase text-emerald-700">New balance</p>
              <p className="mt-0.5 text-sm font-bold text-emerald-800">{fmtKes(balanceAfter)}</p>
            </div>
          </div>
          <figure className="mx-auto mt-5 max-w-md rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <blockquote className="text-sm italic text-gray-800">“{quoteLine.text}”</blockquote>
            <figcaption className="mt-1 text-xs text-gray-500">— {quoteLine.source}</figcaption>
          </figure>
          <p className="mt-3 text-sm font-medium text-emerald-700">Continue saving with us — your Umrah is getting closer, insha'Allah.</p>
          {!passport.onFile && (
            <p className="mx-auto mt-3 max-w-md rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-800">
              Reminder: please upload your passport so you're ready to travel.
            </p>
          )}
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <button type="button" onClick={reset} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Save again</button>
            {tx?.id && (
              <button
                type="button"
                onClick={() => downloadSavingsReceipt(tx.id, tx.receipt_no).catch((err) => toast.error(errorMessage(err)))}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" /> Download receipt
              </button>
            )}
          </div>
        </div>
      ) : phase === 'waiting' || phase === 'timeout' ? (
        <div className="py-4 text-center">
          {phase === 'waiting' ? (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <Smartphone className="h-8 w-8 animate-pulse text-emerald-600" />
            </div>
          ) : (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
              <Loader2 className="h-8 w-8 text-amber-600" />
            </div>
          )}
          <h2 className="mt-4 text-lg font-bold text-gray-900">
            {phase === 'waiting' ? 'Check your phone' : 'Still waiting for M-Pesa'}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600">
            {phase === 'waiting'
              ? <>Enter your M-Pesa PIN to save <strong>{fmtKes(amountNum)}</strong>. This page updates by itself.</>
              : 'We have not heard back from M-Pesa yet. If you completed the payment, it will be credited automatically and you will get a receipt by email and WhatsApp.'}
          </p>
          {phase === 'waiting' && <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-emerald-600" />}
          <div className="mt-5 flex justify-center gap-2">
            {phase === 'timeout' && (
              <button type="button" onClick={() => { startedRef.current = Date.now(); setPhase('waiting'); poll(); }} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Check again</button>
            )}
            <button type="button" onClick={reset} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">Start over</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Wallet className="h-5 w-5 text-emerald-600" /> Save towards your Umrah
          </h2>
          <p className="mt-1 text-sm text-gray-500">Any amount from {fmtKes(limits.minDepositKes)}. Small and steady wins.</p>

          <label htmlFor="lmm-amount" className="mt-5 block text-xs font-semibold text-gray-600">Amount (KES)</label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">KES</span>
            <input
              id="lmm-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, '').slice(0, 7))}
              className="w-full rounded-2xl border border-gray-200 py-3.5 pl-14 pr-4 text-2xl font-extrabold text-gray-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(String(a))}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${amountNum === a ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-emerald-300'}`}
              >
                {a.toLocaleString()}
              </button>
            ))}
          </div>
          {amountError && amount !== '' && <p className="mt-1.5 text-xs text-red-600">{amountError}</p>}

          <p className="mt-5 text-xs font-semibold text-gray-600">Pay with</p>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            {[
              { id: 'MPESA', label: 'M-Pesa', sub: 'Prompt on your phone', icon: Smartphone },
              { id: 'CARD', label: 'Bank card', sub: 'Visa / Mastercard', icon: CreditCard },
            ].map(({ id, label, sub, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMethod(id)}
                aria-pressed={method === id}
                className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${method === id ? 'border-emerald-500 bg-emerald-50/60' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${method === id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-gray-900">{label}</span>
                  <span className="block text-[11px] text-gray-500">{sub}</span>
                </span>
              </button>
            ))}
          </div>

          {method === 'MPESA' ? (
            <>
              <label htmlFor="lmm-phone" className="mt-4 block text-xs font-semibold text-gray-600">M-Pesa number</label>
              <input
                id="lmm-phone"
                type="tel"
                inputMode="tel"
                placeholder="0712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="mt-1 text-[11px] text-gray-500">We'll send the payment prompt to this number. It's your registered number unless you change it.</p>
            </>
          ) : (
            <p className="mt-4 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
              You'll be taken to our secure payment partner (Pesapal) to pay, then brought straight back here.
            </p>
          )}

          {phase === 'failed' && message && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!!amountError || phase === 'sending'}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === 'sending'
              ? <><Loader2 className="h-5 w-5 animate-spin" /> {method === 'MPESA' ? 'Sending prompt…' : 'Opening secure checkout…'}</>
              : <>Save {amountNum ? fmtKes(amountNum) : ''} {method === 'MPESA' ? 'with M-Pesa' : 'by card'}</>}
          </button>
        </form>
      )}
    </section>
  );
}

// ── Balance & goal ───────────────────────────────────────────────────────────
function BalanceCard({ account, progress, quote, onGoalSaved }) {
  const [editing, setEditing] = useState(false);
  const [goal, setGoal] = useState(String(Math.round(account.goalKes)));
  const [saving, setSaving] = useState(false);

  const save = async (value) => {
    setSaving(true);
    try {
      await updateSavingsGoal({ goalKes: value });
      toast.success('Goal updated');
      setEditing(false);
      onGoalSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 p-5 text-white shadow-lg sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Your Umrah savings</p>
      <p className="mt-1 text-4xl font-extrabold tracking-tight">{fmtKes(account.balanceKes)}</p>
      <p className="mt-1 text-xs text-emerald-200">{account.depositCount} deposit{account.depositCount === 1 ? '' : 's'} · {fmtKes(account.totalDepositedKes)} saved in total</p>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 font-semibold"><Target className="h-3.5 w-3.5" /> Goal {fmtKes(account.goalKes)}</span>
          <span className="font-bold text-amber-300">{progress.percent}%</span>
        </div>
        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-white/15">
          <div className="h-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 transition-all duration-700" style={{ width: `${Math.max(2, progress.percent)}%` }} />
        </div>
        <p className="mt-2 text-xs text-emerald-100">
          {progress.reached
            ? 'Alhamdulillah — you can book your Umrah now! Choose a package below.'
            : `${fmtKes(progress.remainingKes)} to go.`}
        </p>
      </div>

      {editing ? (
        <div className="mt-4 flex gap-2">
          <input
            inputMode="numeric"
            value={goal}
            onChange={(e) => setGoal(e.target.value.replace(/[^\d]/g, '').slice(0, 8))}
            className="min-w-0 flex-1 rounded-xl border-0 px-3 py-2 text-sm text-gray-900"
            aria-label="Goal in KES"
          />
          <button type="button" disabled={saving} onClick={() => save(Number(goal))} className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-bold text-emerald-950 disabled:opacity-60">Save</button>
          <button type="button" onClick={() => setEditing(false)} className="rounded-xl bg-white/10 px-3 py-2 text-sm">Cancel</button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 font-semibold text-amber-300 hover:underline">
            <Pencil className="h-3.5 w-3.5" /> Change goal
          </button>
          {account.customGoal && (
            <button type="button" disabled={saving} onClick={() => save(null)} className="text-emerald-200 hover:underline">Use default</button>
          )}
        </div>
      )}

      <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-[11px] leading-relaxed text-emerald-50">
        An Umrah package costs between <strong>{fmtUsd(quote.targetMinUsd)} and {fmtUsd(quote.targetMaxUsd)}</strong> (about {fmtKes(quote.targetMinKes)} – {fmtKes(quote.targetMaxKes)} today).
      </p>
    </section>
  );
}

function PassportCard({ passport, onUpload }) {
  const ok = passport.onFile;
  return (
    <section className={`rounded-3xl border p-5 ${ok ? 'border-emerald-100 bg-white' : 'border-amber-200 bg-amber-50/60'}`}>
      <div className="flex items-center gap-3">
        {ok ? <ShieldCheck className="h-6 w-6 text-emerald-600" /> : <ShieldAlert className="h-6 w-6 text-amber-600" />}
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">Passport</p>
          <p className="text-xs text-gray-600">
            {ok
              ? `${passport.status === 'verified' ? 'Verified' : 'Received — under review'}${passport.numberHint ? ` · ${passport.numberHint}` : ''}${passport.expiry ? ` · expires ${passport.expiry}` : ''}`
              : passport.status === 'pending'
                ? 'We could not confirm your last upload. Please try again.'
                : 'Not uploaded yet'}
          </p>
        </div>
        <button type="button" onClick={onUpload} className={`rounded-xl px-3 py-2 text-xs font-semibold ${ok ? 'border border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
          {ok ? 'Replace' : 'Upload'}
        </button>
      </div>
    </section>
  );
}

// ── Notifications ────────────────────────────────────────────────────────────
function NotificationsBell({ unread, onRead }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const r = await getSavingsNotifications();
        setItems(r.data || []);
        if (unread > 0) {
          await markSavingsNotificationsRead();
          onRead?.();
        }
      } catch {
        setItems([]);
      }
    }
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={toggle} className="relative rounded-full border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm hover:text-emerald-700" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
          <p className="border-b border-gray-100 px-4 py-3 text-sm font-bold text-gray-900">Notifications</p>
          <div className="max-h-96 overflow-y-auto">
            {items === null && <div className="p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-emerald-600" /></div>}
            {items?.length === 0 && <p className="p-6 text-center text-sm text-gray-500">No notifications yet.</p>}
            {items?.map((n) => (
              <div key={n.id} className={`border-b border-gray-50 px-4 py-3 ${n.read_at ? '' : 'bg-emerald-50/40'}`}>
                <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                <p className="mt-0.5 text-xs text-gray-600">{n.body}</p>
                <p className="mt-1 text-[10px] text-gray-400">{fmtDate(n.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Packages ─────────────────────────────────────────────────────────────────
function PackagesSection({ packages, balance, onBook }) {
  const [showAll, setShowAll] = useState(false);
  const affordable = useMemo(() => (packages || []).filter((p) => p.affordable), [packages]);
  const list = showAll ? packages || [] : (packages || []).slice(0, 6);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Book your Umrah with your savings</h2>
          <p className="mt-1 text-sm text-gray-600">
            {affordable.length > 0
              ? `Alhamdulillah — you can afford ${affordable.length} package${affordable.length === 1 ? '' : 's'} right now.`
              : 'Packages you are saving towards. Prices are for one adult and update with the exchange rate.'}
          </p>
        </div>
      </div>

      {packages === null ? (
        <div className="mt-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
      ) : packages.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white p-6 text-center text-sm text-gray-500">No packages are available right now. Keep saving — new packages are added regularly.</p>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => {
              const pct = Math.min(100, Math.floor((balance / p.priceKes) * 100));
              return (
                <article key={p.id} className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${p.affordable ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-gray-100'}`}>
                  <div className="relative h-36 bg-gradient-to-br from-emerald-100 to-amber-50">
                    {p.image && <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    {p.affordable && (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                        <Sparkles className="h-3 w-3" /> You can book this
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="line-clamp-2 font-semibold text-gray-900">{p.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{p.agentName || 'Verified agent'}{p.duration ? ` · ${p.duration} days` : ''}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.includesMeals ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        <Utensils className="h-3 w-3" /> {p.includesMeals ? 'Meals included' : 'No meals'}
                      </span>
                      {p.availableFrom && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">Departs {p.availableFrom}</span>}
                    </div>
                    <div className="mt-auto pt-4">
                      <p className="text-lg font-extrabold text-gray-900">{fmtKes(p.priceKes)} <span className="text-xs font-medium text-gray-400">≈ {fmtUsd(p.priceUsd)}</span></p>
                      {!p.affordable && (
                        <>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.max(2, pct)}%` }} />
                          </div>
                          <p className="mt-1 text-[11px] text-gray-500">{fmtKes(p.shortfallKes)} more to go</p>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={!p.affordable}
                        onClick={() => onBook(p)}
                        className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {p.affordable ? 'Book with my savings' : 'Keep saving'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {packages.length > 6 && (
            <div className="mt-5 text-center">
              <button type="button" onClick={() => setShowAll((v) => !v)} className="text-sm font-semibold text-emerald-700 hover:underline">
                {showAll ? 'Show fewer' : `Show all ${packages.length} packages`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ModalShell({ children, onClose, busy, label }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [busy, onClose]);
  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={label}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">{children}</div>
    </div>
  );
}

function RedeemModal({ pkg, balance, passportOnFile, onUploadPassport, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const after = balance - pkg.priceKes;

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await redeemSavings(pkg.id);
      onDone(r);
    } catch (err) {
      if (err?.data?.code === 'PASSPORT_REQUIRED') {
        onUploadPassport();
        return;
      }
      setError(errorMessage(err, 'Could not complete the booking.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose} busy={busy} label="Book with savings">
      <h2 className="text-lg font-bold text-gray-900">Book with your savings</h2>
      <p className="mt-1 text-sm text-gray-600">{pkg.name} · {pkg.agentName}</p>
      <dl className="mt-4 space-y-2 rounded-2xl bg-gray-50 p-4 text-sm">
        <div className="flex justify-between"><dt className="text-gray-500">Your savings</dt><dd className="font-semibold">{fmtKes(balance)}</dd></div>
        <div className="flex justify-between"><dt className="text-gray-500">Package (1 adult)</dt><dd className="font-semibold">− {fmtKes(pkg.priceKes)}</dd></div>
        <div className="flex justify-between border-t border-gray-200 pt-2"><dt className="font-semibold text-gray-900">Left in savings</dt><dd className="font-bold text-emerald-700">{fmtKes(after)}</dd></div>
      </dl>
      {after > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
          <Gift className="mt-0.5 h-4 w-4 flex-shrink-0" />
          You'll have {fmtKes(after)} surplus. After booking you can have it refunded or use it for extras{pkg.includesMeals ? '' : ' — this package has no meals, so you could add meals'}.
        </p>
      )}
      {!passportOnFile && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>You need to upload your passport before booking. <button type="button" onClick={onUploadPassport} className="font-bold underline">Upload now</button></span>
        </div>
      )}
      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700">Cancel</button>
        <button type="button" onClick={confirm} disabled={busy || !passportOnFile} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirm booking
        </button>
      </div>
    </ModalShell>
  );
}

function RedeemSuccessModal({ result, onClose, onSurplus }) {
  const navigate = useNavigate();
  const { booking, surplusKes } = result;
  return (
    <ModalShell onClose={onClose} label="Booking confirmed">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-9 w-9 text-emerald-600" /></div>
        <h2 className="mt-4 text-xl font-extrabold text-gray-900">Mabrook! Your Umrah is booked</h2>
        <p className="mt-2 text-sm text-gray-600">{booking.packageName} with <strong>{booking.agentName}</strong>. {fmtKes(booking.amountKes)} was paid from your savings. Your agent will message you shortly.</p>
      </div>
      {surplusKes > 0 && (
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-sm font-bold text-gray-900">You have {fmtKes(surplusKes)} surplus</p>
          <p className="mt-1 text-xs text-gray-600">
            {booking.includesMeals ? 'Use it for extra services, or get it back.' : 'This package does not include meals — you can use the surplus for meals or other extras, or get it back.'}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onSurplus('EXTRAS')} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white"><Utensils className="h-4 w-4" /> Use for extras</button>
            <button type="button" onClick={() => onSurplus('REFUND')} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white py-2.5 text-xs font-semibold text-emerald-700"><Wallet className="h-4 w-4" /> Refund to M-Pesa</button>
          </div>
          <p className="mt-2 text-center text-[11px] text-gray-500">Or keep it in your savings for your next trip.</p>
        </div>
      )}
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700">Close</button>
        <button type="button" onClick={() => navigate('/client/dashboard')} className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white">My bookings</button>
      </div>
    </ModalShell>
  );
}

function SurplusBanner({ balance, onRefund, onExtras }) {
  return (
    <section className="mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-white p-4 sm:flex-row sm:items-center">
      <Gift className="h-6 w-6 flex-shrink-0 text-emerald-600" />
      <p className="flex-1 text-sm text-gray-700">
        You have <strong>{fmtKes(balance)}</strong> left after booking. Use it for extras like meals or Ziyarah tours, or get it refunded.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onExtras} className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white">Use for extras</button>
        <button type="button" onClick={onRefund} className="rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-700">Refund</button>
      </div>
    </section>
  );
}

function SurplusModal({ initial, balance, bookings, extraServices, registeredPhone, onClose, onDone }) {
  const [type, setType] = useState(initial.type);
  const [amount, setAmount] = useState(String(Math.floor(Math.min(initial.amount || balance, balance))));
  const [phone, setPhone] = useState(toLocalPhone(registeredPhone));
  const [services, setServices] = useState(['meals']);
  const [bookingId, setBookingId] = useState(initial.bookingId || bookings?.[0]?.id || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const toggle = (s) => setServices((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const amt = Math.floor(Number(amount) || 0);
    if (amt < 1 || amt > balance) return setError(`Enter an amount up to ${fmtKes(balance)}.`);
    setBusy(true);
    try {
      await requestSurplus({
        type,
        amount: amt,
        note: note.trim() || undefined,
        bookingId: bookingId || undefined,
        ...(type === 'REFUND' ? { payoutPhone: phone } : { services }),
      });
      toast.success('Request sent — we will notify you when it is done.');
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'Could not send your request.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose} busy={busy} label="Use your surplus">
      <form onSubmit={submit}>
        <h2 className="text-lg font-bold text-gray-900">Your surplus</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
          {[['EXTRAS', 'Extra services'], ['REFUND', 'Refund to M-Pesa']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setType(id)} className={`rounded-xl py-2 text-xs font-semibold ${type === id ? 'bg-white text-emerald-700 shadow' : 'text-gray-600'}`}>{label}</button>
          ))}
        </div>

        <label className="mt-4 block text-xs font-semibold text-gray-600" htmlFor="sp-amount">Amount (KES, up to {fmtKes(balance)})</label>
        <input id="sp-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm" />

        {type === 'REFUND' ? (
          <>
            <label className="mt-4 block text-xs font-semibold text-gray-600" htmlFor="sp-phone">Send to M-Pesa number</label>
            <input id="sp-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm" />
          </>
        ) : (
          <>
            {bookings?.length > 1 && (
              <>
                <label className="mt-4 block text-xs font-semibold text-gray-600" htmlFor="sp-booking">For booking</label>
                <select id="sp-booking" value={bookingId} onChange={(e) => setBookingId(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
                  {bookings.map((b) => <option key={b.id} value={b.id}>{b.package?.name || 'Umrah package'}</option>)}
                </select>
              </>
            )}
            <p className="mt-4 text-xs font-semibold text-gray-600">Which services?</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.entries(extraServices || {}).map(([id, label]) => (
                <label key={id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs ${services.includes(id) ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-700'}`}>
                  <input type="checkbox" checked={services.includes(id)} onChange={() => toggle(id)} className="accent-emerald-600" /> {label}
                </label>
              ))}
            </div>
          </>
        )}

        <label className="mt-4 block text-xs font-semibold text-gray-600" htmlFor="sp-note">Note (optional)</label>
        <textarea id="sp-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm" placeholder={type === 'EXTRAS' ? 'e.g. halal meals for 14 days, vegetarian' : ''} />

        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700">Cancel</button>
          <button type="submit" disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send request
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── History ──────────────────────────────────────────────────────────────────
function HistorySection({ transactions }) {
  if (!transactions?.length) return null;
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900"><History className="h-5 w-5 text-emerald-600" /> Savings history</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <ul className="divide-y divide-gray-50">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${t.direction === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                {t.direction === 'CREDIT' ? <KshIcon className="h-4 w-4" /> : <Plane className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {TYPE_LABEL[t.type] || t.type}{t.method && t.method !== 'INTERNAL' ? ` · ${t.method === 'MPESA' ? 'M-Pesa' : 'Card'}` : ''}
                </p>
                <p className="truncate text-[11px] text-gray-500">{t.receipt_no} · {fmtDate(t.paid_at || t.created_at)}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${t.direction === 'CREDIT' ? 'text-emerald-700' : 'text-gray-900'}`}>
                  {t.direction === 'CREDIT' ? '+' : '−'} {fmtKes(t.amount_kes)}
                </p>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[t.status] || ''}`}>{t.status.toLowerCase()}</span>
              </div>
              {t.type === 'DEPOSIT' && t.status === 'SUCCESS' ? (
                <button
                  type="button"
                  onClick={() => downloadSavingsReceipt(t.id, t.receipt_no).catch((err) => toast.error(errorMessage(err)))}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-emerald-700"
                  aria-label={`Download receipt ${t.receipt_no}`}
                >
                  <Download className="h-4 w-4" />
                </button>
              ) : <span className="w-8" />}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
