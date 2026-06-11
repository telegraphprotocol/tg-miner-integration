'use client';

import type { FormState } from '../../types';

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

export default function BasicsSection({ state, set }: Props) {
  return (
    <div className="section-fields">
      <div className="field-row-2">
        <div className="field-group">
          <label className="field-label">
            Schema Version
            <Tooltip lines={['Always <strong>1</strong> for the current Telegraph spec. Fixed — do not change.']} />
          </label>
          <input className="field-input field-locked" value="1" readOnly />
        </div>
        <div className="field-group">
          <label className="field-label">
            Integration ID <span className="field-required">*</span>
            <Tooltip lines={['Numeric ID assigned to this integration.', 'Used in smart contracts and URL routing — e.g. <strong>34</strong>.']} />
          </label>
          <input
            className="field-input"
            type="number"
            min="0"
            placeholder="e.g. 34"
            value={state.id}
            onChange={e => set('id', e.target.value)}
          />
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">
          Kind
          <Tooltip lines={[
            '<strong>subnet</strong> — on-demand AI inference API (miner). <strong>validator</strong> — validation/scoring service.',
          ]} />
        </label>
        <div className="chips">
          {['subnet', 'validator'].map(o => (
            <button key={o} type="button" className={`chip ${state.kind === o ? 'chip-on' : ''}`} onClick={() => set('kind', o)}>
              {o}
            </button>
          ))}
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">
          Protocol
          <Tooltip lines={[
            '<strong>bittensor</strong> — Bittensor subnet (default).',
            '<strong>generic</strong> — any custom REST API not tied to a specific network.',
          ]} />
        </label>
        <div className="chips">
          {['bittensor', 'generic'].map(o => (
            <button key={o} type="button" className={`chip ${state.protocol === o ? 'chip-on' : ''}`} onClick={() => set('protocol', state.protocol === o ? '' : o)}>
              {o}
            </button>
          ))}
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">
          Slug <span className="field-required">*</span>
          <Tooltip lines={[
            'Only lowercase letters, numbers, and hyphens.',
            'No spaces or special characters.',
            'e.g. <strong>my-api-v1</strong>',
          ]} />
        </label>
        <input
          className="field-input"
          placeholder="my-api-provider-v1"
          value={state.slug}
          onChange={e => set('slug', e.target.value)}
        />
      </div>

      <div className="field-group">
        <label className="field-label">
          Name <span className="field-required">*</span>
          <Tooltip lines={['Human-readable display name shown in docs and the Kraken UI.']} />
        </label>
        <input
          className="field-input"
          placeholder="My API Integration"
          value={state.name}
          onChange={e => set('name', e.target.value)}
        />
      </div>

      <div className="field-group">
        <label className="field-label">
          Description
          <Tooltip lines={[
            'Shown in docs, terminal UI, and used as engine context.',
            'Describe what this integration provides and how the autonomous engine should use it.',
          ]} />
        </label>
        <textarea
          className="field-input field-textarea"
          rows={4}
          placeholder="What does this integration provide? How does the autonomous engine use it?"
          value={state.description}
          onChange={e => set('description', e.target.value)}
        />
      </div>
    </div>
  );
}
