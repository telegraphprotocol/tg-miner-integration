'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useSession } from '../hooks/useSession';
import { useToast } from './Toast';
import Spinner from './Spinner';

function daysRemaining(untilIso: string): number {
  return Math.max(1, Math.ceil((new Date(untilIso).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function LinkWalletCard() {
  const toast = useToast();
  const { user, refetch } = useSession();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [busy, setBusy] = useState(false);
  const [delinkBusy, setDelinkBusy] = useState(false);

  if (!user) return null;

  const hasLinkedWallet = !!user.walletAddress;
  const alreadyLinkedHere = hasLinkedWallet && !!address && user.walletAddress?.toLowerCase() === address.toLowerCase();
  const connectedDiffersFromLinked = hasLinkedWallet && !!address && user.walletAddress?.toLowerCase() !== address.toLowerCase();
  const cooldownActive = !!user.walletUnlinkCooldownUntil;
  const cooldownDays = user.walletUnlinkCooldownUntil ? daysRemaining(user.walletUnlinkCooldownUntil) : 0;

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

  const handleDelink = async () => {
    setDelinkBusy(true);
    try {
      const res = await fetch('/api/auth/wallet/unlink', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Could not delink wallet.'); return; }
      toast.success('Wallet delinked from your account.');
      refetch();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setDelinkBusy(false);
    }
  };

  return (
    <div className="register-card register-card-full link-wallet-card">
      <div className="register-card-header"><span>Account Wallet</span></div>

      {hasLinkedWallet && (
        <>
          <div className="link-wallet-row">
            <span className={`reg-status-badge ${alreadyLinkedHere ? 'badge-success' : 'wasm-status-pending'}`}>
              {alreadyLinkedHere ? 'LINKED' : 'LINKED · NOT CONNECTED'}
            </span>
            <div className="link-wallet-row-text">
              <span className="result-mono link-wallet-address">{user.walletAddress}</span>
              <span className="field-hint">
                {alreadyLinkedHere
                  ? `Linked to ${user.email}. Only this wallet can submit registrations for your account.`
                  : connectedDiffersFromLinked
                    ? 'Connect this wallet above to use it for registration.'
                    : `Linked to ${user.email}. Connect it above to use it for registration.`}
              </span>
            </div>
          </div>

          <p className="field-hint link-wallet-note">
            You can only delink a wallet once every 14 days.
            {cooldownActive && ` You delinked recently — try again in ${cooldownDays} day${cooldownDays === 1 ? '' : 's'}.`}
          </p>
          <button
            type="button"
            className={`btn-ghost reg-danger link-wallet-btn ${delinkBusy ? 'btn-loading' : ''}`}
            onClick={handleDelink}
            disabled={delinkBusy || cooldownActive}
            title={cooldownActive ? `Available again in ${cooldownDays} day${cooldownDays === 1 ? '' : 's'}` : undefined}
          >
            {delinkBusy
              ? <><Spinner /> Delinking…</>
              : cooldownActive ? `Delink Wallet (${cooldownDays}d remaining)` : 'Delink Wallet'}
          </button>
        </>
      )}

      {!hasLinkedWallet && !isConnected && (
        <p className="field-hint link-wallet-note">Connect your wallet above to link it to {user.email}.</p>
      )}

      {!hasLinkedWallet && isConnected && (
        <>
          <div className="link-wallet-row">
            <span className="reg-status-badge wasm-status-pending">NOT LINKED</span>
            <div className="link-wallet-row-text">
              <span className="result-mono link-wallet-address">{address}</span>
              <span className="field-hint">Sign a free message to link this wallet — no transaction, no gas.</span>
            </div>
          </div>
          <button type="button" className={`btn-fill link-wallet-btn ${busy ? 'btn-loading' : ''}`} onClick={handleLink} disabled={busy}>
            {busy ? <><Spinner /> Waiting for signature…</> : 'Link Wallet'}
          </button>
        </>
      )}
    </div>
  );
}
