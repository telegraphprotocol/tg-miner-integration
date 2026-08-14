'use client';

import { useCallback, useEffect, useState } from 'react';

export interface SessionUser {
  email: string;
  walletAddress: string | null;
  walletUnlinkCooldownUntil: string | null;
  firstName: string | null;
  lastName: string | null;
  discordUsername: string | null;
  xUsername: string | null;
  profileLocked: boolean;
}

export function useSession(): {
  user: SessionUser | null;
  isLoading: boolean;
  refetch: () => void;
  logout: () => Promise<void>;
} {
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

  return { user, isLoading, refetch: fetchSession, logout };
}
