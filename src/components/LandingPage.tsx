'use client';

import { useState } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { emitIntentSignal } from '../hooks/useIntentSignal';
import WalletBar from './WalletBar';
import LiveLeaderboard from './LiveLeaderboard';
import ExternalLinksNav from './ExternalLinksNav';
import AccountButton from './AccountButton';
import { useSession } from '../hooks/useSession';

const CARDS = [
  {
    key: 'create',
    step: '01',
    title: 'Create YAML',
    desc: 'Build a new API config from scratch using the step-by-step wizard.',
    cta: 'Start building →',
    tags: ['Wizard', 'From scratch'],
    mode: 'create',
  },
  {
    key: 'import',
    step: '02',
    title: 'Import & Upload',
    desc: 'Import an existing YAML file, review parsed values, and pin to IPFS.',
    cta: 'Import YAML →',
    tags: ['Import', 'IPFS · Pinata'],
    mode: 'import',
  },
  {
    key: 'register',
    step: '03',
    title: 'Register',
    desc: 'Already have an IPFS hash? Submit directly to the registry contract on Base Sepolia.',
    cta: 'Register now →',
    tags: ['Base Sepolia', 'Registry'],
    mode: 'hash',
  },
] as const;

const ROOT_CARDS = [
  {
    key: 'yaml',
    title: 'Connect API',
    desc: 'Hook your API in 2 minutes. Get scored, climb the leaderboard, and compete to win paid requests directly from machines & agents.',
    cta: 'Continue →',
    tags: ['API', 'Available now'],
  },
  {
    key: 'wasm',
    title: 'Submit WASM',
    desc: 'Write evaluation scripts. Build the logic that scores APIs, and earn recurring revenue every time your script runs.',
    cta: 'Continue →',
    tags: ['WASM', 'Available now'],
  },
  {
    key: 'integrate',
    title: 'Consume Intelligence',
    desc: 'Power your agents with scored intelligence. Drop in our 1-line SDK to automatically route requests to the top-scoring providers.',
    cta: 'Explore →',
    tags: ['MCP · WebSocket', 'SDK'],
  },
] as const;

type Choice = 'root' | 'yaml';

const REASON = 'You need to register in order to progress';

export default function LandingPage() {
  const router = useRouter();
  const { user } = useSession();
  const [hovered, setHovered] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [choice, setChoice] = useState<Choice>('root');

  const requireAuth = (next: string): boolean => {
    if (user) return true;
    router.push(`/login?tab=signup&reason=${encodeURIComponent(REASON)}&next=${encodeURIComponent(next)}`);
    return false;
  };

  const rootHandlers: Record<string, () => void> = {
    yaml: () => { if (requireAuth('/')) setChoice('yaml'); },
    wasm: () => { if (requireAuth('/wasm')) router.push('/wasm'); },
    integrate: () => { if (requireAuth('/integrate')) router.push('/integrate'); },
  };

  const handlers: Record<string, () => void> = {
    create: () => router.push('/register?mode=create'),
    import: () => router.push('/register?mode=import'),
    register: () => router.push('/register?mode=hash'),
  };

  return (
    <div className="lv2">

      {/* ── Navbar ── */}
      <nav className="lv2-nav">
        <div className="lv2-nav-left">
          <div className="lv2-nav-logo">
            <img src="/logo.png" alt="Telegraph" className="lv2-logo-img" />
            <span className="lv2-logo-text">TELEGRAPH</span>
          </div>
          {choice === 'yaml' && (
            <button type="button" className="lv2-nav-back-btn" onClick={() => setChoice('root')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
          )}
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
          <ExternalLinksNav mode="inline" onNavigate={() => setMenuOpen(false)} />
          <AccountButton />
          <WalletBar />
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="lv2-hero">
        <div className="lv2-tagline">
          <span className="lv2-tagline-pip" />
          Live Leaderboard · Open Integration
          <span className="lv2-tagline-pip" />
        </div>

        {choice === 'root' && (
          <>
            <div className="lv2-hero-copy">
              <h1 className="lv2-hero-headline">
                Get your API discovered, scored, and <span className="lv2-hero-accent">paid</span> — automatically.
              </h1>
              <div className="lv2-hero-prize-badge">$15,000 Hackathon Prize Pool</div>
              <p className="lv2-hero-sub">
                Hook up your API in minutes. Compete on a live leaderboard, win requests from autonomous
                agents, and get paid per call — no sales calls, no negotiating. Registering here
                automatically enters you into the Telegraph Hackathon.
              </p>
              {!user && (
                <button
                  type="button"
                  className="lv2-hero-cta-primary"
                  onClick={() => {
                    emitIntentSignal();
                    router.push('/login?tab=signup');
                  }}
                >
                  Register Now →
                </button>
              )}
            </div>

            <div className="lv2-cards-block" id="root-cards">
              <div className="lv2-cards lv2-cards-root">
                {ROOT_CARDS.map(card => (
                  <button
                    key={card.key}
                    id={card.key === 'yaml' ? 'root-card-yaml' : undefined}
                    type="button"
                    className={`lv2-card lv2-card-root${hovered === card.key ? ' lv2-card-active' : ''}`}
                    onClick={() => { emitIntentSignal(); rootHandlers[card.key](); }}
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <LiveLeaderboard limit={3} className="lv2-leaderboard" onGetRanked={() => { emitIntentSignal(); rootHandlers.yaml(); }} />
          </>
        )}

        {choice === 'yaml' && (
          <>
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
