// BookingFlow.jsx
// Drop-in replacement for <BookingModal/>. Gates the payment modal behind
// passport verification: checks whether this user has already verified their
// passport for this package, and if not, runs PassportVerificationModal first.
//
// Same props as BookingModal so call sites only need to swap the component:
//   <BookingFlow pkg={pkg} user={user} onClose={...} onSuccess={...} />
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import BookingModal from './BookingModal';
import PassportVerificationModal from './PassportVerificationModal';
import { getPassportStatus } from '../api';

export default function BookingFlow({ pkg, user, onClose, onSuccess }) {
  const [phase, setPhase] = useState('loading'); // loading | passport | payment

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getPassportStatus(pkg.id);
        if (!alive) return;
        setPhase(res?.canProceed ? 'payment' : 'passport');
      } catch {
        // On any error, fail safe — require verification.
        if (alive) setPhase('passport');
      }
    })();
    return () => { alive = false; };
  }, [pkg.id]);

  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
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

  return <BookingModal pkg={pkg} user={user} onClose={onClose} onSuccess={onSuccess} />;
}
