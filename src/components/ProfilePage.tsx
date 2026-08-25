'use client';

import { useRouter } from 'nextjs-toploader/app';
import AppBackground from './AppBackground';
import Header from './Header';
import LinkWalletCard from './LinkWalletCard';
import ProfileDetailsCard from './ProfileDetailsCard';
import CountryFlag from './CountryFlag';
import { countryName } from '../countries';
import { useSession } from '../hooks/useSession';

function initialsFor(name: string, email: string): string {
  if (name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useSession();

  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';

  return (
    <div className="app">
      <AppBackground />
      <Header onBack={() => router.push('/')} />
      <div className="app-body">
        <div className="dashboard-body">
          {user && (
            <div className="profile-hero">
              <div className="profile-avatar">{initialsFor(displayName, user.email)}</div>
              <div className="profile-hero-info">
                <span className="profile-hero-name">{displayName || user.email}</span>
                {displayName && <span className="profile-hero-email">{user.email}</span>}
                <div className="profile-hero-chips">
                  {user.country && (
                    <span className="profile-chip"><CountryFlag code={user.country} /> {countryName(user.country)}</span>
                  )}
                  <span className={`profile-chip ${user.walletAddresses?.length ? 'profile-chip-on' : ''}`}>
                    <span className={`profile-status-dot ${user.walletAddresses?.length ? 'profile-status-dot-on' : ''}`} />
                    {user.walletAddresses?.length ? 'Wallet Linked' : 'No Wallet Linked'}
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
              <LinkWalletCard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
