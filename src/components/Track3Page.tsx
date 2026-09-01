'use client';

import { useRouter } from 'nextjs-toploader/app';
import { emitIntentSignal } from '../hooks/useIntentSignal';
import { fireTrack3RegisterConversion } from '../lib/xPixel';
import WalletBar from './WalletBar';
import ExternalLinksNav from './ExternalLinksNav';
import AccountButton from './AccountButton';
import { useSession } from '../hooks/useSession';

const REASON = 'You need to register in order to progress';

export default function Track3Page() {
  const router = useRouter();
  const { user } = useSession();

  const requireAuth = (next: string): boolean => {
    if (user) return true;
    router.push(`/login?tab=signup&reason=${encodeURIComponent(REASON)}&next=${encodeURIComponent(next)}`);
    return false;
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
        </div>

        <div className="lv2-nav-links">
          <ExternalLinksNav mode="inline" />
          <AccountButton />
          <WalletBar />
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="lv2-hero">
        <div className="lv2-tagline">
          <span className="lv2-tagline-pip" />
          Track 3 · Consume Intelligence
          <span className="lv2-tagline-pip" />
        </div>

        <div className="lv2-hero-copy">
          <h1 className="lv2-hero-headline">
            Plug your agents into <span className="lv2-hero-accent">scored, real-time intelligence</span>.
          </h1>
          <div className="lv2-hero-prize-badge">$15,000 Hackathon Prize Pool</div>
          <p className="lv2-hero-sub">
            Drop in our 1-line SDK and automatically route requests to the top-scoring providers.
            Register to get access, then start consuming intelligence in minutes.
          </p>

          <div className="lv2-hero-cta-group">
            {!user && (
              <button
                type="button"
                className="lv2-hero-cta-primary"
                onClick={() => {
                  emitIntentSignal();
                  fireTrack3RegisterConversion();
                  fetch('/api/track3/register-click', { method: 'POST' }).catch(() => {});
                  router.push('/login?tab=signup');
                }}
              >
                Register Now →
              </button>
            )}

            <button
              type="button"
              className="lv2-hero-cta-secondary"
              onClick={() => {
                emitIntentSignal();
                if (requireAuth('/integrate')) router.push('/integrate');
              }}
            >
              Consume Intelligence →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
