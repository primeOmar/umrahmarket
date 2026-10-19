import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Sparkles, LogIn, UserPlus, ShieldCheck, MessageSquare, CreditCard } from 'lucide-react';
import AuthModal from './AuthModal';

const STEPS = [
  { icon: Sparkles, title: 'Describe your trip', text: 'Dates, group size, hotels and budget.' },
  { icon: MessageSquare, title: 'Agents send offers', text: 'Verified agents reply with a price and details.' },
  { icon: CreditCard, title: 'Accept & pay', text: 'Pick an offer, upload passports and pay securely.' },
];

/**
 * /custom-package entry point. A custom request needs an account so offers,
 * acceptance, payment and passport upload all happen against one identity:
 * guests are asked to sign in or register first, signed-in clients go straight
 * to the Custom Request tab of their dashboard.
 */
const CustomPackageGate = ({ authReady, currentUser, onAuthSuccess }) => {
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);

  if (!authReady) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to={currentUser.role === 'agent' ? '/agent/dashboard' : '/client/dashboard?tab=custom'} replace />;
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
      <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Request a custom Umrah package</h1>
        </div>
        <p className="text-sm text-white/90">
          Can't find the right package? Tell verified agents what you need and they'll send you offers.
          Sign in or create a free account to send your request.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        {STEPS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-gray-100 bg-white p-4">
            <Icon className="h-5 w-5 text-emerald-600 mb-2" />
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500 mt-1">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={() => setShowAuth(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700">
          <LogIn className="h-4 w-4" /> Sign in to continue
        </button>
        <button type="button" onClick={() => setShowAuth(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-emerald-200 text-emerald-700 font-medium hover:bg-emerald-50">
          <UserPlus className="h-4 w-4" /> Create a free account
        </button>
      </div>
      <p className="mt-4 text-xs text-gray-400 flex items-center gap-1">
        <ShieldCheck className="h-3.5 w-3.5" /> Your contact details are never shared with agents.
      </p>

      {showAuth && (
        <div className="fixed inset-0 z-[100]">
          <AuthModal
            onClose={() => setShowAuth(false)}
            onAuthSuccess={(user) => {
              setShowAuth(false);
              onAuthSuccess?.(user);
              navigate(user?.role === 'agent' ? '/agent/dashboard' : '/client/dashboard?tab=custom', { replace: true });
            }}
          />
        </div>
      )}
    </main>
  );
};

export default CustomPackageGate;
