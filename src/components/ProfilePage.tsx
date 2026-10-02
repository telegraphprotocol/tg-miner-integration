'use client';

import { useRouter } from 'nextjs-toploader/app';
import AppBackground from './AppBackground';
import Header from './Header';
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

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useSession();

  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';
  const identifier = user ? (user.email ?? user.walletAddress ?? '') : '';
  const shortIdentifier = user?.email ?? (identifier ? `${identifier.slice(0, 6)}…${identifier.slice(-4)}` : '');

  return (
    <div className="app">
      <AppBackground />
      <Header onBack={() => router.push('/')} />
      <div className="app-body">
        <div className="dashboard-body">
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

          {!user && (
            <div className="step-section-heading">
              <div className="step-eyebrow">YOUR PROFILE</div>
              <h2 className="step-title">Profile</h2>
              <p className="step-desc">Sign in to manage your account.</p>
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
