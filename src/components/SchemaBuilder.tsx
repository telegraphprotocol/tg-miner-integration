'use client';

import { useState } from 'react';
import type { SchemaField, SchemaFieldType } from '../types';
import { uid } from '../formState';

const FIELD_TYPES: SchemaFieldType[] = ['string', 'number', 'integer', 'boolean', 'array', 'object'];
const STRING_FORMATS = ['', 'uri', 'url', 'date-time', 'date', 'time', 'email', 'uuid', 'hostname', 'ipv4', 'ipv6'];

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function FieldRow({ field, onChange, onRemove }: {
  field: SchemaField;
  onChange: (f: SchemaField) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const f = (k: keyof SchemaField, v: unknown) => onChange({ ...field, [k]: v });

  const hasConstraints = ['string', 'number', 'integer', 'array'].includes(field.type);

  return (
    <div className={`schema-field-row${field.autoConfigured ? ' auto-cfg' : ''}`}>
      <div className="schema-field-main">
        <input
          className="field-input field-mono schema-name-input"
          placeholder="field_name"
          value={field.name}
          onChange={e => f('name', e.target.value)}
          spellCheck={false}
        />

        <div className="schema-type-chips">
          {FIELD_TYPES.map(t => (
            <button
              key={t}
              type="button"
              className={`chip chip-xs ${field.type === t ? 'chip-on' : ''}`}
              onClick={() => f('type', field.type === t ? '' : t)}
            >
              {t}
            </button>
          ))}
        </div>

        <input
          className="field-input schema-desc-input"
          placeholder="Description"
          value={field.description}
          onChange={e => f('description', e.target.value)}
        />

        <label className="opt-checkbox schema-req-check" title="Required">
          <input
            type="checkbox"
            checked={field.required}
            onChange={e => f('required', e.target.checked)}
          />
          <span>req</span>
        </label>

        {hasConstraints ? (
          <button
            type="button"
            className="btn-icon-sm"
            onClick={() => setExpanded(x => !x)}
            title="Constraints"
          >
            <ChevronIcon open={expanded} />
          </button>
        ) : (
          <span className="schema-no-constraints" />
        )}

        <button type="button" className="btn-icon-danger" onClick={onRemove}>
          <TrashIcon />
        </button>
      </div>

      {expanded && hasConstraints && (
        <div className="schema-field-constraints">
          {(field.type === 'string') && (
            <div className="field-row-3">
              <div className="field-group">
                <label className="field-label">minLength</label>
                <input className="field-input" type="number" min="0" placeholder="—" value={field.min_length} onChange={e => f('min_length', e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">maxLength</label>
                <input className="field-input" type="number" min="0" placeholder="—" value={field.max_length} onChange={e => f('max_length', e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">format</label>
                <div className="field-select-wrap">
                  <select className="field-input field-select" value={field.format} onChange={e => f('format', e.target.value)}>
                    {STRING_FORMATS.map(fmt => <option key={fmt} value={fmt}>{fmt || '— none —'}</option>)}
                  </select>
                  <svg className="field-select-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
              <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">enum values <span className="field-hint-inline">(comma-separated)</span></label>
                <input className="field-input field-mono" placeholder="pending, active, complete" value={field.enum_values} onChange={e => f('enum_values', e.target.value)} />
              </div>
              <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">pattern <span className="field-hint-inline">(regex)</span></label>
                <input className="field-input field-mono" placeholder="^[a-zA-Z0-9_]+$" value={field.pattern} onChange={e => f('pattern', e.target.value)} />
              </div>
            </div>
          )}

          {(field.type === 'number' || field.type === 'integer') && (
            <div className="field-row-3">
              <div className="field-group">
                <label className="field-label">minimum</label>
                <input className="field-input" type="number" placeholder="—" value={field.minimum} onChange={e => f('minimum', e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">maximum</label>
                <input className="field-input" type="number" placeholder="—" value={field.maximum} onChange={e => f('maximum', e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">enum values <span className="field-hint-inline">(comma-sep)</span></label>
                <input className="field-input field-mono" placeholder="0, 1, 2" value={field.enum_values} onChange={e => f('enum_values', e.target.value)} />
              </div>
            </div>
          )}

          {field.type === 'array' && (
            <div className="field-group">
              <label className="field-label">items type</label>
              <div className="chips">
                {(['string', 'number', 'integer', 'boolean', 'object'] as SchemaFieldType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`chip chip-xs ${field.items_type === t ? 'chip-on' : ''}`}
                    onClick={() => f('items_type', field.items_type === t ? '' : t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  fields: SchemaField[];
  onChange: (fields: SchemaField[]) => void;
}

export default function SchemaBuilder({ fields, onChange }: Props) {
  const emptyField = (): SchemaField => ({
    _id: uid(),
    name: '',
    type: 'string',
    description: '',
    required: false,
    enum_values: '',
    minimum: '',
    maximum: '',
    min_length: '',
    max_length: '',
    pattern: '',
    format: '',
    items_type: '',
  });

  const addField = () => onChange([...fields, emptyField()]);
  const updateField = (id: string, updated: SchemaField) => onChange(fields.map(f => f._id === id ? updated : f));
  const removeField = (id: string) => onChange(fields.filter(f => f._id !== id));

  return (
    <div className="schema-builder">
      {fields.length > 0 && (
        <div className="schema-field-list">
          <div className="schema-field-header">
            <span>Name</span>
            <span>Type</span>
            <span>Description</span>
            <span>Req</span>
            <span></span>
            <span></span>
          </div>
          {fields.map(field => (
            <FieldRow
              key={field._id}
              field={field}
              onChange={updated => updateField(field._id, updated)}
              onRemove={() => removeField(field._id)}
            />
          ))}
        </div>
      )}

      {fields.length === 0 && (
        <p className="schema-empty-hint">No fields defined. Add fields to describe the schema shape.</p>
      )}

      <button type="button" className="btn-add-sm" onClick={addField}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add field
      </button>
    </div>
  );
}
