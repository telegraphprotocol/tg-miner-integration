'use client';

import { useState } from 'react';
import type { FormState, OnChainFieldItem, OnChainRequestItem, OnChainBodyField } from '../../types';
import { uid } from '../../formState';
import { outputFieldPaths } from '../../schemaUtils';

interface Props {
  state: FormState;
  set: (key: keyof FormState, value: unknown) => void;
}

type ArrayKey = 'onchain_strings' | 'onchain_integers' | 'onchain_bools';
const ARRAY_TABS: { key: ArrayKey; label: string; hint: string }[] = [
  { key: 'onchain_strings',   label: 'strings[]',   hint: 'String values extracted from the API response' },
  { key: 'onchain_integers',  label: 'integers[]',  hint: 'Integer/fixed-point values (use multiplier to encode decimals)' },
  { key: 'onchain_bools',     label: 'bools[]',     hint: 'Boolean values extracted from the API response' },
];

function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function TrashIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
}

function FieldItemRow({ item, idx, onChange, onRemove, showMultiplier, showTransformRule, pathSuggestions }: {
  item: OnChainFieldItem; idx: number;
  onChange: (f: OnChainFieldItem) => void;
  onRemove: () => void;
  showMultiplier: boolean;
  showTransformRule: boolean;
  pathSuggestions: string[];
}) {
  const f = (k: keyof OnChainFieldItem, v: string) => onChange({ ...item, [k]: v });
  const listId = `path-suggest-${item._id}`;

  return (
    <div className={`array-card array-card-sm${item.autoConfigured ? ' auto-cfg' : ''}`}>
      <div className="array-card-header">
        <div className="array-card-index">{idx}</div>
        <span className="array-card-label">{item.name || `Field ${idx}`}</span>
        {item.autoConfigured && <span className="auto-cfg-badge">⚡ AUTO</span>}
        <button type="button" className="btn-icon-danger" onClick={onRemove}><TrashIcon /></button>
      </div>
      <div className="array-card-body">
        <div className="field-row-2">
          <div className="field-group">
            <label className="field-label">On-chain Name</label>
            <input
              className="field-input field-mono"
              placeholder="result_field"
              value={item.name}
              onChange={e => f('name', e.target.value)}
            />
            <p className="field-hint">Identifier used in the on-chain data layout.</p>
          </div>
          <div className="field-group">
            <label className="field-label">Source Path</label>
            <input
              className="field-input field-mono"
              list={listId}
              placeholder="response.field_name"
              value={item.source_path}
              onChange={e => f('source_path', e.target.value)}
            />
            {pathSuggestions.length > 0 && (
              <datalist id={listId}>
                {pathSuggestions.map(p => <option key={p} value={p} />)}
              </datalist>
            )}
            <p className="field-hint">
              Dot-path into the API response (e.g. <code className="inline-code">data.score</code>,{' '}
              <code className="inline-code">result.0.value</code>).
              {pathSuggestions.length > 0 && ' Suggestions from your output schema.'}
            </p>
          </div>
        </div>
        <div className="field-group">
          <label className="field-label">Description <span className="field-required">*</span></label>
          <input
            className={`field-input${!item.description ? ' field-input-warn' : ''}`}
            placeholder="What this field represents and any conversion notes."
            value={item.description}
            onChange={e => f('description', e.target.value)}
          />
          {!item.description && <p className="field-error" style={{ marginTop: 4 }}>Required by the schema.</p>}
        </div>
        {(showMultiplier || showTransformRule) && (
          <div className="field-row-2">
            {showMultiplier && (
              <div className="field-group">
                <label className="field-label">Multiplier</label>
                <input
                  className="field-input"
                  type="number"
                  placeholder="1"
                  value={item.multiplier}
                  onChange={e => f('multiplier', e.target.value)}
                />
                <p className="field-hint">Scale factor to encode decimals as integers (e.g. <code className="inline-code">100</code> for 2 decimal places).</p>
              </div>
            )}
            {showTransformRule && (
              <div className="field-group">
                <label className="field-label">Transform Rule</label>
                <input
                  className="field-input field-mono"
                  placeholder="bool_from_int"
                  value={item.transform_rule}
                  onChange={e => f('transform_rule', e.target.value)}
                />
                <p className="field-hint">
                  <code className="inline-code">bool_from_int</code> — non-zero = true.{' '}
                  <code className="inline-code">bool_from_eq:value</code> — equals value = true.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function buildOnchainSourceSuggestions(state: FormState): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];
  state.onchain_strings.forEach((f, i) => {
    const v = `strings.${i}`;
    result.push({ value: v, label: f.name ? `${v} — ${f.name}` : v });
  });
  // Note: on-chain integers[] are referenced as numbers.N in request mappings (per the YAML standard)
  state.onchain_integers.forEach((f, i) => {
    const v = `numbers.${i}`;
    result.push({ value: v, label: f.name ? `${v} — ${f.name}` : v });
  });
  state.onchain_bools.forEach((f, i) => {
    const v = `bools.${i}`;
    result.push({ value: v, label: f.name ? `${v} — ${f.name}` : v });
  });
  return result;
}

function RequestItemCard({ req, idx, onChange, onRemove, sourceSuggestions }: {
  req: OnChainRequestItem; idx: number;
  onChange: (r: OnChainRequestItem) => void;
  onRemove: () => void;
  sourceSuggestions: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'body' | 'query'>('body');

  const addBodyField = () =>
    onChange({ ...req, body_fields: [...req.body_fields, { _id: uid(), field_name: '', source: '', optional: false, type: '', format: '' }] });
  const removeBodyField = (id: string) =>
    onChange({ ...req, body_fields: req.body_fields.filter(f => f._id !== id) });
  const updateBodyField = (id: string, k: keyof OnChainBodyField, v: string | boolean) =>
    onChange({ ...req, body_fields: req.body_fields.map(f => f._id === id ? { ...f, [k]: v } : f) });

  const addQueryField = () =>
    onChange({ ...req, query_fields: [...req.query_fields, { _id: uid(), field_name: '', source: '', optional: false, type: '', format: '' }] });
  const removeQueryField = (id: string) =>
    onChange({ ...req, query_fields: req.query_fields.filter(f => f._id !== id) });
  const updateQueryField = (id: string, k: keyof OnChainBodyField, v: string | boolean) =>
    onChange({ ...req, query_fields: req.query_fields.map(f => f._id === id ? { ...f, [k]: v } : f) });

  const activeFields = tab === 'body' ? req.body_fields : req.query_fields;
  const addField = tab === 'body' ? addBodyField : addQueryField;
  const removeField = tab === 'body' ? removeBodyField : removeQueryField;
  const updateField = tab === 'body' ? updateBodyField : updateQueryField;
  const sourceListId = `src-suggest-${req._id}-${tab}`;

  return (
    <div className="array-card">
      <div className="array-card-header">
        <button type="button" className="array-card-toggle" onClick={() => setOpen(o => !o)}>
          <div className="array-card-index">{idx + 1}</div>
          <span className="array-card-label">{req.endpoint || 'Unnamed mapping'}</span>
          {req.method && <span className="method-badge method-badge-sm">{req.method}</span>}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <button type="button" className="btn-icon-danger" onClick={onRemove}><TrashIcon /></button>
      </div>

      {open && (
        <div className="array-card-body">
          <div className="field-row-2">
            <div className="field-group">
              <label className="field-label">Endpoint Keyword <span className="field-required">*</span></label>
              <input
                className="field-input field-mono"
                placeholder="predict"
                value={req.endpoint}
                onChange={e => onChange({ ...req, endpoint: e.target.value })}
              />
              <p className="field-hint">
                Keyword that matches an endpoint path from the Endpoints section
                (e.g. if path is <code className="inline-code">/v1/predict</code>, use <code className="inline-code">predict</code>).
              </p>
            </div>
            <div className="field-group">
              <label className="field-label">Method</label>
              <div className="field-select-wrap">
                <select className="field-input field-select" value={req.method} onChange={e => onChange({ ...req, method: e.target.value })}>
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
                <svg className="field-select-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>

          {/* Body / Query tabs */}
          <div className="sub-tabs">
            <button type="button" className={`sub-tab ${tab === 'body' ? 'sub-tab-active' : ''}`} onClick={() => setTab('body')}>
              body {req.body_fields.length > 0 && <span className="sub-tab-count">{req.body_fields.length}</span>}
            </button>
            <button type="button" className={`sub-tab ${tab === 'query' ? 'sub-tab-active' : ''}`} onClick={() => setTab('query')}>
              query_params {req.query_fields.length > 0 && <span className="sub-tab-count">{req.query_fields.length}</span>}
            </button>
          </div>

          <p className="field-hint" style={{ marginBottom: 8 }}>
            Map on-chain stored values to request fields. Sources:{' '}
            <code className="inline-code">strings.N</code>,{' '}
            <code className="inline-code">numbers.N</code> (integers),{' '}
            <code className="inline-code">bools.N</code>.
            {sourceSuggestions.length > 0 && ' Auto-complete shows your defined on-chain fields.'}
          </p>

          {sourceSuggestions.length > 0 && (
            <datalist id={sourceListId}>
              {sourceSuggestions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </datalist>
          )}

          {activeFields.length > 0 && (
            <div className="req-field-table">
              <div className="req-field-header">
                <span>Field Name</span>
                <span>Source (on-chain ref)</span>
                <span>Opts</span>
                <span></span>
              </div>
              {activeFields.map(f => (
                <div key={f._id} className={`req-field-row${f.autoConfigured ? ' auto-cfg' : ''}`}>
                  <input
                    className="field-input field-mono req-field-input"
                    placeholder="input_field"
                    value={f.field_name}
                    onChange={e => updateField(f._id, 'field_name', e.target.value)}
                  />
                  <input
                    className="field-input field-mono req-field-input"
                    list={sourceListId}
                    placeholder="strings.0"
                    value={f.source}
                    onChange={e => updateField(f._id, 'source', e.target.value)}
                  />
                  <div className="req-field-opts">
                    <div className="field-select-wrap req-select-wrap">
                      <select
                        className="field-input field-select req-type-select"
                        value={f.type || f.format}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === 'chat_messages') {
                            updateField(f._id, 'type', '');
                            updateField(f._id, 'format', 'chat_messages');
                          } else {
                            updateField(f._id, 'format', '');
                            updateField(f._id, 'type', v);
                          }
                        }}
                      >
                        <option value="">–</option>
                        <option value="float">float</option>
                        <option value="int">int</option>
                        <option value="bool">bool</option>
                        <option value="chat_messages">chat_messages</option>
                      </select>
                      <svg className="field-select-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    <label className="opt-checkbox">
                      <input type="checkbox" checked={f.optional} onChange={e => updateField(f._id, 'optional', e.target.checked)} />
                      <span>opt</span>
                    </label>
                  </div>
                  <button type="button" className="btn-icon-danger" onClick={() => removeField(f._id)}><TrashIcon /></button>
                </div>
              ))}
            </div>
          )}

          <button type="button" className="btn-add-sm" onClick={addField}>
            <PlusIcon /> Add {tab === 'body' ? 'body' : 'query'} field
          </button>
        </div>
      )}
    </div>
  );
}

export default function OnChainSection({ state, set }: Props) {
  const [fieldTab, setFieldTab] = useState<ArrayKey>('onchain_strings');

  const tabInfo = ARRAY_TABS.find(t => t.key === fieldTab)!;
  const items: OnChainFieldItem[] = state[fieldTab] as OnChainFieldItem[];

  const pathSuggestions = outputFieldPaths(state.output_schema_fields);

  const addField = () => {
    const next = items.length;
    set(fieldTab, [...items, { _id: uid(), index: String(next), name: '', description: '', source_path: '', multiplier: '', transform_rule: '' }]);
  };
  const updateField = (id: string, updated: OnChainFieldItem) =>
    set(fieldTab, items.map(f => f._id === id ? updated : f));
  const removeField = (id: string) =>
    set(fieldTab, items.filter(f => f._id !== id));

  const addRequest = () => {
    set('onchain_request', [...state.onchain_request, { _id: uid(), endpoint: '', method: 'POST', content_type: '', body_fields: [], query_fields: [] }]);
  };
  const updateRequest = (id: string, updated: OnChainRequestItem) =>
    set('onchain_request', state.onchain_request.map(r => r._id === id ? updated : r));
  const removeRequest = (id: string) =>
    set('onchain_request', state.onchain_request.filter(r => r._id !== id));

  const sourceSuggestions = buildOnchainSourceSuggestions(state);

  return (
    <div className="section-fields">
      {/* Toggle */}
      <div className="field-group">
        <div className="toggle-row">
          <div>
            <div className="field-label">Enable On-Chain Layout</div>
            <p className="field-hint" style={{ marginTop: 2 }}>
              Maps API response values to typed on-chain storage arrays, then maps those stored values back into API request fields.
            </p>
          </div>
          <button
            type="button"
            className={`toggle ${state.onchain_enabled ? 'toggle-on' : ''}`}
            onClick={() => set('onchain_enabled', !state.onchain_enabled)}
          >
            <div className="toggle-thumb" />
          </button>
        </div>
      </div>

      {state.onchain_enabled && (
        <>
          <div className="notice-card notice-card-info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              <strong>Data flow:</strong> API response → on-chain fields (source paths) → contract storage (strings/integers/bools) → request mappings (re-injected as API inputs).
              Define your output schema in the <em>Advanced</em> section to get source path suggestions here.
            </span>
          </div>

          <div className="field-group">
            <label className="field-label">Description</label>
            <textarea
              className="field-input field-textarea"
              rows={3}
              placeholder="Describe what data this on-chain layout captures and why it is stored on-chain."
              value={state.onchain_description}
              onChange={e => set('onchain_description', e.target.value)}
            />
          </div>

          <div className="field-row-2">
            <div className="field-group">
              <label className="field-label">Transform</label>
              <div className="chips">
                {['direct', 'llm'].map(t => (
                  <button key={t} type="button" className={`chip ${state.onchain_transform === t ? 'chip-on' : ''}`} onClick={() => set('onchain_transform', t)}>
                    {t}
                  </button>
                ))}
              </div>
              <p className="field-hint">
                <strong>direct</strong> — deterministic dot-path extraction from response.{' '}
                <strong>llm</strong> — GPT-4o extracts values from complex/unstructured responses.
              </p>
            </div>
            <div className="field-group">
              <label className="field-label">Min Price (USDC)</label>
              <input
                className="field-input"
                type="number"
                min="0"
                step="0.001"
                placeholder="0.01"
                value={state.onchain_min_price_usdc}
                onChange={e => set('onchain_min_price_usdc', e.target.value)}
              />
              <p className="field-hint">Floor price for 402 payment gating.</p>
            </div>
          </div>

          {state.onchain_transform === 'llm' && (
            <div className="field-group">
              <label className="field-label">Prompt Template</label>
              <textarea
                className="field-input field-textarea field-mono"
                rows={4}
                placeholder="Extract a structured snapshot from {raw_response}. Schema: {field_schema}. Current UTC: {current_utc}."
                value={state.onchain_prompt_template}
                onChange={e => set('onchain_prompt_template', e.target.value)}
              />
              <p className="field-hint">
                Available placeholders:{' '}
                <code className="inline-code">{'{field_schema}'}</code>,{' '}
                <code className="inline-code">{'{raw_response}'}</code>,{' '}
                <code className="inline-code">{'{current_utc}'}</code>
              </p>
            </div>
          )}

          <div className="section-divider"><span>On-Chain Fields</span></div>
          <p className="section-desc-sm">
            Define which values from the API response are extracted and stored on-chain.
            Each field maps a response path to a typed slot in the contract's storage arrays.
            {pathSuggestions.length === 0 && (
              <span className="field-hint-inline"> Define your output schema in the <em>Advanced</em> section to get source path auto-complete.</span>
            )}
          </p>

          {/* Array type tabs */}
          <div className="sub-tabs">
            {ARRAY_TABS.map(t => {
              const count = (state[t.key] as OnChainFieldItem[]).length;
              return (
                <button key={t.key} type="button" className={`sub-tab ${fieldTab === t.key ? 'sub-tab-active' : ''}`} onClick={() => setFieldTab(t.key)}>
                  {t.label} {count > 0 && <span className="sub-tab-count">{count}</span>}
                </button>
              );
            })}
          </div>

          <p className="field-hint">{tabInfo.hint}</p>

          {items.map((item, idx) => (
            <FieldItemRow
              key={item._id}
              item={item}
              idx={idx}
              onChange={updated => updateField(item._id, updated)}
              onRemove={() => removeField(item._id)}
              showMultiplier={fieldTab === 'onchain_integers'}
              showTransformRule={fieldTab === 'onchain_bools'}
              pathSuggestions={pathSuggestions}
            />
          ))}

          <button type="button" className="btn-add-sm" onClick={addField}>
            <PlusIcon /> Add {fieldTab.replace('onchain_', '')} field
          </button>

          <div className="section-divider"><span>Request Mappings</span></div>
          <p className="section-desc-sm">
            Define how on-chain stored values are re-injected as API inputs. Each mapping targets one endpoint and specifies which on-chain array slots (<code className="inline-code">strings.N</code>, <code className="inline-code">integers.N</code>, etc.) map to which request fields.
          </p>

          {state.onchain_request.map((req, idx) => (
            <RequestItemCard
              key={req._id}
              req={req}
              idx={idx}
              onChange={updated => updateRequest(req._id, updated)}
              onRemove={() => removeRequest(req._id)}
              sourceSuggestions={sourceSuggestions}
            />
          ))}

          <button type="button" className="btn-add-endpoint" onClick={addRequest}>
            <PlusIcon /> Add Request Mapping
          </button>
        </>
      )}
    </div>
  );
}
