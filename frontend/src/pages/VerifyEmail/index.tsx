import { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '@api/auth.api';
import AuthContext from '@context/index';
import logger from '@utils/logger';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        const response = await verifyEmail(token);
        setStatus('success');
        setMessage(response.message || 'Email verified successfully.');

        // If the user is already signed in (verified in the same browser they
        // registered in), flip their cached `emailVerified` flag so the gate
        // route lets them through immediately.
        if (auth?.user && auth.user.emailVerified === false) {
          setAuth({
            user: { ...auth.user, emailVerified: true },
            token: auth.token,
          });
        }
        // No auto-redirect — let the user choose when to leave the page.
        // Earlier versions bounced to "/" after 3s, which made the
        // verification tab steal focus from whatever the user was doing
        // (often still reading the success message).
      } catch (error: any) {
        logger.error('Email verification failed:', error);
        setStatus('error');
        setMessage(
          error.response?.data?.message ||
          'Verification failed. The link may be invalid or expired.'
        );
      }
    };

    verify();
  }, [token, auth, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-8 sm:p-10 text-center">
          {status === 'verifying' && (
            <>
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-stone-100">
                <div className="w-7 h-7 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
              </div>
              <h2 className="mt-6 text-xl font-semibold text-stone-900">
                Verifying your email
              </h2>
              <p className="mt-2 text-sm text-stone-500">
                One moment — confirming your link.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-100">
                <svg className="h-7 w-7 text-emerald-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-xl font-semibold text-stone-900">
                Email verified
              </h2>
              <p className="mt-2 text-sm text-stone-500 leading-relaxed">
                {message} You can close this tab or head back to MyBookClubs.
              </p>
              <div className="mt-7">
                <button
                  onClick={() => navigate('/')}
                  className="w-full px-4 py-3 text-sm font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-colors"
                >
                  Go to MyBookClubs
                </button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100">
                <svg className="h-7 w-7 text-red-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-6 text-xl font-semibold text-stone-900">
                Verification failed
              </h2>
              <p className="mt-2 text-sm text-stone-500 leading-relaxed">{message}</p>
              <div className="mt-7">
                <button
                  onClick={() => navigate(auth?.user ? '/verify-required' : '/')}
                  className="w-full px-4 py-3 text-sm font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-colors"
                >
                  {auth?.user ? 'Back to verification' : 'Go to MyBookClubs'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
