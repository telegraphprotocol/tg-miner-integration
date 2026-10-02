'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { parseEventLogs } from 'viem';
import {
  DIAMOND_ADDRESS,
  friendlyRevertMessage,
  intentRegistryAbi,
  type AddressBundleResponse,
} from '../wasmAbi';
import { addWasmRegistration } from '../registrationsStore';
import { useCanonicalIntents } from '../hooks/useCanonicalIntents';
import { useToast } from './Toast';
import WalletBar from './WalletBar';
import Spinner from './Spinner';
import IntentSearchList from './IntentSearchList';
import { usePathname } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import { useSession } from '../hooks/useSession';
import { apiFetch, apiPost, errorMessage } from '../lib/api';

const BASE_SEPOLIA_EXPLORER = 'https://sepolia.basescan.org';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type Phase = 'select' | 'verified';

export default function WasmWizard() {
  const toast = useToast();
  const { address, isConnected, chain } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: sessionLoading } = useSession();
  // Email accounts register through the backend (gas sponsored); wallet accounts sign in their own wallet.
  const isEmailUser = user?.primaryAuth === 'EMAIL';

  const [phase, setPhase] = useState<Phase>('select');
  const [localHash, setLocalHash] = useState<`0x${string}` | ''>('');
  const [wasmUrl, setWasmUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [feeAddress, setFeeAddress] = useState('');

  const [result, setResult] = useState<{ registrationId: string; intentId: string } | null>(null);
  const [emailTx, setEmailTx] = useState<string | null>(null);
  const [emailPending, setEmailPending] = useState(false);
  const [emailError, setEmailError] = useState('');

  const wrongNetwork = !isEmailUser && isConnected && chain?.id !== baseSepolia.id;
  const { intents: canonicalIntents, isLoading: intentsLoading, error: intentsError } = useCanonicalIntents();

  const defaultFeeAddress = isEmailUser ? user?.smartWalletAddress : address;
  useEffect(() => {
    if (defaultFeeAddress && !feeAddress) setFeeAddress(defaultFeeAddress);
  }, [defaultFeeAddress, feeAddress]);

  const feeError =
    !feeAddress || feeAddress.toLowerCase() === ZERO_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(feeAddress)
      ? 'Fee address must be a non-zero EVM address.'
      : '';

  // Wallet accounts must register with the wallet they signed in with.
  const walletMatchesLogin = !!address && !!user?.walletAddress && address.toLowerCase() === user.walletAddress.toLowerCase();

  const resetForm = useCallback(() => {
    setPhase('select');
    setLocalHash('');
    setWasmUrl('');
    setLinkUrl('');
    setLinkBusy(false);
    setLinkError('');
    setSelectedIntent(null);
  }, []);

  const {
    writeContract: writeRegister,
    data: registerHash,
    isPending: isRegisterPending,
    error: registerError,
    reset: resetRegister,
  } = useWriteContract();
  const {
    data: registerReceipt,
    isLoading: isRegisterConfirming,
    isSuccess: isRegisterConfirmed,
    error: registerReceiptError,
  } = useWaitForTransactionReceipt({ hash: registerHash });

  useEffect(() => {
    if (!isRegisterConfirmed || !registerReceipt || result) return;

    if (registerReceipt.status !== 'success') {
      resetRegister();
      resetForm();
      toast.error('Transaction reverted on-chain. No changes were made — check BaseScan for details.');
      return;
    }

    try {
      const [event] = parseEventLogs({
        abi: intentRegistryAbi,
        eventName: 'WasmRegistered',
        logs: registerReceipt.logs,
      });
      const registrationId = event.args.registrationId.toString();
      const intentId = event.args.intentId;
      setResult({ registrationId, intentId });
      if (address) {
        addWasmRegistration(address, {
          registrationId,
          intentId,
          wasmUrl,
          wasmHash: localHash,
          intents: selectedIntent ? [selectedIntent] : [],
          txHash: registerHash ?? '',
          registeredAt: new Date().toISOString(),
        });
      }
      toast.success('WASM module registered on-chain successfully.');
    } catch {
      toast.error('Registered, but could not parse the registration event. Check BaseScan.');
    }
  }, [isRegisterConfirmed, registerReceipt, result, address, wasmUrl, localHash, selectedIntent, registerHash, toast, resetRegister, resetForm]);

  useEffect(() => {
    const err = registerError ?? registerReceiptError;
    if (err) {
      resetRegister();
      resetForm();
      toast.error(friendlyRevertMessage(err.message ?? 'Transaction failed.'));
    }
  }, [registerError, registerReceiptError, toast, resetRegister, resetForm]);

  // Email accounts get only a tx hash back from the sponsored call, so find the new registration
  // id by polling the address bundle until a WASM record with this URL shows up.
  useEffect(() => {
    if (!isEmailUser || !emailTx || !user?.smartWalletAddress) return;
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const res = await apiFetch(`/registrations/address/${user.smartWalletAddress}`);
        if (res.ok) {
          const bundle = (await res.json()) as AddressBundleResponse;
          const match = (bundle.wasm ?? [])
            .filter(w => w.WasmURL === wasmUrl)
            .sort((a, b) => Number(b.RegistrationID) - Number(a.RegistrationID))[0];
          if (match && !cancelled) {
            setResult({ registrationId: String(match.RegistrationID), intentId: match.IntentID });
            return;
          }
        }
      } catch {
        // keep polling
      }
      if (!cancelled && attempts < 12) setTimeout(poll, 5000);
    };
    poll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmailUser, emailTx, user?.smartWalletAddress]);

  const handleLinkSubmit = async () => {
    if (!linkUrl.trim()) return;
    setLinkError('');
    try {
      new URL(linkUrl.trim());
    } catch {
      setLinkError('Enter a valid URL.');
      return;
    }
    if (!user) {
      setLinkError('Sign in to verify and hash your module.');
      return;
    }
    setLinkBusy(true);
    try {
      const res = await apiPost('/registrations/hash-remote', { url: linkUrl.trim() });
      const data = await res.json();
      if (!res.ok) {
        setLinkError(errorMessage(data, 'Could not validate that link.'));
        return;
      }
      setLocalHash(data.hash);
      setWasmUrl(data.url);
      setPhase('verified');
      toast.success('Link verified and hashed successfully.');
    } catch {
      setLinkError('Network error. Please try again.');
    } finally {
      setLinkBusy(false);
    }
  };

  const handleEmailRegister = async () => {
    if (!selectedIntent) return;
    setEmailError('');
    setEmailPending(true);
    try {
      const res = await apiPost('/registrations/wasm', { wasmUrl, intent: selectedIntent, feeAddress });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(errorMessage(data, `Registration failed (HTTP ${res.status}).`));
      setEmailTx((data as { txHash: string }).txHash);
      toast.success('WASM module registered on-chain successfully.');
    } catch (err) {
      const message = (err as Error).message || 'Registration failed.';
      setEmailError(message);
      toast.error(message);
    } finally {
      setEmailPending(false);
    }
  };

  const handleRegister = () => {
    if (!user || !selectedIntent || feeError) return;
    if (isEmailUser) {
      handleEmailRegister();
      return;
    }
    resetRegister();
    writeRegister({
      address: DIAMOND_ADDRESS,
      abi: intentRegistryAbi,
      functionName: 'registerWasm',
      args: [localHash as `0x${string}`, wasmUrl, selectedIntent, feeAddress as `0x${string}`],
    });
  };

  const isRegisterInFlight = isEmailUser ? emailPending : isRegisterPending || isRegisterConfirming;
  const shownTxHash = isEmailUser ? emailTx : registerHash;

  if (result || emailTx) {
    return (
      <div className="register-layout">
        <div className="step-section-heading">
          <div className="step-eyebrow">WASM REGISTRATION</div>
          <h2 className="step-title">Submitted Successfully</h2>
        </div>
        <div className="tx-confirmed">
          <div className="tx-success-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="tx-success-content">
            <p className="tx-success-title">Scoring module registered</p>
            <p className="tx-success-sub">
              Stage 1 checks run within seconds; Stage 2 evaluation against the incumbent can take several
              minutes. Track status from your Dashboard.
            </p>
            <div className="wallet-info-row">
              <span className="result-row-label">REGISTRATION ID</span>
              <span className="result-row-value result-mono">{result?.registrationId ?? 'Indexing…'}</span>
            </div>
            {result && (
              <div className="wallet-info-row">
                <span className="result-row-label">INTENT ID</span>
                <span className="result-row-value result-mono result-truncate">{result.intentId}</span>
              </div>
            )}
            {selectedIntent && (
              <div className="wallet-info-row">
                <span className="result-row-label">SERVES INTENT</span>
                <span className="result-row-value">{selectedIntent}</span>
              </div>
            )}
            {shownTxHash && (
              <div className="tx-hash-row">
                <span className="result-row-label">TX HASH</span>
                <a className="result-row-link result-mono" href={`${BASE_SEPOLIA_EXPLORER}/tx/${shownTxHash}`} target="_blank" rel="noopener noreferrer">
                  {shownTxHash.slice(0, 18)}…{shownTxHash.slice(-8)}
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="step-footer">
          <button className="btn-fill" onClick={() => router.push('/dashboard')}>Go to Dashboard →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="register-layout">
      <div className="step-section-heading">
        <div className="step-eyebrow">REGISTER WASM SCORING MODULE</div>
        <h2 className="step-title">Publish a Candidate Scorer</h2>
        <p className="step-desc">
          Your module runs through Stage 1 structural checks and Stage 2 evaluation against the incumbent
          scorer. If it wins, it is hot-swapped in as the live scorer. Read the requirements carefully
          before submitting.
        </p>
      </div>

      {/* Step 1: link + hash */}
      <div className="register-card register-card-full">
        <div className="register-card-header">
          <span>1. Link &amp; Hash Binary</span>
          {phase !== 'select' && <span className="badge-success">✓ VERIFIED</span>}
        </div>

        <div className="field-group">
          <label className="field-label">Hosted file link <span className="field-required">*</span></label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="field-input"
              type="url"
              placeholder="https://www.dropbox.com/scl/fi/.../scorer.wasm?dl=0"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              disabled={linkBusy || phase !== 'select'}
              style={{ flex: 1 }}
            />
            {phase === 'select' && (
              <button
                type="button"
                className={`btn-fill ${linkBusy ? 'btn-loading' : ''}`}
                onClick={handleLinkSubmit}
                disabled={linkBusy || !linkUrl.trim()}
              >
                {linkBusy ? <><Spinner /> Verifying…</> : 'Verify & Hash'}
              </button>
            )}
          </div>
          <p className="field-hint" style={{ marginTop: 4, fontSize: 11, opacity: 0.55 }}>
            Host your .wasm on any free file-sharing service — Dropbox, Mega, and similar all work — just make
            sure the link is public. Must export rank_answer, alloc, dealloc, and linear memory — invalid
            modules are rejected on arrival. Max 32 MB. We'll verify it's downloadable before hashing.
          </p>
          {linkError && <p className="field-error" style={{ marginTop: 8 }}>{linkError}</p>}
        </div>

        {localHash && (
          <div className="wallet-info-row">
            <span className="result-row-label">KECCAK256</span>
            <span className="result-row-value result-mono result-truncate">{localHash}</span>
          </div>
        )}
      </div>

      {phase === 'verified' && (
        <div className="register-card register-card-full">
          <div className="register-card-header">
            <span>2. Hosted Link</span>
            <span className="badge-success">✓ VERIFIED</span>
          </div>
          <div className="wallet-info-row">
            <span className="result-row-label">DIRECT URL</span>
            <a className="result-row-link result-mono result-truncate" href={wasmUrl} target="_blank" rel="noopener noreferrer">
              {wasmUrl}
            </a>
          </div>
        </div>
      )}

      {/* Step 3 + 4: intent, fee address + register */}
      {phase === 'verified' && (
        <>
          <div className="register-card register-card-full">
            <div className="register-card-header">
              <span>3. Intent This Module Serves</span>
              {selectedIntent && <span className="badge-success">✓ SELECTED</span>}
            </div>
            <p className="field-hint" style={{ marginBottom: 12 }}>
              Which canonical intent is this scorer meant to evaluate? Exactly one — sourced live from the
              registry contract so it can never drift out of sync or be mis-spelled.
            </p>

            {selectedIntent ? (
              <div className="intent-list" style={{ marginBottom: 12 }}>
                <div className="intent-chip">
                  <span>{selectedIntent}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedIntent(null)}
                    className="intent-remove"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </div>
            ) : (
              <IntentSearchList
                intents={canonicalIntents}
                isLoading={intentsLoading}
                error={intentsError}
                onSelect={intent => setSelectedIntent(intent)}
                placeholder="Search canonical intents…"
              />
            )}
          </div>

          <div className="register-card register-card-full">
            <div className="register-card-header"><span>4. Fee Address</span></div>
            <div className="field-group">
              <label className="field-label">Fee Address <span className="field-required">*</span></label>
              <input
                className="field-input field-mono"
                type="text"
                placeholder="0x… EVM address for payouts"
                value={feeAddress}
                onChange={e => setFeeAddress(e.target.value)}
                disabled={isRegisterInFlight}
              />
              <p className="field-hint" style={{ marginTop: 4 }}>
                Where the module author&apos;s earnings are sent. Must be non-zero.
              </p>
              {feeError && feeAddress !== '' && <p className="field-error">{feeError}</p>}
            </div>
          </div>

          <div className="register-grid">
            <div className="register-card register-card-full">
              <div className="register-card-header"><span>{isEmailUser ? 'Account' : 'Wallet'}</span></div>
              {isEmailUser ? (
                <div className="wallet-info">
                  <div className="wallet-status-row">
                    <div className="result-dot" />
                    <span className="wallet-status-text">Signed in as {user?.email} · gas sponsored</span>
                  </div>
                  <div className="wallet-info-row">
                    <span className="result-row-label">ACCOUNT WALLET</span>
                    <span className="result-row-value result-mono">{user?.smartWalletAddress ?? 'Being provisioned…'}</span>
                  </div>
                </div>
              ) : !isConnected ? (
                <div className="wallet-disconnected">
                  <p className="wallet-disconnected-text">Connect your wallet to proceed.</p>
                  <WalletBar />
                </div>
              ) : wrongNetwork ? (
                <div className="wallet-disconnected">
                  <p className="wallet-disconnected-text">Switch to Base Sepolia to continue.</p>
                  <button className="btn-fill" onClick={() => switchChain({ chainId: baseSepolia.id })} disabled={isSwitching}>
                    {isSwitching ? 'Switching…' : 'Switch Network'}
                  </button>
                </div>
              ) : (
                <div className="wallet-info">
                  <div className="wallet-status-row">
                    <div className="result-dot" />
                    <span className="wallet-status-text">Connected · Base Sepolia</span>
                  </div>
                  <div className="wallet-info-row">
                    <span className="result-row-label">ADDRESS</span>
                    <span className="result-row-value result-mono">{address}</span>
                  </div>
                  {!sessionLoading && !user && (
                    <div className="wallet-disconnected" style={{ marginTop: 12 }}>
                      <p className="wallet-disconnected-text">Sign in to register a WASM module.</p>
                      <button
                        type="button"
                        className="wallet-pill wallet-pill-accent"
                        onClick={() => router.push(`/login?tab=login&next=${encodeURIComponent(pathname)}`)}
                      >
                        Login
                      </button>
                    </div>
                  )}
                  {!sessionLoading && user && !walletMatchesLogin && (
                    <div className="wallet-disconnected" style={{ marginTop: 12 }}>
                      <p className="wallet-disconnected-text">Connect the wallet you signed in with to continue.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="register-card register-card-full">
              <div className="register-card-header"><span>Transaction</span></div>

              {!user ? (
                <p className="field-hint">Sign in to continue.</p>
              ) : !isEmailUser && (!isConnected || wrongNetwork) ? (
                <p className="field-hint">Connect your wallet and switch to Base Sepolia to continue.</p>
              ) : !isEmailUser && !walletMatchesLogin ? (
                <p className="field-hint">Connect the wallet you signed in with to continue.</p>
              ) : !selectedIntent ? (
                <p className="field-hint">Select the intent this module serves above to continue.</p>
              ) : isRegisterInFlight ? (
                <div className="tx-pending">
                  <div className="tx-pending-inner">
                    <span className="spinner spinner-lg" />
                    <div className="tx-pending-text">
                      <span className="tx-pending-title">
                        {isEmailUser ? 'Submitting sponsored registration…' : isRegisterPending ? 'Awaiting signature…' : 'Confirming on-chain…'}
                      </span>
                      <span className="tx-pending-sub">
                        {isEmailUser ? 'We send the transaction for you — no gas needed.' : 'Registering the scoring module on Base Sepolia.'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {emailError && <p className="field-error" style={{ marginBottom: 12 }}>{emailError}</p>}
                  <button className="btn-fill btn-full" onClick={handleRegister} disabled={!!feeError}>
                    Register WASM Module
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
