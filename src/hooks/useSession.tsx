'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, clearToken, getToken, setToken } from '../lib/api';

export interface SessionUser {
  email: string | null;
  primaryAuth: 'EMAIL' | 'WALLET';
  smartWalletAddress: string | null;
  walletAddress: string | null;
  country: string | null;
  firstName: string | null;
  lastName: string | null;
  discordUsername: string | null;
  xUsername: string | null;
  profileLocked: boolean;
}

interface SessionContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  /** Stores a fresh access token (from login/signup/SIWE) and reloads the session. */
  signIn: (accessToken: string) => Promise<void>;
  refetch: () => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiFetch('/auth/me');
      if (res.ok) {
        setUser(await res.json());
      } else {
        if (res.status === 401) clearToken();
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const signIn = useCallback(
    async (accessToken: string) => {
      setToken(accessToken);
      await fetchSession();
    },
    [fetchSession],
  );

  const logout = useCallback(async () => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, signIn, refetch: fetchSession, logout }),
    [user, isLoading, signIn, fetchSession, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
