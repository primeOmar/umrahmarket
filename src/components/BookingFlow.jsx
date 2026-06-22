// BookingFlow.jsx
//
// Orchestrates the full booking journey:
//   1. loading  — check if passport already verified for this package
//   2. passport — PassportVerificationModal (details + passport page scan)
//   3. payment  — BookingModal (card / M-Pesa / bank)
//   4. face     — FacePhotoModal (selfie for Umrah ID card, post-payment)
//
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import BookingModal from './BookingModal';
import PassportVerificationModal from './PassportVerificationModal';
import FacePhotoModal from './FacePhotoModal';
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
        if (alive) setPhase('passport');
      }
    })();
    return () => { alive = false; };
  }, [pkg.id]);

  // Payment confirmed → immediately advance to face-photo phase.
  // Also surface to the parent (ClientDashboard) so it can refresh bookings.
  const handlePaymentSuccess = (bookingData) => {
    onSuccess?.(bookingData);   // let ClientDashboard refresh its list
    setPhase('face');           // show face-photo modal right away
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

  if (phase === 'face') {
    return (
      <FacePhotoModal
        pkg={pkg}
        user={user}
        onDone={onClose}
      />
    );
  }

  return null;
}