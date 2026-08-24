'use client';

import { useMemo, useState } from 'react';
import { COUNTRIES, countryName } from '../countries';
import CountryFlag from './CountryFlag';

interface Props {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function CountrySelect({ value, onChange, disabled, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [query]);

  if (disabled) {
    return (
      <div className="field-input field-mono country-select-trigger country-select-disabled">
        {value ? <><CountryFlag code={value} /> {countryName(value)}</> : (placeholder ?? 'No country set')}
      </div>
    );
  }

  return (
    <div className="intent-search">
      <button
        type="button"
        className="field-input field-mono country-select-trigger"
        onClick={() => setOpen(o => !o)}
      >
        {value ? <><CountryFlag code={value} /> {countryName(value)}</> : (placeholder ?? 'Select your country…')}
      </button>

      {open && (
        <div className="field-group">
          <input
            className="field-input field-mono"
            type="text"
            autoFocus
            placeholder="Search countries…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      )}

      {open && (
        filtered.length === 0 ? (
          <p className="field-hint">No matching countries.</p>
        ) : (
          <div className="intent-search-list">
            {filtered.map(c => (
              <button
                key={c.code}
                type="button"
                className="intent-search-item"
                onClick={() => { onChange(c.code); setOpen(false); setQuery(''); }}
              >
                <span className="intent-search-item-name"><CountryFlag code={c.code} /> {c.name}</span>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}
