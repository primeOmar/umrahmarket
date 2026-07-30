import React, { useState } from 'react';
import { Mail, X } from 'lucide-react';
import { resendVerificationEmail } from '../api';

// Soft nag banner — shown while user.emailVerified is false. Does NOT block
// any dashboard functionality; it's a dismissible-for-this-session reminder
// with a resend action. Render with: {!user?.emailVerified && <EmailVerificationBanner user={user} darkMode={darkMode} />}
const EmailVerificationBanner = ({ user, darkMode = false }) => {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (dismissed || !user?.email) return null;

  const handleResend = async () => {
    if (sending) return;
    setSending(true);
    try {
      await resendVerificationEmail(user.email);
      setSent(true);
      setTimeout(() => setSent(false), 8000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 sm:px-6 py-3 border-b text-sm ${
        darkMode ? 'bg-amber-950/40 border-amber-900 text-amber-200' : 'bg-amber-50 border-amber-100 text-amber-800'
      }`}
    >
      <Mail className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 truncate">
        {sent ? (
          <>Verification email sent — check <strong>{user.email}</strong> (and spam).</>
        ) : (
          <>Please confirm <strong>{user.email}</strong> to secure your account.</>
        )}
      </span>
      {!sent && (
        <button
          onClick={handleResend}
          disabled={sending}
          className={`flex-shrink-0 font-semibold underline underline-offset-2 disabled:opacity-50 ${
            darkMode ? 'text-amber-100 hover:text-white' : 'text-amber-900 hover:text-amber-950'
          }`}
        >
          {sending ? 'Sending…' : 'Resend email'}
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