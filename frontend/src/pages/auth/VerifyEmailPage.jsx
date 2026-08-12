import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }
    api.get(`/auth/verify-email/${token}`)
      .then(() => {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Invalid or expired verification link.');
      });
  }, [token]);

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800" />
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700 max-w-md w-full p-8 text-center relative">
        {status === 'loading' && (
          <>
            <Loader className="w-16 h-16 text-green-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verifying Your Email...</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link to="/dashboard" className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg font-medium inline-block">
              Go to Dashboard
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-red-600 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link to="/login" className="text-green-700 hover:underline font-medium">
              Go to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
