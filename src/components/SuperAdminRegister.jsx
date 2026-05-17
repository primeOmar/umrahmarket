import React, { useState } from 'react';
import { Lock, Mail, User, Eye, EyeOff, Loader, Shield, AlertCircle, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const BASE_API = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

// Password strength scorer
const scorePassword = (pwd) => {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[@$!%*?&]/.test(pwd)) score++;
  return score; // 0–5
};

const strengthLabel = [
  { label: 'Too short',  color: 'bg-red-400' },
  { label: 'Weak',       color: 'bg-red-400' },
  { label: 'Fair',       color: 'bg-amber-400' },
  { label: 'Good',       color: 'bg-yellow-400' },
  { label: 'Strong',     color: 'bg-emerald-400' },
  { label: 'Very strong',color: 'bg-emerald-500' },
];

const SuperAdminRegister = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username:       '',
    email:          '',
    fullName:       '',
    password:       '',
    confirmPassword:'',
    registerSecret: '',
  });
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecret,          setShowSecret]          = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const pwdScore  = scorePassword(form.password);
  const strength  = strengthLabel[Math.min(pwdScore, 5)];
  const pwdMatch  = form.confirmPassword && form.password === form.confirmPassword;
  const pwdNoMatch= form.confirmPassword && form.password !== form.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.username || !form.email || !form.password || !form.confirmPassword || !form.registerSecret) {
      setError('All fields are required'); return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match'); return;
    }
    if (pwdScore < 3) {
      setError('Please choose a stronger password'); return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${BASE_API}/superadmin/register`, form);
      if (data.success) {
        setSuccess(true);
        toast.success('Account created! Redirecting to login...');
        setTimeout(() => navigate('/superadmin/login'), 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ── shared field style ──────────────────────────────────────────────────
  const fieldClass = `
    w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-100 disabled:cursor-not-allowed transition-all
    bg-gray-50 text-gray-900 placeholder-gray-400
  `;
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

  // ── Success screen ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account Created</h2>
          <p className="text-sm text-gray-500">Redirecting you to the login page…</p>
          <Loader className="h-5 w-5 animate-spin text-blue-600 mx-auto mt-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Left panel — slate, matching dashboard sidebar */}
      <div className="hidden lg:flex w-5/12 bg-slate-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Umrah Market</p>
            <p className="text-slate-400 text-xs">Superadmin Portal</p>
          </div>
        </div>

        <div>
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-8">
            <KeyRound className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Create Your<br />Admin Account
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Register a superadmin account to manage the Umrah Market platform. A registration secret is required to prevent unauthorised access.
          </p>

          {/* Checklist */}
          <ul className="mt-8 space-y-3">
            {[
              'Full platform monitoring',
              'Agent & client management',
              'Document verification',
              'Audit log access',
            ].map(item => (
              <li key={item} className="flex items-center gap-2.5 text-slate-300 text-sm">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-slate-600 text-xs">
          Already have an account?{' '}
          <button onClick={() => navigate('/superadmin/login')} className="text-slate-400 hover:text-white transition-colors underline">
            Sign in
          </button>
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">

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

          <div className="mb-8">
            <button
              onClick={() => navigate('/superadmin/login')}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to login
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Register Superadmin</h2>
            <p className="text-sm text-gray-500 mt-1">Fill in your details and the registration secret</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Full Name */}
            <div>
              <label className={labelClass}>Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={form.fullName}
                  onChange={set('fullName')}
                  placeholder="John Doe"
                  disabled={loading}
                  className={fieldClass}
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className={labelClass}>Username <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={form.username}
                  onChange={set('username')}
                  placeholder="superadmin"
                  disabled={loading}
                  className={fieldClass}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email Address <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="admin@example.com"
                  disabled={loading}
                  className={fieldClass}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={labelClass}>Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Min 8 chars, upper, number, symbol"
                  disabled={loading}
                  className={`${fieldClass} pr-10`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength bar */}
              {form.password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= pwdScore ? strength.color : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${pwdScore >= 4 ? 'text-emerald-600' : pwdScore >= 3 ? 'text-amber-600' : 'text-red-500'}`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className={labelClass}>Confirm Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  placeholder="Re-enter password"
                  disabled={loading}
                  className={`${fieldClass} pr-10 ${pwdMatch ? 'border-emerald-400 focus:ring-emerald-500' : pwdNoMatch ? 'border-red-400 focus:ring-red-500' : 'border-gray-200'}`}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwdMatch   && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Passwords match</p>}
              {pwdNoMatch && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
            </div>

            {/* Registration Secret */}
            <div className="pt-2 border-t border-gray-100">
              <label className={labelClass}>
                Registration Secret <span className="text-red-500">*</span>
                <span className="ml-2 text-xs font-normal text-gray-400">(set in your .env as SUPERADMIN_REGISTER_SECRET)</span>
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={form.registerSecret}
                  onChange={set('registerSecret')}
                  placeholder="Enter the registration secret"
                  disabled={loading}
                  className={`${fieldClass} pr-10`}
                />
                <button type="button" onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                This secret prevents unauthorised registrations. Ask your system administrator.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              {loading
                ? <><Loader className="h-4 w-4 animate-spin" /> Creating account...</>
                : <><Shield className="h-4 w-4" /> Create Superadmin Account</>
              }
            </button>
          </form>

          {/* Security note */}
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500 text-center">
              <span className="font-semibold text-slate-700">One-time setup:</span> Disable the register route in production once your account is created.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminRegister;