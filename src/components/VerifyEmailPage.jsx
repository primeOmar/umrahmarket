import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { verifyEmail } from '../api';

// Route this at /verify-email (already referenced by the confirmation
// email link and by AuthModal's post-registration copy).
const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return; // StrictMode double-invoke guard
    ranOnce.current = true;

    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }

    verifyEmail(token)
      .then((res) => {
        if (res.success) {
          setStatus('success');
          setMessage(res.message || 'Your email has been verified.');
        } else {
          setStatus('error');
          setMessage(res.error || 'This verification link is invalid or has expired.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong while verifying your email. Please try again.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-5">
          {status === 'verifying' && <Loader2 className="h-7 w-7 text-white animate-spin" />}
          {status === 'success' && <CheckCircle2 className="h-7 w-7 text-white" />}
          {status === 'error' && <XCircle className="h-7 w-7 text-white" />}
        </div>

        {status === 'verifying' && (
          <>
            <h1 className="text-lg font-bold text-gray-900 mb-1">Confirming your email…</h1>
            <p className="text-sm text-gray-500">This will just take a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="text-lg font-bold text-gray-900 mb-1">Email confirmed</h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Continue to UmrahMarket
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-lg font-bold text-gray-900 mb-1">Couldn't confirm email</h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Mail className="h-4 w-4" /> Back to UmrahMarket
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;