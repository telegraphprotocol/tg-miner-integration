'use client';

import { useEffect, useState } from 'react';
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { keccak256, parseEventLogs } from 'viem';
import {
  DIAMOND_ADDRESS,
  friendlyRevertMessage,
  intentRegistryAbi,
} from '../wasmAbi';
import { addWasmRegistration } from '../registrationsStore';
import { useCanonicalIntents } from '../hooks/useCanonicalIntents';
import { useToast } from './Toast';
import WalletBar from './WalletBar';
import Spinner from './Spinner';
import IntentSearchList from './IntentSearchList';
import AuthModal from './AuthModal';
import { useSession } from '../hooks/useSession';

const BASE_SEPOLIA_EXPLORER = 'https://sepolia.basescan.org';

interface Props {
  onDone: () => void;
}

type Phase = 'select' | 'hashed' | 'uploaded' | 'verified';

export default function WasmWizard({ onDone }: Props) {
  const toast = useToast();
  const { address, isConnected, chain } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { user, isLoading: sessionLoading, refetch: refetchSession } = useSession();
  const [showAuth, setShowAuth] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('select');
  const [localHash, setLocalHash] = useState<`0x${string}` | ''>('');
  const [gatewayUrl, setGatewayUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);

  const [result, setResult] = useState<{ registrationId: string; intentId: string } | null>(null);

  const wrongNetwork = isConnected && chain?.id !== baseSepolia.id;
  const walletMismatch = !!user?.walletAddress && !!address && user.walletAddress.toLowerCase() !== address.toLowerCase();
  const noLinkedWallet = !!user && !user.walletAddress;
  const { intents: canonicalIntents, isLoading: intentsLoading, error: intentsError } = useCanonicalIntents();

  const {
    writeContract: writeRegister,
    data: registerHash,
    isPending: isRegisterPending,
    error: registerError,
    reset: resetRegister,
  } = useWriteContract();
  const { data: registerReceipt, isLoading: isRegisterConfirming, isSuccess: isRegisterConfirmed } =
    useWaitForTransactionReceipt({ hash: registerHash });

  useEffect(() => {
    if (isRegisterConfirmed && registerReceipt && !result) {
      try {
        const [event] = parseEventLogs({
          abi: intentRegistryAbi,
          eventName: 'IntentRegistered',
          logs: registerReceipt.logs,
        });
        const registrationId = event.args.registrationId.toString();
        const intentId = event.args.intentId;
        setResult({ registrationId, intentId });
        if (address) {
          addWasmRegistration(address, {
            registrationId,
            intentId,
            wasmUrl: gatewayUrl,
            wasmHash: localHash,
            intents: selectedIntents,
            txHash: registerHash ?? '',
            registeredAt: new Date().toISOString(),
          });
        }
        toast.success('WASM module registered on-chain successfully.');
      } catch {
        toast.error('Registered, but could not parse the registration event. Check BaseScan.');
      }
    }
  }, [isRegisterConfirmed, registerReceipt, result, address, gatewayUrl, localHash, selectedIntents, registerHash, toast]);

  useEffect(() => {
    if (registerError) toast.error(friendlyRevertMessage(registerError.message ?? 'Transaction failed.'));
  }, [registerError, toast]);

  const handleFileSelect = async (f: File) => {
    if (f.size > 32 * 1024 * 1024) {
      toast.error('Binary exceeds the 32 MB limit.');
      return;
    }
    setFile(f);
    const bytes = new Uint8Array(await f.arrayBuffer());
    const hash = keccak256(bytes);
    setLocalHash(hash);
    setPhase('hashed');
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('name', file.name.replace(/\.wasm$/, '') || 'scorer');
      const res = await fetch('/api/upload-wasm', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Upload failed.');
        setUploading(false);
        return;
      }
      setGatewayUrl(data.gateway);
      setPhase('uploaded');
      toast.success('Pinned .wasm to IPFS successfully.');
    } catch {
      toast.error('Network error during upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyError('');
    try {
      const res = await fetch(gatewayUrl);
      if (!res.ok) throw new Error(`Could not re-fetch hosted URL (HTTP ${res.status}).`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const rehash = keccak256(bytes);
      if (rehash !== localHash) {
        setVerifyError('Re-hashed bytes do not match the locally computed hash. Do not register this URL.');
        toast.error('Hash mismatch after hosting — registration blocked.');
        return;
      }
      setPhase('verified');
      toast.success('Hash verified against hosted bytes.');
    } catch (err) {
      setVerifyError((err as Error).message ?? 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleRegister = () => {
    if (!user?.walletAddress || walletMismatch) return;
    resetRegister();
    writeRegister({
      address: DIAMOND_ADDRESS,
      abi: intentRegistryAbi,
      functionName: 'registerWasm',
      args: [localHash as `0x${string}`, gatewayUrl, []],
    });
  };

  const isRegisterInFlight = isRegisterPending || isRegisterConfirming;

  if (result) {
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
              <span className="result-row-value result-mono">{result.registrationId}</span>
            </div>
            <div className="wallet-info-row">
              <span className="result-row-label">INTENT ID</span>
              <span className="result-row-value result-mono result-truncate">{result.intentId}</span>
            </div>
            {selectedIntents.length > 0 && (
              <div className="wallet-info-row">
                <span className="result-row-label">SERVES INTENTS</span>
                <span className="result-row-value">{selectedIntents.join(', ')}</span>
              </div>
            )}
            {registerHash && (
              <div className="tx-hash-row">
                <span className="result-row-label">TX HASH</span>
                <a className="result-row-link result-mono" href={`${BASE_SEPOLIA_EXPLORER}/tx/${registerHash}`} target="_blank" rel="noopener noreferrer">
                  {registerHash.slice(0, 18)}…{registerHash.slice(-8)}
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="step-footer">
          <button className="btn-fill" onClick={onDone}>Go to Dashboard →</button>
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

      {/* Step 1: select + hash */}
      <div className="register-card register-card-full">
        <div className="register-card-header">
          <span>1. Select &amp; Hash Binary</span>
          {phase !== 'select' && <span className="badge-success">✓ HASHED</span>}
        </div>
        <div className="field-group">
          <label className="field-label">.wasm file <span className="field-required">*</span></label>
          <input
            type="file"
            accept=".wasm"
            className="field-input"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          />
          <p className="field-hint" style={{ marginTop: 4, fontSize: 11, opacity: 0.55 }}>
            Must export rank_answer, breakdown_answer, alloc, dealloc, and linear memory — invalid modules
            are rejected on arrival. Max 32 MB.
          </p>
        </div>
        {localHash && (
          <div className="wallet-info-row">
            <span className="result-row-label">KECCAK256</span>
            <span className="result-row-value result-mono result-truncate">{localHash}</span>
          </div>
        )}
      </div>

      {/* Step 2: upload */}
      {phase !== 'select' && (
        <div className="register-card register-card-full">
          <div className="register-card-header">
            <span>2. Pin to IPFS</span>
            {phase === 'uploaded' || phase === 'verified' ? <span className="badge-success">✓ UPLOADED</span> : null}
          </div>
          {phase === 'hashed' && (
            <button className={`btn-fill ${uploading ? 'btn-loading' : ''}`} onClick={handleUpload} disabled={uploading}>
              {uploading ? <><Spinner /> Uploading…</> : 'Pin to IPFS'}
            </button>
          )}
          {gatewayUrl && (
            <div className="wallet-info-row">
              <span className="result-row-label">GATEWAY URL</span>
              <a className="result-row-link result-mono result-truncate" href={gatewayUrl} target="_blank" rel="noopener noreferrer">
                {gatewayUrl}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Step 3: verify */}
      {phase === 'uploaded' || phase === 'verified' ? (
        <div className="register-card register-card-full">
          <div className="register-card-header">
            <span>3. Verify Hosted Bytes</span>
            {phase === 'verified' && <span className="badge-success">✓ VERIFIED</span>}
          </div>
          <p className="field-hint" style={{ marginBottom: 12 }}>
            Re-fetches the hosted URL and recomputes the hash client-side. This must match before you can
            register.
          </p>
          {phase === 'uploaded' && (
            <button className={`btn-fill ${verifying ? 'btn-loading' : ''}`} onClick={handleVerify} disabled={verifying}>
              {verifying ? <><Spinner /> Verifying…</> : 'Verify Hash Matches'}
            </button>
          )}
          {verifyError && <p className="field-error" style={{ marginTop: 12 }}>{verifyError}</p>}
        </div>
      ) : null}

      {/* Step 4 + 5: whitelisted urls + register */}
      {phase === 'verified' && (
        <>
          <div className="register-card register-card-full">
            <div className="register-card-header">
              <span>4. Intents This Module Serves</span>
              {selectedIntents.length > 0 && <span className="badge-success">✓ {selectedIntents.length} SELECTED</span>}
            </div>
            <p className="field-hint" style={{ marginBottom: 12 }}>
              Which canonical intents is this scorer meant to evaluate? Select one or more. Sourced live
              from the registry contract so they can never drift out of sync or be mis-spelled.
            </p>

            {selectedIntents.length > 0 && (
              <div className="intent-list" style={{ marginBottom: 12 }}>
                {selectedIntents.map(intent => (
                  <div key={intent} className="intent-chip">
                    <span>{intent}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedIntents(prev => prev.filter(i => i !== intent))}
                      className="intent-remove"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <IntentSearchList
              intents={canonicalIntents}
              isLoading={intentsLoading}
              error={intentsError}
              excluded={selectedIntents}
              onSelect={intent => setSelectedIntents(prev => [...prev, intent])}
              placeholder="Search canonical intents…"
            />
          </div>

          <div className="register-grid">
            <div className="register-card register-card-full">
              <div className="register-card-header"><span>Wallet</span></div>
              {!isConnected ? (
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

            <div className="register-card register-card-full">
              <div className="register-card-header"><span>Transaction</span></div>

              {!isConnected || wrongNetwork ? (
                <p className="field-hint">Connect your wallet and switch to Base Sepolia to continue.</p>
              ) : !user ? (
                <p className="field-hint">Sign in above to continue.</p>
              ) : noLinkedWallet ? (
                <p className="field-error">No wallet linked to your account yet. Link one from your Profile before registering.</p>
              ) : walletMismatch ? (
                <p className="field-error">
                  Connected wallet doesn't match your account's linked wallet
                  (<span className="result-mono">{user.walletAddress}</span>). Switch wallets to continue.
                </p>
              ) : selectedIntents.length === 0 ? (
                <p className="field-hint">Select at least one intent this module serves above to continue.</p>
              ) : isRegisterInFlight ? (
                <div className="tx-pending">
                  <div className="tx-pending-inner">
                    <span className="spinner spinner-lg" />
                    <div className="tx-pending-text">
                      <span className="tx-pending-title">{isRegisterPending ? 'Awaiting signature…' : 'Confirming on-chain…'}</span>
                      <span className="tx-pending-sub">Registering the scoring module on Base Sepolia.</span>
                    </div>
                  </div>
                </div>
              ) : (
                <button className="btn-fill btn-full" onClick={handleRegister}>
                  Register WASM Module
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
