'use client';

import { useState } from 'react';
import AppBackground from './components/AppBackground';
import LandingPage from './components/LandingPage';
import Header from './components/Header';
import YamlWizard from './components/YamlWizard';
import PinataUpload from './components/PinataUpload';
import ContractRegister from './components/ContractRegister';
import ImportModal from './components/ImportModal';
import { DEFAULT_FORM } from './formState';
import type { Step, FormState, PinataResult } from './types';
import { generateYaml } from './yamlGen';

type View = 'landing' | 'app';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [pinataResult, setPinataResult] = useState<PinataResult | null>(null);
  const [showImport, setShowImport] = useState(false);
  // tracks where to land after import: wizard (step 1) or upload (step 2)
  const [importTarget, setImportTarget] = useState<1 | 2>(1);
  const [importBanner, setImportBanner] = useState('');

  const handleChange = (key: keyof FormState, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleImport = (imported: FormState) => {
    setForm(imported);
    setShowImport(false);
    setStep(importTarget);
    setView('app');
    setImportBanner(`YAML imported — "${imported.name || imported.slug || 'untitled'}" loaded.`);
    setTimeout(() => setImportBanner(''), 4000);
  };

  // Option 1: Create from scratch
  const handleCreate = () => {
    setForm(DEFAULT_FORM);
    setPinataResult(null);
    setStep(1);
    setView('app');
  };

  // Option 2: Import → upload
  const handleImportToUpload = () => {
    setImportTarget(2);
    setShowImport(true);
  };

  // Option 3: Jump straight to on-chain register
  const handleRegisterDirect = () => {
    setPinataResult(null);
    setStep(3);
    setView('app');
  };

  const yaml = generateYaml(form);

  if (view === 'landing') {
    return (
      <>
        <AppBackground />
        <LandingPage
          onCreate={handleCreate}
          onImportToUpload={handleImportToUpload}
          onRegisterDirect={handleRegisterDirect}
        />
        {showImport && <ImportModal onImport={handleImport} onClose={() => setShowImport(false)} />}
      </>
    );
  }

  return (
    <div className="app">
      <AppBackground />
      <Header step={step} onGoHome={() => setView('landing')} />

      {importBanner && (
        <div className="import-banner">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {importBanner}
        </div>
      )}

      <div className="app-body">
        {step === 1 && (
          <YamlWizard state={form} onChange={handleChange} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <PinataUpload
            yaml={yaml}
            name={form.name || form.slug || 'miner-config'}
            result={pinataResult}
            onResult={setPinataResult}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <ContractRegister
            yaml={yaml}
            pinataResult={pinataResult}
            intents={form.semantics_intents}
            minPriceUsdc={form.onchain_min_price_usdc}
            onBack={pinataResult ? () => setStep(2) : () => setView('landing')}
          />
        )}
      </div>

      {showImport && <ImportModal onImport={handleImport} onClose={() => setShowImport(false)} />}
    </div>
  );
}
