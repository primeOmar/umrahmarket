import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  X, ChevronRight, Mail, Lock, Eye, EyeOff, Smartphone, Building,
  User, Sparkles, Hotel, Calendar, Headphones, Key, ShieldCheck,
  Zap, TrendingUp, Users as UsersIcon, Target, CreditCard, Star,
  Globe, Heart, MapPin, BookOpen, Shield, Info, Upload, FileText,
  Award, Briefcase, AlertCircle, CheckCircle
} from 'lucide-react';

import {
  login,
  registerClient,
  registerAgent,
  googleLogin,
  uploadAgentDocuments,
  userStore,
} from '../api';   

// ==================== ANIMATION STYLES ====================
const animationStyles = `
  @keyframes confetti {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes progress {
    0% { width: 0%; }
    100% { width: 100%; }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes ping {
    75%, 100% { transform: scale(2); opacity: 0; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0) translateX(0); }
    25% { transform: translateY(-10px) translateX(5px); }
    50% { transform: translateY(-5px) translateX(-5px); }
    75% { transform: translateY(5px) translateX(10px); }
  }
  .animate-confetti {
    animation: confetti 3s ease-out forwards;
  }
  .animate-slideUp {
    animation: slideUp 0.5s ease-out;
  }
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  .animate-progress {
    animation: progress 2s ease-out;
  }
  .animate-bounce {
    animation: bounce 1s infinite;
  }
  .animate-ping {
    animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  .animate-float {
    animation: float 15s ease-in-out infinite;
  }
  .animate-check {
    stroke-dasharray: 50;
    stroke-dashoffset: 50;
    animation: draw 0.8s ease-out forwards;
  }
  @keyframes draw {
    to { stroke-dashoffset: 0; }
  }
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = animationStyles;
  document.head.appendChild(styleSheet);
}

// ==================== ALERT COMPONENT ====================
const Alert = ({ type, message }) => {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl text-sm mb-4 ${
      isError
        ? 'bg-red-50 border border-red-200 text-red-700'
        : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
    }`}>
      {isError
        ? <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        : <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
      <span>{message}</span>
    </div>
  );
};

/**
 * Maps frontend state to Backend Client requirements
 * Ensures all required fields are present & trimmed
 */
const buildClientPayload = (data) => ({
  firstName: data.firstName?.trim() || '',
  lastName:  data.lastName?.trim() || '',
  email:     data.email?.trim() || '',
  password:  data.password || '',
  phone:     data.phone?.trim() || '',
});

/**
 * Maps frontend state to Backend Agent requirements
 */
const buildAgentPayload = (data) => {
  const director = data.directorName?.trim() || '';
  const parts = director ? director.split(/\s+/) : [];
  const firstName = parts[0] || data.firstName?.trim() || '';
  const lastName = parts.slice(1).join(' ') || data.lastName?.trim() || '-';
  return {
    firstName,
    lastName,
    email:         data.email?.trim().toLowerCase() || '',
    password:      data.password || '',
    phone:         data.phone?.trim().replace(/\s+/g, '') || '',
    companyName: data.agencyName?.trim() || '',
    licenseNumber: data.licenseNumber?.trim() || '',
    role:          'agent',
  };
};

// Agent validation
const validateAgentForm = (data) => {
  const errs = [];
  if (!data.agencyName?.trim())
    errs.push('Agency/Business Name is required.');

  const director = data.directorName?.trim() || '';
  if (!director || director.length < 2)
    errs.push('Director/Owner Name must be at least 2 characters.');
  else if (director.split(/\s+/).length < 2)
    errs.push('Please enter the full name (first and last) of the director/owner.');

  if (!data.licenseNumber?.trim())
    errs.push('Travel License Number is required.');

  const email = data.email?.trim() || '';
  if (!email) errs.push('Email is required.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Please enter a valid email address.');

  if (!data.password || data.password.length < 8)
    errs.push('Password must be at least 8 characters.');
  else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password))
    errs.push('Password must contain uppercase, lowercase, and a number.');

  if (!data.phone?.trim())
    errs.push('Phone number is required.');

  return errs;
};

