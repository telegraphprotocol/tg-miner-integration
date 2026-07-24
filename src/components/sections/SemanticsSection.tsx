'use client';

import { useState } from 'react';
import type { FormState } from '../../types';
import { CANONICAL_INTENTS } from '../../types';

interface Props {
  state: FormState;
  set: (key: keyof FormState, value: unknown) => void;
}

function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function TrashIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
}

export default function SemanticsSection({ state, set }: Props) {
  const [newIntent, setNewIntent] = useState('');

  const normalizeIntent = (v: string) => v.trim().toUpperCase().replace(/\s+/g, '_');

  const addIntent = () => {
    const v = normalizeIntent(newIntent);
    if (!v || state.semantics_intents.includes(v)) return;
    set('semantics_intents', [...state.semantics_intents, v]);
    setNewIntent('');
  };

  const removeIntent = (idx: number) =>
    set('semantics_intents', state.semantics_intents.filter((_, i) => i !== idx));

  const addCanonical = (intent: string) => {
    if (state.semantics_intents.includes(intent)) return;
    set('semantics_intents', [...state.semantics_intents, intent]);
  };

  const unusedCanonicals = CANONICAL_INTENTS.filter(i => !state.semantics_intents.includes(i));

  return (
    <div className="section-fields">
      <div className="section-divider"><span>Signal Mapping</span></div>

      <p className="section-desc-sm">
        Tells the autonomous engine how to interpret this API's response. Works for any API type — classification, generation, embeddings, search, and more.
      </p>

      {/* Mapping fields — all optional */}
      <div className="field-row-3">
        <div className="field-group">
          <label className="field-label">Label Field</label>
          <input
            className="field-input field-mono"
            placeholder="choices"
            value={state.semantics_label_field}
            onChange={e => set('semantics_label_field', e.target.value)}
          />
          <p className="field-hint">
            Primary output field in the response (e.g. <code className="inline-code">choices</code>,{' '}
            <code className="inline-code">output_text</code>, <code className="inline-code">result</code>).
            Optional.
          </p>
        </div>
        <div className="field-group">
          <label className="field-label">Confidence Field</label>
          <input
            className="field-input field-mono"
            placeholder="confidence"
            value={state.semantics_confidence_field}
            onChange={e => set('semantics_confidence_field', e.target.value)}
          />
          <p className="field-hint">
            Response field holding a 0–1 probability/confidence score.
            Relevant for classification APIs. Optional.
          </p>
        </div>
        <div className="field-group">
          <label className="field-label">Reason Field</label>
          <input
            className="field-input field-mono"
            placeholder="reason"
            value={state.semantics_reason_field}
            onChange={e => set('semantics_reason_field', e.target.value)}
          />
          <p className="field-hint">
            Human-readable explanation field in the response (if available). Optional.
          </p>
        </div>
      </div>

      <div className="section-divider"><span>Supported Intents</span></div>

      <p className="section-desc-sm">
        Declare which tasks this integration can fulfill. The engine builds a{' '}
        <code className="inline-code">providersByIntent</code> routing map at startup.
        Use UPPER_SNAKE_CASE. Click a canonical intent to add it, or type a custom one.
      </p>

      {/* Added intents */}
      <div className="intent-list">
        {state.semantics_intents.map((intent, idx) => (
          <div key={idx} className="intent-chip">
            <span>{intent}</span>
            <button type="button" onClick={() => removeIntent(idx)} className="intent-remove">
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>

      {state.semantics_intents.length === 0 && (
        <p className="field-hint" style={{ marginTop: '8px' }}>
          No intents added yet. Click a canonical intent below or type a custom one.
        </p>
      )}

      {/* Canonical intent picker */}
      {unusedCanonicals.length > 0 && (
        <div className="intent-canonical-grid">
          {unusedCanonicals.map(intent => (
            <button
              key={intent}
              type="button"
              className="intent-canonical-btn"
              onClick={() => addCanonical(intent)}
              title="Click to add"
            >
              <PlusIcon />
              {intent}
            </button>
          ))}
        </div>
      )}

      {/* Custom intent input */}
      <div className="intent-add-row">
        <input
          className="field-input field-mono"
          placeholder="custom_intent_name"
          value={newIntent}
          onChange={e => setNewIntent(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addIntent())}
        />
        <button type="button" className="btn-add-sm btn-add-intent" onClick={addIntent}>
          <PlusIcon /> Add custom
        </button>
      </div>
      <p className="field-hint">Uppercased and underscore-formatted automatically. Press Enter to add.</p>
    </div>
  );
}
