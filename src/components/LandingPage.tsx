'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import WalletBar from './WalletBar';

interface Props {
  onCreate: () => void;
  onImportToUpload: () => void;
  onRegisterDirect: () => void;
  onOpenDashboard: () => void;
  onRegisterWasm: () => void;
}

const CARDS = [
  {
    key: 'create',
    step: '01',
    title: 'Create YAML',
    desc: 'Build a new miner config from scratch using the step-by-step wizard.',
    cta: 'Start building →',
    tags: ['Wizard', 'From scratch'],
  },
  {
    key: 'import',
    step: '02',
    title: 'Import & Upload',
    desc: 'Import an existing YAML file, review parsed values, and pin to IPFS.',
    cta: 'Import YAML →',
    tags: ['Import', 'IPFS · Pinata'],
  },
  {
    key: 'register',
    step: '03',
    title: 'Register On-Chain',
    desc: 'Already have an IPFS hash? Submit directly to the registry contract on Base Sepolia.',
    cta: 'Register now →',
    tags: ['Base Sepolia', 'On-chain'],
  },
] as const;

const ROOT_CARDS = [
  {
    key: 'yaml',
    title: 'Register YAML for Miner',
    desc: 'Describe an inference node with a YAML config, pin it to IPFS, and register it on-chain.',
    cta: 'Continue →',
    tags: ['Miner', 'Available now'],
  },
  {
    key: 'wasm',
    title: 'Register WASM',
    desc: 'Publish a candidate scoring module and register it on-chain against a bond.',
    cta: 'Continue →',
    tags: ['WASM', 'Available now'],
  },
] as const;

type Choice = 'root' | 'yaml';

export default function LandingPage({ onCreate, onImportToUpload, onRegisterDirect, onOpenDashboard, onRegisterWasm }: Props) {
  const { isConnected } = useAccount();
  const [hovered, setHovered] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [choice, setChoice] = useState<Choice>('root');

  const rootHandlers: Record<string, () => void> = {
    yaml: () => setChoice('yaml'),
    wasm: onRegisterWasm,
  };

  const handlers: Record<string, () => void> = {
    create: onCreate,
    import: onImportToUpload,
    register: onRegisterDirect,
  };

  return (
    <div className="lv2">

      {/* ── Navbar ── */}
      <nav className="lv2-nav">
        <div className="lv2-nav-logo">
          <img src="/logo.png" alt="Telegraph" className="lv2-logo-img" />
          <span className="lv2-logo-text">TELEGRAPH</span>
        </div>

        <button
          type="button"
          className={`lv2-nav-toggle ${menuOpen ? 'lv2-nav-toggle-open' : ''}`}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(v => !v)}
        >
          <span className="lv2-nav-toggle-bar" />
          <span className="lv2-nav-toggle-bar" />
          <span className="lv2-nav-toggle-bar" />
        </button>

        <div className={`lv2-nav-links ${menuOpen ? 'lv2-nav-links-open' : ''}`}>
          <a
            href="https://telegraphprotocol.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="lv2-nav-link"
            onClick={() => setMenuOpen(false)}
          >
            Telegraph Protocol
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
          <a
            href="https://docs.telegraphprotocol.com"
            target="_blank"
            rel="noopener noreferrer"
            className="lv2-nav-link"
            onClick={() => setMenuOpen(false)}
          >
            Docs
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
          <WalletBar onOpenDashboard={onOpenDashboard} />
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="lv2-hero">
        <div className="lv2-tagline">
          <span className="lv2-tagline-pip" />
          Be part of the Telegraph Protocol
          <span className="lv2-tagline-pip" />
        </div>

        {choice === 'root' && (
          <>
            {!isConnected && (
              <p className="lv2-connect-hint">Connect your wallet above to start registering.</p>
            )}
            <div className="lv2-cards lv2-cards-root">
              {ROOT_CARDS.map(card => (
                <button
                  key={card.key}
                  type="button"
                  className={`lv2-card lv2-card-root${hovered === card.key ? ' lv2-card-active' : ''}${!isConnected ? ' lv2-card-disabled' : ''}`}
                  disabled={!isConnected}
                  onClick={rootHandlers[card.key]}
                  onMouseEnter={() => setHovered(card.key)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div className="lv2-card-glow" />
                  <div className="lv2-card-corner lv2-corner-tl" />
                  <div className="lv2-card-corner lv2-corner-br" />

                  <div className="lv2-card-body">
                    <span className="lv2-card-title">{card.title}</span>
                    <p className="lv2-card-desc">{card.desc}</p>
                    <div className="lv2-card-tags">
                      {card.tags.map(t => <span key={t} className="lv2-card-tag">{t}</span>)}
                    </div>
                  </div>

                  <div className="lv2-card-cta">
                    {card.cta}
                    {isConnected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {choice === 'yaml' && (
          <>
            <button type="button" className="lv2-back-btn" onClick={() => setChoice('root')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>

            <div className="lv2-cards">
              {CARDS.map((card, i) => (
                <div key={card.key} className="lv2-cards-row-item">
                  {i > 0 && (
                    <div className="lv2-card-connector">
                      <div className="lv2-card-connector-line" />
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="lv2-card-connector-arrow">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                      <div className="lv2-card-connector-line" />
                    </div>
                  )}
                  <button
                    type="button"
                    className={`lv2-card${hovered === card.key ? ' lv2-card-active' : ''}`}
                    onClick={handlers[card.key]}
                    onMouseEnter={() => setHovered(card.key)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div className="lv2-card-glow" />
                    <div className="lv2-card-corner lv2-corner-tl" />
                    <div className="lv2-card-corner lv2-corner-br" />

                    <div className="lv2-card-step">{card.step}</div>

                    <div className="lv2-card-body">
                      <span className="lv2-card-title">{card.title}</span>
                      <p className="lv2-card-desc">{card.desc}</p>
                      <div className="lv2-card-tags">
                        {card.tags.map(t => <span key={t} className="lv2-card-tag">{t}</span>)}
                      </div>
                    </div>

                    <div className="lv2-card-cta">
                      {card.cta}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
