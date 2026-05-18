import React, { useState, useRef, useEffect } from 'react';
import { Lock, Mail, AlertCircle, Eye, EyeOff, Loader, Shield, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BASE_API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const SuperAdminLogin = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [accountLocked, setAccountLocked]         = useState(false);
  const [lockoutTime, setLockoutTime]             = useState(null);
  const [show2FA, setShow2FA]           = useState(false);
  const [twoFACode, setTwoFACode]       = useState('');
  const [sessionToken, setSessionToken] = useState(null);

  // Countdown timer when account is locked
  useEffect(() => {
    if (!accountLocked || !lockoutTime) return;
    const timer = setInterval(() => {
      if (lockoutTime - new Date() <= 0) {
        setAccountLocked(false);
        setLockoutTime(null);
        setRemainingAttempts(5);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [accountLocked, lockoutTime]);

  const formatLockoutTime = () => {
    if (!lockoutTime) return '';
    const diff = lockoutTime - new Date();
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (accountLocked) { setError('Account temporarily locked. Please try again later.'); return; }
    if (!email.trim() || !password.trim()) { setError('Email and password are required'); return; }

    setLoading(true);
    try {
      const { data } = await axios.post(`${BASE_API}/superadmin/login`, {
        email: email.trim().toLowerCase(),
        password,
        userAgent: navigator.userAgent,
        ipAddress: 'client-ip',
      });

      if (data.success) {
        if (data.requires2FA) {
          setShow2FA(true);
          setSessionToken(data.sessionToken);
          toast.success('Enter your 2FA code');
          setEmail(''); setPassword('');
        } else {
          localStorage.setItem('superadmin_token',         data.token);
          localStorage.setItem('superadmin_refresh_token', data.refreshToken);
          localStorage.setItem('superadmin_user',          JSON.stringify(data.user));
          // Mirror tokens to the global keys so shared API client can refresh
          if (data.token)        localStorage.setItem('access_token', data.token);
          if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
          toast.success('Welcome, Superadmin!');
          if (onLoginSuccess) onLoginSuccess(data.user);
          else navigate('/superadmin/dashboard');
        }
        setRemainingAttempts(5);
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setRemainingAttempts(err.response.data.remainingAttempts || 0);
        if (err.response.data.lockedUntil) {
          setAccountLocked(true);
          setLockoutTime(new Date(err.response.data.lockedUntil));
          setError('Too many failed attempts. Account locked for 15 minutes.');
        }
      } else if (err.response?.status === 403) {
        setError('Account suspended. Contact support.');
      } else {
        setError(err.response?.data?.message || 'Login failed');
        setRemainingAttempts(prev => Math.max(0, prev - 1));
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!twoFACode.trim() || twoFACode.length !== 6) { setError('Invalid 2FA code format'); return; }

    setLoading(true);
    try {
      const { data } = await axios.post(`${BASE_API}/superadmin/verify-2fa`, {
        sessionToken,
        code: twoFACode.trim(),
      });

      if (data.success) {
        localStorage.setItem('superadmin_token',         data.token);
        localStorage.setItem('superadmin_refresh_token', data.refreshToken);
        localStorage.setItem('superadmin_user',          JSON.stringify(data.user));
        // Mirror tokens to global keys for unified client
        if (data.token)        localStorage.setItem('access_token', data.token);
        if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
        toast.success('Authentication successful!');
        if (onLoginSuccess) onLoginSuccess(data.user);
        else navigate('/superadmin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || '2FA verification failed');
    } finally {
      setLoading(false);
    }
  };

  // ── shared field style ────────────────────────────────────────────────────
  const fieldClass = `
    w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-100 disabled:cursor-not-allowed transition-all
    bg-gray-50 text-gray-900 placeholder-gray-400
  `;

  // ── layout wrapper ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Left panel — slate sidebar matching dashboard */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col justify-between p-12">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Umrah Market</p>
            <p className="text-slate-400 text-xs">Superadmin Portal</p>
          </div>
        </div>

        {/* Centre copy */}
        <div>
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-8">
            <Lock className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Restricted<br />Access Only
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            This portal is reserved for authorised superadmin personnel. All actions are logged and monitored.
          </p>
        </div>

        {/* Footer note */}
        <p className="text-slate-600 text-xs">
          If you don't have access, contact your system administrator.
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Mobile brand */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Umrah Market</p>
              <p className="text-gray-400 text-xs">Superadmin Portal</p>
            </div>
          </div>

          {!show2FA ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
                <p className="text-sm text-gray-500 mt-1">Enter your superadmin credentials to continue</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      disabled={loading || accountLocked}
                      placeholder="admin@example.com"
                      className={fieldClass}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      disabled={loading || accountLocked}
                      placeholder="••••••••••••"
                      className={`${fieldClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-700">{error}</p>
                      {!accountLocked && remainingAttempts <= 3 && (
                        <p className="text-xs text-red-500 mt-0.5">
                          {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Lockout countdown */}
                {accountLocked && (
                  <div className="flex gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Account Temporarily Locked</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        Try again in <span className="font-mono font-bold">{formatLockoutTime()}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || accountLocked}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md"
                >
                  {loading
                    ? <><Loader className="h-4 w-4 animate-spin" /> Authenticating...</>
                    : <><Lock className="h-4 w-4" /> Sign In</>
                  }
                </button>
              </form>
            </>
          ) : (
            /* ── 2FA screen ─────────────────────────────────────────────── */
            <>
              <button
                onClick={() => setShow2FA(false)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to login
              </button>

              <div className="mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                  <Lock className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Two-Factor Auth</h2>
                <p className="text-sm text-gray-500 mt-1">Enter the 6-digit code from your authenticator app</p>
              </div>

              <form onSubmit={handle2FASubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Authentication Code</label>
                  <input
                    type="text"
                    maxLength="6"
                    inputMode="numeric"
                    value={twoFACode}
                    onChange={e => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    disabled={loading}
                    className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-all"
                  />
                </div>

                {error && (
                  <div className="flex gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || twoFACode.length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md"
                >
                  {loading
                    ? <><Loader className="h-4 w-4 animate-spin" /> Verifying...</>
                    : 'Verify Code'
                  }
                </button>
              </form>
            </>
          )}

          {/* Security note */}
          <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500 text-center">
              <span className="font-semibold text-slate-700">Security notice:</span> All login attempts are logged and monitored.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;