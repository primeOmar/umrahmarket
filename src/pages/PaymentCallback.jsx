// src/pages/PaymentCallback.jsx
// Pesapal redirects the user's browser here after card payment.
// URL shape: /payment/callback/:packageId?OrderTrackingId=xxx&OrderMerchantReference=UMR-xxx
//
// packageId is embedded in the URL PATH (not query string) by CardController at order
// submission time. Pesapal only appends/replaces query params on redirect — it never
// touches the path — so this approach survives even if localStorage is cleared.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { request }               from '../api';

export default function PaymentCallback() {
  const navigate = useNavigate();
  const { packageId: packageIdFromPath } = useParams(); // ← reliable: comes from URL path

  // verifying | success | pending | failed
  const [status,  setStatus]  = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      const params          = new URLSearchParams(window.location.search);
      const orderTrackingId = params.get('OrderTrackingId');

      // Path param is the source of truth; localStorage is a last-ditch fallback
      // for any edge cases where the path param might be missing.
      const packageId = packageIdFromPath || localStorage.getItem('pesapal_package_id');

      if (!orderTrackingId) {
        setMessage('Missing payment reference in URL.');
        setStatus('failed');
        return;
      }
      if (!packageId) {
        setMessage('Session expired. Please try booking again.');
        setStatus('failed');
        return;
      }

      // Clean up localStorage either way
      localStorage.removeItem('pesapal_package_id');

      try {
        const res = await request({
          method: 'post',
          url:    '/payments/card/verify',
          data:   { orderTrackingId, packageId },
        });

        if (res.data?.status === 'PENDING') {
          setStatus('pending');
          return;
        }

        if (res.data?.success) {
          // Signal the dashboard to refresh bookings and open the bookings tab
          sessionStorage.setItem('booking_just_confirmed', '1');
          setStatus('success');
          setTimeout(() => navigate('/client/dashboard'), 3000);
        } else {
          setMessage(res.data?.message || 'Verification failed.');
          setStatus('failed');
        }
      } catch (err) {
        setMessage(err.message || 'Could not verify payment. Contact support if you were charged.');
        setStatus('failed');
      }
    };

    run();
  }, [navigate, packageIdFromPath]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center space-y-5">

        {/* ── VERIFYING ── */}
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xl font-bold text-gray-800">Verifying your payment…</p>
            <p className="text-sm text-gray-500">Please don't close this tab.</p>
          </>
        )}

        {/* ── SUCCESS ── */}
        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-emerald-600">Payment Confirmed!</p>
            <p className="text-sm text-gray-500">Your booking is confirmed. Redirecting to your dashboard…</p>
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          </>
        )}

        {/* ── PENDING ── */}
        {status === 'pending' && (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xl font-bold text-amber-600">Payment Still Processing</p>
            <p className="text-sm text-gray-500">
              Your payment is being processed. Check your dashboard in a few minutes — we'll update your booking automatically.
            </p>
            <button
              onClick={() => navigate('/client/dashboard')}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition w-full">
              Go to Dashboard
            </button>
          </>
        )}

        {/* ── FAILED ── */}
        {status === 'failed' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-xl font-bold text-red-600">Payment Failed</p>
            <p className="text-sm text-gray-500">{message || 'Something went wrong. Please try again.'}</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition">
                Back to Home
              </button>
              <button
                onClick={() => navigate('/client/dashboard')}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition">
                Dashboard
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}