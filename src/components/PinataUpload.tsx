'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import type { PinataResult } from '../types';
import YamlPreview from './YamlPreview';
import { useToast } from './Toast';

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
  /** Set when the key was tested but couldn't be stored yet (no live registration) — it's held for miner_address instead. */
  api_key_staged?: boolean;
  staged_until?: string;
  /** Identity pre-checks (duplicate id / slug owned by another wallet) — same rejections registerMiner would hit, without spending gas. */
  conflicts?: ValidationConflict[];
}

interface Props {
  yaml: string;
  name?: string;
  result: PinataResult | null;
  onResult: (r: PinataResult) => void;
  onBack: () => void;
  onNext: () => void;
}

type UploadState = 'idle' | 'validating' | 'uploading' | 'done' | 'error';

export default function PinataUpload({ yaml, name, result, onResult, onBack, onNext }: Props) {
  const toast = useToast();
  const { address } = useAccount();
  const [state, setState] = useState<UploadState>(result ? 'done' : 'idle');
  const [requiresApiKey, setRequiresApiKey] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null);
  const [apiKeyStored, setApiKeyStored] = useState(false);
  const [apiKeyStaged, setApiKeyStaged] = useState(false);
  const [conflicts, setConflicts] = useState<ValidationConflict[]>([]);

  // result is owned by the parent and can be cleared out from under us (e.g. a fresh
  // YAML import) without this component remounting — re-sync instead of only seeding at mount.
  useEffect(() => {
    if (!result) setState('idle');
  }, [result]);

  const handleUpload = async () => {
    if (requiresApiKey && !apiKey.trim()) {
      setErrorMsg('API key is required.');
      setState('error');
      return;
    }

    setState('validating');
    setErrorMsg('');
    setValidationErrors([]);
    setValidationResults(null);
    setApiKeyStored(false);
    setApiKeyStaged(false);
    setConflicts([]);

    try {
      const vRes = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yaml,
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
        setValidationErrors(vData.errors ?? ['Unknown validation error']);
        setState('error');
        toast.error('YAML validation failed — see details below.');
        return;
      }
    } catch (err) {
      const message = (err as Error).message ?? 'YAML validation request failed.';
      setErrorMsg(message);
      setState('error');
      toast.error(message);
      return;
    }

    setState('uploading');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml, name: name || 'miner-config' }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.error || 'Upload failed. Please try again.';
        setErrorMsg(message);
        setState('error');
        toast.error(message);
        return;
      }

      onResult(data as PinataResult);
      setState('done');
      toast.success('Pinned to IPFS successfully.');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setState('error');
      toast.error('Network error. Please try again.');
    }
  };

  const busy = state === 'validating' || state === 'uploading';

  return (
    <div className="upload-layout">
      <div className="upload-main">
        <div className="step-section-heading">
          <div className="step-eyebrow">STEP 2 OF 3</div>
          <h2 className="step-title">Validate &amp; Upload to IPFS</h2>
          <p className="step-desc">
            {requiresApiKey
              ? "Your API key is sandbox-tested against every endpoint before pinning. It's only stored in the node database if this slug already has a live registration — otherwise, install it from your Dashboard after you register."
              : 'Your endpoints are sandbox-tested before pinning — no API key needed for keyless miners.'}
          </p>
        </div>

        <div className="upload-card">
          <div className="upload-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <span>IPFS via Pinata</span>
            {state === 'done' && (
              <span className="badge-success">
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                UPLOADED
              </span>
            )}
          </div>

          {state !== 'done' && (
            <div className="field-group" style={{ marginBottom: '20px' }}>
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
                  disabled={busy}
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
                    disabled={busy}
                    autoComplete="off"
                  />
                  <p className="field-hint" style={{ marginTop: '4px', fontSize: '11px', opacity: 0.55 }}>
                    Tested against your endpoints, then stored in the node DB. Never logged.
                  </p>
                </>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="reg-info-panel reg-info-panel-error" style={{ marginBottom: '16px' }}>
              <div className="reg-info-title reg-info-title-error">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Request Failed
              </div>
              <p className="field-hint" style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>{errorMsg}</p>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="reg-info-panel reg-info-panel-error" style={{ marginBottom: '16px' }}>
              <div className="reg-info-title reg-info-title-error">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Validation Failed
              </div>
              <ul className="reg-info-list reg-info-list-error" style={{ paddingLeft: '16px' }}>
                {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
              {!requiresApiKey && validationErrors.some(e => /api_key|api key/i.test(e)) && (
                <p className="field-hint" style={{ margin: 0, color: 'rgba(255,200,80,0.75)' }}>
                  This endpoint needs a credential — switch on <strong>Requires API Key</strong> above and paste one in.
                </p>
              )}
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="reg-info-panel reg-info-panel-error" style={{ marginBottom: '16px' }}>
              <div className="reg-info-title reg-info-title-error">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Would Be Rejected On-Chain
              </div>
              <ul className="reg-info-list reg-info-list-error" style={{ paddingLeft: '16px' }}>
                {conflicts.map((c, i) => <li key={i}>{c.message}</li>)}
              </ul>
              <p className="field-hint" style={{ margin: 0 }}>
                This is the same rejection registerMiner would hit — fix it before spending gas.
              </p>
            </div>
          )}

          {validationResults && validationResults.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
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
                  Key was tested but not staged — connect a wallet before validating so it can be
                  staged for auto-install, or install it from your Dashboard after registering.
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {validationResults.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '12px', fontFamily: 'var(--font-mono, monospace)',
                    padding: '6px 10px', borderRadius: '6px',
                    background: r.success ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                    border: `1px solid ${r.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}>
                    <span style={{ color: r.success ? '#22c55e' : '#ef4444', fontWeight: 600, minWidth: '8px' }}>
                      {r.success ? '✓' : '✗'}
                    </span>
                    <span style={{ opacity: 0.6, minWidth: '36px' }}>{r.method}</span>
                    <span style={{ flex: 1 }}>{r.path}</span>
                    <span style={{ opacity: 0.5 }}>HTTP {r.status}</span>
                    <span style={{ opacity: 0.4, minWidth: '52px', textAlign: 'right' }}>{r.latency_ms}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state !== 'done' && (
            <button
              className={`btn-fill btn-full ${busy ? 'btn-loading' : ''}`}
              onClick={handleUpload}
              disabled={busy || (requiresApiKey && !apiKey.trim())}
            >
              {state === 'validating' ? (
                <><span className="spinner" />Validating endpoints…</>
              ) : state === 'uploading' ? (
                <><span className="spinner" />Uploading to IPFS…</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="16 16 12 12 8 16"/>
                    <line x1="12" y1="12" x2="12" y2="21"/>
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                  </svg>
                  {state === 'error' ? 'Retry' : 'Validate & Upload to IPFS'}
                </>
              )}
            </button>
          )}
        </div>

        {result && (
          <div className="result-card">
            <div className="result-card-header">
              <div className="result-dot" />
              <span>Upload Successful</span>
            </div>

            <div className="result-rows">
              <div className="result-row">
                <span className="result-row-label">IPFS HASH</span>
                <span className="result-row-value result-mono">{result.hash}</span>
              </div>
              <div className="result-row">
                <span className="result-row-label">IPFS URL</span>
                <span className="result-row-value result-mono">{result.url}</span>
              </div>
              <div className="result-row">
                <span className="result-row-label">GATEWAY</span>
                <a className="result-row-link result-mono" href={result.gateway} target="_blank" rel="noopener noreferrer">
                  {result.gateway}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="step-footer">
          <button className="btn-ghost" onClick={onBack}>← Back to Configure</button>
          {result && (
            <button className="btn-fill" onClick={onNext}>
              Proceed to Register →
            </button>
          )}
        </div>
      </div>

      <div className="upload-preview-col">
        <YamlPreview yaml={yaml} />
      </div>
    </div>
  );
}
