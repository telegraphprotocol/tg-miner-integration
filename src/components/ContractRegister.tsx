'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import { decodeEventLog } from 'viem';
import type { PinataResult } from '../types';
import YamlHashModal from './YamlHashModal';
import AuthModal from './AuthModal';
import { useToast } from './Toast';
import { addYamlRegistration } from '../registrationsStore';
import { useSession } from '../hooks/useSession';
import { friendlyRevertMessage, intentRegistryAbi, type MinerRecordApi } from '../wasmAbi';

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_REGISTRY_CONTRACT ?? '') as `0x${string}`;
const BASE_SEPOLIA_EXPLORER = 'https://sepolia.basescan.org';
const MIN_PRICE_RAW = BigInt(10_000); // $0.01 in 6-decimal USDC

async function sha256Hex(text: string): Promise<`0x${string}`> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `0x${hex}`;
}

function Tip({ text }: { text: string }) {
  return (
    <span className="field-tooltip-wrap">
      <span className="field-tooltip-icon">?</span>
      <span className="field-tooltip-popup">
        <span className="field-tooltip-line">{text}</span>
      </span>
    </span>
  );
}

type Mode = 'auto' | 'manual';

interface Props {
  yaml: string;
  pinataResult: PinataResult | null;
  intents: string[];
  minPriceUsdc: string;
  onBack: () => void;
  /** When set, this form edits an existing registration (calls updateMiner) instead of creating a new one. */
  editRecord?: MinerRecordApi;
}

