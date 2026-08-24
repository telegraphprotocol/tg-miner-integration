'use client';

import { useEffect, useState } from 'react';

/** Best-effort IP-based country guess to prefill (not lock) the country selector. */
export function useGeoCountryGuess(): string | null {
  const [guess, setGuess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/geo')
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (!cancelled && data?.country) setGuess(data.country); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return guess;
}
