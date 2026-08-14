'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from '../hooks/useSession';
import { useIntentSignal } from '../hooks/useIntentSignal';
import AuthModal from './AuthModal';

const FIRST_DELAY_MS = 25_000;
const REPEAT_GAPS_MS = [60_000, 120_000, 240_000, 300_000];
const MAX_SHOWS = 5;
const COUNT_KEY = 'tg_nudge_shows';

function readShowCount(): number {
  try {
    return Number(sessionStorage.getItem(COUNT_KEY) ?? '0');
  } catch {
    return 0;
  }
}

function writeShowCount(n: number): void {
  try {
    sessionStorage.setItem(COUNT_KEY, String(n));
  } catch {
    // ignore
  }
}

export default function SignupNudge() {
  const { user, isLoading, refetch } = useSession();
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const showCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const scheduleNext = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (showCountRef.current >= MAX_SHOWS) return;
    const gap = REPEAT_GAPS_MS[Math.min(showCountRef.current - 1, REPEAT_GAPS_MS.length - 1)] ?? REPEAT_GAPS_MS[REPEAT_GAPS_MS.length - 1];
    timerRef.current = setTimeout(() => show(), gap);
  };

  const show = () => {
    if (showCountRef.current >= MAX_SHOWS) return;
    showCountRef.current += 1;
    writeShowCount(showCountRef.current);
    setVisible(true);
  };

  const dismiss = (opts?: { convert?: boolean }) => {
    setVisible(false);
    if (opts?.convert) setModalOpen(true);
    scheduleNext();
  };

  // First appearance, and the escalating auto-repeat chain.
  useEffect(() => {
    if (isLoading || user) return;
    showCountRef.current = readShowCount();
    if (showCountRef.current >= MAX_SHOWS) return;

    timerRef.current = setTimeout(() => show(), FIRST_DELAY_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  // "About to convert" moments (Connect Wallet, a register/consume card, …) surface it immediately.
  useIntentSignal(() => {
    if (user || visible) return;
    show();
  });

  // Dismiss on a click ANYWHERE — inside the card converts (opens sign-up), outside just dismisses.
  // Never blocks the click's own effect on whatever it actually hit.
  useEffect(() => {
    if (!visible) return;
    const handleClick = (e: MouseEvent) => {
      const insideCard = !!cardRef.current && cardRef.current.contains(e.target as Node);
      dismiss({ convert: insideCard });
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (user) return null;

  return (
    <>
      {visible && (
        <div className="signup-nudge" ref={cardRef}>
          <svg className="signup-nudge-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 21h8" />
            <path d="M12 17v4" />
            <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
            <path d="M17 5h2a2 2 0 0 1 2 2 4 4 0 0 1-4 4" />
            <path d="M7 5H5a2 2 0 0 0-2 2 4 4 0 0 0 4 4" />
          </svg>
          <div className="signup-nudge-text">
            <span className="signup-nudge-title">Save your rank</span>
            <span className="signup-nudge-sub">Sign up free — 2 minutes →</span>
          </div>
        </div>
      )}
      {modalOpen && (
        <AuthModal
          onClose={() => setModalOpen(false)}
          onAuthed={() => { setModalOpen(false); refetch(); }}
        />
      )}
    </>
  );
}
