import React, { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { confirmPasswordReset } from '../api';

const dashboardFor = (user) =>
  user?.role === 'agent' ? '/agent/dashboard'
    : user?.role === 'super_admin' || user?.role === 'superadmin' ? '/superadmin/dashboard'
      : '/client/dashboard';

const ResetPassword = () => {
  const [token, setToken] = useState(null);
  const [linkError, setLinkError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Link format: /reset-password?token_hash=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    if (tokenHash) {
      setToken(tokenHash);
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      setLinkError('This reset link is invalid or has expired. Please request a new one from the sign-in form.');
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await confirmPasswordReset(token, password, confirm);
      setDone(true);
      const user = res?.data?.data?.user;
      setTimeout(() => { window.location.assign(dashboardFor(user)); }, 1500);
    } catch (err) {
      const details = err?.data?.details;
      setError(
        Array.isArray(details) && details.length
          ? details.map((d) => d.message).join(' ')
          : err.message || 'Could not reset your password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
        {linkError ? (
          <div className="text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">Link problem</h1>
            <p className="text-sm text-gray-600">{linkError}</p>
            <a href="/" className="inline-block px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
              Back to home
            </a>
          </div>
        ) : done ? (
          <div className="text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">Password updated</h1>
            <p className="text-sm text-gray-600">Taking you to your dashboard…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">Set a new password</h1>
              <p className="text-sm text-gray-500 mt-1">
                At least 8 characters with upper and lower case letters, a number and a special character.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> <span>{error}</span>
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                required
                autoComplete="new-password"
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                required
                autoComplete="new-password"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Reset password &amp; sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
