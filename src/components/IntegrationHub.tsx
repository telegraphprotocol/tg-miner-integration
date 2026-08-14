'use client';

import Header from './Header';
import { TELEGRAPH_NODE_URL } from '../wasmAbi';
import { USE_CASES } from '../useCases';

interface Props {
  onGoHome: () => void;
  onOpenDashboard: () => void;
  onOpenProfile: () => void;
}

function ExternalLinkIcon() {
  return (
    <svg className="io-btn-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

export default function IntegrationHub({ onGoHome, onOpenDashboard, onOpenProfile }: Props) {
  return (
    <div className="app">
      <Header onGoHome={onGoHome} onOpenDashboard={onOpenDashboard} onOpenProfile={onOpenProfile} onBack={onGoHome} />
      <div className="app-body">
        <div className="register-layout">
          <div className="step-section-heading">
            <div className="step-eyebrow">CONSUME INTELLIGENCE</div>
            <h2 className="step-title">Integrate Out</h2>
            <p className="step-desc">
              Call Telegraph's network of miners from your own agents and apps — REST, WebSocket, MCP,
              or fork a working example below. Looking for the live leaderboard instead? It's on{' '}
              <button type="button" className="inline-link-btn" onClick={onGoHome}>the homepage</button>.
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
                  <code className="inline-code">GET /engine/v1/miners</code> or the leaderboard on
                  the homepage.
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
        </div>
      </div>
    </div>
  );
}
