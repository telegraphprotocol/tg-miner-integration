'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface SessionUser {
  email: string;
  walletAddresses: string[];
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
  refetch: () => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        setUser(await res.json());
      } else {
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

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, isLoading, refetch: fetchSession, logout }), [user, isLoading, fetchSession, logout]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