// Client-side validation
const validateClientForm = (data) => {
  const errs = [];
  const fname = data.firstName?.trim() || '';
  const lname = data.lastName?.trim() || '';
  
  if (!fname) errs.push('First Name is required.');
  else if (fname.length < 2 || fname.length > 50) errs.push('First Name must be 2–50 characters.');
  else if (!/^[a-zA-Z\s'-]*$/.test(fname)) errs.push('First Name: letters, spaces, hyphens, apostrophes only.');
  
  if (!lname) errs.push('Last Name is required.');
  else if (lname.length < 2 || lname.length > 50) errs.push('Last Name must be 2–50 characters.');
  else if (!/^[a-zA-Z\s'-]*$/.test(lname)) errs.push('Last Name: letters, spaces, hyphens, apostrophes only.');
  
  if (!data.email?.trim()) errs.push('Email is required.');
  if (!data.password || data.password.length < 8) errs.push('Password must be at least 8 characters.');
  if (!data.phone?.trim()) errs.push('Phone number is required.');
  
  return errs;
};

// ==================== MEMOIZED FORM COMPONENTS ====================

const ClientForm = React.memo(({
  formData, authType, isLoading, showPassword,
  onInputChange, onTogglePassword, onSubmit, onToggleAuthType,
  alert,
}) => (
  <form onSubmit={onSubmit} className="space-y-6">
    <Alert {...alert} />

    {authType === 'register' && (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name <span className="text-emerald-500">*</span>
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300 pointer-events-none" />
              <input type="text" name="firstName" value={formData.firstName || ''} onChange={onInputChange}
                placeholder="Muhammad"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300 group-hover:border-emerald-300"
                required autoComplete="given-name" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name <span className="text-emerald-500">*</span>
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300 pointer-events-none" />
              <input type="text" name="lastName" value={formData.lastName || ''} onChange={onInputChange}
                placeholder="Ahmed"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300 group-hover:border-emerald-300"
                required autoComplete="family-name" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <div className="relative group">
            <Smartphone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300 pointer-events-none" />
            <input type="tel" name="phone" value={formData.phone || ''} onChange={onInputChange}
              placeholder="+1 (555) 000-0000"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300 group-hover:border-emerald-300"
              autoComplete="tel" />
          </div>
        </div>
      </>
    )}

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Email Address <span className="text-emerald-500">*</span>
      </label>
      <div className="relative group">
        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300 pointer-events-none" />
        <input type="email" name="email" value={formData.email || ''} onChange={onInputChange}
          placeholder="your@email.com"
          className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300 group-hover:border-emerald-300"
          required autoComplete="email" />
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Password <span className="text-emerald-500">*</span>
      </label>
      <div className="relative group">
        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300 pointer-events-none" />
        <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password || ''} onChange={onInputChange}
          placeholder="••••••••"
          className="w-full pl-12 pr-12 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300 group-hover:border-emerald-300"
          required autoComplete={authType === 'login' ? 'current-password' : 'new-password'} />
        <button type="button" onClick={onTogglePassword}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors duration-300" tabIndex="-1">
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {authType === 'register' && (
        <p className="text-xs text-gray-400 mt-1.5">Min 8 chars · uppercase · lowercase · number · special char</p>
      )}
    </div>

    {authType === 'login' && (
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input type="checkbox" id="remember" className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
          <label htmlFor="remember" className="ml-2 text-sm text-gray-700">Remember me</label>
        </div>
        <button type="button" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors duration-300">
          Forgot Password?
        </button>
      </div>
    )}

    {authType === 'register' && (
      <div className="flex items-start">
        <input type="checkbox" id="terms" className="h-4 w-4 mt-1 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" required />
        <label htmlFor="terms" className="ml-2 text-sm text-gray-700">
          I agree to the{' '}
          <button type="button" className="text-emerald-600 hover:text-emerald-700 font-semibold">Terms of Service</button>{' '}
          and{' '}
          <button type="button" className="text-emerald-600 hover:text-emerald-700 font-semibold">Privacy Policy</button>
        </label>
      </div>
    )}

    <button type="submit" disabled={isLoading}
      className="relative w-full py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-500 transform hover:-translate-y-1 active:scale-[0.99] overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
          <span>Processing...</span>
        </div>
      ) : (
        <>
          <span className="relative">{authType === 'login' ? 'Sign In as Pilgrim' : 'Create Pilgrim Account'}</span>
          <ChevronRight className="inline-block ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
        </>
      )}
    </button>

    <div className="text-center">
      <p className="text-sm text-gray-600">
        {authType === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button type="button" onClick={onToggleAuthType}
          className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors duration-300">
          {authType === 'login' ? 'Create Account' : 'Sign In'}
        </button>
      </p>
    </div>
  </form>
));
ClientForm.displayName = 'ClientForm';

const AgentForm = React.memo(({
  formData, authType, isLoading, showPassword,
  onInputChange, onTogglePassword, onSubmit, onToggleAuthType,
  alert,
}) => (
  <form onSubmit={onSubmit} className="space-y-6">
    <Alert {...alert} />

    {authType === 'register' && (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agency/Business Name <span className="text-blue-500">*</span>
          </label>
          <div className="relative group">
            <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" />
            <input type="text" name="agencyName" value={formData.agencyName || ''} onChange={onInputChange}
              placeholder="Your Agency Name"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 group-hover:border-blue-300"
              required autoComplete="organization" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Director/Owner Name <span className="text-blue-500">*</span>
          </label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" />
            <input type="text" name="directorName" value={formData.directorName || ''} onChange={onInputChange}
              placeholder="Full Name"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 group-hover:border-blue-300"
              required autoComplete="name" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Travel License Number <span className="text-blue-500">*</span>
          </label>
          <div className="relative group">
            <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" />
            <input type="text" name="licenseNumber" value={formData.licenseNumber || ''} onChange={onInputChange}
              placeholder="License Number"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 group-hover:border-blue-300"
              required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number <span className="text-blue-500">*</span>
          </label>
          <div className="relative group">
            <Smartphone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" />
            <input type="tel" name="phone" value={formData.phone || ''} onChange={onInputChange}
              placeholder="+1 (555) 000-0000"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 group-hover:border-blue-300"
              required autoComplete="tel" />
          </div>
        </div>
      </>
    )}

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {authType === 'register' ? 'Business Email' : 'Email Address'} <span className="text-blue-500">*</span>
      </label>
      <div className="relative group">
        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" />
        <input type="email" name="email" value={formData.email || ''} onChange={onInputChange}
          placeholder={authType === 'register' ? 'agency@email.com' : 'your@email.com'}
          className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 group-hover:border-blue-300"
          required autoComplete="email" />
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Password <span className="text-blue-500">*</span>
      </label>
      <div className="relative group">
        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" />
        <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password || ''} onChange={onInputChange}
          placeholder="••••••••"
          className="w-full pl-12 pr-12 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 group-hover:border-blue-300"
          required autoComplete={authType === 'login' ? 'current-password' : 'new-password'} />
        <button type="button" onClick={onTogglePassword}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors duration-300" tabIndex="-1">
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {authType === 'register' && (
        <p className="text-xs text-gray-400 mt-1.5">Min 8 chars · uppercase · lowercase · number · special char</p>
      )}
    </div>

    {authType === 'login' && (
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input type="checkbox" id="remember-agent" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
          <label htmlFor="remember-agent" className="ml-2 text-sm text-gray-700">Remember me</label>
        </div>
        <button type="button" className="text-sm text-blue-600 font-semibold hover:text-blue-700 transition-colors duration-300">
          Forgot Password?
        </button>
      </div>
    )}

    {authType === 'register' && (
      <div className="space-y-3">
        <div className="flex items-start">
          <input type="checkbox" id="agent-terms" className="h-4 w-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500" required />
          <label htmlFor="agent-terms" className="ml-2 text-sm text-gray-700">
            I agree to the{' '}
            <button type="button" className="text-blue-600 hover:text-blue-700 font-semibold">Agent Terms of Service</button>
            {' '}and{' '}
            <button type="button" className="text-blue-600 hover:text-blue-700 font-semibold">Privacy Policy</button>
          </label>
        </div>
        <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
          <p className="text-xs text-blue-700">
            <span className="font-semibold">Important:</span> You'll need to upload verification documents from your dashboard.
          </p>
        </div>
      </div>
    )}

    <button type="submit" disabled={isLoading}
      className="relative w-full py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-500 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-500 transform hover:-translate-y-1 active:scale-[0.99] overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
          <span>Processing...</span>
        </div>
      ) : (
        <>
          <span className="relative">{authType === 'login' ? 'Sign In as Agent' : 'Register Agency'}</span>
          <ChevronRight className="inline-block ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
        </>
      )}
    </button>

    <div className="text-center">
      <p className="text-sm text-gray-600">
        {authType === 'login' ? 'Not an agent yet?' : 'Already registered?'}{' '}
        <button type="button" onClick={onToggleAuthType}
          className="text-blue-600 font-semibold hover:text-blue-700 transition-colors duration-300">
          {authType === 'login' ? 'Apply Now' : 'Sign In'}
        </button>
      </p>
    </div>
  </form>
));
AgentForm.displayName = 'AgentForm';

