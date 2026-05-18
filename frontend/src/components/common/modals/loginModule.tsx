import { useState, useContext, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '@api/axios';
import AuthContext from '@context/index';
import { FiX, FiMail, FiLock, FiBook } from 'react-icons/fi';
import { GoogleLogin } from '@react-oauth/google';
import ForgotPasswordModal from './ForgotPasswordModal';
import logger from '@utils/logger';

const Login = ({ onClose, onSwitchToRegister }) => {
  const { setAuth } = useContext(AuthContext);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Body scroll lock + Escape close — applied while the modal is mounted.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const validate = () => {
    const errs: string[] = [];
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.push('Enter a valid email address');
    if (!formData.password || formData.password.length < 8) errs.push('Password must be at least 8 characters');
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMessage('');
    setErrors([]);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setMessage('');
    const v = validate();
    if (v.length) { setErrors(v); return; }
    setErrors([]);
    setLoading(true);
    try {
      const res = await apiClient.post('/v1/auth/login', formData);
      const responseData = res?.data?.data || res?.data;
      const accessToken = responseData?.accessToken || res?.data?.accessToken || res?.data?.token;
      const user = responseData?.user || res?.data?.user;
      if (!accessToken || !user) {
        logger.error('Missing required data');
        setErrors(['Login succeeded but received incomplete data from server']);
        return;
      }
      setAuth({ token: accessToken, user });
      onClose?.();
      if (user.emailVerified === false) {
        window.location.assign('/verify-required');
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      const respMsg = err?.response?.data?.message;
      const respErrors = err?.response?.data?.errors;
      if (respErrors && Array.isArray(respErrors)) setErrors(respErrors);
      else setErrors([respMsg || 'Login failed']);
    } finally {
      setLoading(false);
    }
  }, [formData, setAuth, onClose]);

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true); setErrors([]); setMessage('');
    try {
      const res = await apiClient.post('/v1/auth/google', { credential: credentialResponse.credential });
      const responseData = res?.data?.data || res?.data;
      const accessToken = responseData?.accessToken || res?.data?.accessToken;
      const user = responseData?.user || res?.data?.user;
      if (accessToken && user) {
        setAuth({ token: accessToken, user });
        onClose?.();
        window.location.reload();
      } else {
        setErrors(['Google login succeeded but received incomplete data from server']);
      }
    } catch (err: any) {
      setErrors([err?.response?.data?.message || 'Google authentication failed']);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    logger.error('Google Sign-In error');
    setErrors(['Google authentication failed. Please check that popups are not blocked and try again.']);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Header — brand glyph + title + close */}
        <header className="flex items-start justify-between px-6 pt-6 pb-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex w-10 h-10 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 items-center justify-center">
              <FiBook size={18} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 leading-tight">Welcome back</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Sign in to your account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-3">
          {/* Inline error banner — flat list, no preamble */}
          {errors.length > 0 && (
            <div role="alert" className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm">
              <ul className="space-y-1">
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {message && (
            <div role="status" className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email — icon inside pill input */}
            <label className="relative block cursor-text">
              <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                autoComplete="email"
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
              />
            </label>

            {/* Password */}
            <label className="relative block cursor-text">
              <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                autoComplete="current-password"
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 mt-1 text-sm font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Single compact divider */}
          <div className="relative my-5 flex items-center">
            <div className="flex-grow border-t border-stone-200 dark:border-gray-800" />
            <span className="px-3 text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500 font-medium">or</span>
            <div className="flex-grow border-t border-stone-200 dark:border-gray-800" />
          </div>

          {/* Google OAuth */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              width="100%"
            />
          </div>

          {/* Switch-to-register — inline link, not a full secondary button */}
          <p className="text-center text-sm text-stone-500 dark:text-stone-400 mt-6">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="font-semibold text-stone-900 dark:text-stone-100 hover:underline"
            >
              Create one
            </button>
          </p>
        </div>

        {/* Forgot Password Modal */}
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
        />
      </div>
    </div>,
    document.body
  );
};

export default Login;
