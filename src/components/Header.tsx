'use client';

import { useRouter } from 'nextjs-toploader/app';
import WalletBar from './WalletBar';
import ExternalLinksNav from './ExternalLinksNav';
import AccountButton from './AccountButton';
import type { Step } from '../types';

interface Props {
  step?: Step;
  onBack?: () => void;
}

const STEPS = [
  { n: 1, label: 'Configure YAML' },
  { n: 2, label: 'Upload to IPFS' },
  { n: 3, label: 'Register On-Chain' },
];

export default function Header({ step, onBack }: Props) {
  const router = useRouter();

  return (
    <header className="app-header">
      <div className="app-header-left">
        <button type="button" className="app-header-logo app-header-logo-btn" onClick={() => router.push('/')}>
          <img src="/logo.png" alt="Telegraph" className="app-logo-img" />
          <span className="app-logo-text">TELEGRAPH</span>
        </button>
        {onBack && (
          <button type="button" className="lv2-nav-back-btn" onClick={onBack}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        )}
      </div>

      {step !== undefined && (
        <nav className="step-nav">
          {STEPS.map((s, i) => (
            <div key={s.n} className="step-nav-item">
              <div className={`step-bubble ${step === s.n ? 'step-active' : step > s.n ? 'step-done' : 'step-upcoming'}`}>
                {step > s.n ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : s.n}
              </div>
              <span className={`step-label ${step === s.n ? 'step-label-active' : ''}`}>{s.label}</span>
              {i < STEPS.length - 1 && <div className={`step-connector ${step > s.n ? 'step-connector-done' : ''}`} />}
            </div>
          ))}
        </nav>
      )}

      <div className="app-header-right">
        <ExternalLinksNav mode="dropdown" />
        <AccountButton />
        <WalletBar />
      </div>
    </header>
  );
}
