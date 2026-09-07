'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import { decodeEventLog } from 'viem';
import { usePathname } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import type { PinataResult } from '../types';
import YamlHashModal from './YamlHashModal';
import { useToast } from './Toast';
import { addYamlRegistration } from '../registrationsStore';
import { parseYamlToForm } from '../yamlParse';
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

interface ValidationResult {
  path: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
  latency_ms: number;
}

interface ValidationConflict {
  field: string;
  message: string;
}

interface ValidationResponse {
  valid: boolean;
  slug?: string;
  name?: string;
  errors: string[];
  results: ValidationResult[] | null;
  api_key_stored: boolean;
  api_key_staged?: boolean;
  staged_until?: string;
  conflicts?: ValidationConflict[];
}

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
  const router = useRouter();
  const pathname = usePathname();
  const { address, isConnected, chain } = useAccount();
  const { user, isLoading: sessionLoading } = useSession();

  // Editing only ever works from known existing values — there's no fresh YAML to auto-hash — so it's always 'manual'.
  const [mode, setMode] = useState<Mode>(isEdit ? 'manual' : (pinataResult ? 'auto' : 'manual'));
  const [feeAddress, setFeeAddress]   = useState(editRecord?.FeeAddress ?? '');
  const [minPrice, setMinPrice]       = useState(editRecord ? ((editRecord.MinPriceUsdc ?? 0) / 1_000_000).toString() : (minPriceUsdc || '0.01'));
  const [autoHash, setAutoHash]       = useState<`0x${string}` | ''>('');

  // manual-mode fields
  const [manualHash, setManualHash]       = useState(editRecord?.YamlHash ?? '');
  const [manualUrl, setManualUrl]         = useState(editRecord?.YamlURL ?? '');
  const [manualIntents, setManualIntents] = useState(editRecord ? (editRecord.SupportedIntents ?? []).join(', ') : intents.join(', '));
  // The URL the current manualHash was generated for — used to detect a stale hash after the URL changes.
  const [hashSourceUrl, setHashSourceUrl] = useState(editRecord?.YamlURL ?? '');
  const hashIsStale = manualUrl !== '' && manualUrl !== hashSourceUrl;

  const [showInfo, setShowInfo]         = useState(false);
  const [showHashModal, setShowHashModal] = useState(false);
  const [fetchingHash, setFetchingHash] = useState(false);

  // manual-mode validate + API key (skipped entirely when editing)
  const isManualValidatable = mode === 'manual' && !isEdit;
  const [manualYamlText, setManualYamlText]           = useState('');
  const [requiresApiKey, setRequiresApiKey]           = useState(true);
  const [apiKey, setApiKey]                           = useState('');
  const [validateState, setValidateState]             = useState<'idle' | 'validating' | 'valid' | 'error'>('idle');
  const [validateErrorMsg, setValidateErrorMsg]       = useState('');
  const [validationErrorsList, setValidationErrorsList] = useState<string[]>([]);
  const [validationResults, setValidationResults]     = useState<ValidationResult[] | null>(null);
  const [apiKeyStored, setApiKeyStored]               = useState(false);
  const [apiKeyStaged, setApiKeyStaged]               = useState(false);
  const [conflicts, setConflicts]                     = useState<ValidationConflict[]>([]);
  // the (url, hash) pair the current validateState='valid' applies to — used to detect staleness
  const [validatedFor, setValidatedFor]               = useState<{ url: string; hash: string } | null>(null);

  useEffect(() => {
    if (!isManualValidatable) return;
    if (validateState === 'valid' && validatedFor && (validatedFor.url !== manualUrl || validatedFor.hash !== manualHash)) {
      setValidateState('idle');
      setValidatedFor(null);
    }
  }, [manualUrl, manualHash, validateState, validatedFor, isManualValidatable]);

  const handleFetchHashFromUrl = async () => {
    if (!manualUrl) return;
    setFetchingHash(true);
    try {
      const res = await fetch('/api/yaml-hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: manualUrl }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Could not fetch hash from that URL.'); return; }
      setManualHash(data.hash);
      setHashSourceUrl(manualUrl);
      setManualYamlText(data.yaml ?? '');
      toast.success('Hash regenerated from URL.');
    } catch {
      toast.error('Network error fetching that URL.');
    } finally {
      setFetchingHash(false);
    }
  };

  const handleValidate = async () => {
    if (requiresApiKey && !apiKey.trim()) {
      setValidateErrorMsg('API key is required.');
      setValidateState('error');
      return;
    }

    setValidateState('validating');
    setValidateErrorMsg('');
    setValidationErrorsList([]);
    setValidationResults(null);
    setApiKeyStored(false);
    setApiKeyStaged(false);
    setConflicts([]);

    try {
      // Always re-fetch on every Validate click — the URL's content may have changed
      // since the last fetch (e.g. the user re-hosted a fix), and Validate is meant to
      // check the live state of the URL, not a cached snapshot of it.
      const hRes = await fetch('/api/yaml-hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: manualUrl }),
      });
      const hData = await hRes.json();
      if (!hRes.ok) { throw new Error(hData.error || 'Could not fetch YAML from that URL.'); }
      const yamlText = hData.yaml ?? '';
      setManualYamlText(yamlText);
      setManualHash(hData.hash);
      setHashSourceUrl(manualUrl);

      const vRes = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yaml: yamlText,
          api_key: requiresApiKey ? apiKey.trim() : '',
          ...(address ? { miner_address: address } : {}),
        }),
      });
      if (!vRes.ok && vRes.status !== 200) {
        const vErr = await vRes.json().catch(() => null);
        const detail = vErr?.error ?? vErr?.message ?? (vErr ? JSON.stringify(vErr) : null);
        throw new Error(detail ?? `Validation request failed (${vRes.status}) — no error detail returned.`);
      }
      const vData = await vRes.json() as ValidationResponse;
      setValidationResults(vData.results ?? null);
      setApiKeyStored(vData.api_key_stored);
      setApiKeyStaged(!!vData.api_key_staged);
      setConflicts(vData.conflicts ?? []);
      if (!vData.valid) {
        setValidationErrorsList(vData.errors ?? ['Unknown validation error']);
        setValidateState('error');
        toast.error('YAML validation failed — see details below.');
        return;
      }
      setValidateState('valid');
      setValidatedFor({ url: manualUrl, hash: manualHash.startsWith('0x') ? manualHash : `0x${manualHash}` });
      try {
        const parsedIntents = parseYamlToForm(yamlText).semantics_intents.filter(Boolean);
        if (parsedIntents.length) setManualIntents(parsedIntents.join(', '));
      } catch {
        // fall back to whatever the user already typed — YAML is validator-approved but not necessarily parseable by our own subset parser
      }
      toast.success('Endpoint validated.');
    } catch (err) {
      const message = (err as Error).message ?? 'YAML validation request failed.';
      setValidateErrorMsg(message);
      setValidateState('error');
      toast.error(message);
    }
  };

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
  const endpointNotValidatedError = isManualValidatable && validateState !== 'valid' ? 'Validate the YAML endpoint before registering.' : '';

  const validationErrors = [priceError, intentError, urlError, hashError, feeError, endpointNotValidatedError].filter(Boolean);

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
  // Editing must use the wallet that owns the miner record being edited.
  const walletOwnsRecord = !isEdit || (!!address && address.toLowerCase() === editRecord!.MinerAddress.toLowerCase());
  const canSubmit    = isConnected && !wrongNetwork && !!user && walletOwnsRecord && !!CONTRACT_ADDRESS && validationErrors.length === 0;

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
                  <button
                    type="button"
                    className="wallet-pill wallet-pill-accent"
                    onClick={() => router.push(`/login?tab=login&next=${encodeURIComponent(pathname)}`)}
                  >
                    Login
                  </button>
                </div>
              )}
              {!sessionLoading && user && !walletOwnsRecord && (
                <div className="wallet-disconnected" style={{ marginTop: 12 }}>
                  <p className="wallet-disconnected-text">
                    {isEdit
                      ? 'Connect the wallet that registered this miner to edit it.'
                      : 'Link a wallet to your account to register.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

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
                {hashIsStale && (
                  <p className="field-hint" style={{ marginTop: 6, color: 'rgba(255,180,80,0.9)' }}>
                    URL changed — the hash below no longer matches it.{' '}
                    <button
                      type="button"
                      className="btn-hash-gen"
                      style={{ display: 'inline-flex', marginLeft: 4 }}
                      onClick={handleFetchHashFromUrl}
                      disabled={isTxInFlight || isSuccess || fetchingHash}
                    >
                      {fetchingHash ? 'Regenerating…' : 'Regenerate hash from URL'}
                    </button>
                  </p>
                )}
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

              {isManualValidatable && (
                <div className="field-group">
                  <div className="toggle-row">
                    <div>
                      <div className="field-label">Requires API Key</div>
                      <p className="field-hint" style={{ marginTop: 2 }}>
                        Turn off for keyless miners — public APIs that don't need an upstream key.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`toggle ${requiresApiKey ? 'toggle-on' : ''}`}
                      onClick={() => setRequiresApiKey(v => !v)}
                      disabled={validateState === 'validating' || isTxInFlight || isSuccess}
                    >
                      <div className="toggle-thumb" />
                    </button>
                  </div>

                  {requiresApiKey && (
                    <>
                      <label className="field-label" style={{ marginTop: '14px' }}>
                        API Key <span className="field-required">*</span>
                      </label>
                      <input
                        className="field-input"
                        type="password"
                        placeholder="Paste your upstream API key"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        disabled={validateState === 'validating' || isTxInFlight || isSuccess}
                        autoComplete="off"
                      />
                      <p className="field-hint" style={{ marginTop: '4px', fontSize: '11px', opacity: 0.55 }}>
                        Tested against your endpoints, then stored in the node DB. Never logged.
                      </p>
                    </>
                  )}

                  {validateErrorMsg && (
                    <div className="reg-info-panel reg-info-panel-error" style={{ marginTop: '12px' }}>
                      <div className="reg-info-title reg-info-title-error">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        Request Failed
                      </div>
                      <p className="field-hint" style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>{validateErrorMsg}</p>
                    </div>
                  )}

                  {validationErrorsList.length > 0 && (
                    <div className="reg-info-panel reg-info-panel-error" style={{ marginTop: '12px' }}>
                      <div className="reg-info-title reg-info-title-error">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        Validation Failed
                      </div>
                      <ul className="reg-info-list reg-info-list-error" style={{ paddingLeft: '16px' }}>
                        {validationErrorsList.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                      {!requiresApiKey && validationErrorsList.some(e => /api_key|api key/i.test(e)) && (
                        <p className="field-hint" style={{ margin: 0, color: 'rgba(255,200,80,0.75)' }}>
                          This endpoint needs a credential — switch on <strong>Requires API Key</strong> above and paste one in.
                        </p>
                      )}
                    </div>
                  )}

                  {conflicts.length > 0 && (
                    <div className="reg-info-panel reg-info-panel-error" style={{ marginTop: '12px' }}>
                      <div className="reg-info-title reg-info-title-error">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        Would Be Rejected On-Chain
                      </div>
                      <ul className="reg-info-list reg-info-list-error" style={{ paddingLeft: '16px' }}>
                        {conflicts.map((c, i) => <li key={i}>{c.message?.trim() || (c.field ? `${c.field}: conflicts with an existing registration.` : 'Conflicts with an existing registration.')}</li>)}
                      </ul>
                      <p className="field-hint" style={{ margin: 0 }}>
                        This is the same rejection registerMiner would hit — fix it before spending gas.
                      </p>
                    </div>
                  )}

                  {validationResults && validationResults.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', opacity: 0.55, marginBottom: '8px' }}>
                        ENDPOINT RESULTS
                        {apiKeyStored && (
                          <span className="badge-success" style={{ marginLeft: '8px', fontSize: '10px' }}>
                            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            API KEY STORED
                          </span>
                        )}
                        {!apiKeyStored && apiKeyStaged && (
                          <span className="reg-status-badge wasm-status-pending" style={{ marginLeft: '8px' }}>
                            KEY STAGED
                          </span>
                        )}
                      </div>
                      {requiresApiKey && apiKeyStaged && !apiKeyStored && (
                        <p className="field-hint" style={{ marginTop: '-4px', marginBottom: '12px' }}>
                          Key tested and staged against your connected wallet — it installs automatically
                          the moment that wallet's registration lands, no extra step needed.
                        </p>
                      )}
                      {requiresApiKey && !apiKeyStored && !apiKeyStaged && (
                        <p className="field-hint" style={{ marginTop: '-4px', marginBottom: '12px' }}>
                          {address
                            ? 'Key was tested but not staged — likely because one or more endpoints failed above. Fix the failing endpoint(s) and re-validate, or install the key from your Dashboard after registering.'
                            : 'Key was tested but not staged — connect a wallet before validating so it can be staged for auto-install, or install it from your Dashboard after registering.'}
                        </p>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {validationResults.map((r, i) => (
                          <div key={i} style={{
                            display: 'flex', flexDirection: 'column', gap: '4px',
                            fontSize: '12px', fontFamily: 'var(--font-mono, monospace)',
                            padding: '6px 10px', borderRadius: '6px',
                            background: r.success ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                            border: `1px solid ${r.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: r.success ? '#22c55e' : '#ef4444', fontWeight: 600, minWidth: '8px' }}>
                                {r.success ? '✓' : '✗'}
                              </span>
                              <span style={{ opacity: 0.6, minWidth: '36px' }}>{r.method}</span>
                              <span style={{ flex: 1 }}>{r.path}</span>
                              <span style={{ opacity: 0.5 }}>HTTP {r.status}</span>
                              <span style={{ opacity: 0.4, minWidth: '52px', textAlign: 'right' }}>{r.latency_ms}ms</span>
                            </div>
                            {!r.success && r.error && (
                              <div style={{ opacity: 0.75, color: '#ef4444', paddingLeft: '16px' }}>{r.error}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className={`btn-fill btn-full ${validateState === 'validating' ? 'btn-loading' : ''}`}
                    style={{ marginTop: '14px' }}
                    onClick={handleValidate}
                    disabled={
                      validateState === 'validating' || isTxInFlight || isSuccess ||
                      !manualUrl || (requiresApiKey && !apiKey.trim())
                    }
                  >
                    {validateState === 'validating' ? (
                      <><span className="spinner" />Validating endpoints…</>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <polyline points="16 16 12 12 8 16"/>
                          <line x1="12" y1="12" x2="12" y2="21"/>
                          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                        </svg>
                        {validateState === 'valid' ? 'Re-validate' : validateState === 'error' ? 'Retry Validation' : 'Validate Endpoints'}
                      </>
                    )}
                  </button>
                  {validateState === 'valid' && (
                    <p className="field-hint" style={{ marginTop: '8px', color: 'rgba(34,197,94,0.85)' }}>
                      ✓ Endpoint validated — ready to register.
                    </p>
                  )}
                </div>
              )}

              {isManualValidatable ? (
                intentError && validateState === 'valid' && (
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
                    <p className="field-hint" style={{ marginTop: 6 }}>
                      The validated YAML had no semantics.supported_intents — enter them manually.
                    </p>
                  </div>
                )
              ) : (
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
              )}
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
                    ...(isManualValidatable ? [{ label: 'Endpoint validated', ok: validateState === 'valid' }] : []),
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
                  : !walletOwnsRecord ? 'Connect the Owning Wallet'
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
          onApply={h => { setManualHash(h); setHashSourceUrl(manualUrl); }}
          onClose={() => setShowHashModal(false)}
        />
      )}
    </div>
  );
}
