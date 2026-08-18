'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from './Toast';
import Spinner from './Spinner';
import { validatePasswordStrength, PASSWORD_REQUIREMENTS_TEXT } from '../lib/passwordRules';
import { fireSignupConversion } from '../lib/xPixel';

interface Props {
  onClose: () => void;
  onAuthed: () => void;
  /** 'dropdown' anchors under the trigger (e.g. the navbar Login button) instead of a full-screen centered modal. */
  variant?: 'modal' | 'dropdown';
  defaultTab?: Tab;
}

type Tab = 'signup' | 'login';
type SignupPhase = 'email' | 'code';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.9 19.9 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a19.9 19.9 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function AuthModal({ onClose, onAuthed, variant = 'modal', defaultTab = 'signup' }: Props) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>(defaultTab);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== 'dropdown') return;
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  // Signup state
  const [signupPhase, setSignupPhase] = useState<SignupPhase>('email');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupToken, setSignupToken] = useState('');
  const [otp, setOtp] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupBusy, setSignupBusy] = useState(false);
  const [signupError, setSignupError] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [magicBusy, setMagicBusy] = useState(false);

  // Forgot-password state — null means not in reset mode (showing the normal login form)
  const [resetPhase, setResetPhase] = useState<'email' | 'code' | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleRequestOtp = async () => {
    setSignupError('');
    if (!signupEmail.trim()) { setSignupError('Enter your email.'); return; }
    setSignupBusy(true);
    try {
      const res = await fetch('/api/auth/signup/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setSignupError(data.error || 'Could not send code.'); return; }
      setSignupToken(data.token);
      setSignupPhase('code');
      toast.success('Verification code sent — check your inbox.');
    } catch {
      setSignupError('Network error. Please try again.');
    } finally {
      setSignupBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    setSignupError('');
    if (!otp.trim() || !signupPassword) { setSignupError('Enter the code and a password.'); return; }
    const passwordError = validatePasswordStrength(signupPassword);
    if (passwordError) { setSignupError(passwordError); return; }
    setSignupBusy(true);
    try {
      const res = await fetch('/api/auth/signup/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: signupToken, otp: otp.trim(), password: signupPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setSignupError(data.error || 'Could not verify code.'); return; }
      toast.success('Account created.');
      fireSignupConversion();
      onAuthed();
    } catch {
      setSignupError('Network error. Please try again.');
    } finally {
      setSignupBusy(false);
    }
  };

  const handleLogin = async () => {
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword) { setLoginError('Enter your email and password.'); return; }
    setLoginBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || 'Could not sign in.'); return; }
      toast.success('Signed in.');
      onAuthed();
    } catch {
      setLoginError('Network error. Please try again.');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleMagicLink = async () => {
    setLoginError('');
    if (!loginEmail.trim()) { setLoginError('Enter your email first.'); return; }
    setMagicBusy(true);
    try {
      const res = await fetch('/api/auth/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || 'Could not send link. Please try again.');
        return;
      }
      setMagicSent(true);
    } catch {
      setLoginError('Network error. Please try again.');
    } finally {
      setMagicBusy(false);
    }
  };

  const openForgotPassword = () => {
    setResetError('');
    setResetEmail(loginEmail);
    setResetPhase('email');
  };

  const handleRequestReset = async () => {
    setResetError('');
    if (!resetEmail.trim()) { setResetError('Enter your email.'); return; }
    setResetBusy(true);
    try {
      const res = await fetch('/api/auth/password-reset/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setResetError(data.error || 'Could not send code.'); return; }
      setResetToken(data.token);
      setResetPhase('code');
      toast.success('Reset code sent — check your inbox.');
    } catch {
      setResetError('Network error. Please try again.');
    } finally {
      setResetBusy(false);
    }
  };

  const handleVerifyReset = async () => {
    setResetError('');
    if (!resetOtp.trim() || !resetPassword) { setResetError('Enter the code and a new password.'); return; }
    const passwordError = validatePasswordStrength(resetPassword);
    if (passwordError) { setResetError(passwordError); return; }
    setResetBusy(true);
    try {
      const res = await fetch('/api/auth/password-reset/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, otp: resetOtp.trim(), password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setResetError(data.error || 'Could not reset password.'); return; }
      toast.success('Password reset — sign in with your new password.');
      setResetPhase(null);
      setLoginEmail(resetEmail);
      setLoginPassword('');
      setResetOtp('');
      setResetPassword('');
    } catch {
      setResetError('Network error. Please try again.');
    } finally {
      setResetBusy(false);
    }
  };

  const panel = (
    <div className={`modal-panel modal-auth ${variant === 'dropdown' ? 'auth-dropdown-panel' : ''}`} ref={panelRef}>
        <div className="modal-header">
          <div className="modal-header-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{tab === 'signup' ? 'Create Account' : 'Sign In'}</span>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="sub-tabs" style={{ marginBottom: 20 }}>
          <button
            type="button"
            className={`sub-tab ${tab === 'login' ? 'sub-tab-active' : ''}`}
            onClick={() => setTab('login')}
          >
            Log In
          </button>
          <button
            type="button"
            className={`sub-tab ${tab === 'signup' ? 'sub-tab-active' : ''}`}
            onClick={() => setTab('signup')}
          >
            Sign Up
          </button>
        </div>

        {tab === 'signup' ? (
          <div className="field-group">
            {signupPhase === 'email' ? (
              <>
                <label className="field-label">Email</label>
                <input
                  className="field-input"
                  type="email"
                  placeholder="you@example.com"
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                  autoFocus
                />
                {signupError && <p className="field-error">{signupError}</p>}
                <button
                  type="button"
                  className={`btn-fill btn-full ${signupBusy ? 'btn-loading' : ''}`}
                  onClick={handleRequestOtp}
                  disabled={signupBusy}
                  style={{ marginTop: 8 }}
                >
                  {signupBusy ? <><Spinner /> Sending…</> : 'Send verification code'}
                </button>
              </>
            ) : (
              <>
                <p className="field-hint" style={{ marginBottom: 12 }}>
                  Enter the code sent to <span className="result-mono">{signupEmail}</span> and choose a password.
                </p>
                <label className="field-label">Verification code</label>
                <input
                  className="field-input field-mono"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  autoFocus
                />
                <label className="field-label" style={{ marginTop: 12 }}>Password</label>
                <div className="field-password-wrap">
                  <input
                    className="field-input"
                    type={showSignupPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="field-password-toggle"
                    onClick={() => setShowSignupPassword(v => !v)}
                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    <EyeIcon open={showSignupPassword} />
                  </button>
                </div>
                <p className="field-hint" style={{ marginTop: 4 }}>{PASSWORD_REQUIREMENTS_TEXT}</p>
                {signupError && <p className="field-error">{signupError}</p>}
                <button
                  type="button"
                  className={`btn-fill btn-full ${signupBusy ? 'btn-loading' : ''}`}
                  onClick={handleVerifyOtp}
                  disabled={signupBusy}
                  style={{ marginTop: 8 }}
                >
                  {signupBusy ? <><Spinner /> Verifying…</> : 'Create account'}
                </button>
                <button
                  type="button"
                  className="inline-link-btn"
                  style={{ marginTop: 10 }}
                  onClick={() => { setSignupPhase('email'); setOtp(''); }}
                >
                  Use a different email
                </button>
              </>
            )}
          </div>
        ) : resetPhase === 'email' ? (
          <div className="field-group">
            <p className="field-hint" style={{ marginBottom: 12 }}>
              Enter your email and we'll send you a code to reset your password.
            </p>
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              placeholder="you@example.com"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              autoFocus
            />
            {resetError && <p className="field-error">{resetError}</p>}
            <button
              type="button"
              className={`btn-fill btn-full ${resetBusy ? 'btn-loading' : ''}`}
              onClick={handleRequestReset}
              disabled={resetBusy}
              style={{ marginTop: 8 }}
            >
              {resetBusy ? <><Spinner /> Sending…</> : 'Send reset code'}
            </button>
            <button
              type="button"
              className="inline-link-btn"
              style={{ marginTop: 10 }}
              onClick={() => setResetPhase(null)}
            >
              Back to login
            </button>
          </div>
        ) : resetPhase === 'code' ? (
          <div className="field-group">
            <p className="field-hint" style={{ marginBottom: 12 }}>
              Enter the code sent to <span className="result-mono">{resetEmail}</span> and choose a new password.
            </p>
            <label className="field-label">Reset code</label>
            <input
              className="field-input field-mono"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={resetOtp}
              onChange={e => setResetOtp(e.target.value)}
              autoFocus
            />
            <label className="field-label" style={{ marginTop: 12 }}>New password</label>
            <div className="field-password-wrap">
              <input
                className="field-input"
                type={showResetPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
              />
              <button
                type="button"
                className="field-password-toggle"
                onClick={() => setShowResetPassword(v => !v)}
                aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <EyeIcon open={showResetPassword} />
              </button>
            </div>
            <p className="field-hint" style={{ marginTop: 4 }}>{PASSWORD_REQUIREMENTS_TEXT}</p>
            {resetError && <p className="field-error">{resetError}</p>}
            <button
              type="button"
              className={`btn-fill btn-full ${resetBusy ? 'btn-loading' : ''}`}
              onClick={handleVerifyReset}
              disabled={resetBusy}
              style={{ marginTop: 8 }}
            >
              {resetBusy ? <><Spinner /> Resetting…</> : 'Reset password'}
            </button>
            <button
              type="button"
              className="inline-link-btn"
              style={{ marginTop: 10 }}
              onClick={() => { setResetPhase('email'); setResetOtp(''); }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="field-group">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              placeholder="you@example.com"
              value={loginEmail}
              onChange={e => { setLoginEmail(e.target.value); setMagicSent(false); }}
              autoFocus
            />
            <label className="field-label" style={{ marginTop: 12 }}>Password</label>
            <div className="field-password-wrap">
              <input
                className="field-input"
                type={showLoginPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button
                type="button"
                className="field-password-toggle"
                onClick={() => setShowLoginPassword(v => !v)}
                aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <EyeIcon open={showLoginPassword} />
              </button>
            </div>
            {loginError && <p className="field-error">{loginError}</p>}
            <button
              type="button"
              className={`btn-fill btn-full ${loginBusy ? 'btn-loading' : ''}`}
              onClick={handleLogin}
              disabled={loginBusy}
              style={{ marginTop: 8 }}
            >
              {loginBusy ? <><Spinner /> Signing in…</> : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" className="inline-link-btn" onClick={openForgotPassword}>
                Forgot password?
              </button>
              {magicSent ? (
                <p className="field-hint">Check <span className="result-mono">{loginEmail}</span> for a sign-in link.</p>
              ) : (
                <button type="button" className="inline-link-btn" onClick={handleMagicLink} disabled={magicBusy}>
                  {magicBusy ? <><Spinner /> Sending…</> : 'Email me a magic link instead'}
                </button>
              )}
            </div>
          </div>
        )}
    </div>
  );

  if (variant === 'dropdown') return panel;

  return (
    <div className="modal-bd" onClick={e => e.target === e.currentTarget && onClose()}>
      {panel}
    </div>
  );
}
