import { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiRefreshCw, FiLogOut, FiCheckCircle } from 'react-icons/fi';
import AuthContext from '@context/index';
import apiClient from '@api/axios';
import { resendVerification } from '@api/auth.api';
import { useToast } from '@hooks/useUIFeedback';
import logger from '@utils/logger';

const RESEND_COOLDOWN_MS = 60_000;

/**
 * Full-screen gate shown to authenticated users whose email is not yet
 * verified. Polls the profile endpoint every 5s so the page flips to the
 * app the moment the user clicks the link in their inbox — no manual reload.
 *
 * Three actions:
 *   - "Resend email"     — re-triggers the verification mail (60s cooldown)
 *   - "I've verified"    — manual refetch of the profile
 *   - "Sign out"         — for users who registered with the wrong email
 */
const VerifyRequired = () => {
  const { auth, setAuth, logout } = useContext(AuthContext);
  const { toastSuccess, toastError } = useToast();
  const navigate = useNavigate();

  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastResendAt, setLastResendAt] = useState<number | null>(null);

  // If the gate page mounts without a logged-in user, kick them home.
  useEffect(() => {
    if (!auth?.user) navigate('/', { replace: true });
  }, [auth?.user, navigate]);

  // Poll the profile endpoint so we notice the moment the user verifies in
  // another tab. Runs every 5s while the gate is mounted.
  const checkVerification = useCallback(async () => {
    if (!auth?.user?.id) return;
    try {
      const { data } = await apiClient.get(`/v1/profile/${auth.user.id}`);
      const profile = data?.success ? data.data : data;
      if (profile?.emailVerified) {
        setAuth({
          user: { ...auth.user, emailVerified: true },
          token: auth.token,
        });
        toastSuccess('Email verified! Welcome aboard.');
        navigate('/', { replace: true });
      }
    } catch (err) {
      logger.warn('Verification poll failed:', err);
    }
  }, [auth, setAuth, navigate, toastSuccess]);

  useEffect(() => {
    const id = setInterval(checkVerification, 5_000);
    return () => clearInterval(id);
  }, [checkVerification]);

  if (!auth?.user) return null;

  const cooldownRemaining = lastResendAt
    ? Math.max(0, Math.ceil((lastResendAt + RESEND_COOLDOWN_MS - Date.now()) / 1000))
    : 0;

  const handleResend = async () => {
    if (cooldownRemaining > 0) return;
    setResending(true);
    try {
      await resendVerification(auth.user.email);
      setLastResendAt(Date.now());
      toastSuccess('Verification email sent. Check your inbox (and spam folder).');
    } catch (err) {
      logger.error('Resend verification failed:', err);
      toastError('Could not resend verification email. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  const handleManualCheck = async () => {
    setChecking(true);
    await checkVerification();
    setChecking(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/5 p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-5">
          <FiMail className="text-amber-600 dark:text-amber-400" size={28} />
        </div>

        <h1 className="text-2xl font-display font-bold text-stone-800 dark:text-stone-100 mb-2">
          Verify your email
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-1">
          We sent a verification link to
        </p>
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-6 break-all">
          {auth.user.email}
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-500 mb-6 leading-relaxed">
          Click the link in that email to unlock your account. Don&apos;t see it?
          Check your spam folder, or use Resend below.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleManualCheck}
            disabled={checking}
            className="w-full px-4 py-2.5 bg-stone-800 hover:bg-stone-900 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <FiCheckCircle size={16} />
            {checking ? 'Checking…' : "I've verified — check now"}
          </button>

          <button
            onClick={handleResend}
            disabled={resending || cooldownRemaining > 0}
            className="w-full px-4 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-stone-700 dark:text-stone-200 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FiRefreshCw size={16} className={resending ? 'animate-spin' : ''} />
            {resending
              ? 'Sending…'
              : cooldownRemaining > 0
                ? `Resend available in ${cooldownRemaining}s`
                : 'Resend verification email'}
          </button>

          <button
            onClick={() => { logout(); navigate('/', { replace: true }); }}
            className="w-full px-4 py-2 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-sm transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <FiLogOut size={14} />
            Wrong email? Sign out
          </button>
        </div>

        <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-6">
          This page auto-refreshes every 5 seconds.
        </p>
      </div>
    </div>
  );
};

export default VerifyRequired;
