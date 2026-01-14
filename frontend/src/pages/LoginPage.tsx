import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../components/useToast';
import ToastContainer from '../components/ToastContainer';
import type { User } from '@booksharepdx/shared';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const navigate = useNavigate();
  const { updateCurrentUser } = useUser();
  const { showToast, toasts, dismiss } = useToast();

  const validateForm = () => {
    if (!identifier.trim()) {
      setError('Email or username is required');
      return false;
    }
    setError(undefined);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await authService.sendMagicLink(identifier);

      // Check if we got a user back (direct login in dev mode)
      if ('id' in result) {
        // Direct login - we got a user object
        updateCurrentUser(result as User);
        showToast('Login successful!', 'success', 2000);
        setTimeout(() => {
          navigate('/browse');
        }, 500);
      } else {
        // Email flow - show "check your email" message
        setLinkSent(true);
        showToast('Sign-in link sent! Check your email.', 'success');
      }
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === 'USER_NOT_FOUND') {
        setError('No account found with that email or username.');
        showToast('Account not found', 'error');
      } else if (err.code === 'ACCOUNT_BANNED') {
        showToast('Your account has been suspended. Please contact support.', 'error');
      } else if (err.code === 'NETWORK_ERROR') {
        showToast('Unable to connect to the server. Please check your connection.', 'error');
      } else {
        showToast(err.message || 'Unable to send sign-in link. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">Login to BookSharePDX</h1>

          {linkSent ? (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              <div>
                <p className="text-sm text-green-800">
                  Check your email for a sign-in link.
                </p>
                <button
                  onClick={() => {
                    setLinkSent(false);
                    setIdentifier('');
                  }}
                  className="text-sm text-green-700 underline hover:text-green-900 mt-1"
                >
                  Try a different email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                  Email or Username
                </label>
                <input
                  type="text"
                  id="identifier"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError(undefined);
                  }}
                  placeholder="you@example.com or username"
                  className={`input ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
                  disabled={loading}
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Sign-in Link'}
              </button>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
              </div>
            </div>

            <Link
              to="/signup"
              className="mt-6 block w-full text-center py-2 px-4 rounded-lg border-2 border-primary-600 text-primary-600 font-medium hover:bg-primary-50 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
