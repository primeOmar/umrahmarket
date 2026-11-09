// /lipa-mdogo-mdogo/callback — Pesapal sends the pilgrim back here after a
// card deposit (?OrderTrackingId=…). We confirm the payment with the backend
// (which asks Pesapal server-to-server — the query string alone is never
// trusted), show the result, then hand them back to their savings.
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle, Clock } from 'lucide-react';
import AuthModal from '../components/AuthModal';
import { setPostAuthRedirect } from '../utils/postAuthRedirect';
import { verifyCardDeposit, errorMessage, fmtKes, SAVINGS_PATH } from './savingsApi';

const POLL_MS = 3000;
const MAX_WAIT_MS = 60_000;

export default function SavingsCallback({ currentUser, authReady, onAuthSuccess }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const orderTrackingId = params.get('OrderTrackingId') || params.get('orderTrackingId') || '';

  const [state, setState] = useState({ phase: 'checking' });
  const [showAuth, setShowAuth] = useState(false);
  const startedRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!authReady || !currentUser || !orderTrackingId) return undefined;
    let cancelled = false;
    startedRef.current = Date.now();

    const check = async () => {
      try {
        const r = await verifyCardDeposit(orderTrackingId);
        if (cancelled) return;
        if (r.status === 'SUCCESS') {
          try { sessionStorage.removeItem('lmm_card_tx'); } catch { /* ignore */ }
          setState({ phase: 'success', tx: r.transaction, balance: r.balanceKes });
          return;
        }
        if (r.status === 'FAILED' || r.status === 'CANCELLED') {
          setState({ phase: 'failed', message: r.transaction?.result_desc });
          return;
        }
      } catch (err) {
        if (cancelled) return;
        if (err?.status === 404) {
          setState({ phase: 'failed', message: errorMessage(err) });
          return;
        }
      }
      if (Date.now() - startedRef.current > MAX_WAIT_MS) {
        setState({ phase: 'pending' });
        return;
      }
      timerRef.current = setTimeout(check, POLL_MS);
    };

    check();
    return () => { cancelled = true; clearTimeout(timerRef.current); };
  }, [authReady, currentUser, orderTrackingId]);

  const card = (children) => (
    <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">{children}</div>
    </div>
  );

  if (!authReady) {
    return card(<Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />);
  }

  if (!orderTrackingId) {
    return card(
      <>
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <p className="mt-4 text-lg font-bold text-gray-900">Payment reference missing</p>
        <p className="mt-2 text-sm text-gray-600">If you completed a card payment it will still be credited automatically, and you'll get a receipt by email and WhatsApp.</p>
        <Link to={SAVINGS_PATH} className="mt-6 inline-block w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white">Back to my savings</Link>
      </>
    );
  }

  if (!currentUser) {
    return card(
      <>
        <Clock className="mx-auto h-12 w-12 text-amber-500" />
        <p className="mt-4 text-lg font-bold text-gray-900">Please sign in to confirm your deposit</p>
        <p className="mt-2 text-sm text-gray-600">Your session ended while you were paying. Sign in and we'll confirm it straight away.</p>
        <button
          type="button"
          onClick={() => { setPostAuthRedirect(`${location.pathname}${location.search}`); setShowAuth(true); }}
          className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white"
        >
          Sign in
        </button>
        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            onAuthSuccess={(user) => { setShowAuth(false); onAuthSuccess?.(user); }}
          />
        )}
      </>
    );
  }

  if (state.phase === 'success') {
    return card(
      <>
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        <p className="mt-4 text-xl font-extrabold text-gray-900">Alhamdulillah! Deposit received</p>
        <p className="mt-2 text-sm text-gray-600">
          <strong>{fmtKes(state.tx?.amount_kes)}</strong> has been added to your Lipa Mdogo Mdogo savings. Receipt <strong>{state.tx?.receipt_no}</strong> is on its way to your email and WhatsApp.
        </p>
        <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">New balance: {fmtKes(state.balance)}</p>
        <p className="mt-4 text-xs italic text-gray-500">“The most beloved deeds to Allah are the consistent ones, even if small.” — Sahih al-Bukhari</p>
        <Link to={SAVINGS_PATH} className="mt-6 inline-block w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white">Continue saving</Link>
      </>
    );
  }

  if (state.phase === 'failed') {
    return card(
      <>
        <XCircle className="mx-auto h-14 w-14 text-red-500" />
        <p className="mt-4 text-lg font-bold text-gray-900">The card payment didn't go through</p>
        <p className="mt-2 text-sm text-gray-600">{state.message || 'No money was taken. You can try again or use M-Pesa.'}</p>
        <Link to={SAVINGS_PATH} className="mt-6 inline-block w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white">Try again</Link>
      </>
    );
  }

  if (state.phase === 'pending') {
    return card(
      <>
        <Clock className="mx-auto h-14 w-14 text-amber-500" />
        <p className="mt-4 text-lg font-bold text-gray-900">Your bank is still confirming</p>
        <p className="mt-2 text-sm text-gray-600">This can take a few minutes. We'll credit your savings automatically and send your receipt by email and WhatsApp as soon as it's confirmed.</p>
        <Link to={SAVINGS_PATH} className="mt-6 inline-block w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white">Back to my savings</Link>
      </>
    );
  }

  return card(
    <>
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
      <p className="mt-4 text-lg font-bold text-gray-900">Confirming your payment…</p>
      <p className="mt-2 text-sm text-gray-600">Please don't close this page.</p>
    </>
  );
}
