'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardEntry, LeaderboardResponse } from '../wasmAbi';

interface CachedLeaderboard {
  byIntent: Record<string, LeaderboardEntry[]>;
  epoch: number | null;
}

function cacheKey(limit: number): string {
  return `telegraph_leaderboard_v1_${limit}`;
}

function readCache(limit: number): CachedLeaderboard | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(limit));
    return raw ? (JSON.parse(raw) as CachedLeaderboard) : null;
  } catch {
    return null;
  }
}

function writeCache(limit: number, data: CachedLeaderboard): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(cacheKey(limit), JSON.stringify(data));
  } catch {
    // storage full/unavailable — non-fatal, just skip caching
  }
}

export function useLeaderboard(limit = 10): {
  byIntent: Record<string, LeaderboardEntry[]>;
  epoch: number | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  // Seed empty on both server and client's first render (SSR has no localStorage) — the
  // cache is applied a moment later in an effect, after hydration, to avoid a mismatch.
  const [cached, setCached] = useState<CachedLeaderboard>({ byIntent: {}, epoch: null });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fromCache = readCache(limit);
    if (fromCache) setCached(fromCache);
  }, [limit]);

  // Always refetch in the background, even when cached data is shown immediately.
  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard/miners?limit=${limit}`);
      if (!res.ok) throw new Error(`Node returned HTTP ${res.status}`);
      const data = (await res.json()) as LeaderboardResponse;
      const fresh = { byIntent: data.intents ?? {}, epoch: data.epoch ?? null };
      setCached(fresh);
      writeCache(limit, fresh);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const hasCachedData = Object.keys(cached.byIntent).length > 0;

  return {
    byIntent: cached.byIntent,
    epoch: cached.epoch,
    isLoading: isLoading && !hasCachedData,
    error,
    refetch: fetchLeaderboard,
  };
}