export default function ContractRegister({ yaml, pinataResult, intents, minPriceUsdc, onBack, editRecord }: Props) {
  const isEdit = !!editRecord;
  const toast = useToast();
  const { address, isConnected, chain } = useAccount();
  const { user, isLoading: sessionLoading, refetch: refetchSession } = useSession();
  const [showAuth, setShowAuth] = useState(false);

  // Editing only ever works from known existing values — there's no fresh YAML to auto-hash — so it's always 'manual'.
  const [mode, setMode] = useState<Mode>(isEdit ? 'manual' : (pinataResult ? 'auto' : 'manual'));
  const [feeAddress, setFeeAddress]   = useState(editRecord?.FeeAddress ?? '');
  const [minPrice, setMinPrice]       = useState(editRecord ? (editRecord.MinPriceUsdc / 1_000_000).toString() : (minPriceUsdc || '0.01'));
  const [autoHash, setAutoHash]       = useState<`0x${string}` | ''>('');

  // manual-mode fields
  const [manualHash, setManualHash]       = useState(editRecord?.YamlHash ?? '');
  const [manualUrl, setManualUrl]         = useState(editRecord?.YamlURL ?? '');
  const [manualIntents, setManualIntents] = useState(editRecord ? editRecord.SupportedIntents.join(', ') : intents.join(', '));

  const [showInfo, setShowInfo]         = useState(false);
  const [showHashModal, setShowHashModal] = useState(false);

  useEffect(() => {
    if (address && !feeAddress) setFeeAddress(address);
  }, [address, feeAddress]);

  useEffect(() => {
    if (!yaml) return;
    sha256Hex(yaml).then(setAutoHash).catch(() => {});
  }, [yaml]);

  const effectiveHash    = mode === 'auto' ? autoHash : (manualHash.startsWith('0x') ? manualHash : `0x${manualHash}`);
  const effectiveUrl     = mode === 'auto' ? (pinataResult?.gateway ?? '') : manualUrl;
  // Manual entry must match the same canonical form (UPPER_SNAKE_CASE) the on-chain
  // registry and the wizard's own intent picker use — otherwise the contract call
  // reverts with "intent not registered onchain" for a mismatched entry anywhere in
  // the array, which can look like it's about a completely different, valid intent.
  const effectiveIntents = mode === 'auto'
    ? intents
    : manualIntents.split(',').map(s => s.trim().toUpperCase().replace(/\s+/g, '_')).filter(Boolean);

  // validation
  const priceRaw = BigInt(Math.round(parseFloat(minPrice || '0') * 1_000_000));
  const priceError  = priceRaw < MIN_PRICE_RAW ? 'Minimum is $0.01 (10,000 in 6-decimal USDC).' : '';
  const intentError = effectiveIntents.length === 0 ? 'At least one intent is required.' : '';
  const urlError    = !effectiveUrl ? (mode === 'auto' ? 'Upload to IPFS first.' : 'IPFS URL is required.') : '';
  const hashError   = !effectiveHash || effectiveHash.length !== 66 ? 'Valid bytes32 hash required.' : '';
  const feeError    = !feeAddress || feeAddress === '0x0000000000000000000000000000000000000000' ? 'Fee address must be non-zero.' : '';

  const validationErrors = [priceError, intentError, urlError, hashError, feeError].filter(Boolean);

  const { writeContract, data: txHash, isPending: isWritePending, error: writeError, reset } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const wrongNetwork = isConnected && chain?.id !== baseSepolia.id;
  const isSuccess    = isConfirmed && receipt?.status === 'success';
  const isReverted   = isConfirmed && receipt?.status !== 'success';
  const txError      = writeError ?? receiptError;
  const isTxInFlight = isWritePending || isConfirming;
  const canSubmit    = isConnected && !wrongNetwork && !!user && !!CONTRACT_ADDRESS && validationErrors.length === 0;

  const toastedTxRef = useRef<string | null>(null);
  useEffect(() => {
    if (!txHash || toastedTxRef.current === txHash) return;

    if (isSuccess) {
      toastedTxRef.current = txHash;
      toast.success(isEdit ? 'Miner updated on-chain successfully.' : 'Miner registered on-chain successfully.');
      if (address) {
        addYamlRegistration(address, {
          yamlUrl: effectiveUrl,
          yamlHash: effectiveHash,
          feeAddress,
          minPriceUsdc: minPrice,
          intents: effectiveIntents,
          txHash,
          registeredAt: new Date().toISOString(),
        });
      }
    } else if (isReverted) {
      toastedTxRef.current = txHash;
      reset();
      toast.error('Transaction reverted on-chain. No changes were made — check BaseScan for details.');
    }
  }, [isSuccess, isReverted, txHash, toast, address, effectiveUrl, effectiveHash, feeAddress, minPrice, effectiveIntents, reset, isEdit]);

  // Decode registrationId from the receipt's MinerRegistered event — immediate,
  // no dependency on the registry's own indexing/serving lag.
  const [freshRegistrationId, setFreshRegistrationId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuccess || !receipt) return;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: intentRegistryAbi, data: log.data, topics: log.topics, eventName: 'MinerRegistered' });
        setFreshRegistrationId(decoded.args.registrationId.toString());
        return;
      } catch {
        // not this log — try the next one
      }
    }
  }, [isSuccess, receipt]);

  useEffect(() => {
    if (txError) toast.error(friendlyRevertMessage(txError.message ?? 'Transaction failed.'));
  }, [txError, toast]);

  const handleRegister = () => {
    if (!canSubmit) return;
    if (isEdit) {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: intentRegistryAbi,
        functionName: 'updateMiner',
        args: [
          BigInt(editRecord!.RegistrationID),
          effectiveUrl,
          effectiveHash as `0x${string}`,
          feeAddress as `0x${string}`,
          priceRaw,
          effectiveIntents,
        ],
      });
    } else {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: intentRegistryAbi,
        functionName: 'registerMiner',
        args: [
          effectiveUrl,
          effectiveHash as `0x${string}`,
          feeAddress as `0x${string}`,
          priceRaw,
          effectiveIntents,
        ],
      });
    }
  };

  return (
    <div className="register-layout">
      {/* Header */}
      <div className="step-section-heading">
        <div className="step-eyebrow">{isEdit ? 'EDIT REGISTRATION' : 'STEP 3 OF 3'}</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h2 className="step-title">{isEdit ? 'Edit Registration' : 'Register On-Chain'}</h2>
            <p className="step-desc">
              {isEdit ? (
                <>Update your existing miner's YAML, fee address, floor price, or intents. This issues a new
                  <code className="inline-code"> registrationId</code> under the hood — anything targeting the old one directly will need updating.</>
              ) : (
                <>Submit your miner to the Telegraph Diamond contract on Base Sepolia.
                  A unique <code className="inline-code">registrationId</code> will be issued and nodes
                  will fetch your YAML within about a minute of the on-chain event — there's no epoch
                  boundary to wait for.</>
              )}
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{ flexShrink: 0, marginTop: 4 }}
            onClick={() => setShowInfo(v => !v)}
          >
            {showInfo ? 'Hide info' : 'How it works'}
          </button>
        </div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="reg-info-panel">
          <div className="reg-info-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            How Registration Works
          </div>
          <ol className="reg-info-list">
            <li>Your YAML URL, SHA-256 hash, intents, fee address, and floor price are stored on-chain — a unique <code className="inline-code">registrationId</code> is issued.</li>
            <li>Telegraph nodes detect the event, fetch the YAML from the declared URL, and verify its SHA-256 hash matches the on-chain commitment.</li>
            <li>If valid, the YAML is staged as <em>pending</em> and activated within about a minute — activation is driven by the registration event, not an epoch schedule.</li>
            <li>Once active, the miner is live in the routing engine with no restart needed.</li>
          </ol>
          <div className="reg-info-note">
            <strong>Note:</strong> To change your YAML, fee address, floor price, or intents later, use Edit from your Dashboard —
            it issues a new registration ID under the hood, so anything targeting your old intent ID directly will need updating.
          </div>
        </div>
      )}

      {/* Mode tabs — editing always uses manual input against known existing values */}
      {!isEdit && (
        <div className="sub-tabs" style={{ marginBottom: '24px' }}>
          <button type="button" className={`sub-tab ${mode === 'auto' ? 'sub-tab-active' : ''}`} onClick={() => setMode('auto')}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            Use uploaded YAML
            {pinataResult && <span className="sub-tab-count">✓</span>}
          </button>
          <button type="button" className={`sub-tab ${mode === 'manual' ? 'sub-tab-active' : ''}`} onClick={() => setMode('manual')}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Enter hash manually
          </button>
        </div>
      )}

      <div className="register-grid">
        {/* Wallet */}
        <div className="register-card">
          <div className="register-card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/>
              <circle cx="17" cy="14" r="1.5" fill="currentColor"/>
            </svg>
            <span>Wallet</span>
          </div>
          {!isConnected ? (
            <div className="wallet-disconnected">
              <p className="wallet-disconnected-text">Connect your wallet to proceed.</p>
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button type="button" className="wallet-pill wallet-pill-primary" onClick={openConnectModal}>
                    Connect
                  </button>
                )}
              </ConnectButton.Custom>
            </div>
          ) : wrongNetwork ? (
            <div className="wallet-disconnected">
              <p className="wallet-disconnected-text">Switch to Base Sepolia to continue.</p>
              <ConnectButton.Custom>
                {({ openChainModal }) => (
                  <button type="button" className="wallet-pill wallet-pill-danger" onClick={openChainModal}>
                    Wrong Chain
                  </button>
                )}
              </ConnectButton.Custom>
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
              <div className="wallet-info-row">
                <span className="result-row-label">CONTRACT</span>
                <span className="result-row-value result-mono result-truncate">{CONTRACT_ADDRESS || '—'}</span>
              </div>
              {!sessionLoading && !user && (
                <div className="wallet-disconnected" style={{ marginTop: 12 }}>
                  <p className="wallet-disconnected-text">{isEdit ? 'Sign in to edit your registration.' : 'Sign in to register a miner.'}</p>
                  <button type="button" className="wallet-pill wallet-pill-accent" onClick={() => setShowAuth(true)}>
                    Login
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {showAuth && (
          <AuthModal
            defaultTab="login"
            onClose={() => setShowAuth(false)}
            onAuthed={() => { setShowAuth(false); refetchSession(); }}
          />
        )}

        {/* Hash source */}
        <div className="register-card">
          <div className="register-card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>{mode === 'auto' ? 'YAML Source' : 'Manual Input'}</span>
          </div>

          {mode === 'auto' ? (
            <div className="wallet-info">
              <div className="wallet-info-row">
                <span className="result-row-label">YAML HASH</span>
                <span className="result-row-value result-mono result-truncate">{autoHash || '—'}</span>
              </div>
              <div className="wallet-info-row">
                <span className="result-row-label">IPFS URL</span>
                <span className="result-row-value result-mono result-truncate">
                  {pinataResult?.gateway ?? <span style={{ color: 'rgba(255,120,100,0.7)' }}>Not uploaded yet</span>}
                </span>
              </div>
              <div className="wallet-info-row">
                <span className="result-row-label">INTENTS</span>
                <span className="result-row-value" style={{ wordBreak: 'break-word' }}>
                  {intents.length > 0 ? intents.join(', ') : <span style={{ color: 'rgba(255,120,100,0.7)' }}>None — add intents in Semantics</span>}
                </span>
              </div>
              <p className="field-hint" style={{ marginTop: 8 }}>
                Hash is computed client-side using SHA-256 of the raw YAML bytes — identical to <code className="inline-code">sha256sum</code>.
              </p>
            </div>
          ) : (
            <div className="upload-fields">
              <div className="field-group">
                <label className="field-label">
                  YAML URL <span className="field-required">*</span>
                  <Tip text="HTTPS or IPFS URL where your YAML is publicly hosted." />
                </label>
                <input
                  className="field-input field-mono"
                  type="text"
                  placeholder="https://gateway.pinata.cloud/ipfs/Qm…"
                  value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                  disabled={isTxInFlight || isSuccess}
                />
              </div>
              <div className="field-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="field-label" style={{ marginBottom: 0 }}>YAML Hash (bytes32) <span className="field-required">*</span><Tip text="SHA-256 of raw YAML bytes, 0x-prefixed. Run: sha256sum my.yaml — do NOT use keccak256." /></label>
                  <button
                    type="button"
                    className="btn-hash-gen"
                    onClick={() => setShowHashModal(true)}
                    disabled={isTxInFlight || isSuccess}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M3 9h18M9 21V9"/>
                    </svg>
                    Generate from file
                  </button>
                </div>
                <input
                  className="field-input field-mono"
                  type="text"
                  placeholder="0xabc123… (64 hex chars)"
                  value={manualHash}
                  onChange={e => setManualHash(e.target.value)}
                  disabled={isTxInFlight || isSuccess}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Supported Intents <span className="field-required">*</span><Tip text="Comma-separated list. At least one canonical intent required (e.g. chat_completion, web_search)." /></label>
                <input
                  className="field-input"
                  type="text"
                  placeholder="chat_completion, web_search"
                  value={manualIntents}
                  onChange={e => setManualIntents(e.target.value)}
                  disabled={isTxInFlight || isSuccess}
                />
                {intentError && manualIntents !== '' && <p className="field-error">{intentError}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Registration params */}
        <div className="register-card register-card-full">
          <div className="register-card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Registration Params</span>
          </div>
          <div className="field-row-2">
            <div className="field-group">
              <label className="field-label">Fee Address <span className="field-required">*</span><Tip text="EVM address where miner payouts are sent. Must be non-zero." /></label>
              <input
                className="field-input field-mono"
                type="text"
                placeholder="0x… EVM address for payouts"
                value={feeAddress}
                onChange={e => setFeeAddress(e.target.value)}
                disabled={isTxInFlight || isSuccess}
              />
              {feeError && feeAddress !== '' && <p className="field-error">{feeError}</p>}
            </div>
            <div className="field-group">
              <label className="field-label">Floor Price (USDC) <span className="field-required">*</span><Tip text="Minimum $0.01. Stored as 6-decimal USDC on-chain (e.g. $0.01 = 10,000). Changeable later via Edit on your Dashboard." /></label>
              <input
                className="field-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.01"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                disabled={isTxInFlight || isSuccess}
              />
              {priceError && minPrice !== '' && <p className="field-error">{priceError}</p>}
            </div>
          </div>
        </div>

        {/* Transaction */}
        <div className="register-card register-card-full">
          <div className="register-card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <span>Transaction</span>
            {isSuccess && (
              <span className="badge-success">
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                CONFIRMED
              </span>
            )}
          </div>

          {!isSuccess && !isTxInFlight && (
            <>
              {/* pre-flight checklist */}
              {isConnected && !wrongNetwork && (
                <div className="reg-checklist">
                  {[
                    { label: 'Signed in',             ok: !!user },
                    { label: 'YAML URL set',         ok: !!effectiveUrl },
                    { label: 'Hash valid (bytes32)',  ok: !!effectiveHash && effectiveHash.length === 66 },
                    { label: 'Fee address set',       ok: !!feeAddress && feeAddress !== '0x0000000000000000000000000000000000000000' },
                    { label: 'Floor price ≥ $0.01',   ok: priceRaw >= MIN_PRICE_RAW },
                    { label: 'At least one intent',   ok: effectiveIntents.length > 0 },
                  ].map(item => (
                    <div key={item.label} className={`reg-check-item ${item.ok ? 'reg-check-ok' : 'reg-check-fail'}`}>
                      {item.ok
                        ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      }
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {txError && (
                <p className="field-error" style={{ marginBottom: '16px' }}>
                  {txError.message?.split('\n')[0] ?? 'Transaction failed.'}
                </p>
              )}

              <button
                className={`btn-fill btn-full ${!canSubmit ? 'btn-disabled' : ''}`}
                style={{ marginTop: 16 }}
                onClick={() => { reset(); handleRegister(); }}
                disabled={!canSubmit}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                {!isConnected       ? 'Connect First'
                  : wrongNetwork    ? 'Switch to Base Sepolia'
                  : !user           ? 'Sign In First'
                  : !CONTRACT_ADDRESS ? 'Contract Not Configured'
                  : validationErrors.length > 0 ? 'Fix errors above'
                  : txError         ? (isEdit ? 'Retry Update' : 'Retry Registration')
                  : isEdit          ? 'Update Miner'
                  : 'Register Miner'}
              </button>
            </>
          )}

          {isTxInFlight && (
            <div className="tx-pending">
              <div className="tx-pending-inner">
                <span className="spinner spinner-lg" />
                <div className="tx-pending-text">
                  <span className="tx-pending-title">
                    {isWritePending ? 'Awaiting signature…' : 'Confirming on-chain…'}
                  </span>
                  <span className="tx-pending-sub">
                    {isWritePending
                      ? 'Approve the transaction in your wallet.'
                      : 'Waiting for Base Sepolia confirmation. This usually takes a few seconds.'}
                  </span>
                  {txHash && !isWritePending && (
                    <a
                      className="result-row-link result-mono"
                      href={`${BASE_SEPOLIA_EXPLORER}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginTop: 8, display: 'inline-flex' }}
                    >
                      View pending tx on BaseScan
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {isSuccess && txHash && (
            <div className="tx-confirmed">
              <div className="tx-success-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div className="tx-success-content">
                <p className="tx-success-title">{isEdit ? 'Miner Updated Successfully' : 'Miner Registered Successfully'}</p>
                <p className="tx-success-sub">
                  {isEdit
                    ? "Your update is live under a new registration ID — check your Dashboard in a couple minutes for the new entry."
                    : 'Your miner is staged as pending and will activate within about a minute — activation is driven by the registration event, not an epoch schedule. No restart needed.'}
                </p>
                <div className="tx-hash-row">
                  <span className="result-row-label">TX HASH</span>
                  <a
                    className="result-row-link result-mono"
                    href={`${BASE_SEPOLIA_EXPLORER}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {txHash.slice(0, 18)}…{txHash.slice(-8)}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                </div>

                {freshRegistrationId && (
                  <div className="wallet-info" style={{ marginTop: 12 }}>
                    <div className="wallet-info-row">
                      <span className="result-row-label">REGISTRATION ID</span>
                      <span className="result-row-value result-mono">{freshRegistrationId}</span>
                    </div>
                    <p className="field-hint" style={{ marginTop: 6 }}>
                      It will be indexed and usable in 3-5 minutes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showHashModal && (
        <YamlHashModal
          onApply={h => setManualHash(h)}
          onClose={() => setShowHashModal(false)}
        />
      )}
    </div>
  );
}
