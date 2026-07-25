// src/pages/PaymentCallback.jsx
// Pesapal redirects the user's browser here (in the tab it opened) after
// card payment.
//
// IMPORTANT: This page does NOT call /payments/card/verify itself anymore.
// The original tab (BookingFlow.jsx's "card-waiting" screen) is the single
// source of truth — it polls verify every few seconds and auto-advances to
// the dashboard on its own. Having both this tab AND the original tab call
// verify concurrently caused a real bug: Pesapal's transaction status can
// be transiently non-COMPLETED right after redirect, and the backend
// permanently marks a payment FAILED the first time it sees that — so a
// premature/duplicate verify call here could lock out the real success
// moments later. This page now just confirms the redirect landed and tells
// the user to go back to the original tab, then tries to close itself.

import { useEffect, useState } from 'react';

export default function PaymentCallback() {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    // Clean up the localStorage fallback either way — the original tab
    // already has everything it needs via its own component state.
    localStorage.removeItem('pesapal_package_id');

    // Try to auto-close this tab and hand control back to the original tab.
    // window.close() only works for tabs opened via script (window.open),
    // which this one was — but some browsers restrict it after a
    // cross-origin navigation (to Pesapal and back), so it can silently
    // no-op. Either way we show a fallback message below.
    const t = setTimeout(() => {
      window.close();
      // If we're still here after attempting to close, the browser blocked it.
      setClosed(true);
    }, 1200);

    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto" />
        <p className="text-xl font-bold text-gray-800">Payment received</p>
        <p className="text-sm text-gray-500">
          {closed
            ? 'You can close this tab now — return to the original tab to finish confirming your booking.'
            : 'Closing this tab and returning you to your booking…'}
        </p>
        {closed && (
          <button
            onClick={() => window.close()}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition w-full">
            Close this tab
          </button>
        )}
      </div>
    </div>
  );
}