'use client';

import { useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { DIAMOND_ADDRESS, intentRegistryAbi } from '../wasmAbi';

export interface CanonicalIntent {
  name: string;
  description: string;
}

const CACHE_KEY = 'telegraph_canonical_intents_v1';

function readCache(): CanonicalIntent[] {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CanonicalIntent[]) : [];
  } catch {
    return [];
  }
}

function writeCache(intents: CanonicalIntent[]): void {
  if (typeof window === 'undefined' || intents.length === 0) return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(intents));
}

export function useCanonicalIntents(): { intents: CanonicalIntent[]; isLoading: boolean; error: Error | null } {
  const [cached, setCached] = useState<CanonicalIntent[]>(() => readCache());

  // Always fetch fresh in the background, even if we have a cached list to show immediately.
  const { data, isLoading, error } = useReadContract({
    address: DIAMOND_ADDRESS,
    abi: intentRegistryAbi,
    functionName: 'getCanonicalIntentsWithDescriptions',
    query: { enabled: !!DIAMOND_ADDRESS, staleTime: 5 * 60 * 1000 },
  });

  useEffect(() => {
    if (!data) return;
    const [names, descriptions] = data;
    const fresh = names.map((name, i) => ({ name, description: descriptions[i] ?? '' }));
    setCached(fresh);
    writeCache(fresh);
  }, [data]);

  const showLoading = isLoading && cached.length === 0;

  return { intents: cached, isLoading: showLoading, error: error as Error | null };
}
