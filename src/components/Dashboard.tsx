'use client';

import { useEffect, useState } from 'react';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import WalletBar from './WalletBar';
import Spinner from './Spinner';
import { useToast } from './Toast';
import { useAddressRegistrations } from '../hooks/useAddressRegistrations';
import {
  DIAMOND_ADDRESS,
  ENTITY_MINER,
  ENTITY_WASM_AUTHOR,
  friendlyRevertMessage,
  intentRegistryAbi,
  type MinerRecordApi,
  type WasmRecordApi,
} from '../wasmAbi';

interface Props {
  onGoHome: () => void;
}

type Tab = 'wasm' | 'yaml';

const POLL_INTERVAL_MS = 15000;

function statusBadgeClass(status: string): string {
  if (status === 'active') return 'badge-success';
  if (status === 'rejected' || status === 'deregistered') return 'wasm-status-bad';
  return 'wasm-status-pending';
}

function WasmRow({ record, onDeregistered }: {
  record: WasmRecordApi;
  onDeregistered: () => void;
}) {
  const toast = useToast();
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      toast.success('WASM entry deregistered.');
      onDeregistered();
    }
  }, [isSuccess, toast, onDeregistered]);

  useEffect(() => {
    if (error) toast.error(friendlyRevertMessage(error.message ?? 'Transaction failed.'));
  }, [error, toast]);

  const status = record.ActivationStatus;
  const inFlight = isPending || isConfirming;
  const deregisterable = status !== 'deregistered';

  return (
    <div className="reg-row">
      <div className="reg-row-main">
        <div className="reg-row-top">
          <span className={`reg-status-badge ${statusBadgeClass(status)}`}>{status.toUpperCase()}</span>
          <span className="result-row-value result-mono result-truncate">{record.WasmURL}</span>
        </div>
        <div className="reg-row-meta">
          <span>REG #{record.RegistrationID}</span>
          <span className="reg-row-sep">·</span>
          <span className="result-mono result-truncate">{record.IntentID}</span>
          {record.WhitelistedURLs?.length > 0 && (
            <>
              <span className="reg-row-sep">·</span>
              <span>{record.WhitelistedURLs.join(', ')}</span>
            </>
          )}
          <span className="reg-row-sep">·</span>
          <span>{new Date(record.RegisteredAt).toLocaleString()}</span>
        </div>
        {record.RejectionReason && (
          <p className="field-error" style={{ marginTop: 6 }}>{record.RejectionReason}</p>
        )}
      </div>
      <div className="reg-row-actions">
        <button type="button" className="btn-ghost" disabled title="Coming soon">
          Edit
        </button>
        {deregisterable && (
          <button
            type="button"
            className={`btn-ghost reg-danger ${inFlight ? 'btn-loading' : ''}`}
            disabled
            title="Deregistration is temporarily disabled"
            onClick={() => {
              reset();
              writeContract({
                address: DIAMOND_ADDRESS,
                abi: intentRegistryAbi,
                functionName: 'deregisterEntity',
                args: [BigInt(record.RegistrationID), ENTITY_WASM_AUTHOR],
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

function MinerRow({ record, onDeregistered }: {
  record: MinerRecordApi;
  onDeregistered: () => void;
}) {
  const toast = useToast();
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      toast.success('Miner deregistered.');
      onDeregistered();
    }
  }, [isSuccess, toast, onDeregistered]);

  useEffect(() => {
    if (error) toast.error(friendlyRevertMessage(error.message ?? 'Transaction failed.'));
  }, [error, toast]);

  const status = record.ActivationStatus;
  const inFlight = isPending || isConfirming;
  const deregisterable = status !== 'deregistered';

  return (
    <div className="reg-row">
      <div className="reg-row-main">
        <div className="reg-row-top">
          <span className={`reg-status-badge ${statusBadgeClass(status)}`}>{status.toUpperCase()}</span>
          <span className="result-row-value result-mono result-truncate">{record.YamlURL}</span>
        </div>
        <div className="reg-row-meta">
          <span>REG #{record.RegistrationID}</span>
          <span className="reg-row-sep">·</span>
          <span>FEE {record.FeeAddress?.slice(0, 6)}…{record.FeeAddress?.slice(-4)}</span>
          <span className="reg-row-sep">·</span>
          <span>${(record.MinPriceUsdc / 1_000_000).toFixed(2)} floor</span>
          <span className="reg-row-sep">·</span>
          <span>{record.SupportedIntents?.join(', ') || record.IntentID || 'no intents'}</span>
          <span className="reg-row-sep">·</span>
          <span>{new Date(record.RegisteredAt).toLocaleString()}</span>
        </div>
      </div>
      <div className="reg-row-actions">
        <button type="button" className="btn-ghost" disabled title="Coming soon">
          Edit
        </button>
        {deregisterable && (
          <button
            type="button"
            className={`btn-ghost reg-danger ${inFlight ? 'btn-loading' : ''}`}
            disabled
            title="Deregistration is temporarily disabled"
            onClick={() => {
              reset();
              writeContract({
                address: DIAMOND_ADDRESS,
                abi: intentRegistryAbi,
                functionName: 'deregisterEntity',
                args: [BigInt(record.RegistrationID), ENTITY_MINER],
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

export default function Dashboard({ onGoHome }: Props) {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>('wasm');
  const { miners, wasm, isLoading, error, refetch } = useAddressRegistrations(address);

  useEffect(() => {
    if (!isConnected) return;
    const id = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isConnected, refetch]);

  const wasmRecords = wasm;
  const yamlRecords = miners;

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
              ? <>Everything registered on-chain by <span className="result-mono">{address}</span>, sourced live from the registry.</>
              : 'Connect your wallet to view your registered items.'}
          </p>
        </div>

        <div className="sub-tabs sub-tabs-lg" style={{ marginBottom: '20px' }}>
          <button type="button" className={`sub-tab sub-tab-lg ${tab === 'wasm' ? 'sub-tab-active' : ''}`} onClick={() => setTab('wasm')}>
            WASM
            {wasmRecords.length > 0 && <span className="sub-tab-count">{wasmRecords.length}</span>}
          </button>
          <button type="button" className={`sub-tab sub-tab-lg ${tab === 'yaml' ? 'sub-tab-active' : ''}`} onClick={() => setTab('yaml')}>
            YAML
            {yamlRecords.length > 0 && <span className="sub-tab-count">{yamlRecords.length}</span>}
          </button>
        </div>

        {!isConnected ? (
          <div className="dashboard-empty">
            <p className="dashboard-empty-title">Wallet not connected</p>
            <p className="dashboard-empty-desc">Connect your wallet to view your registrations.</p>
          </div>
        ) : error ? (
          <div className="dashboard-empty">
            <p className="dashboard-empty-title">Could not reach the registry node</p>
            <p className="dashboard-empty-desc">{error.message}</p>
            <button type="button" className="btn-ghost" onClick={refetch} style={{ marginTop: 12 }}>
              Retry
            </button>
          </div>
        ) : isLoading && wasmRecords.length === 0 && yamlRecords.length === 0 ? (
          <div className="dashboard-empty">
            <p className="dashboard-empty-title"><Spinner /> Loading registrations…</p>
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
                <WasmRow key={r.RegistrationID} record={r} onDeregistered={refetch} />
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
            {yamlRecords.map(r => <MinerRow key={r.RegistrationID} record={r} onDeregistered={refetch} />)}
          </div>
        )}
      </div>
    </div>
  );
}
