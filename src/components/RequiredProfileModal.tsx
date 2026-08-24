'use client';

import { useEffect, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useSession } from '../hooks/useSession';
import { useToast } from './Toast';
import Spinner from './Spinner';
import CountrySelect from './CountrySelect';
import { useGeoCountryGuess } from '../hooks/useGeoCountryGuess';

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Blocking, non-dismissable modal shown to any signed-in user missing a
 * country or a linked wallet — both are mandatory to use the app, for
 * new and pre-existing accounts alike.
 */
export default function RequiredProfileModal() {
  const toast = useToast();
  const { user, refetch } = useSession();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [country, setCountry] = useState('');
  const [countryBusy, setCountryBusy] = useState(false);
  const [countryError, setCountryError] = useState('');

  const [linkBusy, setLinkBusy] = useState(false);

  const geoGuess = useGeoCountryGuess();
  useEffect(() => {
    if (geoGuess && !country) setCountry(geoGuess);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoGuess]);

  if (!user) return null;
  const needsCountry = !user.country;
  const needsWallet = !user.walletAddress;
  if (!needsCountry && !needsWallet) return null;

  const handleSaveCountry = async () => {
    setCountryError('');
    if (!country) { setCountryError('Select your country.'); return; }
    setCountryBusy(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
      });
      const data = await res.json();
      if (!res.ok) { setCountryError(data.error || 'Could not save country.'); return; }
      toast.success('Country saved.');
      refetch();
    } catch {
      setCountryError('Network error. Please try again.');
    } finally {
      setCountryBusy(false);
    }
  };

  const handleLinkWallet = async () => {
    if (!address) return;
    setLinkBusy(true);
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
      setLinkBusy(false);
    }
  };

  return (
    <div className="modal-bd">
      <div className="modal-panel modal-auth">
        <div className="modal-header">
          <div className="modal-header-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Complete your profile</span>
          </div>
        </div>

        <p className="required-profile-banner">
          This is mandatory to continue — you must complete this before using the app.
        </p>

        {needsCountry && (
          <div className="field-group">
            <label className="field-label">Country <span className="field-required">*</span></label>
            <CountrySelect value={country} onChange={setCountry} />
            <p className="field-hint" style={{ marginTop: 4 }}>
              {geoGuess ? 'Auto-detected from your location — confirm or change it. ' : ''}
              Required — cannot be changed once set.
            </p>
            {countryError && <p className="field-error">{countryError}</p>}
            <button
              type="button"
              className={`btn-fill btn-full ${countryBusy ? 'btn-loading' : ''}`}
              onClick={handleSaveCountry}
              disabled={countryBusy}
              style={{ marginTop: 8 }}
            >
              {countryBusy ? <><Spinner /> Saving…</> : 'Save country'}
            </button>
          </div>
        )}

        {needsWallet && (
          <div className="field-group" style={{ marginTop: needsCountry ? 20 : 0 }}>
            <label className="field-label">Linked wallet <span className="field-required">*</span></label>
            <p className="field-hint" style={{ marginBottom: 8 }}>
              A linked wallet is required to register miners — one wallet per account, permanently.
            </p>
            {!isConnected ? (
              <ConnectButton.Custom>
                {({ openConnectModal, mounted }) => (
                  <button
                    type="button"
                    className="btn-fill btn-full"
                    onClick={openConnectModal}
                    disabled={!mounted}
                  >
                    Connect wallet
                  </button>
                )}
              </ConnectButton.Custom>
            ) : (
              <button
                type="button"
                className={`btn-fill btn-full ${linkBusy ? 'btn-loading' : ''}`}
                onClick={handleLinkWallet}
                disabled={linkBusy}
              >
                {linkBusy ? <><Spinner /> Waiting for signature…</> : `Link ${address ? truncateAddress(address) : ''}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
