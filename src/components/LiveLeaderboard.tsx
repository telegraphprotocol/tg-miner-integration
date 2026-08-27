'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Spinner from './Spinner';
import { useLeaderboard } from '../hooks/useLeaderboard';

interface Props {
  limit?: number;
  className?: string;
  /** Called when the "Get Ranked" CTA is clicked — defaults to scrolling to the root registration cards. */
  onGetRanked?: () => void;
}

const AUTO_REFRESH_MS = 15000;
const FLASH_MS = 2000;
const OVERALL_VALUE = '__overall__';

function rankClass(rank: number): string {
  if (rank === 1) return 'lb-rank-1';
  if (rank === 2) return 'lb-rank-2';
  if (rank === 3) return 'lb-rank-3';
  return '';
}

export default function LiveLeaderboard({ limit = 10, className, onGetRanked }: Props) {
  const { byIntent, isLoading, error, refetch } = useLeaderboard(limit);
  const [intentFilter, setIntentFilter] = useState('');
  const [changedSlugs, setChangedSlugs] = useState<Set<string>>(new Set());
  const prevRanksRef = useRef<Map<string, number> | null>(null);

  const intentOptions = useMemo(
    () => Object.keys(byIntent).sort(),
    [byIntent],
  );

  useEffect(() => {
    if (!intentFilter && intentOptions.length > 0) {
      setIntentFilter(OVERALL_VALUE);
    }
  }, [intentFilter, intentOptions]);

  const isOverall = intentFilter === OVERALL_VALUE;

  // For each intent, the #1-ranked miner. Grouped by miner so a miner topping
  // several intents shows up once with all of them listed, rather than once
  // per intent.
  const overallRows = useMemo(() => {
    const intentsByMiner = new Map<string, string[]>();
    for (const [intentId, rows] of Object.entries(byIntent)) {
      const top = rows.find(r => r.rank === 1);
      if (!top) continue;
      const list = intentsByMiner.get(top.miner_slug) ?? [];
      list.push(intentId);
      intentsByMiner.set(top.miner_slug, list);
    }
    return [...intentsByMiner.entries()]
      .map(([miner_slug, intentIds]) => ({ miner_slug, intentIds: intentIds.sort() }))
      .sort((a, b) => b.intentIds.length - a.intentIds.length || a.miner_slug.localeCompare(b.miner_slug));
  }, [byIntent]);

  const activeRows = isOverall ? [] : byIntent[intentFilter] ?? [];

  // Auto-refresh so the leaderboard visibly feels live, not a static snapshot.
  useEffect(() => {
    const id = setInterval(refetch, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [refetch]);

  // Flag rows whose rank changed since the last fetch for a brief highlight.
  useEffect(() => {
    if (isOverall || activeRows.length === 0) return;
    const current = new Map(activeRows.map(e => [e.miner_slug, e.rank ?? 0]));
    const prev = prevRanksRef.current;
    if (prev) {
      const changed = new Set<string>();
      for (const [slug, rank] of current) {
        if (prev.has(slug) && prev.get(slug) !== rank) changed.add(slug);
      }
      if (changed.size > 0) {
        setChangedSlugs(changed);
        const t = setTimeout(() => setChangedSlugs(new Set()), FLASH_MS);
        return () => clearTimeout(t);
      }
    }
    prevRanksRef.current = current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRows]);

  return (
    <div className={`lb-panel ${className ?? ''}`} id="live-leaderboard">
      <div className="lb-panel-header">
        <div className="lb-panel-title-row">
          <span className="result-dot" />
          <span className="lb-panel-title">Live Leaderboard</span>
        </div>
        <p className="lb-panel-sub">
          Top-scoring APIs win the most requests every day — integrate and climb the leaderboard.
        </p>
      </div>

      <div className="lb-panel-controls">
        {intentOptions.length > 0 && (
          <div className="lb-intent-filter">
            <label htmlFor="lb-intent" className="lb-intent-label">Intent</label>
            <div className="field-select-wrap lb-intent-select">
              <select
                id="lb-intent"
                className="field-input field-select"
                value={intentFilter}
                onChange={e => setIntentFilter(e.target.value)}
              >
                <option value={OVERALL_VALUE}>OVERALL (TOP PER INTENT)</option>
                {intentOptions.map(id => (
                  <option key={id} value={id}>{id.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <svg className="field-select-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
        )}
        <div className="lb-panel-actions">
          <a
            className="io-btn"
            href="https://explorer.telegraphprotocol.com/miners/leaderboard"
            target="_blank"
            rel="noopener noreferrer"
          >
            See Full Leaderboard →
          </a>
          <button
            type="button"
            className="io-btn io-btn-accent"
            onClick={() => onGetRanked ? onGetRanked() : document.getElementById('root-cards')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Get Scored →
          </button>
        </div>
      </div>

      {error ? (
        <p className="field-error">Could not reach the registry node. {error.message}</p>
      ) : isLoading && intentOptions.length === 0 ? (
        <p className="field-hint"><Spinner /> Loading leaderboard…</p>
      ) : isOverall ? (
        overallRows.length === 0 ? (
          <p className="field-hint">No top-ranked miners yet.</p>
        ) : (
          <div className="lb-table-wrap">
            <table className="lb-table">
              <colgroup>
                <col className="lb-colw-miner" />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th>API</th>
                  <th>#1 In</th>
                </tr>
              </thead>
              <tbody>
                {overallRows.map(r => (
                  <tr key={r.miner_slug}>
                    <td className="result-mono lb-col-miner">{r.miner_slug}</td>
                    <td>
                      {r.intentIds.map(id => (
                        <span key={id} className="reg-status-badge badge-success" style={{ marginRight: 4 }}>
                          {id.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : activeRows.length === 0 ? (
        <p className="field-hint">No leaderboard data yet.</p>
      ) : (
        <div className="lb-table-wrap">
          <table className="lb-table">
            <colgroup>
              <col className="lb-colw-rank" />
              <col className="lb-colw-miner" />
              <col className="lb-colw-status" />
              <col className="lb-colw-num" />
            </colgroup>
            <thead>
              <tr>
                <th className="lb-col-rank">#</th>
                <th>API</th>
                <th>Status</th>
                <th className="lb-col-num">Score</th>
              </tr>
            </thead>
            <tbody>
              {activeRows.map(e => (
                <tr key={e.miner_slug} className={changedSlugs.has(e.miner_slug) ? 'lb-row-flash' : ''}>
                  <td className="lb-col-rank">
                    <span className={`lb-rank ${rankClass(e.rank ?? 0)}`}>{e.rank ?? '—'}</span>
                  </td>
                  <td className="result-mono lb-col-miner">{e.miner_slug}</td>
                  <td>
                    <span className={`reg-status-badge ${e.activation_status === 'active' ? 'badge-success' : 'wasm-status-pending'}`}>
                      {e.activation_status.toUpperCase()}
                    </span>
                  </td>
                  <td className="lb-col-num">{typeof e.score === 'number' ? e.score.toFixed(3) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
