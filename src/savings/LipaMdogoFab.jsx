// Floating "Lipa Mdogo Mdogo" tab that hangs from the left edge of every
// public page (the chat launcher owns the bottom-right corner). Hover/tap
// slides out a short pitch with a single call to action:
//   signed-in pilgrim → straight to the savings page
//   signed-out        → create-account modal, then straight to the savings page
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import KshIcon from './KshIcon';
import AuthModal from '../components/AuthModal';
import { setPostAuthRedirect } from '../utils/postAuthRedirect';
import { getSavingsSummary, fmtKes, SAVINGS_PATH } from './savingsApi';

const HIDDEN_PREFIXES = [
  '/agent', '/superadmin', '/payment', '/auth', '/lipa-mdogo-mdogo',
  '/reset-password', '/verify-email',
];

export default function LipaMdogoFab({ currentUser, onAuthSuccess }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [summary, setSummary] = useState(null);
  const wrapRef = useRef(null);

  const isClient = currentUser?.role === 'client';
  const hidden =
    currentUser?.role === 'agent' ||
    HIDDEN_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));

  // Light balance fetch for signed-in pilgrims (shown in the slide-out card).
  useEffect(() => {
    if (!isClient || hidden) return undefined;
    let cancelled = false;
    getSavingsSummary()
      .then((r) => { if (!cancelled) setSummary(r?.data || null); })
      .catch(() => { /* card falls back to the generic pitch */ });
    return () => { cancelled = true; };
  }, [isClient, hidden, currentUser?.id]);

  // Close the card when tapping elsewhere (mobile has no hover-out).
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  if (hidden) return null;

  const go = () => {
    setOpen(false);
    if (isClient) {
      navigate(SAVINGS_PATH);
      return;
    }
    setPostAuthRedirect(SAVINGS_PATH);
    setShowAuth(true);
  };

  const balance = Number(summary?.account?.balanceKes) || 0;
  const percent = summary?.progress?.percent ?? 0;
  const unread = summary?.unreadNotifications || 0;

  return (
    <>
      <div
        ref={wrapRef}
        // Phones/tablets: a compact coin bottom-left, just above the bottom nav
        // bar (site header and client dashboard both have one), so it never
        // covers page content. md+: the full tab hanging from the left edge.
        className={`pointer-events-none fixed z-[45] flex flex-col-reverse items-start gap-2 print:hidden
                   left-3 bottom-[5.25rem] sm:left-4 sm:bottom-24
                   md:bottom-auto md:left-0 md:top-1/2 md:-translate-y-1/2 md:flex-row md:items-center md:gap-0`}
        // Hover-to-open is for mouse users only; touch users tap the button.
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') setOpen(true); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOpen(false); }}
      >
        {/* Phones: compact floating coin */}
        <button
          type="button"
          onClick={() => (open ? go() : setOpen(true))}
          aria-expanded={open}
          aria-label="Lipa Mdogo Mdogo — save for your Umrah little by little"
          className={`lmm-float ${open ? 'lmm-paused' : ''} pointer-events-auto relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-emerald-700 to-teal-800 text-white shadow-[0_8px_22px_rgba(4,120,87,0.45)] ring-2 ring-amber-300/80 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 md:hidden`}
        >
          {/* Ripple rings that pulse outward so the coin is hard to miss */}
          <span className="lmm-halo pointer-events-none absolute inset-0 rounded-full border-2 border-amber-300" aria-hidden="true" />
          <span className="lmm-halo lmm-halo-delay pointer-events-none absolute inset-0 rounded-full border-2 border-emerald-400" aria-hidden="true" />
          <span className="absolute inset-0 overflow-hidden rounded-full" aria-hidden="true">
            <span className="lmm-shine absolute inset-y-0 left-0 w-1/3 bg-white/35 blur-[2px]" />
          </span>
          <span className="lmm-sway relative"><KshIcon className="h-7 w-7 text-amber-200" /></span>
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white ring-2 ring-white">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-amber-300 ring-2 ring-white" aria-hidden="true" />
          )}
        </button>

        {/* md+: the hanging tab */}
        <button
          type="button"
          onClick={() => (open ? go() : setOpen(true))}
          aria-expanded={open}
          aria-label="Lipa Mdogo Mdogo — save for your Umrah little by little"
          className={`lmm-float ${open ? 'lmm-paused' : ''} pointer-events-auto group relative hidden flex-col items-center gap-2 overflow-hidden rounded-r-2xl bg-gradient-to-b from-emerald-600 via-emerald-700 to-teal-800 px-2.5 py-4 text-white shadow-[4px_6px_24px_rgba(4,120,87,0.35)] ring-1 ring-white/20 transition-[padding] duration-300 hover:pl-3.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 md:flex`}
        >
          <span className="lmm-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-white/15 blur-[2px]" aria-hidden="true" />
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
            <span className="lmm-sway"><KshIcon className="h-6 w-6 text-amber-200" /></span>
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-300" aria-hidden="true" />
            {unread > 0 && (
              <span className="absolute -bottom-1 -right-1 min-w-[16px] rounded-full bg-red-500 px-1 text-[9px] font-bold leading-4 text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </span>
          <span className="relative text-xs font-bold uppercase tracking-[0.14em] [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
            Lipa Mdogo Mdogo
          </span>
        </button>

        {/* Info card — above the coin on phones, beside the tab on md+ */}
        <div
          className={`w-[min(17rem,calc(100vw-2rem))] origin-bottom-left rounded-2xl border border-emerald-100 bg-white p-4 shadow-2xl transition-all duration-300 md:ml-2 md:w-[17rem] md:origin-left ${
            open
              ? 'pointer-events-auto translate-x-0 translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-2 opacity-0 md:translate-y-0 md:-translate-x-3'
          }`}
          role="dialog"
          aria-label="Lipa Mdogo Mdogo"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-gray-900">Lipa Mdogo Mdogo</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="-mr-1 -mt-1 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isClient && summary ? (
            <>
              <p className="mt-1 text-xs text-gray-500">Your Umrah savings</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-700">{fmtKes(balance)}</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-50">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all"
                  style={{ width: `${Math.max(3, percent)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500">{percent}% of your Umrah goal</p>
            </>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Save for your Umrah weekly or monthly — like <strong>KES 3,000 a week</strong> — by M-Pesa or card.
              When you have enough, pick your package and agent.
            </p>
          )}

          <button
            type="button"
            onClick={go}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
          >
            {isClient ? 'Save now' : 'Start saving'}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-2 text-center text-[10px] italic text-gray-400">
            “The most beloved deeds to Allah are the consistent ones, even if small.”
          </p>
        </div>
      </div>

      {showAuth && (
        <AuthModal
          initialAuthType="register"
          onClose={() => setShowAuth(false)}
          onAuthSuccess={(user) => {
            setShowAuth(false);
            onAuthSuccess?.(user);
          }}
        />
      )}
    </>
  );
}
