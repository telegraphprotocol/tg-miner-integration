'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useToast } from './Toast';
import Spinner from './Spinner';
import AppBackground from './AppBackground';
import { useSession } from '../hooks/useSession';
import { apiPost, errorMessage } from '../lib/api';
import { validatePasswordStrength, PASSWORD_REQUIREMENTS_TEXT } from '../lib/passwordRules';
import { fireSignupConversion } from '../lib/xPixel';

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

export default function AuthPage() {
  const toast = useToast();
  const router = useRouter();
  const { signIn } = useSession();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const searchParams = useSearchParams();

  const initialTab: Tab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  const reason = searchParams.get('reason');
  const next = searchParams.get('next');

  const [tab, setTab] = useState<Tab>(initialTab);

  const goNext = () => router.push(next ? decodeURIComponent(next) : '/');

  // Signup state
  const [signupPhase, setSignupPhase] = useState<SignupPhase>('email');
  const [signupEmail, setSignupEmail] = useState('');
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
  const [walletBusy, setWalletBusy] = useState(false);

  // Forgot-password state — null means not in reset mode (showing the normal login form)
  const [resetPhase, setResetPhase] = useState<'email' | 'code' | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleRequestOtp = async () => {
    setSignupError('');
    if (!signupEmail.trim()) { setSignupError('Enter your email.'); return; }
    if (!signupPassword) { setSignupError('Choose a password.'); return; }
    const passwordError = validatePasswordStrength(signupPassword);
    if (passwordError) { setSignupError(passwordError); return; }
    setSignupBusy(true);
    try {
      const res = await apiPost('/auth/signup/email', { email: signupEmail.trim(), password: signupPassword });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setSignupError(errorMessage(data, 'Could not send code.')); return; }
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
    if (!otp.trim()) { setSignupError('Enter the verification code.'); return; }
    setSignupBusy(true);
    try {
      const res = await apiPost('/auth/signup/verify-otp', { email: signupEmail.trim(), code: otp.trim() });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setSignupError(errorMessage(data, 'Could not verify code.')); return; }
      toast.success('Account created.');
      fireSignupConversion();
      await signIn(data.accessToken);
      goNext();
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
      const res = await apiPost('/auth/login/email', { email: loginEmail.trim(), password: loginPassword });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setLoginError(errorMessage(data, 'Could not sign in.')); return; }
      toast.success('Signed in.');
      await signIn(data.accessToken);
      goNext();
    } catch {
      setLoginError('Network error. Please try again.');
    } finally {
      setLoginBusy(false);
    }
  };

  // Sign-In With Ethereum: the backend builds the message, the wallet signs it, the backend verifies it and issues the token.
  const handleWalletSignIn = async () => {
    if (!address) return;
    setLoginError('');
    setWalletBusy(true);
    try {
      const msgRes = await apiPost('/auth/wallet/message', { address });
      const msgData = await msgRes.json().catch(() => null);
      if (!msgRes.ok) { setLoginError(errorMessage(msgData, 'Could not start wallet sign-in.')); return; }

      const signature = await signMessageAsync({ message: msgData.message });

      const verifyRes = await apiPost('/auth/wallet/verify', { message: msgData.message, signature, nonceId: msgData.nonceId });
      const verifyData = await verifyRes.json().catch(() => null);
      if (!verifyRes.ok) { setLoginError(errorMessage(verifyData, 'Could not verify signature.')); return; }

      toast.success('Signed in with wallet.');
      await signIn(verifyData.accessToken);
      goNext();
    } catch {
      setLoginError('Wallet sign-in cancelled or failed.');
    } finally {
      setWalletBusy(false);
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
      const res = await apiPost('/auth/password/forgot', { email: resetEmail.trim() });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setResetError(errorMessage(data, 'Could not send code.')); return; }
      setResetPhase('code');
      toast.success('If that email has an account, a reset code is on its way.');
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
      const res = await apiPost('/auth/password/reset', { email: resetEmail.trim(), code: resetOtp.trim(), newPassword: resetPassword });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setResetError(errorMessage(data, 'Could not reset password.')); return; }
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

  return (
    <div className="auth-page">
      <AppBackground />
      <button type="button" className="auth-page-logo" onClick={() => router.push('/')}>
        <img src="/logo.png" alt="Telegraph" className="lv2-logo-img" />
        <span className="lv2-logo-text">TELEGRAPH</span>
      </button>

      <div className="auth-page-panel modal-panel modal-auth">
        <div className="modal-header">
          <div className="modal-header-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{tab === 'signup' ? 'Create Account' : 'Sign In'}</span>
          </div>
        </div>

        {reason && <p className="required-profile-banner">{reason}</p>}

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
                  Enter the code sent to <span className="result-mono">{signupEmail}</span> to finish creating your account.
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
              onChange={e => setLoginEmail(e.target.value)}
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
            </div>

            <div style={{ textAlign: 'center', margin: '18px 0 10px', opacity: 0.5, fontSize: 12 }}>or</div>
            {!isConnected ? (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button type="button" className="btn-ghost btn-full" onClick={openConnectModal}>
                    Connect a wallet to sign in
                  </button>
                )}
              </ConnectButton.Custom>
            ) : (
              <button
                type="button"
                className={`btn-ghost btn-full ${walletBusy ? 'btn-loading' : ''}`}
                onClick={handleWalletSignIn}
                disabled={walletBusy}
              >
                {walletBusy ? <><Spinner /> Waiting for signature…</> : `Sign in with ${address?.slice(0, 6)}…${address?.slice(-4)}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
