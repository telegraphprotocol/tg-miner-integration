'use client';

import { useEffect, useRef } from 'react';

const INTENT_SIGNAL_EVENT = 'tg:intent-signal';

/** Fire this from any "about to convert" click — Connect Wallet, a register/consume card, etc. */
export function emitIntentSignal(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(INTENT_SIGNAL_EVENT));
}

/** Subscribe to intent signals fired anywhere in the app. */
export function useIntentSignal(onSignal: () => void): void {
  const latest = useRef(onSignal);
  latest.current = onSignal;

  useEffect(() => {
    const handler = () => latest.current();
    window.addEventListener(INTENT_SIGNAL_EVENT, handler);
    return () => window.removeEventListener(INTENT_SIGNAL_EVENT, handler);
  }, []);
}
