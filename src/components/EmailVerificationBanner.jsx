import React, { useEffect, useState } from 'react';
import { Mail, X } from 'lucide-react';
import { resendVerificationEmail } from '../api';

const MAX_RESEND_ATTEMPTS = 3;

const getResendStorageKey = (email) => `verify_email_resend_count:${(email || '').toLowerCase()}`;

const readResendCount = (email) => {
  if (!email) return 0;
  try {
    const raw = localStorage.getItem(getResendStorageKey(email));
    const parsed = Number.parseInt(raw || '0', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
};

const writeResendCount = (email, count) => {
  if (!email) return;
  try {
    localStorage.setItem(getResendStorageKey(email), String(count));
  } catch {
    // Ignore storage errors and continue without persistence.
  }
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseServerLimitState = (payload) => {
  if (!payload || typeof payload !== 'object') return null;

  const attemptsUsed = toFiniteNumber(payload.resendCount ?? payload.attemptsUsed ?? payload.resend_attempts_used);
  const attemptsMax = toFiniteNumber(payload.maxResends ?? payload.attemptsMax ?? payload.resend_attempts_max ?? payload.limit);

  const explicitLocked = payload.resendLocked === true || payload.locked === true;
  const derivedLocked =
    attemptsUsed !== null && attemptsMax !== null && attemptsMax > 0 && attemptsUsed >= attemptsMax;
  const cooldownSeconds = toFiniteNumber(payload.cooldownSeconds ?? payload.cooldown ?? payload.cooldown_seconds);

  if (attemptsUsed === null && attemptsMax === null && !explicitLocked && cooldownSeconds === null) return null;

  return {
    attemptsUsed,
    attemptsMax,
    locked: explicitLocked || derivedLocked,
    cooldownSeconds: cooldownSeconds !== null && cooldownSeconds > 0 ? Math.floor(cooldownSeconds) : 0,
  };
};

// Render as either:
// - inline banner reminder (blocking=false)
// - full dashboard gate overlay (blocking=true)
const EmailVerificationBanner = ({ user, darkMode = false, blocking = false, onVerified }) => {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendCount, setResendCount] = useState(() => readResendCount(user?.email));
  const [maxResendAttempts, setMaxResendAttempts] = useState(MAX_RESEND_ATTEMPTS);
  const [resendLocked, setResendLocked] = useState(() => readResendCount(user?.email) >= MAX_RESEND_ATTEMPTS);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [error, setError] = useState('');

  if ((!blocking && dismissed) || !user?.email) return null;

  const canResend = !resendLocked && resendCount < maxResendAttempts && cooldownLeft === 0;

  useEffect(() => {
    if (cooldownLeft <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldownLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownLeft]);

  const applyServerLimitState = (state) => {
    if (!state) return;
    if (state.attemptsMax !== null && state.attemptsMax > 0) {
      setMaxResendAttempts(state.attemptsMax);
    }
    if (state.attemptsUsed !== null && state.attemptsUsed >= 0) {
      setResendCount(state.attemptsUsed);
      writeResendCount(user.email, state.attemptsUsed);
    }
    if (state.locked) {
      setResendLocked(true);
    }
    if (state.cooldownSeconds > 0) {
      setCooldownLeft(state.cooldownSeconds);
    }
  };

  const handleResend = async () => {
    if (sending || !canResend) return;
    setError('');
    setSending(true);
    try {
      const response = await resendVerificationEmail(user.email);

      const serverState = parseServerLimitState(response);
      if (serverState) {
        applyServerLimitState(serverState);
      } else {
        // Backward compatibility for older backends that only return success.
        const nextCount = resendCount + 1;
        setResendCount(nextCount);
        writeResendCount(user.email, nextCount);
        if (nextCount >= maxResendAttempts) setResendLocked(true);
      }

      setSent(true);
      setTimeout(() => setSent(false), 8000);
    } catch (err) {
      const errorState = parseServerLimitState(err?.data);
      if (errorState) applyServerLimitState(errorState);

      if (err?.status === 429) {
        setResendLocked(true);
        setError('You have reached the maximum resend attempts.');
      } else {
        setError(err?.message || 'Failed to resend email. Please try again shortly.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = () => {
    if (typeof onVerified === 'function') onVerified();
  };

  const sharedMessage = sent
    ? <>Verification email sent to <strong>{user.email}</strong>. Check inbox and spam.</>
    : <>Please confirm <strong>{user.email}</strong> to continue using your dashboard.</>;

  if (blocking) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/20 backdrop-blur-[1px]">
        <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white shadow-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900">Confirm your email to unlock dashboard access</h2>
              <p className="text-sm text-gray-600 mt-1">{sharedMessage}</p>
              <p className="text-xs text-gray-500 mt-2">
                Resend attempts used: <strong>{resendCount}</strong> / <strong>{maxResendAttempts}</strong>
              </p>
              {!canResend && (
                <p className="text-xs text-red-600 mt-2">
                  You have reached the maximum of {maxResendAttempts} resend attempts.
                </p>
              )}
              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
              {cooldownLeft > 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  You can resend again in {cooldownLeft}s.
                </p>
              )}
              <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={handleResend}
                  disabled={sending || !canResend}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending…' : cooldownLeft > 0 ? `Wait ${cooldownLeft}s` : 'Resend email'}
                </button>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50"
                >
                  I have confirmed, refresh status
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 sm:px-6 py-3 border-b text-sm ${
        darkMode ? 'bg-amber-950/40 border-amber-900 text-amber-200' : 'bg-amber-50 border-amber-100 text-amber-800'
      }`}
    >
      <Mail className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 truncate">{sharedMessage}</span>
      {!sent && (
        <button
          onClick={handleResend}
          disabled={sending || !canResend}
          className={`flex-shrink-0 font-semibold underline underline-offset-2 disabled:opacity-50 ${
            darkMode ? 'text-amber-100 hover:text-white' : 'text-amber-900 hover:text-amber-950'
          }`}
        >
          {sending ? 'Sending…' : cooldownLeft > 0 ? `Wait ${cooldownLeft}s` : canResend ? 'Resend email' : 'Resend limit reached'}
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        className={`flex-shrink-0 p-1 rounded-md transition-colors ${darkMode ? 'hover:bg-amber-900/60' : 'hover:bg-amber-100'}`}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default EmailVerificationBanner;