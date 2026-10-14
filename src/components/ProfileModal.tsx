'use client';

import AccountWalletCard from './AccountWalletCard';
import ProfileDetailsCard from './ProfileDetailsCard';
import CountryFlag from './CountryFlag';
import { countryName } from '../countries';
import { useSession } from '../hooks/useSession';

function initialsFor(name: string, identifier: string): string {
  if (name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return identifier.replace(/^0x/i, '').slice(0, 2).toUpperCase();
}

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user } = useSession();

  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';
  const identifier = user ? (user.email ?? user.walletAddress ?? '') : '';
  const shortIdentifier = user?.email ?? (identifier ? `${identifier.slice(0, 6)}…${identifier.slice(-4)}` : '');

  return (
    <div className="modal-bd" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel modal-profile">
        <div className="modal-header">
          <div className="modal-header-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Profile</span>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-profile-body">
          {user && (
            <div className="profile-hero">
              <div className="profile-avatar">{initialsFor(displayName, identifier)}</div>
              <div className="profile-hero-info">
                <span className="profile-hero-name">{displayName || shortIdentifier}</span>
                {displayName && <span className="profile-hero-email">{shortIdentifier}</span>}
                <div className="profile-hero-chips">
                  {user.country && (
                    <span className="profile-chip"><CountryFlag code={user.country} /> {countryName(user.country)}</span>
                  )}
                  <span className="profile-chip profile-chip-on">
                    <span className="profile-status-dot profile-status-dot-on" />
                    {user.primaryAuth === 'EMAIL' ? 'Email account' : 'Wallet account'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {user && (
            <div className="register-card register-card-full profile-card">
              <ProfileDetailsCard />
              <AccountWalletCard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
