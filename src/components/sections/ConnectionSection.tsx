'use client';

import type { AuthInjectItem, FormState } from '../../types';
import { uid } from '../../formState';

interface Props {
  state: FormState;
  set: (key: keyof FormState, value: unknown) => void;
}

const INJECT_LOCATIONS = ['header', 'query', 'body', 'multipart'];

function TrashIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
}
function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}

function AuthInjectEditor({ items, onChange }: { items: AuthInjectItem[]; onChange: (v: AuthInjectItem[]) => void }) {
  const add = () => onChange([...items, { _id: uid(), in: 'query', name: '', secret: '', value_prefix: '' }]);
  const update = (id: string, patch: Partial<AuthInjectItem>) => onChange(items.map(i => i._id === id ? { ...i, ...patch } : i));
  const remove = (id: string) => onChange(items.filter(i => i._id !== id));

  return (
    <div className="field-group">
      <div className="array-sub-header">
        <label className="field-label" style={{ marginBottom: 0 }}>
          Additional Injection Points
          <Tooltip lines={[
            'For APIs that expect the key somewhere other than a header — e.g. <strong>?apikey=...</strong> in the query string.',
            'Leave empty if the fields above already cover your auth.',
          ]} />
        </label>
        <button type="button" className="btn-add-sm" onClick={add}><PlusIcon /> Add</button>
      </div>
      {items.length > 0 && (
        <div className="section-fields" style={{ marginTop: 8 }}>
          {items.map(i => (
            <div key={i._id} className="array-card array-card-sm">
              <div className="array-card-body">
                <div className="field-row-2">
                  <div className="field-group">
                    <label className="field-label">In</label>
                    <div className="field-select-wrap">
                      <select className="field-input field-select" value={i.in} onChange={e => update(i._id, { in: e.target.value })}>
                        {INJECT_LOCATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <svg className="field-select-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  <div className="field-group">
                    <label className="field-label">Name</label>
                    <input className="field-input field-mono" placeholder="apikey" value={i.name} onChange={e => update(i._id, { name: e.target.value })} />
                  </div>
                </div>
                <div className="field-row-2">
                  <div className="field-group">
                    <label className="field-label">Secret Key <span className="field-hint" style={{ fontWeight: 400 }}>(optional)</span></label>
                    <input className="field-input field-mono" placeholder="api_key" value={i.secret} onChange={e => update(i._id, { secret: e.target.value })} />
                    <p className="field-hint">For multi-secret providers — selects one field from a JSON key.</p>
                  </div>
                  <div className="field-group">
                    <label className="field-label">Value Prefix <span className="field-hint" style={{ fontWeight: 400 }}>(optional)</span></label>
                    <input className="field-input field-mono" placeholder="Token " value={i.value_prefix} onChange={e => update(i._id, { value_prefix: e.target.value })} />
                  </div>
                </div>
                <button type="button" className="btn-ghost reg-danger" onClick={() => remove(i._id)}>
                  <TrashIcon /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
              Env Var <span className="field-hint" style={{ fontWeight: 400 }}>(legacy, optional)</span>
              <Tooltip lines={[
                '<strong>Not read by the node.</strong> Kept only for backward compatibility.',
                'Your key is no longer sourced from an environment variable —',
                'install it after registering (Dashboard → API Key), signed with your registering wallet.',
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

      {state.auth_type !== 'none' && (
        <div className="field-group">
          <label className="field-label">
            Value Prefix
            <Tooltip lines={[
              'Prefix prepended to the key value when injected into the header.',
              `Defaults to <strong>"Bearer "</strong> for bearer auth, empty otherwise.`,
              'e.g. <strong>APIKey </strong> or <strong>Token </strong>',
            ]} />
          </label>
          <input
            className="field-input field-mono"
            placeholder="Bearer "
            value={state.auth_value_prefix}
            onChange={e => set('auth_value_prefix', e.target.value)}
          />
        </div>
      )}

      <AuthInjectEditor items={state.auth_inject} onChange={v => set('auth_inject', v)} />

      <div className="section-divider">
        <span>Error Reporting</span>
      </div>
      <p className="section-desc-sm">
        Tell the protocol where your API reports failures, as dot-paths into your JSON response body. Optional — omit entirely if your API uses real HTTP status codes.
      </p>

      <div className="field-row-2">
        <div className="field-group">
          <label className="field-label">
            Message Path
            <Tooltip lines={[
              'Path to your human-readable error message.',
              'e.g. <strong>detail</strong> or <strong>errors.0.message</strong>',
            ]} />
          </label>
          <input
            className="field-input field-mono"
            placeholder="errors.0.message"
            value={state.errors_message_path}
            onChange={e => set('errors_message_path', e.target.value)}
          />
        </div>
        <div className="field-group">
          <label className="field-label">
            Code Path
            <Tooltip lines={['Path to your machine-readable error code.', 'e.g. <strong>error.code</strong>']} />
          </label>
          <input
            className="field-input field-mono"
            placeholder="error.code"
            value={state.errors_code_path}
            onChange={e => set('errors_code_path', e.target.value)}
          />
        </div>
      </div>

      <div className="field-row-2">
        <div className="field-group">
          <label className="field-label">
            Status Path
            <Tooltip lines={[
              'Only needed if your API reports the real outcome <strong>inside a 200 response</strong>.',
              'Path to that status field.',
            ]} />
          </label>
          <input
            className="field-input field-mono"
            placeholder="responseStatus"
            value={state.errors_status_path}
            onChange={e => set('errors_status_path', e.target.value)}
          />
        </div>
        <div className="field-group">
          <label className="field-label">
            Success Values
            <Tooltip lines={['Comma-separated values at Status Path that mean success.', 'Defaults to <strong>200</strong> if Status Path is set and this is left empty.']} />
          </label>
          <input
            className="field-input field-mono"
            placeholder="200"
            value={state.errors_success_values}
            onChange={e => set('errors_success_values', e.target.value)}
          />
        </div>
      </div>

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
