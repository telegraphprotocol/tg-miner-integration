'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import AppBackground from './AppBackground';
import Header from './Header';
import Spinner from './Spinner';
import ApiKeyModal from './ApiKeyModal';
import { useToast } from './Toast';
import { useAddressRegistrations } from '../hooks/useAddressRegistrations';
import {
  DIAMOND_ADDRESS,
  ENTITY_WASM_AUTHOR,
  friendlyRevertMessage,
  intentRegistryAbi,
  type MinerRecordApi,
  type WasmRecordApi,
} from '../wasmAbi';

type Tab = 'wasm' | 'yaml';

const POLL_INTERVAL_MS = 15000;
const PAGE_SIZE = 3;

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
      <button type="button" className="btn-ghost" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        ← Prev
      </button>
      <span className="field-hint" style={{ margin: 0 }}>Page {page} of {totalPages}</span>
      <button type="button" className="btn-ghost" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Next →
      </button>
    </div>
  );
}

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
  const [confirming, setConfirming] = useState(false);
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const isSuccess = isConfirmed && receipt?.status === 'success';
  const isReverted = isConfirmed && receipt?.status !== 'success';

  useEffect(() => {
    if (isSuccess) {
      toast.success('WASM entry deregistered.');
      onDeregistered();
    } else if (isReverted) {
      reset();
      toast.error('Transaction reverted on-chain. No changes were made — check BaseScan for details.');
    }
  }, [isSuccess, isReverted, toast, onDeregistered, reset]);

  useEffect(() => {
    if (error) toast.error(friendlyRevertMessage(error.message ?? 'Transaction failed.'));
  }, [error, toast]);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  const status = record.ActivationStatus;
  const inFlight = isPending || isConfirming;
  const deregisterable = status !== 'deregistered';

  const handleDeregisterClick = () => {
    if (!confirming) { setConfirming(true); return; }
    setConfirming(false);
    reset();
    writeContract({
      address: DIAMOND_ADDRESS,
      abi: intentRegistryAbi,
      functionName: 'deregisterEntity',
      args: [BigInt(record.RegistrationID), ENTITY_WASM_AUTHOR],
    });
  };

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
          <span className="reg-row-sep">·</span>
          <span>{new Date(record.RegisteredAt).toLocaleString()}</span>
        </div>
        {record.RejectionReason && (
          <p className="field-error" style={{ marginTop: 6 }}>{record.RejectionReason}</p>
        )}
      </div>
      <div className="reg-row-actions">
        {deregisterable && (
          <button
            type="button"
            className={`btn-ghost reg-danger ${inFlight ? 'btn-loading' : ''}`}
            disabled={inFlight}
            onClick={handleDeregisterClick}
          >
            {inFlight ? <><Spinner /> Deregistering…</> : confirming ? 'Confirm Deregister?' : 'Deregister'}
          </button>
        )}
      </div>
    </div>
  );
}

