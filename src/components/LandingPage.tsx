'use client';

import { useState } from 'react';

interface Props {
  onCreate: () => void;
  onImportToUpload: () => void;
  onRegisterDirect: () => void;
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

export default function LandingPage({ onCreate, onImportToUpload, onRegisterDirect }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
          <span className="lv2-logo-badge">MINER REGISTRY</span>
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
            href="https://telegraph-2.gitbook.io/telegraph"
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
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="lv2-hero">
        <div className="lv2-tagline">
          <span className="lv2-tagline-pip" />
          Register your inference node
          <span className="lv2-tagline-pip" />
        </div>

        {/* 3-card grid */}
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

        {/* Tags */}
        <div className="lv2-tags">
          {['BASE NETWORK', 'IPFS · PINATA', 'BITTENSOR', 'STANDARD V1'].map(t => (
            <span key={t} className="lv2-tag">{t}</span>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="lv2-footer">
        <span>TELEGRAPH PROTOCOL</span>
        <span className="lv2-footer-sep">·</span>
        <span>INTEGRATION STANDARD V1</span>
        <span className="lv2-footer-sep">·</span>
        <span>BASE NETWORK</span>
      </div>
    </div>
  );
}
