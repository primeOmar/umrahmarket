// BookingFlow.jsx
//
// Orchestrates the booking journey up to payment:
//   1. loading  — check if passport already verified for this package
//   2. passport — PassportVerificationModal (details + passport page scan).
//                 REQUIRED for every booking — there is no way to reach the
//                 payment step without either an auto-verified passport or a
//                 manual-review pass (3 failed OCR attempts).
//   3. payment  — BookingModal (card / M-Pesa / bank)
//
// What happens AFTER payment is intentionally NOT handled here. Contact
// details, next-of-kin, and the Umrah ID photo are all collected by
// ClientDashboard's <PostBookingModal>, which is the single source of truth
// for "what's still missing on this booking" (see /api/onboarding/*). This
// component used to also render <FacePhotoModal> itself once payment
// succeeded, which raced with PostBookingModal for the same booking and was
// the root cause of the post-payment modal being flaky/inconsistent. Do not
// re-add a post-payment phase here — extend PostBookingModal instead.
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import BookingModal from './BookingModal';
import PassportVerificationModal from './PassportVerificationModal';
import { getPassportStatus } from '../api';

export default function BookingFlow({ pkg, user, onClose, onSuccess }) {
  const [phase, setPhase] = useState('loading');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getPassportStatus(pkg.id);
        if (!alive) return;
        setPhase(res?.canProceed ? 'payment' : 'passport');
      } catch {
        // If the status check fails for any reason, fail closed — every
        // booking must go through passport verification, never skip it.
        if (alive) setPhase('passport');
      }
    })();
    return () => { alive = false; };
  }, [pkg.id]);

  // Payment confirmed → hand off to the parent immediately. ClientDashboard
  // is responsible for closing this flow, switching to the Bookings tab, and
  // opening PostBookingModal for contact / next-of-kin / ID photo.
  const handlePaymentSuccess = (bookingData) => {
    onSuccess?.(bookingData);
    onClose?.();
  };

  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-gray-500">Preparing your booking…</p>
        </div>
      </div>
    );
  }

  if (phase === 'passport') {
    return (
      <PassportVerificationModal
        pkg={pkg}
        user={user}
        onClose={onClose}
        onVerified={() => setPhase('payment')}
      />
    );
  }

  if (phase === 'payment') {
    return (
      <BookingModal
        pkg={pkg}
        user={user}
        onClose={onClose}
        onSuccess={handlePaymentSuccess}
      />
    );
  }

  return null;
}