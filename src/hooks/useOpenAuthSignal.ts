'use client';

import { useEffect, useRef } from 'react';

const OPEN_AUTH_EVENT = 'tg:open-auth';

export type AuthTab = 'signup' | 'login';

/** Fire this to open the shared account/login modal (the same one the navbar's Login button uses) from anywhere. */
export function emitOpenAuthSignal(tab: AuthTab = 'signup'): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AuthTab>(OPEN_AUTH_EVENT, { detail: tab }));
}

/** Subscribe to open-auth signals fired anywhere in the app. */
export function useOpenAuthSignal(onSignal: (tab: AuthTab) => void): void {
  const latest = useRef(onSignal);
  latest.current = onSignal;

  useEffect(() => {
    const handler = (e: Event) => latest.current((e as CustomEvent<AuthTab>).detail);
    window.addEventListener(OPEN_AUTH_EVENT, handler);
    return () => window.removeEventListener(OPEN_AUTH_EVENT, handler);
  }, []);
}
