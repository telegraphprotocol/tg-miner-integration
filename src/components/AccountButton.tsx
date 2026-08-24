'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { useSession } from '../hooks/useSession';
import Spinner from './Spinner';

export default function AccountButton() {
  const router = useRouter();
  const { user, isLoading, logout } = useSession();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  if (isLoading) {
    return (
      <button type="button" className="wallet-pill" disabled>
        <Spinner />
      </button>
    );
  }

  if (user) {
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    return (
      <div className="account-btn-wrap" ref={wrapRef}>
        <button type="button" className="wallet-pill" onClick={() => setOpen(v => !v)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="wallet-pill-label">{displayName}</span>
        </button>

        {open && (
          <div className="ext-links-dropdown account-dropdown">
            <div className="account-dropdown-email">
              {displayName !== user.email && <div className="account-dropdown-name">{displayName}</div>}
              <div>{user.email}</div>
            </div>
            <button
              type="button"
              className="ext-links-dropdown-item account-dropdown-item"
              onClick={() => { setOpen(false); router.push('/dashboard'); }}
            >
              Dashboard
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              className="ext-links-dropdown-item account-dropdown-item"
              onClick={() => { setOpen(false); router.push('/profile'); }}
            >
              Profile
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
            <div className="account-dropdown-sep" />
            <button
              type="button"
              className="ext-links-dropdown-item account-dropdown-item account-dropdown-logout"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? 'Logging out…' : 'Log Out'}
              {loggingOut ? <Spinner /> : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button type="button" className="wallet-pill wallet-pill-accent" onClick={() => router.push('/login?tab=login')}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      Login
    </button>
  );
}
