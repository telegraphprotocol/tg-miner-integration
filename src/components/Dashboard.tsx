'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import WalletBar from './WalletBar';
import Spinner from './Spinner';
import { useToast } from './Toast';
import {
  getWasmRegistrations,
  getYamlRegistrations,
  markWasmDeregistered,
  type WasmRegistrationRecord,
  type YamlRegistrationRecord,
} from '../registrationsStore';
import {
  DIAMOND_ADDRESS,
  ENTITY_WASM_AUTHOR,
  TELEGRAPH_NODE_URL,
  friendlyRevertMessage,
  intentRegistryAbi,
  type WasmRecordApi,
} from '../wasmAbi';

interface Props {
  onGoHome: () => void;
}

type Tab = 'wasm' | 'yaml';

const BASE_SEPOLIA_EXPLORER = 'https://sepolia.basescan.org';
const POLL_INTERVAL_MS = 15000;

function statusBadgeClass(status: string): string {
  if (status === 'active') return 'badge-success';
  if (status === 'rejected' || status === 'deregistered') return 'wasm-status-bad';
  return 'wasm-status-pending';
}

function WasmRow({ record, address, onDeregistered }: {
  record: WasmRegistrationRecord;
  address: `0x${string}`;
  onDeregistered: () => void;
}) {
  const toast = useToast();
  const [live, setLive] = useState<WasmRecordApi | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${TELEGRAPH_NODE_URL}/engine/v1/intents/${record.intentId}/wasm`);
      if (res.ok) {
        const data = await res.json();
        setLive(data.wasm?.[0] ?? null);
      }
    } catch {
      // node unreachable — leave as unknown, keep polling
    } finally {
      setLoading(false);
    }
  }, [record.intentId]);

  useEffect(() => {
    fetchStatus();
    const terminal = live?.ActivationStatus === 'active' || live?.ActivationStatus === 'rejected' || record.deregistered;
    if (terminal) return;
    const id = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStatus, live?.ActivationStatus, record.deregistered]);

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      markWasmDeregistered(address, record.registrationId);
      toast.success('WASM entry deregistered.');
      onDeregistered();
    }
  }, [isSuccess, address, record.registrationId, toast, onDeregistered]);

  useEffect(() => {
    if (error) toast.error(friendlyRevertMessage(error.message ?? 'Transaction failed.'));
  }, [error, toast]);

  const status = record.deregistered ? 'deregistered' : (live?.ActivationStatus ?? (loading ? '…' : 'unknown'));
  const inFlight = isPending || isConfirming;

  return (
    <div className="reg-row">
      <div className="reg-row-main">
        <div className="reg-row-top">
          <span className={`reg-status-badge ${statusBadgeClass(status)}`}>{status.toUpperCase()}</span>
          <span className="result-row-value result-mono result-truncate">{record.wasmUrl}</span>
        </div>
        <div className="reg-row-meta">
          <span>REG #{record.registrationId}</span>
          <span className="reg-row-sep">·</span>
          <span className="result-mono result-truncate">{record.intentId}</span>
          <span className="reg-row-sep">·</span>
          <span>{new Date(record.registeredAt).toLocaleString()}</span>
        </div>
        {live?.RejectionReason && (
          <p className="field-error" style={{ marginTop: 6 }}>{live.RejectionReason}</p>
        )}
      </div>
      <div className="reg-row-actions">
        <button type="button" className="btn-ghost" onClick={fetchStatus} disabled={loading}>
          {loading ? <Spinner /> : 'Refresh'}
        </button>
        {!record.deregistered && (
          <button
            type="button"
            className={`btn-ghost reg-danger ${inFlight ? 'btn-loading' : ''}`}
            disabled={inFlight}
            onClick={() => {
              reset();
              writeContract({
                address: DIAMOND_ADDRESS,
                abi: intentRegistryAbi,
                functionName: 'deregisterEntity',
                args: [BigInt(record.registrationId), ENTITY_WASM_AUTHOR],
              });
            }}
          >
            {inFlight ? <><Spinner /> Deregistering…</> : 'Deregister'}
          </button>
        )}
      </div>
    </div>
  );
}

function YamlRow({ record }: { record: YamlRegistrationRecord }) {
  return (
    <div className="reg-row">
      <div className="reg-row-main">
        <div className="reg-row-top">
          <span className="badge-success">REGISTERED</span>
          <span className="result-row-value result-mono result-truncate">{record.yamlUrl}</span>
        </div>
        <div className="reg-row-meta">
          <span>FEE {record.feeAddress.slice(0, 6)}…{record.feeAddress.slice(-4)}</span>
          <span className="reg-row-sep">·</span>
          <span>${record.minPriceUsdc} floor</span>
          <span className="reg-row-sep">·</span>
          <span>{record.intents.join(', ') || 'no intents'}</span>
          <span className="reg-row-sep">·</span>
          <span>{new Date(record.registeredAt).toLocaleString()}</span>
        </div>
      </div>
      <div className="reg-row-actions">
        <a
          className="btn-ghost"
          href={`${BASE_SEPOLIA_EXPLORER}/tx/${record.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Tx
        </a>
      </div>
    </div>
  );
}

