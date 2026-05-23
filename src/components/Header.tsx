'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { Step } from '../types';

interface Props {
  step: Step;
  onGoHome: () => void;
}

const STEPS = [
  { n: 1, label: 'Configure YAML' },
  { n: 2, label: 'Upload to IPFS' },
  { n: 3, label: 'Register On-Chain' },
];

export default function Header({ step, onGoHome }: Props) {
  return (
    <header className="app-header">
      <button type="button" className="app-header-logo app-header-logo-btn" onClick={onGoHome}>
        <img src="/logo.png" alt="Telegraph" className="app-logo-img" />
        <span className="app-logo-text">TELEGRAPH</span>
        <span className="app-logo-badge">MINER REGISTRY</span>
      </button>

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

      <div className="app-header-right">
        <ConnectButton
          chainStatus="icon"
          showBalance={false}
          accountStatus="avatar"
        />
      </div>
    </header>
  );
}
