'use client';

import { useState } from 'react';
import type { PinataResult } from '../types';
import YamlPreview from './YamlPreview';

interface Props {
  yaml: string;
  name?: string;
  result: PinataResult | null;
  onResult: (r: PinataResult) => void;
  onBack: () => void;
  onNext: () => void;
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

export default function PinataUpload({ yaml, name, result, onResult, onBack, onNext }: Props) {
  const [state, setState] = useState<UploadState>(result ? 'done' : 'idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpload = async () => {
    setState('uploading');
    setErrorMsg('');

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

  return (
    <div className="upload-layout">
      <div className="upload-main">
        {/* Section heading */}
        <div className="step-section-heading">
          <div className="step-eyebrow">STEP 2 OF 3</div>
          <h2 className="step-title">Upload to IPFS</h2>
          <p className="step-desc">
            Pin your YAML configuration to IPFS. This creates a permanent,
            content-addressed record of your miner configuration.
          </p>
        </div>

        {/* Upload card */}
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

          <p className="step-desc" style={{ marginBottom: '20px' }}>
            Your YAML will be pinned to IPFS using the platform&apos;s Pinata integration.
            No credentials required.
          </p>

          {errorMsg && <p className="field-error" style={{ marginBottom: '16px' }}>{errorMsg}</p>}

          {state !== 'done' && (
            <button
              className={`btn-fill btn-full ${state === 'uploading' ? 'btn-loading' : ''}`}
              onClick={handleUpload}
              disabled={state === 'uploading'}
            >
              {state === 'uploading' ? (
                <>
                  <span className="spinner" />
                  Uploading to IPFS…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="16 16 12 12 8 16"/>
                    <line x1="12" y1="12" x2="12" y2="21"/>
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                  </svg>
                  {state === 'error' ? 'Retry Upload' : 'Upload to IPFS'}
                </>
              )}
            </button>
          )}
        </div>

        {/* Result card */}
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

      {/* Right: YAML preview (read-only) */}
      <div className="upload-preview-col">
        <YamlPreview yaml={yaml} />
      </div>
    </div>
  );
}
