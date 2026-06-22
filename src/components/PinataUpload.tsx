'use client';

import { useState } from 'react';
import type { PinataResult } from '../types';
import YamlPreview from './YamlPreview';

interface ValidationResult {
  path: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
  latency_ms: number;
}

interface ValidationResponse {
  valid: boolean;
  slug?: string;
  name?: string;
  errors: string[];
  results: ValidationResult[] | null;
  api_key_stored: boolean;
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
  const [state, setState] = useState<UploadState>(result ? 'done' : 'idle');
  const [apiKey, setApiKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null);
  const [apiKeyStored, setApiKeyStored] = useState(false);

  const handleUpload = async () => {
    if (!apiKey.trim()) {
      setErrorMsg('API key is required.');
      setState('error');
      return;
    }

    setState('validating');
    setErrorMsg('');
    setValidationErrors([]);
    setValidationResults(null);
    setApiKeyStored(false);

    try {
      const vRes = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml, api_key: apiKey.trim() }),
      });
      if (!vRes.ok && vRes.status !== 200) {
        const vErr = await vRes.json().catch(() => ({}));
        throw new Error(vErr.error ?? `Validation request failed (${vRes.status})`);
      }
      const vData = await vRes.json() as ValidationResponse;
      setValidationResults(vData.results ?? null);
      setApiKeyStored(vData.api_key_stored);
      if (!vData.valid) {
        setValidationErrors(vData.errors ?? ['Unknown validation error']);
        setState('error');
        return;
      }
    } catch (err) {
      setErrorMsg((err as Error).message ?? 'YAML validation request failed.');
      setState('error');
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
        setErrorMsg(data.error || 'Upload failed. Please try again.');
        setState('error');
        return;
      }

      onResult(data as PinataResult);
      setState('done');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setState('error');
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
            Your API key is sandbox-tested against every endpoint before pinning.
            On success, it is stored in the node database so your miner goes live
            automatically after on-chain registration.
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
              <label className="field-label">
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
            </div>
          )}

          {errorMsg && <p className="field-error" style={{ marginBottom: '16px' }}>{errorMsg}</p>}

          {validationErrors.length > 0 && (
            <div className="field-error" style={{ marginBottom: '16px' }}>
              <strong>Validation failed:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
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
              </div>
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
              disabled={busy || !apiKey.trim()}
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