// ==================== MAIN AUTH MODAL COMPONENT ====================

const AuthModal = ({ onClose, onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState('client');
  const [authType, setAuthType] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);

  const [alert, setAlert] = useState({ type: null, message: null });

  const [uploadedFiles, setUploadedFiles] = useState({
    incorporation: null,
    tourism: null,
    krapin: null,
  });

  const modalRef = useRef(null);

  const [formData, setFormData] = useState({
    email: '', password: '', phone: '',
    firstName: '', lastName: '',
    agencyName: '', directorName: '', licenseNumber: '',
  });

  const showError = (msg) => setAlert({ type: 'error', message: msg });
  const showSuccess = (msg) => setAlert({ type: 'success', message: msg });
  const clearAlert = () => setAlert({ type: null, message: null });

  // Check for Google OAuth result written by GoogleCallback.jsx
useEffect(() => {
  const raw = localStorage.getItem('google_auth_result');
  if (!raw) return;
  localStorage.removeItem('google_auth_result');

  let result;
  try { result = JSON.parse(raw); } catch { return; }

  if (result.type !== 'GOOGLE_OAUTH_SUCCESS' || !result.idToken) return;

  setIsLoading(true);
  googleLogin(result.idToken)
    .then((res) => {
      const user = res.data?.data?.user || res.data?.user;
      if (!user) throw new Error('User data missing from server response');
      onClose();
      onAuthSuccess(user);
    })
    .catch((err) => {
      showError(err.message || 'Google login failed.');
      setIsLoading(false);
    });
}, [onClose, onAuthSuccess]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setAlert({ type: null, message: null });
  }, []);

  const handleTogglePassword = useCallback(() => setShowPassword(p => !p), []);
  const handleToggleAuthType = useCallback(() => {
    setAuthType(p => p === 'login' ? 'register' : 'login');
    clearAlert();
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '15px';
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    const onEscape = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onClickOutside, true);
    document.addEventListener('keydown', onEscape, true);
    return () => {
      document.removeEventListener('mousedown', onClickOutside, true);
      document.removeEventListener('keydown', onEscape, true);
    };
  }, [onClose]);

  const handleFileUpload = useCallback((e, docType) => {
    const file = e.target.files[0];
    if (file) setUploadedFiles(prev => ({ ...prev, [docType]: file }));
  }, []);

  const handleModeSwitch = useCallback((mode) => {
    setAuthMode(mode);
    clearAlert();
    setFormData({ 
      email: '', password: '', phone: '', firstName: '', lastName: '',
      agencyName: '', directorName: '', licenseNumber: '' 
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    clearAlert();
    setIsLoading(true);

    try {
      if (authType === 'login') {
        showSuccess('Authenticating...');
        
        const res = await login(formData);
        
        // Debug: log the full response to see structure
        if (import.meta?.env?.DEV) {
          console.debug('[Login] Full response:', JSON.stringify(res?.data));
          console.debug('[Login] User:', res.data?.data?.user || res.data?.user || 'NOT FOUND');
        }
        
        const loginPopup = document.createElement('div');
        loginPopup.className = 'fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg animate-fadeIn';
        loginPopup.dataset.authPopup = 'true';
        loginPopup.innerHTML = `
          <div class="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl shadow-black/20 animate-slideUp border border-white/20">
            <div class="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
            <div class="p-8 text-center">
              <div class="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-2">Welcome Back! 🎉</h3>
              <p class="text-gray-600 mb-6">Redirecting you to your dashboard...</p>
              <div class="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
                <div class="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full animate-progress"></div>
              </div>
              <p class="text-xs text-gray-400">Preparing your experience</p>
            </div>
          </div>
        `;
        
        document.body.appendChild(loginPopup);
        
        setTimeout(() => {
          loginPopup.remove();
          
          // Redirect based on user role - backend returns user in res.data.data.user
          const user = res.data?.data?.user || res.data?.user;
          
          console.log('[Login] DEBUG - Full response data:', res.data);
          console.log('[Login] DEBUG - Extracted user:', user);
          console.log('[Login] DEBUG - User role:', user?.role);
          
          if (!user) {
            console.error('[Login] No user found in response - cannot redirect');
            showError('Login succeeded but user data is missing. Please try again.');
            setIsLoading(false);
            return;
          }
          
          console.log('[Login] DEBUG - About to call onClose()');
          // Close modal before redirect
          onClose();
          console.log('[Login] DEBUG - onClose() called');
          
          const targetUrl = user?.role === 'agent' 
            ? '/agent/dashboard?welcome=true' 
            : '/client/dashboard?welcome=true';
          
          console.log('[Login] DEBUG - Redirecting to:', targetUrl);
          onAuthSuccess(user);
          console.log('[Login] DEBUG - onAuthSuccess called (this should navigate)');
        }, 1500);

      } else {
        if (authMode === 'client') {
          const validationErrors = validateClientForm(formData);
          if (validationErrors.length) {
            showError(validationErrors.join(' '));
            setIsLoading(false);
            return;
          }

          const loadingPopup = document.createElement('div');
          loadingPopup.className = 'fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg animate-fadeIn';
          loadingPopup.dataset.authPopup = 'true';
          loadingPopup.innerHTML = `
            <div class="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl shadow-black/20 border border-white/20">
              <div class="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 animate-pulse" />
              <div class="p-8 text-center">
                <div class="mx-auto w-16 h-16 mb-4">
                  <div class="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">Creating Your Account</h3>
                <p class="text-gray-500 text-sm mb-4">Please wait while we set up your pilgrim profile...</p>
                <div class="flex justify-center space-x-1">
                  <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 0s"></div>
                  <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                  <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
              </div>
            </div>
          `;
          
          document.body.appendChild(loadingPopup);
          
          const payload = buildClientPayload(formData);
          const res = await registerClient(payload);
          
          loadingPopup.remove();

          // Set user store for authentication
          const user = res.data?.data?.user || res.data?.user || {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            role: 'client'
          };
          userStore.set(user);

          // Store user data
          const userData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone
          };
          localStorage.setItem('userData', JSON.stringify(userData));

          const successPopup = document.createElement('div');
          successPopup.className = 'fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg animate-fadeIn';
          successPopup.dataset.authPopup = 'true';
          successPopup.innerHTML = `
            <div class="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl shadow-black/20 border border-white/20 animate-slideUp">
              <div class="absolute inset-0 pointer-events-none overflow-hidden">
                ${[...Array(30)].map((_, i) => `
                  <div class="absolute w-2 h-2 bg-emerald-500 rounded-full animate-confetti"
                    style="left: ${Math.random() * 100}%; top: -10%; animation-delay: ${Math.random() * 2}s; animation-duration: ${Math.random() * 3 + 2}s; background: ${['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'][Math.floor(Math.random() * 4)]}">
                  </div>
                `).join('')}
              </div>
              
              <div class="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
              
              <div class="p-8 text-center relative">
                <div class="relative mx-auto w-28 h-28 mb-6">
                  <div class="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-25"></div>
                  <div class="absolute inset-2 bg-emerald-100 rounded-full animate-pulse"></div>
                  <div class="relative w-28 h-28 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center transform transition-transform duration-500 hover:scale-110">
                    <svg class="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                
                <h2 class="text-3xl font-bold text-gray-900 mb-3">Welcome to the Family, ${formData.firstName}! 🤲</h2>
                <p class="text-gray-600 mb-6">Your pilgrim account has been created successfully.</p>
                
                <!-- Dashboard Preview Cards -->
                <div class="grid grid-cols-3 gap-4 mb-8">
                  <div class="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                    <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <svg class="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p class="text-xs text-gray-600">Track Bookings</p>
                  </div>
                  <div class="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <svg class="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <p class="text-xs text-gray-600">Save Favorites</p>
                  </div>
                  <div class="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                    <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <svg class="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p class="text-xs text-gray-600">Chat Agents</p>
                  </div>
                </div>
                
                <!-- Email Verification Card -->
                <div class="relative bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 mb-6 overflow-hidden group">
                  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <div class="flex items-start gap-4">
                    <div class="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div class="text-left flex-1">
                      <p class="text-sm font-semibold text-emerald-800 mb-1">📧 Verification Email Sent</p>
                      <p class="text-xs text-emerald-700 break-all bg-white/50 p-2 rounded-lg border border-emerald-200 font-mono">
                        ${formData.email}
                      </p>
                      <p class="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Don't forget to check your spam folder
                      </p>
                    </div>
                  </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="space-y-3">
                  <a href="/client/dashboard?welcome=true" 
                    class="inline-block w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 transform hover:-translate-y-1 group">
                    <span class="inline-flex items-center justify-center">
                      Go to Your Dashboard
                      <svg class="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </a>
                </div>
                
                <!-- Auto-redirect Indicator -->
                <div class="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <div class="w-4 h-4 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin"></div>
                  <span>Redirecting to your dashboard in <span id="countdown">5</span> seconds...</span>
                </div>
              </div>
            </div>
          `;
          
          document.querySelectorAll('[data-auth-popup]').forEach(el => el.remove());
          document.body.appendChild(successPopup);
          
          let countdown = 5;
          const timer = setInterval(() => {
            countdown--;
            const countdownEl = document.getElementById('countdown');
            if (countdownEl) countdownEl.textContent = countdown;
            if (countdown <= 0) {
              clearInterval(timer);
              // Clean up all popups before calling onAuthSuccess
              document.querySelectorAll('[data-auth-popup]').forEach(el => el.remove());
              onAuthSuccess(user);
            }
          }, 1000);
          
          setTimeout(() => {
            clearInterval(timer);
            // Clean up all popups before calling onAuthSuccess
            document.querySelectorAll('[data-auth-popup]').forEach(el => el.remove());
            onAuthSuccess(user);
          }, 5000);

        } else {
          const validationErrors = validateAgentForm(formData);
          if (validationErrors.length) {
            showError(validationErrors.join(' '));
            setIsLoading(false);
            return;
          }

          const agentLoadingPopup = document.createElement('div');
          agentLoadingPopup.className = 'fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg animate-fadeIn';
          agentLoadingPopup.dataset.authPopup = 'true';
          agentLoadingPopup.innerHTML = `
            <div class="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl shadow-black/20 border border-white/20">
              <div class="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 animate-pulse" />
              <div class="p-8 text-center">
                <div class="mx-auto w-16 h-16 mb-4 relative">
                  <div class="absolute inset-0 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div class="absolute inset-2 bg-blue-100 rounded-full animate-pulse"></div>
                  <Building class="absolute inset-0 m-auto h-6 w-6 text-blue-600" />
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">Registering Your Agency</h3>
                <p class="text-gray-500 text-sm mb-4">Setting up your travel partner profile...</p>
                <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div class="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full animate-progress" style="width: 70%"></div>
                </div>
              </div>
            </div>
          `;
          
          document.body.appendChild(agentLoadingPopup);

          const payload = buildAgentPayload(formData);
          const res = await registerAgent(payload);
          
          agentLoadingPopup.remove();

          // Store agent data
          const agentData = {
            ...res.data?.data?.user ?? res.data?.user,
            agencyName: formData.agencyName,
            email: formData.email,
            licenseNumber: formData.licenseNumber,
            role: 'agent'
          };
          
          localStorage.setItem('agentData', JSON.stringify(agentData));
          sessionStorage.setItem('newAgent', 'true');

          const agentSuccessPopup = document.createElement('div');
          agentSuccessPopup.className = 'fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg animate-fadeIn';
          agentSuccessPopup.dataset.authPopup = 'true';
          agentSuccessPopup.innerHTML = `
            <div class="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl shadow-black/20 border border-white/20 animate-slideUp">
              <div class="absolute inset-0 pointer-events-none overflow-hidden">
                ${[...Array(30)].map((_, i) => `
                  <div class="absolute w-2 h-2 bg-blue-500 rounded-full animate-confetti"
                    style="left: ${Math.random() * 100}%; top: -10%; animation-delay: ${Math.random() * 2}s; animation-duration: ${Math.random() * 3 + 2}s; background: ${['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'][Math.floor(Math.random() * 4)]}">
                  </div>
                `).join('')}
              </div>
              
              <div class="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              
              <div class="p-8 text-center relative">
                <div class="relative mx-auto w-28 h-28 mb-6">
                  <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-25"></div>
                  <div class="absolute inset-2 bg-blue-100 rounded-full animate-pulse"></div>
                  <div class="relative w-28 h-28 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center transform transition-transform duration-500 hover:scale-110">
                    <svg class="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                
                <h2 class="text-3xl font-bold text-gray-900 mb-3">Welcome to the Family, ${formData.agencyName}! 🎉</h2>
                <p class="text-gray-600 mb-6">Your agency account has been created successfully.</p>
                
                <div class="grid grid-cols-3 gap-4 mb-8">
                  <div class="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <p class="text-xs text-gray-600">Manage Clients</p>
                  </div>
                  <div class="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                    <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <svg class="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p class="text-xs text-gray-600">Track Bookings</p>
                  </div>
                  <div class="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                    <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <svg class="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <p class="text-xs text-gray-600">Create Packages</p>
                  </div>
                </div>
                
                <div class="space-y-3">
                  <a href="/agent/dashboard?welcome=true" 
                    class="inline-block w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-1 group">
                    <span class="inline-flex items-center justify-center">
                      Go to Your Dashboard
                      <svg class="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </a>
                  
                  <p class="text-xs text-gray-500 mt-4">
                    ✨ Your dashboard is ready with all the tools you need to manage your travel business
                  </p>
                </div>
                
                <div class="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <div class="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span>Redirecting to your dashboard in <span id="countdown">5</span> seconds...</span>
                </div>
              </div>
            </div>
          `;
          
          document.querySelectorAll('[data-auth-popup]').forEach(el => el.remove());
          document.body.appendChild(agentSuccessPopup);
          
          let countdown = 5;
          const timer = setInterval(() => {
            countdown--;
            const countdownEl = document.getElementById('countdown');
            if (countdownEl) countdownEl.textContent = countdown;
            if (countdown <= 0) {
              clearInterval(timer);
              // Clean up all popups before calling onAuthSuccess
              document.querySelectorAll('[data-auth-popup]').forEach(el => el.remove());
              onAuthSuccess(agentData);
            }
          }, 1000);
          
          setTimeout(() => {
            clearInterval(timer);
            // Clean up all popups before calling onAuthSuccess
            document.querySelectorAll('[data-auth-popup]').forEach(el => el.remove());
            onAuthSuccess(agentData);
          }, 5000);
        }
      }
    } catch (err) {
      const serverData = err?.response?.data;
      console.error('Auth error:', err);
      
      let serverMsg = serverData?.message || serverData?.error || err.message || 'Something went wrong.';

      if (Array.isArray(serverData?.details) && serverData.details.length) {
        serverMsg = serverData.details
          .map(d => d.message || d.msg || d.field && `${d.field}: ${d.message}` || JSON.stringify(d))
          .join('\n');
      } else if (serverData?.errors) {
        serverMsg = typeof serverData.errors === 'string'
          ? serverData.errors
          : Object.entries(serverData.errors).map(([k, v]) => `${k}: ${v}`).join('\n');
      } else if (serverMsg.toLowerCase().includes('rate limit')) {
        serverMsg = 'Too many attempts. Please wait a few minutes before trying again.';
      } else if (err?.response?.status === 409) {
        serverMsg = 'An account with this email already exists. Please sign in instead.';
      }

      showError(serverMsg);
      
      const errorPopup = document.createElement('div');
      errorPopup.className = 'fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg animate-fadeIn';
      errorPopup.dataset.authPopup = 'true';
      errorPopup.innerHTML = `
        <div class="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl shadow-black/20 border border-white/20">
          <div class="h-1.5 bg-gradient-to-r from-red-500 to-rose-500" />
          <div class="p-8 text-center">
            <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Registration Failed</h3>
            <p class="text-gray-600 mb-6">${serverMsg}</p>
            <button onclick="this.closest('.fixed').remove()" 
              class="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors duration-300">
              Try Again
            </button>
          </div>
        </div>
      `;
      
      document.querySelectorAll('[data-auth-popup]').forEach(el => el.remove());
      document.body.appendChild(errorPopup);
      
      setTimeout(() => {
        if (document.body.contains(errorPopup)) {
          errorPopup.remove();
        }
      }, 5000);
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (isLoading) return;
    clearAlert();
    setIsLoading(true);

    try {
      await uploadAgentDocuments(uploadedFiles, pendingUserId);
      showSuccess('Documents submitted! Your account will be reviewed within 24–48 hours.');
      setTimeout(() => {
        window.location.href = '/agent/dashboard?verified=true';
      }, 2500);
    } catch (err) {
      showError(err.message || 'Document upload failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [uploadedFiles, isLoading, pendingUserId]);


const handleGoogleLogin = useCallback(() => {
  if (isLoading) return;
  clearAlert();
  setIsLoading(true);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    showError('VITE_GOOGLE_CLIENT_ID not set in .env');
    setIsLoading(false);
    return;
  }

 localStorage.removeItem('google_auth_result');
  localStorage.removeItem('google_auth_nonce');

  const rawNonce = Math.random().toString(36).substring(2) + Date.now();

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  `${window.location.origin}/auth/google/callback`,
    response_type: 'id_token',
    scope:         'openid email profile',
    nonce:         rawNonce,
  });

  const left  = window.screenX + (window.outerWidth  - 500) / 2;
  const top   = window.screenY + (window.outerHeight - 600) / 2;
  const popup = window.open(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    'google-signin',
    `width=500,height=600,left=${left},top=${top}`
  );

  if (!popup) {
    showError('Popup blocked — please allow popups for this site.');
    localStorage.removeItem('google_auth_nonce');
    setIsLoading(false);
    return;
  }

  let processed  = false;
  let pollTimer  = null;   // declared here so processResult can access it

  const processResult = async (raw) => {
    if (processed) return;
    processed = true;
    if (pollTimer) clearInterval(pollTimer);

    localStorage.removeItem('google_auth_result');
    localStorage.removeItem('google_auth_nonce');

    let result;
    try { result = JSON.parse(raw); }
    catch {
      showError('Invalid auth response.');
      setIsLoading(false);
      return;
    }

    if (result.type === 'GOOGLE_OAUTH_ERROR') {
      showError(result.error || 'Google sign-in failed.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await googleLogin(result.idToken);
      const user = res.data?.data?.user || res.data?.user;
      if (!user) throw new Error('User data missing from server response');
      onClose();
      onAuthSuccess(user);
    } catch (err) {
      showError(err.message || 'Google login failed.');
      setIsLoading(false);
    }
  };

  pollTimer = setInterval(() => {
    const raw = localStorage.getItem('google_auth_result');
    if (raw) { processResult(raw); return; }

    try {
      if (popup.closed && !processed) {
        clearInterval(pollTimer);
        setIsLoading(false);
      }
    } catch { /* COOP blocks popup.closed — ignore */ }
  }, 300);

  setTimeout(() => {
    if (!processed) {
      clearInterval(pollTimer);
      localStorage.removeItem('google_auth_result');
      setIsLoading(false);
    }
  }, 300000);

}, [isLoading, onClose, onAuthSuccess]);
  const formProps = useMemo(() => ({
    formData, authType, isLoading, showPassword, alert,
    onInputChange: handleInputChange,
    onTogglePassword: handleTogglePassword,
    onSubmit: handleSubmit,
    onToggleAuthType: handleToggleAuthType,
  }), [formData, authType, isLoading, showPassword, alert,
      handleInputChange, handleTogglePassword, handleSubmit, handleToggleAuthType]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-lg animate-fadeIn">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => {
          const left = Math.random() * 100;
          const top = Math.random() * 100;
          const size = Math.random() * 8 + 4;
          const bg = authMode === 'client'
            ? 'linear-gradient(135deg, #10b981, #0d9488)'
            : 'linear-gradient(135deg, #3b82f6, #6366f1)';
          const delay = `${Math.random() * 5}s`;
          const duration = `${Math.random() * 10 + 10}s`;
          return (
            <div key={i} className="absolute rounded-full opacity-10 animate-float"
              style={{
                left: left + '%',
                top: top + '%',
                width: size + 'px',
                height: size + 'px',
                background: bg,
                animationDelay: delay,
                animationDuration: duration,
              }}>
            </div>
          );
        })}
      </div>

      <div ref={modalRef}
        className="relative w-full max-w-2xl max-h-[90vh] bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl shadow-black/20 animate-slideUp flex flex-col border border-white/20">
        
        <div className={`h-1.5 flex-shrink-0 ${
          authMode === 'client'
            ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500'
            : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500'
        }`} />

        <button onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2.5 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all duration-500 hover:scale-110 hover:shadow-xl shadow-lg border border-gray-200/50 flex-shrink-0"
          aria-label="Close modal">
          <X className="h-4 w-4 text-gray-600" />
        </button>

        <div className="overflow-y-auto flex-1">
          {!showDocumentUpload && (
            <div className="p-6 sm:p-8 pb-0 flex-shrink-0">
              <div className="flex bg-gray-100/80 rounded-2xl p-1 mb-6">
                {['client', 'agent'].map((mode) => (
                  <button key={mode}
                    onClick={() => handleModeSwitch(mode)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      authMode === mode
                        ? mode === 'client'
                          ? 'bg-white text-emerald-700 shadow-md shadow-emerald-500/10'
                          : 'bg-white text-blue-700 shadow-md shadow-blue-500/10'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {mode === 'client' ? '🕌 Pilgrim' : '🏢 Travel Agent'}
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <h2 className={`text-2xl font-bold ${
                  authMode === 'client' ? 'text-gray-900' : 'text-gray-900'
                }`}>
                  {authType === 'login'
                    ? `Welcome back${authMode === 'client' ? ', Pilgrim' : ''}`
                    : authMode === 'client' ? 'Begin Your Journey' : 'Register Your Agency'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {authType === 'login'
                    ? 'Sign in to continue your spiritual journey'
                    : authMode === 'client'
                    ? 'Create your account to plan your Umrah / Hajj'
                    : 'Join our network of trusted travel partners'}
                </p>
              </div>
            </div>
          )}

          <div className="p-6 sm:p-8 pt-4">
            {showDocumentUpload ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Upload Verification Documents</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Required to activate your agent account (reviewed in 24–48 hrs)
                  </p>
                </div>

                <Alert {...alert} />

                <form onSubmit={handleDocumentSubmit} className="space-y-4">
                  {[
                    { key: 'incorporation', label: 'Certificate of Incorporation', desc: 'Official company registration document', icon: <FileText className="h-5 w-5 text-blue-600" /> },
                    { key: 'tourism',       label: 'Tourism License',              desc: 'Tourism board license or permit',        icon: <Award    className="h-5 w-5 text-blue-600" /> },
                    { key: 'krapin',        label: 'Company KRAPIN',               desc: 'Tax identification number or KRAPIN certificate', icon: <Briefcase className="h-5 w-5 text-blue-600" /> },
                  ].map(({ key, label, desc, icon }) => (
                    <div key={key} className="p-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 transition-all duration-300 bg-gray-50/30">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">{icon}</div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{label}</h4>
                            <p className="text-xs text-gray-500 mt-1">{desc}</p>
                          </div>
                        </div>
                        <div className="relative ml-4 flex-shrink-0">
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(e, key)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                          <button type="button"
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                              uploadedFiles[key]
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                            }`}>
                            {uploadedFiles[key] ? 'Uploaded ✓' : 'Upload'}
                          </button>
                        </div>
                      </div>
                      {uploadedFiles[key] && (
                        <p className="text-xs text-green-600 mt-2 ml-14 truncate">{uploadedFiles[key].name}</p>
                      )}
                    </div>
                  ))}

                  <button type="submit"
                    disabled={isLoading || !uploadedFiles.incorporation || !uploadedFiles.tourism || !uploadedFiles.krapin}
                    className="relative w-full py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-500 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-500 transform hover:-translate-y-1 active:scale-[0.99] overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <span className="relative">Submit Documents for Verification</span>
                        <ChevronRight className="inline-block ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
                      </>
                    )}
                  </button>

                  <p className="text-xs text-center text-gray-500">
                    Your documents will be reviewed within 24–48 hours. You'll receive an email notification once verified.
                  </p>
                </form>
              </div>
            ) : (
              <>
                {/* Google Sign-In Button - CLIENT MODE ONLY */}
                {authMode === 'client' && (
                  <div className="space-y-4 mb-8">
                   {/* Google Sign-In Button */}
<button
  onClick={handleGoogleLogin}
  disabled={isLoading}
  id="google-signin-btn"
  className="w-full group relative px-6 py-4 bg-white border-2 border-gray-200 rounded-xl transition-all duration-500 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none">
  <div className="absolute left-6 top-1/2 transform -translate-y-1/2">
    <div className="w-6 h-6 bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#FBBC05] rounded-full flex items-center justify-center">
      <span className="text-white text-xs font-bold">G</span>
    </div>
  </div>
  <span className="text-gray-700 font-semibold">
    {isLoading ? 'Connecting...' : 'Continue with Google'}
  </span>
</button>

{/* Hidden target for Google to render its button into - we trigger the click programmatically */}
<div id="google-btn-target" className="hidden" />

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500">or continue with email</span>
                      </div>
                    </div>
                  </div>
                )}

                {authMode === 'client'
                  ? <ClientForm {...formProps} />
                  : <AgentForm {...formProps} />}
              </>
            )}
          </div>
        </div>

        {!showDocumentUpload && (
          <div className="p-6 border-t border-gray-200/50 bg-gradient-to-b from-white to-gray-50/50 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 rounded-full bg-emerald-50 border border-emerald-100 flex-shrink-0">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">Bank-level Security</div>
                  <div className="text-xs text-gray-600">256-bit SSL encryption</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                Need help?{' '}
                <button className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors duration-300">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;