function MinerRow({ record, onDeregistered, onEdit }: {
  record: MinerRecordApi;
  onDeregistered: () => void;
  onEdit: () => void;
}) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const isSuccess = isConfirmed && receipt?.status === 'success';
  const isReverted = isConfirmed && receipt?.status !== 'success';

  useEffect(() => {
    if (isSuccess) {
      toast.success('Miner deregistered.');
      onDeregistered();
    } else if (isReverted) {
      reset();
      toast.error('Transaction reverted on-chain. No changes were made — check BaseScan for details.');
    }
  }, [isSuccess, isReverted, toast, onDeregistered, reset]);

  useEffect(() => {
    if (error) toast.error(friendlyRevertMessage(error.message ?? 'Transaction failed.'));
  }, [error, toast]);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  const status = record.ActivationStatus;
  const inFlight = isPending || isConfirming;
  const deregisterable = status !== 'deregistered';
  const keyInstallable = ['active', 'pending', 'unreachable'].includes(status);

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch(`/api/registrations/by-id/${record.RegistrationID}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Could not reach the registry node.'); return; }
      const miner = data.miner ?? data;
      const reason = miner.rejection_reason ? ` — ${miner.rejection_reason}` : '';
      const msg = `Registration #${record.RegistrationID}: ${String(miner.activation_status).toUpperCase()}${reason}`;
      // Mirrors statusBadgeClass() below: active=green, rejected/deregistered=red, else=yellow.
      if (miner.activation_status === 'active') toast.success(msg);
      else if (miner.activation_status === 'rejected' || miner.activation_status === 'deregistered') toast.error(msg);
      else toast.warning(msg); // pending / unreachable / superseded
    } catch {
      toast.error('Network error checking status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleDeregisterClick = () => {
    if (!confirming) { setConfirming(true); return; }
    setConfirming(false);
    reset();
    writeContract({
      address: DIAMOND_ADDRESS,
      abi: intentRegistryAbi,
      functionName: 'deregisterMiner',
      args: [BigInt(record.RegistrationID)],
    });
  };

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
        {record.RejectionReason && (
          <>
            <p className="field-error" style={{ marginTop: 6 }}>{record.RejectionReason}</p>
            {status === 'rejected' && (
              <p className="field-hint" style={{ marginTop: 2 }}>
                This slug is now free — fix the issue and re-submit (Edit) promptly.
              </p>
            )}
          </>
        )}
      </div>
      <div className="reg-row-actions">
        <button type="button" className="btn-ghost" onClick={handleCheckStatus} disabled={inFlight || checkingStatus}>
          {checkingStatus ? <><Spinner /> Checking…</> : 'Check Status'}
        </button>
        {keyInstallable && (
          <button type="button" className="btn-ghost" onClick={() => setShowApiKeyModal(true)} disabled={inFlight}>
            API Key
          </button>
        )}
        {deregisterable && (
          <button type="button" className="btn-ghost" onClick={onEdit} disabled={inFlight}>
            Edit
          </button>
        )}
        {deregisterable && (
          <button
            type="button"
            className={`btn-ghost reg-danger ${inFlight ? 'btn-loading' : ''}`}
            disabled={inFlight}
            onClick={handleDeregisterClick}
          >
            {inFlight ? <><Spinner /> Deregistering…</> : confirming ? 'Confirm Deregister?' : 'Deregister'}
          </button>
        )}
      </div>
      {showApiKeyModal && (
        <ApiKeyModal slug={record.Slug} onClose={() => setShowApiKeyModal(false)} />
      )}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>('wasm');
  const [page, setPage] = useState(1);
  const { miners, wasm, isLoading, error, refetch } = useAddressRegistrations(address);

  useEffect(() => {
    if (!isConnected) return;
    const id = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isConnected, refetch]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const newestFirst = <T extends { RegisteredAt: string }>(records: T[]): T[] =>
    [...records].sort((a, b) => new Date(b.RegisteredAt).getTime() - new Date(a.RegisteredAt).getTime());

  const wasmRecords = newestFirst(wasm);
  const yamlRecords = newestFirst(miners);

  const activeRecords = tab === 'wasm' ? wasmRecords : yamlRecords;
  const totalPages = Math.max(1, Math.ceil(activeRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRecords = activeRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="app">
      <AppBackground />
      <Header onBack={() => router.push('/')} />

      <div className="app-body">
        <div className="dashboard-body">

        <div className="step-section-heading">
          <div className="step-eyebrow">YOUR REGISTRATIONS</div>
          <h2 className="step-title">Registrations</h2>
          <p className="step-desc">
            {isConnected
              ? <>Everything registered on-chain by <span className="result-mono">{address}</span>, sourced live from the registry.</>
              : 'Connect your wallet to view your registered items.'}
          </p>
        </div>

        <div className="reg-info-panel">
          <div className="reg-info-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Indexing takes a few minutes
          </div>
          <p className="field-hint" style={{ margin: 0 }}>
            After registering, deregistering, or editing a YAML entry, please wait 2-3 minutes for the change
            to reflect here — that's the time the registry node's indexer needs to catch up.
          </p>
        </div>

        <div className="reg-info-panel reg-info-panel-warn">
          <div className="reg-info-title reg-info-title-warn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Edit deregisters and re-registers
          </div>
          <p className="field-hint" style={{ margin: 0 }}>
            Editing a YAML miner <strong>deregisters the current entry and registers a new one</strong> under
            the hood — it'll appear here as a new registration ID, not an in-place update.
          </p>
        </div>

        <div className="sub-tabs sub-tabs-lg" style={{ marginBottom: '20px', paddingBottom: '10px', justifyContent: 'space-between', alignItems: 'center', display: 'flex' }}>
          <div style={{ display: 'flex' }}>
            <button type="button" className={`sub-tab sub-tab-lg ${tab === 'wasm' ? 'sub-tab-active' : ''}`} onClick={() => setTab('wasm')}>
              Evaluation WASMs
              {wasmRecords.length > 0 && <span className="sub-tab-count">{wasmRecords.length}</span>}
            </button>
            <button type="button" className={`sub-tab sub-tab-lg ${tab === 'yaml' ? 'sub-tab-active' : ''}`} onClick={() => setTab('yaml')}>
              Miners
              {yamlRecords.length > 0 && <span className="sub-tab-count">{yamlRecords.length}</span>}
            </button>
          </div>
          <button type="button" className="btn-ghost" onClick={refetch} disabled={isLoading}>
            {isLoading ? <><Spinner /> Refreshing…</> : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Refresh
              </>
            )}
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
            <button type="button" className="btn-ghost" onClick={refetch} disabled={isLoading} style={{ marginTop: 12 }}>
              {isLoading ? <><Spinner /> Retrying…</> : 'Retry'}
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
            <>
              <div className="reg-list">
                {(pageRecords as WasmRecordApi[]).map(r => (
                  <WasmRow key={r.RegistrationID} record={r} onDeregistered={refetch} />
                ))}
              </div>
              <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
            </>
          )
        ) : yamlRecords.length === 0 ? (
          <div className="dashboard-empty">
            <p className="dashboard-empty-title">No YAML registrations yet</p>
            <p className="dashboard-empty-desc">Register a miner from the landing page to see it here.</p>
          </div>
        ) : (
          <>
            <div className="reg-list">
              {(pageRecords as MinerRecordApi[]).map(r => (
                <MinerRow key={r.RegistrationID} record={r} onDeregistered={refetch} onEdit={() => router.push(`/register/edit/${r.RegistrationID}`)} />
              ))}
            </div>
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </>
        )}
        </div>
      </div>
    </div>
  );
}
