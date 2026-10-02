'use client';

import { useSession } from '../hooks/useSession';

function WalletIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** Read-only view of the address this account registers from: the smart wallet for email accounts, the sign-in wallet otherwise. */
export default function AccountWalletCard() {
  const { user } = useSession();
  if (!user) return null;

  const isEmail = user.primaryAuth === 'EMAIL';
  const address = isEmail ? user.smartWalletAddress : user.walletAddress;

  return (
    <div className="profile-section link-wallet-card">
      <div className="profile-section-header">
        <span className="profile-section-icon"><WalletIcon /></span>
        <span className="profile-section-label">Account Wallet</span>
      </div>

      <div className="profile-value-pill profile-value-pill-icon link-wallet-address-pill">
        <span className="result-mono">{address ?? 'Being provisioned…'}</span>
      </div>
      <p className="field-hint link-wallet-note">
        {isEmail
          ? 'Registrations from your email account are sent from this wallet and their gas is sponsored.'
          : 'You signed in with this wallet. Registrations are sent from it and you pay the gas.'}
      </p>
    </div>
  );
}
