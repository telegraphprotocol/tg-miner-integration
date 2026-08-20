'use client';

import { useState } from 'react';
import { useSignMessage } from 'wagmi';
import { keccak256, toBytes } from 'viem';
import { useToast } from './Toast';
import Spinner from './Spinner';

interface Props {
  slug: string;
  onClose: () => void;
}

interface EndpointResult {
  path: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
}

type Status = 'idle' | 'requesting-challenge' | 'awaiting-signature' | 'installing' | 'done' | 'error';

const STEPS: { key: Status; label: string }[] = [
  { key: 'requesting-challenge', label: 'Challenge' },
  { key: 'awaiting-signature', label: 'Sign' },
  { key: 'installing', label: 'Install' },
];
const STEP_ORDER: Status[] = ['requesting-challenge', 'awaiting-signature', 'installing'];

export default function ApiKeyModal({ slug, onClose }: Props) {
  const toast = useToast();
  const { signMessageAsync } = useSignMessage();
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [endpointResults, setEndpointResults] = useState<EndpointResult[] | null>(null);

  const busy = status === 'requesting-challenge' || status === 'awaiting-signature' || status === 'installing';
  const currentStepIdx = STEP_ORDER.indexOf(status);

  const handleInstall = async () => {
    if (!apiKey.trim()) {
      setErrorMsg('API key is required.');
      setStatus('error');
      return;
    }

    setErrorMsg('');
    setEndpointResults(null);
    setStatus('requesting-challenge');

    try {
      const keyHash = keccak256(toBytes(apiKey.trim()));

      const challengeRes = await fetch('/api/miner-key/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, key_hash: keyHash }),
      });
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok) {
        throw new Error(challengeData.error || `Could not request a challenge (HTTP ${challengeRes.status}).`);
      }

      const { nonce, message } = challengeData as { nonce: string; message: string };

      setStatus('awaiting-signature');
      const signature = await signMessageAsync({ message });

      setStatus('installing');
      const installRes = await fetch('/api/miner-key/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, nonce, signature, api_key: apiKey.trim() }),
      });
      const installData = await installRes.json();

      if (installRes.status === 200) {
        setStatus('done');
        toast.success('API key installed. It takes effect on the next call.');
        onClose();
        return;
      }

      if (installRes.status === 422) {
        setEndpointResults(installData.results ?? null);
        setErrorMsg('Your endpoints rejected the key — nothing was stored.');
        setStatus('error');
        return;
      }

      if (installRes.status === 401) {
        throw new Error(installData.error || 'Signature invalid, or the challenge expired — try again.');
      }

      if (installRes.status === 429) {
        throw new Error(installData.error || "This miner's key was updated in the last 30s — try again shortly.");
      }

      if (installRes.status === 404) {
        throw new Error('No live registration found for this slug — register first, then install the key.');
      }

      throw new Error(installData.error || `Install failed (HTTP ${installRes.status}).`);
    } catch (err) {
      const message = (err as Error).message ?? 'Key install cancelled or failed.';
      setErrorMsg(message);
      setStatus('error');
      toast.error(message);
    }
  };

  return (
    <div className="modal-bd" onClick={e => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal-panel modal-md">
        <div className="modal-header">
          <div className="modal-header-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="10" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Install / Rotate API Key</span>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={busy}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <p className="modal-desc">
          Sign a free message with the wallet that registered <code className="inline-code">{slug}</code> to
          install a new upstream API key. It's sandbox-tested against your registered YAML before storing —
          if it fails, nothing changes and your current key keeps serving traffic.
        </p>

        <div className="field-group">
          <label className="field-label">API Key</label>
          <input
            className="field-input"
            type="password"
            placeholder="Paste your upstream API key"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            disabled={busy || status === 'done'}
            autoComplete="off"
          />
        </div>

        {busy && (
          <div className="reg-checklist">
            {STEPS.map((s, i) => (
              <div key={s.key} className={`reg-check-item ${i < currentStepIdx ? 'reg-check-ok' : i === currentStepIdx ? 'reg-check-fail' : ''}`}
                   style={i > currentStepIdx ? { opacity: 0.35 } : undefined}>
                {i < currentStepIdx ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : i === currentStepIdx ? (
                  <Spinner />
                ) : (
                  <span style={{ width: 10, height: 10, display: 'inline-block' }} />
                )}
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {status === 'awaiting-signature' && (
          <div className="tx-pending">
            <div className="tx-pending-inner">
              <span className="spinner spinner-lg" />
              <div className="tx-pending-text">
                <span className="tx-pending-title">Awaiting signature…</span>
                <span className="tx-pending-sub">Approve the message in your wallet.</span>
              </div>
            </div>
          </div>
        )}

        {errorMsg && <p className="field-error">{errorMsg}</p>}

        {endpointResults && endpointResults.length > 0 && (
          <div className="reg-info-panel reg-info-panel-error" style={{ marginBottom: 0 }}>
            <div className="reg-info-title reg-info-title-error">Endpoint Results</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {endpointResults.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12, fontFamily: 'var(--font-mono, monospace)',
                  padding: '6px 10px', borderRadius: 6,
                  background: r.success ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                  border: `1px solid ${r.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                  <span style={{ color: r.success ? '#22c55e' : '#ef4444', fontWeight: 600, minWidth: 8 }}>
                    {r.success ? '✓' : '✗'}
                  </span>
                  <span style={{ opacity: 0.6, minWidth: 36 }}>{r.method}</span>
                  <span style={{ flex: 1 }}>{r.path}</span>
                  <span style={{ opacity: 0.5 }}>HTTP {r.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            type="button"
            className={`btn-fill ${!apiKey.trim() ? 'btn-disabled' : ''}`}
            onClick={handleInstall}
            disabled={busy || !apiKey.trim() || status === 'done'}
          >
            {busy ? <><Spinner /> Working…</> : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                {status === 'error' ? 'Retry' : 'Install Key'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
