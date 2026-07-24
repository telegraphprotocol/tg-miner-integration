'use client';

import { useState } from 'react';
import type { FormState, SchemaField, LimitationItem } from '../../types';
import SchemaBuilder from '../SchemaBuilder';
import { schemaFieldsToJson, schemaJsonToFields } from '../../schemaUtils';
import { uid } from '../../formState';

const MACHINE_CODES = ['MAX_BODY_SIZE', 'MAX_PARAM_SIZE', 'MAX_PARAM_VALUE', 'MAX_PARAM_COUNT'];
const PROPERTIES = ['size_bytes', 'value', 'length', 'count'];
const OPERATORS = ['lte', 'gte', 'lt', 'gt', 'eq'];

function TrashIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
}
function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}

function LimitationsEditor({ items, onChange }: { items: LimitationItem[]; onChange: (v: LimitationItem[]) => void }) {
  const add = () => onChange([...items, { _id: uid(), code: '', message: '', param: '', property: '', value_bytes: '', value_num: '', operator: '' }]);
  const update = (id: string, patch: Partial<LimitationItem>) => onChange(items.map(l => l._id === id ? { ...l, ...patch } : l));
  const remove = (id: string) => onChange(items.filter(l => l._id !== id));

  return (
    <div className="section-fields">
      {items.map((l, idx) => (
        <div key={l._id} className="array-card array-card-sm">
          <div className="array-card-header">
            <div className="array-card-index">{idx}</div>
            <span className="array-card-label">{l.code || `Limitation ${idx}`}</span>
            <button type="button" className="btn-icon-danger" onClick={() => remove(l._id)}><TrashIcon /></button>
          </div>
          <div className="array-card-body">
            <div className="field-row-2">
              <div className="field-group">
                <label className="field-label">Code <span className="field-required">*</span></label>
                <input
                  className="field-input field-mono"
                  list={`limitation-code-${l._id}`}
                  placeholder="MAX_BODY_SIZE"
                  value={l.code}
                  onChange={e => update(l._id, { code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                />
                <datalist id={`limitation-code-${l._id}`}>
                  {MACHINE_CODES.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="field-group">
                <label className="field-label">Param</label>
                <input
                  className="field-input field-mono"
                  placeholder="request body key"
                  value={l.param}
                  onChange={e => update(l._id, { param: e.target.value })}
                />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Message <span className="field-required">*</span></label>
              <input
                className="field-input"
                placeholder="Human-readable description"
                value={l.message}
                onChange={e => update(l._id, { message: e.target.value })}
              />
            </div>
            <div className="field-row-3">
              <div className="field-group">
                <label className="field-label">Property</label>
                <div className="field-select-wrap">
                  <select className="field-input field-select" value={l.property} onChange={e => update(l._id, { property: e.target.value })}>
                    <option value="">–</option>
                    {PROPERTIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <svg className="field-select-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
              <div className="field-group">
                <label className="field-label">Operator</label>
                <div className="field-select-wrap">
                  <select className="field-input field-select" value={l.operator} onChange={e => update(l._id, { operator: e.target.value })}>
                    <option value="">–</option>
                    {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <svg className="field-select-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
              <div className="field-group">
                <label className="field-label">Value (bytes or num)</label>
                <input
                  className="field-input"
                  placeholder="value_bytes"
                  value={l.value_bytes}
                  onChange={e => update(l._id, { value_bytes: e.target.value })}
                />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Value (numeric)</label>
              <input
                className="field-input"
                placeholder="value_num"
                value={l.value_num}
                onChange={e => update(l._id, { value_num: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn-add-sm" onClick={add}>
        <PlusIcon /> Add limitation
      </button>
    </div>
  );
}

interface Props {
  state: FormState;
  set: (key: keyof FormState, value: unknown) => void;
}

type SchemaMode = 'visual' | 'raw';

function ModeToggle({ mode, onSwitch }: { mode: SchemaMode; onSwitch: (m: SchemaMode) => void }) {
  return (
    <div className="schema-mode-toggle">
      <button
        type="button"
        className={`schema-mode-btn ${mode === 'visual' ? 'schema-mode-btn-active' : ''}`}
        onClick={() => onSwitch('visual')}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
        Visual Builder
      </button>
      <button
        type="button"
        className={`schema-mode-btn ${mode === 'raw' ? 'schema-mode-btn-active' : ''}`}
        onClick={() => onSwitch('raw')}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
        Raw JSON
      </button>
    </div>
  );
}

function SchemaSection({
  title,
  desc,
  mode,
  fields,
  raw,
  onModeSwitch,
  onFieldsChange,
  onRawChange,
}: {
  title: string;
  desc: string;
  mode: SchemaMode;
  fields: SchemaField[];
  raw: string;
  onModeSwitch: (m: SchemaMode) => void;
  onFieldsChange: (f: SchemaField[]) => void;
  onRawChange: (v: string) => void;
}) {
  const handleModeSwitch = (next: SchemaMode) => {
    if (next === 'visual' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        const parsed_fields = schemaJsonToFields(parsed);
        if (parsed_fields) onFieldsChange(parsed_fields);
      } catch { /* keep existing fields */ }
    }
    if (next === 'raw' && fields.length) {
      const obj = schemaFieldsToJson(fields);
      if (obj) onRawChange(JSON.stringify(obj, null, 2));
    }
    onModeSwitch(next);
  };

  let jsonError = '';
  if (mode === 'raw' && raw.trim()) {
    try { JSON.parse(raw); } catch (e) { jsonError = (e as Error).message; }
  }

  return (
    <>
      <div className="schema-section-header">
        <div>
          <p className="section-desc-sm" style={{ marginBottom: 4 }}>{desc}</p>
        </div>
        <ModeToggle mode={mode} onSwitch={handleModeSwitch} />
      </div>

      {mode === 'visual' ? (
        <SchemaBuilder fields={fields} onChange={onFieldsChange} />
      ) : (
        <>
          <textarea
            className="field-input field-textarea field-mono schema-textarea"
            rows={10}
            placeholder={'{\n  "type": "object",\n  "required": ["field"],\n  "properties": {\n    "field": {\n      "type": "string",\n      "description": "..."\n    }\n  }\n}'}
            value={raw}
            onChange={e => onRawChange(e.target.value)}
            spellCheck={false}
          />
          {jsonError && <p className="field-error">Invalid JSON: {jsonError}</p>}
        </>
      )}
    </>
  );
}

export default function AdvancedSection({ state, set }: Props) {
  const [inputMode, setInputMode] = useState<SchemaMode>(
    state.input_schema_fields.length > 0 ? 'visual' : 'raw'
  );
  const [outputMode, setOutputMode] = useState<SchemaMode>(
    state.output_schema_fields.length > 0 ? 'visual' : 'raw'
  );

  return (
    <div className="section-fields">
      <div className="section-divider"><span>Limitations</span></div>
      <p className="section-desc-sm">
        Declare known constraints the integration enforces. Machine-enforced codes are validated against the node schema.
      </p>
      <LimitationsEditor items={state.limitations} onChange={v => set('limitations', v)} />

      <div className="section-divider"><span>Input Schema</span></div>
      <SchemaSection
        title="Input Schema"
        desc="Defines the shape of a valid request body. Used by the autonomous engine to construct API calls and by the CLI --call flag. Define fields your API expects as input."
        mode={inputMode}
        fields={state.input_schema_fields}
        raw={state.input_schema_raw}
        onModeSwitch={setInputMode}
        onFieldsChange={f => set('input_schema_fields', f)}
        onRawChange={v => set('input_schema_raw', v)}
      />

      <div className="section-divider"><span>Output Schema</span></div>
      <SchemaSection
        title="Output Schema"
        desc="Defines the shape of the API response. Fields defined here become available as source paths in the On-Chain section for mapping response values to on-chain storage."
        mode={outputMode}
        fields={state.output_schema_fields}
        raw={state.output_schema_raw}
        onModeSwitch={setOutputMode}
        onFieldsChange={f => set('output_schema_fields', f)}
        onRawChange={v => set('output_schema_raw', v)}
      />
    </div>
  );
}
