'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import AuthModal from './AuthModal';
import ProfileModal from './ProfileModal';

interface OpenLoginOptions {
  tab?: 'login' | 'signup';
  /** Banner shown above the form explaining why sign-in is needed. */
  reason?: string;
  /** Runs after a successful sign-in/sign-up. */
  onSuccess?: () => void;
  /** Runs when the modal is dismissed without signing in. */
  onClose?: () => void;
}

interface AuthModalContextValue {
  openLogin: (opts?: OpenLoginOptions) => void;
  openProfile: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [login, setLogin] = useState<OpenLoginOptions | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const openLogin = useCallback((opts: OpenLoginOptions = {}) => setLogin(opts), []);
  const openProfile = useCallback(() => setProfileOpen(true), []);
  const value = useMemo(() => ({ openLogin, openProfile }), [openLogin, openProfile]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {login && (
        <AuthModal
          initialTab={login.tab ?? 'login'}
          reason={login.reason}
          onClose={() => {
            const dismissed = login.onClose;
            setLogin(null);
            dismissed?.();
          }}
          onSuccess={() => {
            const done = login.onSuccess;
            setLogin(null);
            done?.();
          }}
        />
      )}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within an AuthModalProvider');
  return ctx;
}
