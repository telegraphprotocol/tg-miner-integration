'use client';

import type { ReactNode } from 'react';
import NextTopLoader from 'nextjs-toploader';
import { ToastProvider } from './Toast';
import { SessionProvider } from '../hooks/useSession';
import SignupNudge from './SignupNudge';
import RequiredProfileModal from './RequiredProfileModal';

/**
 * Mounted once in app/layout.tsx so every route shares one session fetch,
 * one toast stack, and the same global nudge/required-profile UI —
 * previously these only existed inside the single-page App() component.
 */
export default function GlobalProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <NextTopLoader color="#ffffff" showSpinner={false} height={2} shadow="0 0 10px rgba(255,255,255,0.5)" />
        {children}
        <SignupNudge />
        <RequiredProfileModal />
      </ToastProvider>
    </SessionProvider>
  );
}
