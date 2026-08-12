'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  LeaderboardByIntentResponse,
  LeaderboardEntry,
  LeaderboardResponse,
} from '../wasmAbi';

export function useLeaderboard(limit = 10): {
  entries: LeaderboardEntry[];
  byIntent: Record<string, LeaderboardEntry[]>;
  epochStart: number | null;
  epochEnd: number | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [byIntent, setByIntent] = useState<Record<string, LeaderboardEntry[]>>({});
  const [epochStart, setEpochStart] = useState<number | null>(null);
  const [epochEnd, setEpochEnd] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overallRes, byIntentRes] = await Promise.all([
        fetch(`/api/leaderboard/miners?limit=${limit}`),
        fetch(`/api/leaderboard/miners/by-intent?limit=${limit}`),
      ]);
      if (!overallRes.ok) throw new Error(`Node returned HTTP ${overallRes.status}`);
      const overall = (await overallRes.json()) as LeaderboardResponse;
      setEntries(overall.entries ?? []);
      setEpochStart(overall.epoch_start ?? null);
      setEpochEnd(overall.epoch_end ?? null);

      if (byIntentRes.ok) {
        const byIntentData = (await byIntentRes.json()) as LeaderboardByIntentResponse;
        setByIntent(byIntentData.intents ?? {});
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { entries, byIntent, epochStart, epochEnd, isLoading, error, refetch: fetchLeaderboard };
}
