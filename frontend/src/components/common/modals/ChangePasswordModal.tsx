import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiLock, FiCheck } from 'react-icons/fi';
import { authAPI } from '@api/index';
import logger from '@utils/logger';

/**
 * Per-rule password validation. Mirrors the backend regex exactly:
 *   ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$
 *
 * Splitting it into 5 rules + a "no disallowed characters" check lets us
 * surface WHICH rule failed in real time, instead of relying on the
 * backend's generic "must contain uppercase, lowercase, number…" error
 * that fires even when the actual problem is, say, a `.` in the password
 * (outside the allowed character set). That misleading error was the
 * source of the "number-not-detected" complaint.
 */
const ALLOWED_CHARS = /^[A-Za-z\d@$!%*?&#]*$/;

const PASSWORD_RULES: Array<{ label: string; test: (s: string) => boolean }> = [
  { label: '8+ characters',           test: (s) => s.length >= 8 },
  { label: 'Uppercase letter',        test: (s) => /[A-Z]/.test(s) },
  { label: 'Lowercase letter',        test: (s) => /[a-z]/.test(s) },
  { label: 'Number',                  test: (s) => /[0-9]/.test(s) },
  { label: 'Special char (@$!%*?&#)', test: (s) => /[@$!%*?&#]/.test(s) },
];

const ChangePasswordModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Body scroll lock + Escape close.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Live rule state — drives chips AND submit validation in one place.
  const ruleStates = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(newPassword) })),
    [newPassword],
  );
  const hasDisallowedChars = newPassword.length > 0 && !ALLOWED_CHARS.test(newPassword);
  const allRulesPass = ruleStates.every((r) => r.ok) && !hasDisallowedChars;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const differentFromCurrent = currentPassword.length > 0 && newPassword.length > 0 && currentPassword !== newPassword;

  const canSubmit = allRulesPass && passwordsMatch && differentFromCurrent && !loading;

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');

    if (!allRulesPass) return setError('Password does not meet all requirements');
    if (hasDisallowedChars) return setError('Password contains characters not in the allowed set');
    if (!passwordsMatch) return setError('New passwords do not match');
    if (!differentFromCurrent) return setError('New password must be different from current password');

    setLoading(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        localStorage.removeItem('auth');
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      logger.error('Change password error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to change password';
      if (errorMessage.includes('OAuth') || errorMessage.includes('Google')) {
        setError('You signed in with Google. Password changes are not available for OAuth accounts.');
      } else if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [allRulesPass, hasDisallowedChars, passwordsMatch, differentFromCurrent, currentPassword, newPassword]);

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Change password"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-2 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Change password</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Pick something strong — you'll be signed out and need to log in again.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 -mr-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-3">
          {success ? (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 mb-4">
                <FiCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
              </div>
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">Password changed</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Redirecting to login…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Current password */}
              <label className="relative block cursor-text">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
                />
              </label>

              {/* New password */}
              <label className="relative block cursor-text">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  required
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
                />
              </label>

              {/* Live password requirement chips — same pattern as RegisterModule.
                  Only renders when the user starts typing so the modal isn't
                  busy on first open. */}
              {newPassword.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {ruleStates.map((r) => (
                    <span
                      key={r.label}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                        r.ok
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-stone-100 text-stone-500 dark:bg-gray-800 dark:text-stone-400'
                      }`}
                    >
                      {r.ok && <FiCheck size={11} />}
                      {r.label}
                    </span>
                  ))}
                  {/* Disallowed-char warning chip — only shown when violated.
                      This is the most common silent-fail with the old version:
                      user types `.` or `_`, regex rejects on backend, error
                      mentions "missing number" because the catch-all message
                      lists all four classes. */}
                  {hasDisallowedChars && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                      Contains disallowed characters
                    </span>
                  )}
                </div>
              )}

              {/* Confirm */}
              <label className="relative block cursor-text">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
                />
              </label>

              {/* Real-time match / "different from current" feedback */}
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-600 dark:text-red-400">Passwords don't match</p>
              )}
              {currentPassword.length > 0 && newPassword.length > 0 && !differentFromCurrent && (
                <p className="text-xs text-red-600 dark:text-red-400">New password must be different from current</p>
              )}

              {error && (
                <div role="alert" className="mt-1 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex-1 px-4 py-3 text-sm font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {loading && <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />}
                  {loading ? 'Changing…' : 'Change password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ChangePasswordModal;
