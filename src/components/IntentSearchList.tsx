'use client';

import { useMemo, useState } from 'react';
import type { CanonicalIntent } from '../hooks/useCanonicalIntents';
import Spinner from './Spinner';

interface Props {
  intents: CanonicalIntent[];
  isLoading: boolean;
  error: Error | null;
  excluded?: string[];
  onSelect: (name: string) => void;
  placeholder?: string;
}

export default function IntentSearchList({ intents, isLoading, error, excluded = [], onSelect, placeholder }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return intents
      .filter(i => !excluded.includes(i.name))
      .filter(i => !q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
  }, [intents, excluded, query]);

  return (
    <div className="intent-search">
      <div className="field-group">
        <input
          className="field-input field-mono"
          type="text"
          placeholder={placeholder ?? 'Search intents…'}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="field-hint"><Spinner /> Loading canonical intents from the registry contract…</p>
      ) : error ? (
        <p className="field-error">Could not load intents from the contract. Try again shortly.</p>
      ) : filtered.length === 0 ? (
        <p className="field-hint">No matching intents.</p>
      ) : (
        <div className="intent-search-list">
          {filtered.map(intent => (
            <button
              key={intent.name}
              type="button"
              className="intent-search-item"
              onClick={() => onSelect(intent.name)}
              title={intent.description}
            >
              <span className="intent-search-item-name">{intent.name}</span>
              {intent.description && <span className="intent-search-item-desc">{intent.description}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
