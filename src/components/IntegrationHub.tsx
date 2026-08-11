'use client';

import { useMemo, useState } from 'react';
import Header from './Header';
import Spinner from './Spinner';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { TELEGRAPH_NODE_URL } from '../wasmAbi';
import { USE_CASES } from '../useCases';

interface Props {
  onGoHome: () => void;
  onOpenDashboard: () => void;
}

function rankClass(position: number): string {
  if (position === 1) return 'lb-rank-1';
  if (position === 2) return 'lb-rank-2';
  if (position === 3) return 'lb-rank-3';
  return '';
}

function ExternalLinkIcon() {
  return (
    <svg className="io-btn-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

export default function IntegrationHub({ onGoHome, onOpenDashboard }: Props) {
  const { entries, byIntent, isLoading, error, refetch } = useLeaderboard(10);
  const [intentFilter, setIntentFilter] = useState('all');

  const intentOptions = useMemo(
    () => Object.keys(byIntent).sort(),
    [byIntent],
  );

  const activeRows = intentFilter === 'all' ? entries : (byIntent[intentFilter] ?? []);

  return (
    <div className="app">
      <Header onGoHome={onGoHome} onOpenDashboard={onOpenDashboard} />
      <div className="app-body">
        <div className="register-layout">
          <div className="step-section-heading">
            <div className="step-eyebrow">INTEGRATION HUB</div>
            <h2 className="step-title">Integrate In, or Integrate Out</h2>
            <p className="step-desc">
              Point your API at the benchmark and get ranked, or consume Telegraph's network of miners
              from your own agents and apps. This is the front door to both directions.
            </p>
          </div>

          {/* ── Integrate Out ── */}
          <div className="register-card register-card-full">
            <div className="io-section-header">
              <h3 className="io-section-title">Integrate Out — Consume Telegraph</h3>
              <p className="io-section-desc">
                Every miner on the network is reachable through a handful of stable surfaces — pick
                whichever fits your stack.
              </p>
            </div>
            <div className="io-grid">
              <div className="io-card">
                <div className="io-card-title">Ask — Auto-Routed</div>
                <div className="io-endpoint">
                  <span className="io-method io-method-post">POST</span>
                  <code className="io-path">/engine/v1/ask</code>
                </div>
                <p className="io-desc" style={{ marginBottom: 12 }}>
                  Send a natural-language query and the engine classifies intent, then routes to the
                  best miner for it automatically.
                </p>
                <a
                  className="io-btn"
                  href="https://docs.telegraphprotocol.com/docs/using/x402-inference"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  x402 Inference Docs
                  <ExternalLinkIcon />
                </a>
              </div>

              <div className="io-card">
                <div className="io-card-title">Ask — Call a Specific Miner</div>
                <div className="io-endpoint">
                  <span className="io-method io-method-post">POST</span>
                  <code className="io-path">/engine/v1/ask/:subnet_id</code>
                </div>
                <p className="io-desc" style={{ marginBottom: 12 }}>
                  Skip routing and call a known miner directly by its registered ID. Send a body of{' '}
                  <code className="inline-code">{'{ method, endpoint, payload }'}</code> — the upstream
                  HTTP verb, the miner's path (e.g. <code className="inline-code">/forecast</code>), and
                  the payload forwarded as the body or query params. Find IDs via{' '}
                  <code className="inline-code">GET /engine/v1/miners</code> or the leaderboard below.
                </p>
                <a
                  className="io-btn"
                  href="https://docs.telegraphprotocol.com/docs/using/x402-inference"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  x402 Inference Docs
                  <ExternalLinkIcon />
                </a>
              </div>

              <div className="io-card">
                <div className="io-card-title">WebSocket</div>
                <div className="io-endpoint">
                  <span className="io-method io-method-ws">WS</span>
                  <code className="io-path">{TELEGRAPH_NODE_URL.replace('http', 'ws')}/engine/ws</code>
                </div>
                <p className="io-desc" style={{ marginBottom: 12 }}>
                  A persistent connection for streamed asks plus push-based subscriptions to daemon
                  signal matches.
                </p>
                <a
                  className="io-btn"
                  href="https://docs.telegraphprotocol.com/docs/using/websocket-signals"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WebSocket Signals Docs
                  <ExternalLinkIcon />
                </a>
              </div>

              <div className="io-card">
                <div className="io-card-title">Telegraph MCP Server</div>
                <p className="io-desc" style={{ marginBottom: 14 }}>
                  A local MCP server that exposes Telegraph's miners, the signal feed, and on-demand
                  inference to any MCP client — Claude Desktop, Cursor, ElizaOS, LangChain, OpenClaw,
                  Goose, VS Code / Continue — with x402 payments handled internally.
                </p>
                <div className="io-links">
                  <a
                    className="io-btn"
                    href="https://github.com/telegraphprotocol/Telegraph-MCP"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Repository
                    <ExternalLinkIcon />
                  </a>
                  <a
                    className="io-btn"
                    href="https://docs.telegraphprotocol.com/docs/using/mcp-server"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Docs
                    <ExternalLinkIcon />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ── Boilerplate Projects ── */}
          <div className="register-card register-card-full">
            <div className="io-section-header">
              <h3 className="io-section-title">Boilerplate Projects &amp; Use Cases</h3>
              <p className="io-section-desc">
                Real apps already routing requests through Telegraph miners and settling micro-fees
                on-chain — clone one as a starting point.
              </p>
            </div>
            <div className="io-grid">
              {USE_CASES.map(uc => (
                <div key={uc.id} className="io-card">
                  <div className="io-card-title">{uc.name}</div>
                  <p className="io-desc" style={{ marginBottom: 4, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.08em', color: 'var(--muted2)' }}>
                    {uc.subtitle}
                  </p>
                  <p className="io-desc" style={{ marginBottom: 14 }}>{uc.description}</p>
                  <div className="io-links">
                    <a
                      className="io-btn"
                      href={uc.githubHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Repository
                      <ExternalLinkIcon />
                    </a>
                    {uc.liveHref ? (
                      <a
                        className="io-btn io-btn-accent"
                        href={uc.liveHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Live App
                        <ExternalLinkIcon />
                      </a>
                    ) : (
                      <span className="io-btn" aria-disabled="true">Live app coming soon</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Leaderboard ── */}
          <div className="register-card register-card-full">
            <div className="register-card-header">
              <span>Live Leaderboard</span>
              {intentOptions.length > 0 && (
                <div className="lb-intent-filter">
                  <label htmlFor="lb-intent" className="lb-intent-label">Filter by intent</label>
                  <div className="field-select-wrap lb-intent-select">
                    <select
                      id="lb-intent"
                      className="field-input field-select"
                      value={intentFilter}
                      onChange={e => setIntentFilter(e.target.value)}
                    >
                      <option value="all">Overall</option>
                      {intentOptions.map(id => (
                        <option key={id} value={id}>{id.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                    <svg className="field-select-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
              )}
              <button type="button" className="io-btn lb-refresh" onClick={refetch} disabled={isLoading}>
                {isLoading ? <Spinner /> : <><RefreshIcon /> Refresh</>}
              </button>
            </div>
            {error ? (
              <p className="field-error">Could not reach the registry node. {error.message}</p>
            ) : isLoading && activeRows.length === 0 ? (
              <p className="field-hint"><Spinner /> Loading leaderboard…</p>
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
                    <col className="lb-colw-num" />
                    <col className="lb-colw-num" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="lb-col-rank">Rank</th>
                      <th>Miner</th>
                      <th>Status</th>
                      <th className="lb-col-num">Avg Score</th>
                      <th className="lb-col-num">Requests</th>
                      <th className="lb-col-num">Best Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRows.map(e => (
                      <tr key={e.miner_slug}>
                        <td className="lb-col-rank">
                          <span className={`lb-rank ${rankClass(e.position)}`}>{e.position}</span>
                        </td>
                        <td className="result-mono lb-col-miner">{e.miner_slug}</td>
                        <td>
                          {e.activation_status ? (
                            <span className={`reg-status-badge ${e.activation_status === 'active' ? 'badge-success' : 'wasm-status-pending'}`}>
                              {e.activation_status.toUpperCase()}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="lb-col-num">{typeof e.avg_score === 'number' ? e.avg_score.toFixed(3) : '—'}</td>
                        <td className="lb-col-num">{e.total_requests_served}</td>
                        <td className="lb-col-num">{e.best_rank != null ? `#${e.best_rank}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="step-footer">
            <button className="io-btn" onClick={onGoHome}>← Back to Home</button>
          </div>
        </div>
      </div>
    </div>
  );
}
