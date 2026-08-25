'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useSession } from '../hooks/useSession';
import { useToast } from './Toast';
import Spinner from './Spinner';

function WalletIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}

export default function LinkWalletCard() {
  const toast = useToast();
  const { user, refetch } = useSession();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const linkedWallets = user.walletAddresses ?? [];
  const hasLinkedWallet = linkedWallets.length > 0;
  const connectedAlreadyLinked = !!address && linkedWallets.some(w => w.toLowerCase() === address.toLowerCase());

  const handleLink = async () => {
    if (!address) return;
    setBusy(true);
    try {
      const nonceRes = await fetch(`/api/auth/wallet/nonce?address=${address}`);
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok) { toast.error(nonceData.error || 'Could not start wallet link.'); return; }

      const signature = await signMessageAsync({ message: nonceData.message });

      const verifyRes = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) { toast.error(verifyData.error || 'Could not verify signature.'); return; }

      toast.success('Wallet linked to your account.');
      refetch();
    } catch {
      toast.error('Wallet link cancelled or failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-section link-wallet-card">
      <div className="profile-section-header">
        <span className="profile-section-icon"><WalletIcon /></span>
        <span className="profile-section-label">Account Wallets</span>
        {hasLinkedWallet && (
          <span className="profile-section-action">
            <span className={`profile-status-dot ${connectedAlreadyLinked ? 'profile-status-dot-on' : ''}`} />
            {linkedWallets.length} linked
          </span>
        )}
      </div>

      {hasLinkedWallet && (
        <>
          {linkedWallets.map(w => (
            <div key={w} className="profile-value-pill profile-value-pill-icon link-wallet-address-pill">
              <span className="result-mono">{w.slice(0, 6)}...{w.slice(-4)}</span>
            </div>
          ))}
          <p className="field-hint link-wallet-note">
            Linked to {user.email}. Any linked wallet can be connected above to use it for registration.
          </p>
        </>
      )}

      {!isConnected && (
        <p className="field-hint link-wallet-note">Connect a wallet above to link it to {user.email}.</p>
      )}

      {isConnected && !connectedAlreadyLinked && (
        <>
          <div className="profile-value-pill profile-value-pill-icon link-wallet-address-pill">
            <span className="result-mono">{address}</span>
          </div>
          <p className="field-hint" style={{ marginBottom: 12 }}>Sign a free message to link this wallet — no transaction, no gas.</p>
          <button type="button" className={`btn-fill link-wallet-btn ${busy ? 'btn-loading' : ''}`} onClick={handleLink} disabled={busy}>
            {busy ? <><Spinner /> Waiting for signature…</> : 'Link Wallet'}
          </button>
        </>
      )}
    </div>
  );
}
