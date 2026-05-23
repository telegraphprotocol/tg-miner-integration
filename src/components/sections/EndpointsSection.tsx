'use client';

import { useState } from 'react';
import type { FormState, EndpointItem, OnChainRequestItem } from '../../types';
import { uid } from '../../formState';
import { inferFromSamples, type InferResult } from '../../sampleInfer';

interface Props {
  state: FormState;
  set: (key: keyof FormState, value: unknown) => void;
}

function Tooltip({ lines }: { lines: string[] }) {
  return (
    <span className="field-tooltip-wrap">
      <span className="field-tooltip-icon">?</span>
      <span className="field-tooltip-popup">
        {lines.map((l, i) => (
          <span key={i} className="field-tooltip-line" dangerouslySetInnerHTML={{ __html: l }} />
        ))}
      </span>
    </span>
  );
}

function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function TrashIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
}
function ChevronIcon({ open }: { open: boolean }) {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// ── Sample panel inside each endpoint card ──────────────────────────────────
function SamplePanel({ ep, onApply, onSaveJson }: {
  ep: EndpointItem;
  onApply: (result: InferResult) => void;
  onSaveJson: (req: string, res: string) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'applied' | 'error'>(() =>
    ep.sample_request_json || ep.sample_response_json ? 'applied' : 'idle'
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [lastResult, setLastResult] = useState<InferResult | null>(null);

  const reqJson = ep.sample_request_json;
  const resJson = ep.sample_response_json;

  const handleChange = (field: 'req' | 'res', val: string) => {
    setStatus('idle');
    onSaveJson(field === 'req' ? val : reqJson, field === 'res' ? val : resJson);
  };

  const handleApply = () => {
    if (!reqJson.trim() && !resJson.trim()) {
      setErrorMsg('Paste at least one JSON sample to continue.');
      setStatus('error');
      return;
    }
    const out = inferFromSamples(reqJson, resJson, ep.path || ep.external_path || 'endpoint');
    if ('error' in out) {
      setErrorMsg(`Invalid ${out.error.field} JSON: ${out.error.message}`);
      setStatus('error');
      return;
    }
    setLastResult(out.result);
    setStatus('applied');
    setErrorMsg('');
    onApply(out.result);
  };

  return (
    <div className="sample-panel">
      <p className="sample-panel-desc">
        Paste a real request and response from this endpoint. We'll automatically generate the input/output schemas and on-chain field mappings.
      </p>

      <div className="sample-json-row">
        <div className="field-group">
          <label className="field-label">
            Request JSON
            {status === 'applied' && reqJson && <span className="sample-saved-badge">saved</span>}
          </label>
          <textarea
            className="field-input field-textarea field-mono sample-textarea"
            placeholder={'{\n  "model": "my-model",\n  "messages": [\n    { "role": "user", "content": "Hello" }\n  ],\n  "max_tokens": 1024\n}'}
            value={reqJson}
            onChange={e => handleChange('req', e.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="field-group">
          <label className="field-label">
            Response JSON
            {status === 'applied' && resJson && <span className="sample-saved-badge">saved</span>}
          </label>
          <textarea
            className="field-input field-textarea field-mono sample-textarea"
            placeholder={'{\n  "result": "...",\n  "confidence": 0.98,\n  "usage": {\n    "tokens": 42\n  }\n}'}
            value={resJson}
            onChange={e => handleChange('res', e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>

      {status === 'error' && (
        <p className="field-error" style={{ marginTop: 4 }}>{errorMsg}</p>
      )}

      {status === 'applied' && lastResult && (
        <div className="sample-applied">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>
            Auto-configured — {lastResult.summary.inputs} input fields,{' '}
            {lastResult.summary.outputs} output fields,{' '}
            {lastResult.summary.strings}s + {lastResult.summary.integers}i + {lastResult.summary.bools}b on-chain.{' '}
            Review and adjust in the <em>On-Chain</em> and <em>Advanced</em> sections.
          </span>
        </div>
      )}

      {status === 'applied' && !lastResult && (reqJson || resJson) && (
        <div className="sample-applied">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Samples saved. Edit and re-apply to update the configuration.</span>
        </div>
      )}

      <div className="sample-apply-row">
        <button type="button" className={`btn-sample-apply${status === 'applied' ? ' btn-sample-applied' : ''}`} onClick={handleApply}>
          {status === 'applied' ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Re-configure from samples
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Auto-configure from samples
            </>
          )}
        </button>
        {status === 'applied' && (
          <span className="sample-done-pill">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Configured
          </span>
        )}
      </div>
    </div>
  );
}

// ── Single endpoint card ────────────────────────────────────────────────────
function EndpointCard({ ep, idx, onChange, onRemove, onAutoInfer }: {
  ep: EndpointItem;
  idx: number;
  onChange: (updated: EndpointItem) => void;
  onRemove: () => void;
  onAutoInfer: (result: InferResult) => void;
}) {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  const f = (key: keyof EndpointItem, val: string) => onChange({ ...ep, [key]: val });

  const addParamRow = () =>
    onChange({ ...ep, param_map: [...ep.param_map, { _id: uid(), key: '', value: '' }] });
  const removeParamRow = (id: string) =>
    onChange({ ...ep, param_map: ep.param_map.filter(p => p._id !== id) });
  const updateParam = (id: string, k: 'key' | 'value', v: string) =>
    onChange({ ...ep, param_map: ep.param_map.map(p => p._id === id ? { ...p, [k]: v } : p) });

  const label = ep.path || ep.external_path || `Endpoint ${idx + 1}`;

  return (
    <div className="array-card">
      <div className="array-card-header">
        <button type="button" className="array-card-toggle" onClick={() => setOpen(o => !o)}>
          <div className="array-card-index">{idx + 1}</div>
          <span className="array-card-label">{label}</span>
          {ep.method && <span className="method-badge method-badge-sm">{ep.method}</span>}
          <ChevronIcon open={open} />
        </button>
        <button type="button" className="btn-icon-danger" onClick={onRemove} title="Remove endpoint">
          <TrashIcon />
        </button>
      </div>

      {open && (
        <div className="array-card-body">

          {/* ── Mode toggle ─────────────────────────── */}
          <div className="ep-mode-toggle">
            <button
              type="button"
              className={`ep-mode-btn ${mode === 'auto' ? 'ep-mode-btn-active' : ''}`}
              onClick={() => setMode('auto')}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Auto-configure
            </button>
            <button
              type="button"
              className={`ep-mode-btn ${mode === 'manual' ? 'ep-mode-btn-active' : ''}`}
              onClick={() => setMode('manual')}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
              </svg>
              Manual
            </button>
          </div>

          {/* ── Auto mode ───────────────────────────── */}
          {mode === 'auto' && (
            <>
              <div className="field-row-2">
                <div className="field-group">
                  <label className="field-label">
                    Telegraph Path <span className="field-required">*</span>
                    <Tooltip lines={[
                      'The path Telegraph exposes to the network.',
                      'This is what callers use to reach your endpoint.',
                      'e.g. <strong>/chat</strong>',
                    ]} />
                  </label>
                  <input
                    className="field-input field-mono"
                    placeholder="/chat"
                    value={ep.path}
                    onChange={e => f('path', e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">
                    API Endpoint Path <span className="field-required">*</span>
                    <Tooltip lines={[
                      'The actual path on your upstream API that Telegraph forwards requests to.',
                      'Combined with the Base URL from Connection settings.',
                      'e.g. <strong>/v1/messages</strong>',
                    ]} />
                  </label>
                  <input
                    className="field-input field-mono"
                    placeholder="/v1/messages"
                    value={ep.external_path}
                    onChange={e => f('external_path', e.target.value)}
                  />
                </div>
              </div>

              <div className="field-group" style={{ maxWidth: 200 }}>
                <label className="field-label">Method <span className="field-required">*</span></label>
                <div className="field-select-wrap">
                  <select className="field-input field-select" value={ep.method} onChange={e => f('method', e.target.value)}>
                    <option value="">Select…</option>
                    {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <svg className="field-select-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>

              <SamplePanel
                ep={ep}
                onApply={onAutoInfer}
                onSaveJson={(req, res) => onChange({ ...ep, sample_request_json: req, sample_response_json: res })}
              />
            </>
          )}

          {/* ── Manual mode ─────────────────────────── */}
          {mode === 'manual' && (
            <>
              <div className="field-row-2">
                <div className="field-group">
                  <label className="field-label">
                    Telegraph Path <span className="field-required">*</span>
                    <Tooltip lines={[
                      'The path Telegraph exposes to the network.',
                      'This is what callers use to reach your endpoint.',
                      'e.g. <strong>/chat</strong>',
                    ]} />
                  </label>
                  <input
                    className="field-input field-mono"
                    placeholder="/chat"
                    value={ep.path}
                    onChange={e => f('path', e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">
                    API Endpoint Path <span className="field-required">*</span>
                    <Tooltip lines={[
                      'The actual path on your upstream API that Telegraph forwards requests to.',
                      'Combined with the Base URL from Connection settings.',
                      'e.g. <strong>/v1/messages</strong>',
                    ]} />
                  </label>
                  <input
                    className="field-input field-mono"
                    placeholder="/v1/messages"
                    value={ep.external_path}
                    onChange={e => f('external_path', e.target.value)}
                  />
                </div>
              </div>

              <div className="field-row-2">
                <div className="field-group">
                  <label className="field-label">Method <span className="field-required">*</span></label>
                  <div className="field-select-wrap">
                    <select className="field-input field-select" value={ep.method} onChange={e => f('method', e.target.value)}>
                      <option value="">Select…</option>
                      {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <svg className="field-select-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label">Endpoint Base URL Override</label>
                  <input
                    className="field-input"
                    placeholder="https://other-host.example.com"
                    value={ep.endpoint_base_url}
                    onChange={e => f('endpoint_base_url', e.target.value)}
                  />
                  <p className="field-hint">Replaces the top-level base URL for this endpoint only.</p>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Description</label>
                <textarea
                  className="field-input field-textarea"
                  rows={2}
                  placeholder="What this endpoint does…"
                  value={ep.description}
                  onChange={e => f('description', e.target.value)}
                />
              </div>

              <div className="field-row-2">
                <div className="field-group">
                  <label className="field-label">Content-Type Override</label>
                  <input
                    className="field-input"
                    placeholder="multipart/form-data"
                    value={ep.content_type}
                    onChange={e => f('content_type', e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Multipart Fields</label>
                  <input
                    className="field-input"
                    placeholder="file, image, video"
                    value={ep.multipart_fields}
                    onChange={e => f('multipart_fields', e.target.value)}
                  />
                  <p className="field-hint">Comma-separated → <code className="inline-code">multipart_fields: [...]</code></p>
                </div>
              </div>

              <div className="field-group">
                <div className="array-sub-header">
                  <label className="field-label">Param Map</label>
                  <button type="button" className="btn-add-sm" onClick={addParamRow}><PlusIcon /> Add</button>
                </div>
                {ep.param_map.length > 0 ? (
                  <div className="kv-list">
                    {ep.param_map.map(p => (
                      <div key={p._id} className="kv-row">
                        <input className="field-input field-mono kv-input" placeholder="incoming_name" value={p.key} onChange={e => updateParam(p._id, 'key', e.target.value)} />
                        <span className="kv-arrow">→</span>
                        <input className="field-input field-mono kv-input" placeholder="upstream_name" value={p.value} onChange={e => updateParam(p._id, 'value', e.target.value)} />
                        <button type="button" className="btn-icon-danger" onClick={() => removeParamRow(p._id)}><TrashIcon /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="field-hint">Rename query params (e.g. <code className="inline-code">lat → latitude</code>). Click Add to begin.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section root ────────────────────────────────────────────────────────────
export default function EndpointsSection({ state, set }: Props) {
  const endpoints: EndpointItem[] = state.endpoints;

  const addEndpoint = () => {
    set('endpoints', [
      ...endpoints,
      { _id: uid(), path: '', external_path: '', method: 'POST', description: '', endpoint_base_url: '', content_type: '', multipart_fields: '', param_map: [], sample_request_json: '', sample_response_json: '' },
    ]);
  };

  const updateEndpoint = (id: string, updated: EndpointItem) =>
    set('endpoints', endpoints.map(e => e._id === id ? updated : e));

  const removeEndpoint = (id: string) =>
    set('endpoints', endpoints.filter(e => e._id !== id));

  // Apply inferred data from sample JSONs — React 18 batches all these set() calls
  const handleAutoInfer = (result: InferResult) => {
    set('input_schema_fields', result.input_schema_fields);
    set('output_schema_fields', result.output_schema_fields);
    set('onchain_strings', result.onchain_strings);
    set('onchain_integers', result.onchain_integers);
    set('onchain_bools', result.onchain_bools);
    const hasOnchain = result.onchain_strings.length > 0 || result.onchain_integers.length > 0 || result.onchain_bools.length > 0;
    set('onchain_enabled', hasOnchain);
    if (result.onchain_request.body_fields.length > 0 || result.onchain_request.query_fields.length > 0) {
      const existing = state.onchain_request as OnChainRequestItem[];
      // Replace existing mapping for same endpoint keyword, or append
      const keyword = result.onchain_request.endpoint;
      const already = existing.findIndex(r => r.endpoint === keyword);
      const next = already >= 0
        ? existing.map((r, i) => i === already ? result.onchain_request : r)
        : [...existing, result.onchain_request];
      set('onchain_request', next);
    }
  };

  return (
    <div className="section-fields">
      {endpoints.length === 0 && (
        <div className="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
          </svg>
          <p>No endpoints defined yet.</p>
          <p className="empty-state-sub">
            Click "Add Endpoint" below. For each endpoint you can paste a sample request and response — we'll auto-generate everything else.
          </p>
        </div>
      )}

      {endpoints.map((ep, idx) => (
        <EndpointCard
          key={ep._id}
          ep={ep}
          idx={idx}
          onChange={updated => updateEndpoint(ep._id, updated)}
          onRemove={() => removeEndpoint(ep._id)}
          onAutoInfer={handleAutoInfer}
        />
      ))}

      <button type="button" className="btn-add-endpoint" onClick={addEndpoint}>
        <PlusIcon /> Add Endpoint
      </button>
    </div>
  );
}
