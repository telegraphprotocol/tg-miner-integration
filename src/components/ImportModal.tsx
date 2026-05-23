'use client';

import { useState, useRef } from 'react';
import type { FormState } from '../types';
import { parseYamlToForm } from '../yamlParse';

interface Props {
  onImport: (state: FormState) => void;
  onClose: () => void;
}

type Tab = 'paste' | 'upload';

export default function ImportModal({ onImport, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('paste');
  const [yamlText, setYamlText] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    const text = yamlText.trim();
    if (!text) { setError('Paste or upload a YAML file to continue.'); return; }
    try {
      const form = parseYamlToForm(text);
      onImport(form);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const loadFile = (file: File) => {
    if (!file.name.match(/\.(yaml|yml)$/i) && file.type !== 'text/plain') {
      setError('Please upload a .yaml or .yml file.');
      return;
    }
    setFileName(file.name);
    setError('');
    const reader = new FileReader();
    reader.onload = e => setYamlText(e.target?.result as string ?? '');
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  return (
    <div className="modal-bd" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel modal-import">

        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <polyline points="16 13 12 17 8 13"/>
              <line x1="12" y1="17" x2="12" y2="9"/>
            </svg>
            <span>Import Existing YAML</span>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Mode selector — two prominent cards */}
        <div className="import-mode-grid">
          <button
            type="button"
            className={`import-mode-card ${tab === 'paste' ? 'import-mode-active' : ''}`}
            onClick={() => setTab('paste')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="8" y1="13" x2="16" y2="13"/>
              <line x1="8" y1="17" x2="12" y2="17"/>
            </svg>
            <div className="import-mode-text">
              <span className="import-mode-label">Paste YAML</span>
              <span className="import-mode-hint">Copy &amp; paste your config directly</span>
            </div>
            {tab === 'paste' && (
              <div className="import-mode-check">
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </button>

          <button
            type="button"
            className={`import-mode-card ${tab === 'upload' ? 'import-mode-active' : ''}`}
            onClick={() => setTab('upload')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <polyline points="16 16 12 12 8 16"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            <div className="import-mode-text">
              <span className="import-mode-label">Upload File</span>
              <span className="import-mode-hint">Drag &amp; drop or browse a .yaml file</span>
            </div>
            {tab === 'upload' && (
              <div className="import-mode-check">
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </button>
        </div>

        {/* Content */}
        {tab === 'paste' && (
          <textarea
            className="field-input field-textarea field-mono import-textarea"
            rows={12}
            placeholder={`version: "1"\nkind: subnet\nid: 34\nslug: bittensor-sn34-bitmind\nname: BitMind Deepfake Detector\nbase_url: https://api.bitmind.ai\n...`}
            value={yamlText}
            onChange={e => { setYamlText(e.target.value); setError(''); }}
            spellCheck={false}
            autoFocus
          />
        )}

        {tab === 'upload' && (
          <div
            className={`drop-zone drop-zone-lg ${dragging ? 'drop-zone-active' : ''} ${fileName ? 'drop-zone-filled' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".yaml,.yml" style={{ display: 'none' }} onChange={handleFileInput} />
            {fileName ? (
              <>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" color="rgba(120,255,160,0.7)">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span className="drop-zone-filename">{fileName}</span>
                <span className="drop-zone-sub">Click to replace</span>
              </>
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <polyline points="16 16 12 12 8 16"/>
                  <line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Drop your .yaml file here</span>
                <span className="drop-zone-sub">or click to browse your files</span>
              </>
            )}
          </div>
        )}

        {error && <p className="field-error modal-error">{error}</p>}

        <div className="modal-footer">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={`btn-fill ${!yamlText.trim() ? 'btn-disabled' : ''}`}
            onClick={handleImport}
            disabled={!yamlText.trim()}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Import & Edit
          </button>
        </div>
      </div>
    </div>
  );
}
