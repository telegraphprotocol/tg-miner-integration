'use client';

import { useState } from 'react';
import type { FormState, SchemaField } from '../../types';
import SchemaBuilder from '../SchemaBuilder';
import { schemaFieldsToJson, schemaJsonToFields } from '../../schemaUtils';

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
