'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardEntry, LeaderboardResponse } from '../wasmAbi';

export function useLeaderboard(limit = 10): {
  byIntent: Record<string, LeaderboardEntry[]>;
  epoch: number | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [byIntent, setByIntent] = useState<Record<string, LeaderboardEntry[]>>({});
  const [epoch, setEpoch] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard/miners?limit=${limit}`);
      if (!res.ok) throw new Error(`Node returned HTTP ${res.status}`);
      const data = (await res.json()) as LeaderboardResponse;
      setByIntent(data.intents ?? {});
      setEpoch(data.epoch ?? null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { byIntent, epoch, isLoading, error, refetch: fetchLeaderboard };
}
