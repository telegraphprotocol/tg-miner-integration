'use client';

import { useState, useRef } from 'react';

interface Props {
  onApply: (hash: string) => void;
  onClose: () => void;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return '0x' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function YamlHashModal({ onApply, onClose }: Props) {
  const [dragging, setDragging]   = useState(false);
  const [fileName, setFileName]   = useState('');
  const [hash, setHash]           = useState('');
  const [computing, setComputing] = useState(false);
  const [error, setError]         = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(yaml|yml)$/i) && file.type !== 'text/plain') {
      setError('Please upload a .yaml or .yml file.');
      return;
    }
    setError('');
    setHash('');
    setFileName(file.name);
    setComputing(true);
    try {
      const buf = await file.arrayBuffer();
      const h = await sha256Hex(buf);
      setHash(h);
    } catch {
      setError('Failed to compute hash.');
    } finally {
      setComputing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="modal-bd" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-header-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            <span>Generate YAML Hash</span>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <p className="modal-desc">
          Upload your YAML file to compute its SHA-256 hash client-side.
          No data leaves your browser. The hash is computed from the raw file bytes —
          identical to <code className="inline-code">sha256sum your-file.yaml</code>.
        </p>

        <div
          className={`drop-zone ${dragging ? 'drop-zone-active' : ''} ${fileName && !computing ? 'drop-zone-filled' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{ marginBottom: 16 }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".yaml,.yml"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
          {computing ? (
            <>
              <span className="spinner" style={{ width: 20, height: 20, borderTopColor: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)' }} />
              <span>Computing SHA-256…</span>
            </>
          ) : fileName ? (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" color="rgba(120,255,160,0.7)">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span className="drop-zone-filename">{fileName}</span>
              <span className="drop-zone-sub">Click to replace</span>
            </>
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              <span>Drop .yaml file here</span>
              <span className="drop-zone-sub">or click to browse</span>
            </>
          )}
        </div>

        {hash && (
          <div className="yaml-hash-result">
            <div className="yaml-hash-result-label">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              SHA-256 Hash
            </div>
            <code className="yaml-hash-value">{hash}</code>
          </div>
        )}

        {error && <p className="field-error" style={{ marginBottom: 12 }}>{error}</p>}

        <div className="modal-footer">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={`btn-fill ${!hash ? 'btn-disabled' : ''}`}
            onClick={() => { onApply(hash); onClose(); }}
            disabled={!hash}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Apply Hash
          </button>
        </div>
      </div>
    </div>
  );
}
