// src/pages/Login.jsx
// Teacher sign-in. No public registration: accounts are created/approved by
// an administrator. Real password checking happens on the backend.
import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, Sun, Moon, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { COLLEGE_EMAIL_DOMAIN, USE_MOCK_API } from '../config/env';
import { getErrorMessage } from '../utils/errors';
import FormField from '../components/common/FormField';
import { Alert } from '../components/common/States';
import collegeLogo from '../assets/college-logo.jpeg';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email, password) {
  const errors = {};
  const e = email.trim().toLowerCase();
  if (!e) errors.email = 'Enter your college email address.';
  else if (!EMAIL_RE.test(e)) errors.email = 'Enter a valid email address.';
  else if (COLLEGE_EMAIL_DOMAIN && !e.endsWith(`@${COLLEGE_EMAIL_DOMAIN}`)) {
    errors.email = `Use your official @${COLLEGE_EMAIL_DOMAIN} email address.`;
  }
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export default function Login() {
  const { login, status } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const from = location.state?.from;
  const redirectTo = from ? `${from.pathname}${from.search || ''}` : '/dashboard';

  if (status === 'signedIn') return <Navigate to={redirectTo} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const nextErrors = validate(email, password);
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err, 'Sign in failed. Please try again.'));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gray-50 dark:bg-dark-bg">
      <div className="h-1 bg-primary" aria-hidden="true" />
      <div className="flex justify-end p-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="icon-btn"
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      <main className="flex flex-1 items-start justify-center px-4 pb-12 sm:items-center">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="rounded-lg bg-white p-2 shadow-card">
              <img src={collegeLogo} alt="College logo" className="h-16 w-auto object-contain" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              CampusCare
            </h1>
            <p className="mt-1 text-sm muted">Teacher Portal · sign in with your college account</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="card space-y-5 p-6 sm:p-8">
            {formError && <Alert type="error">{formError}</Alert>}

            <FormField id="email" label="College email" error={errors.email}>
              {(aria) => (
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={COLLEGE_EMAIL_DOMAIN ? `name@${COLLEGE_EMAIL_DOMAIN}` : 'name@college.edu'}
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  {...aria}
                />
              )}
            </FormField>

            <FormField id="password" label="Password" error={errors.password}>
              {(aria) => (
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`input pr-12 ${errors.password ? 'input-error' : ''}`}
                    {...aria}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}
            </FormField>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-center text-xs muted">
              Accounts are created by the lab administrator. If you can't sign in, contact them to activate your
              account.
            </p>
          </form>

          {USE_MOCK_API && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-xs muted dark:border-dark-border">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p>
                Demo (mock mode): <span className="font-mono">teacher@college.edu</span> /{' '}
                <span className="font-mono">password123</span>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