export default function Dashboard({ onGoHome }: Props) {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>('wasm');
  const [, forceRefresh] = useState(0);

  const wasmRecords = address ? getWasmRegistrations(address) : [];
  const yamlRecords = address ? getYamlRegistrations(address) : [];

  return (
    <div className="lv2">
      <nav className="lv2-nav">
        <button type="button" className="lv2-nav-logo lv2-nav-logo-btn" onClick={onGoHome}>
          <img src="/logo.png" alt="Telegraph" className="lv2-logo-img" />
          <span className="lv2-logo-text">TELEGRAPH</span>
        </button>
        <div className="lv2-nav-links">
          <WalletBar onOpenDashboard={onGoHome} />
        </div>
      </nav>

      <div className="dashboard-body">
        <button type="button" className="lv2-back-btn" onClick={onGoHome}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Home
        </button>

        <div className="dashboard-heading">
          <h2 className="step-title">Your Registrations</h2>
          <p className="step-desc">
            {isConnected
              ? <>Items registered by <span className="result-mono">{address}</span> from this browser will appear here.</>
              : 'Connect your wallet to view your registered items.'}
          </p>
        </div>

        <div className="sub-tabs" style={{ marginBottom: '20px' }}>
          <button type="button" className={`sub-tab ${tab === 'wasm' ? 'sub-tab-active' : ''}`} onClick={() => setTab('wasm')}>
            WASM
            {wasmRecords.length > 0 && <span className="sub-tab-count">{wasmRecords.length}</span>}
          </button>
          <button type="button" className={`sub-tab ${tab === 'yaml' ? 'sub-tab-active' : ''}`} onClick={() => setTab('yaml')}>
            YAML
            {yamlRecords.length > 0 && <span className="sub-tab-count">{yamlRecords.length}</span>}
          </button>
        </div>

        {!isConnected ? (
          <div className="dashboard-empty">
            <p className="dashboard-empty-title">Wallet not connected</p>
            <p className="dashboard-empty-desc">Connect your wallet to view your registrations.</p>
          </div>
        ) : tab === 'wasm' ? (
          wasmRecords.length === 0 ? (
            <div className="dashboard-empty">
              <p className="dashboard-empty-title">No WASM registrations yet</p>
              <p className="dashboard-empty-desc">Register a scoring module from the landing page to see it here.</p>
            </div>
          ) : (
            <div className="reg-list">
              {wasmRecords.map(r => (
                <WasmRow key={r.registrationId} record={r} address={address as `0x${string}`} onDeregistered={() => forceRefresh(n => n + 1)} />
              ))}
            </div>
          )
        ) : yamlRecords.length === 0 ? (
          <div className="dashboard-empty">
            <p className="dashboard-empty-title">No YAML registrations yet</p>
            <p className="dashboard-empty-desc">Register a miner from the landing page to see it here.</p>
          </div>
        ) : (
          <div className="reg-list">
            {yamlRecords.map(r => <YamlRow key={r.txHash} record={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}
