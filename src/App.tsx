'use client';

import { useState } from 'react';
import AppBackground from './components/AppBackground';
import LandingPage from './components/LandingPage';
import Header from './components/Header';
import YamlWizard from './components/YamlWizard';
import PinataUpload from './components/PinataUpload';
import ContractRegister from './components/ContractRegister';
import ImportModal from './components/ImportModal';
import Dashboard from './components/Dashboard';
import WasmWizard from './components/WasmWizard';
import { ToastProvider, useToast } from './components/Toast';
import { DEFAULT_FORM } from './formState';
import type { Step, FormState, PinataResult } from './types';
import { generateYaml } from './yamlGen';

type View = 'landing' | 'app' | 'dashboard' | 'wasm';

function AppInner() {
  const toast = useToast();
  const [view, setView] = useState<View>('landing');
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [pinataResult, setPinataResult] = useState<PinataResult | null>(null);
  const [showImport, setShowImport] = useState(false);
  // tracks where to land after import: wizard (step 1) or upload (step 2)
  const [importTarget, setImportTarget] = useState<1 | 2>(1);

  const handleChange = (key: keyof FormState, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleImport = (imported: FormState) => {
    setForm(imported);
    setShowImport(false);
    setStep(importTarget);
    setView('app');
    toast.success(`YAML imported — "${imported.name || imported.slug || 'untitled'}" loaded.`);
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
          onOpenDashboard={() => setView('dashboard')}
          onRegisterWasm={() => setView('wasm')}
        />
        {showImport && <ImportModal onImport={handleImport} onClose={() => setShowImport(false)} />}
      </>
    );
  }

  if (view === 'dashboard') {
    return (
      <>
        <AppBackground />
        <Dashboard onGoHome={() => setView('landing')} />
      </>
    );
  }

  if (view === 'wasm') {
    return (
      <div className="app">
        <AppBackground />
        <Header onGoHome={() => setView('landing')} onOpenDashboard={() => setView('dashboard')} />
        <div className="app-body">
          <WasmWizard onBack={() => setView('landing')} onDone={() => setView('dashboard')} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <AppBackground />
      <Header step={step} onGoHome={() => setView('landing')} onOpenDashboard={() => setView('dashboard')} />

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

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
