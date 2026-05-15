import { useContext, useState } from 'react';
import { FiMail, FiX } from 'react-icons/fi';
import AuthContext from '@context/index';
import { resendVerification } from '@api/auth.api';
import { useToast } from '@hooks/useUIFeedback';
import logger from '@utils/logger';

const DISMISS_KEY = 'emailVerifyDismissedAt';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24h cooldown after dismiss

/**
 * Yellow banner shown to authenticated users whose email is unverified.
 *
 * Encourages them to confirm via the link we already emailed at registration
 * and offers a one-click resend. Hidden if the user dismisses (24h) or once
 * `emailVerified` flips to true. Verification is non-blocking — features stay
 * usable — but the nudge gets people to confirm before account-recovery flows
 * (password reset etc.) actually need that email to be valid.
 */
const EmailVerificationBanner = () => {
  const { auth } = useContext(AuthContext);
  const { toastSuccess, toastError } = useToast();
  const [resending, setResending] = useState(false);

  const dismissed = (() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      return Date.now() - parseInt(raw, 10) < DISMISS_DURATION_MS;
    } catch {
      return false;
    }
  })();

  // Bail early if not signed in, already verified, or dismissed recently.
  if (!auth?.user || auth.user.emailVerified || dismissed) return null;

  const handleResend = async () => {
    if (!auth.user.email) return;
    setResending(true);
    try {
      await resendVerification(auth.user.email);
      toastSuccess('Verification email sent. Check your inbox.');
    } catch (err) {
      logger.error('Failed to resend verification email:', err);
      toastError('Could not resend verification email. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* storage disabled */ }
    // Force a re-render via location reload of just this component? Easier to
    // hide via state, but parent re-renders will bring us back. The 24h
    // localStorage check on next render is what actually keeps it dismissed.
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div
      role="alert"
      className="w-full bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-3 text-amber-900 dark:text-amber-200"
    >
      <FiMail className="flex-shrink-0" size={16} />
      <p className="text-sm flex-1 min-w-0">
        Please verify your email address (<span className="font-medium">{auth.user.email}</span>) to secure your account.
      </p>
      <button
        onClick={handleResend}
        disabled={resending}
        className="text-sm font-semibold px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0"
      >
        {resending ? 'Sending…' : 'Resend email'}
      </button>
      <button
        onClick={handleDismiss}
        className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <FiX size={16} />
      </button>
    </div>
  );
};

export default EmailVerificationBanner;
