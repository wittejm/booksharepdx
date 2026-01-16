import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services';
import { useUser } from '../contexts/UserContext';
import {
  getPendingAction,
  clearPendingAction,
  buildRedirectUrl,
  broadcastLogin,
} from '../utils/pendingAuth';

export default function VerifyMagicLinkPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateCurrentUser } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setError('No sign-in token provided. Please request a new sign-in link.');
        setVerifying(false);
        return;
      }

      try {
        const user = await authService.verifyMagicLink(token);
        updateCurrentUser(user);
        broadcastLogin(); // Notify other tabs (like the login page)

        // Check for pending action and redirect
        const pendingAction = getPendingAction();
        if (pendingAction) {
          const redirectUrl = buildRedirectUrl(pendingAction);
          clearPendingAction();
          navigate(redirectUrl);
        } else {
          navigate('/browse');
        }
      } catch (err) {
        const error = err as Error & { code?: string };
        if (error.code === 'INVALID_TOKEN') {
          setError('This sign-in link has expired or is invalid. Please request a new one.');
        } else if (error.code === 'ACCOUNT_BANNED') {
          setError('Your account has been banned. Please contact support if you believe this is an error.');
        } else {
          setError('Something went wrong. Please try again or request a new sign-in link.');
        }
        setVerifying(false);
      }
    };

    verifyToken();
  }, [searchParams, navigate, updateCurrentUser]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          {verifying ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <h1 className="text-xl font-semibold text-gray-900">Signing you in...</h1>
              <p className="text-gray-600 mt-2">Please wait while we verify your sign-in link.</p>
            </>
          ) : error ? (
            <>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Sign-in Failed</h1>
              <p className="text-gray-600 mt-2">{error}</p>
              <Link
                to="/login"
                className="btn-primary inline-block mt-6"
              >
                Go to Login
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
