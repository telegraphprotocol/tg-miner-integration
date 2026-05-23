'use client';

import type { FormState } from '../../types';

interface Props {
  state: FormState;
  set: (key: keyof FormState, value: unknown) => void;
}

function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="chips">
      {options.map(o => (
        <button key={o} type="button" className={`chip ${value === o ? 'chip-on' : ''}`} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
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

export default function ConnectionSection({ state, set }: Props) {
  return (
    <div className="section-fields">
      <div className="field-group">
        <label className="field-label">
          Base URL <span className="field-required">*</span>
          <Tooltip lines={[
            'Default upstream API base URL.',
            'Endpoint paths are appended to this unless overridden per-endpoint.',
            'e.g. <strong>https://api.example.com</strong>',
          ]} />
        </label>
        <input
          className="field-input"
          placeholder="https://api.bitmind.ai"
          value={state.base_url}
          onChange={e => set('base_url', e.target.value)}
        />
      </div>

      <div className="section-divider">
        <span>Authentication</span>
      </div>

      <div className="field-group">
        <label className="field-label">
          Auth Type
          <Tooltip lines={[
            '<strong>bearer</strong> — sends the key as <em>Authorization: Bearer &lt;key&gt;</em>.',
            '<strong>header</strong> — sends the key in a custom header you specify.',
            '<strong>none</strong> — no authentication required.',
          ]} />
        </label>
        <Chips options={['bearer', 'header', 'none']} value={state.auth_type} onChange={v => set('auth_type', v)} />
      </div>

      {state.auth_type !== 'none' && (
        <div className="field-row-2">
          <div className="field-group">
            <label className="field-label">
              Env Var <span className="field-required">*</span>
              <Tooltip lines={[
                'Name of the environment variable that holds the API key.',
                'The raw key is never stored here — only the variable name.',
                'e.g. <strong>MY_API_KEY</strong>',
              ]} />
            </label>
            <input
              className="field-input field-mono"
              placeholder="BITMIND_API_KEY"
              value={state.auth_env_var}
              onChange={e => set('auth_env_var', e.target.value.toUpperCase())}
            />
          </div>
          {state.auth_type === 'header' && (
            <div className="field-group">
              <label className="field-label">
                Header Name <span className="field-required">*</span>
                <Tooltip lines={[
                  'The HTTP header the key will be sent in.',
                  'e.g. <strong>X-Api-Key</strong> or <strong>Authorization</strong>',
                ]} />
              </label>
              <input
                className="field-input"
                placeholder="X-Api-Key"
                value={state.auth_header_name}
                onChange={e => set('auth_header_name', e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      <div className="section-divider">
        <span>Rate Limits & Resilience</span>
      </div>

      <div className="field-row-2">
        <div className="field-group">
          <label className="field-label">
            Rate Limit / sec
            <Tooltip lines={[
              'Maximum requests per second sent to the upstream API.',
              '<strong>0</strong> = no limit.',
            ]} />
          </label>
          <input
            className="field-input"
            type="number"
            min="0"
            placeholder="5"
            value={state.rate_limit_per_sec}
            onChange={e => set('rate_limit_per_sec', e.target.value)}
          />
        </div>
        <div className="field-group">
          <label className="field-label">
            Cache TTL (sec)
            <Tooltip lines={[
              'How long to cache API responses.',
              '<strong>0</strong> = no caching, every request hits the upstream.',
            ]} />
          </label>
          <input
            className="field-input"
            type="number"
            min="0"
            placeholder="0"
            value={state.cache_ttl_sec}
            onChange={e => set('cache_ttl_sec', e.target.value)}
          />
        </div>
      </div>

      <div className="field-row-2">
        <div className="field-group">
          <label className="field-label">
            Circuit Threshold
            <Tooltip lines={[
              'Number of consecutive failures before the circuit breaker opens and stops sending requests.',
            ]} />
          </label>
          <input
            className="field-input"
            type="number"
            min="0"
            placeholder="5"
            value={state.circuit_threshold}
            onChange={e => set('circuit_threshold', e.target.value)}
          />
        </div>
        <div className="field-group">
          <label className="field-label">
            Circuit Cooldown (sec)
            <Tooltip lines={[
              'Seconds to wait before retrying after the circuit breaker opens.',
            ]} />
          </label>
          <input
            className="field-input"
            type="number"
            min="0"
            placeholder="30"
            value={state.circuit_cooldown_seconds}
            onChange={e => set('circuit_cooldown_seconds', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
