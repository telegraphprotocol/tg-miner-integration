'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import AppBackground from './AppBackground';
import Header from './Header';
import YamlWizard from './YamlWizard';
import PinataUpload from './PinataUpload';
import ContractRegister from './ContractRegister';
import ImportModal from './ImportModal';
import { useToast } from './Toast';
import { DEFAULT_FORM } from '../formState';
import type { Step, FormState, PinataResult } from '../types';
import { generateYaml } from '../yamlGen';

export default function RegisterWizard() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode'); // 'create' | 'import' | 'hash' | null

  const [step, setStep] = useState<Step>(mode === 'hash' ? 3 : 1);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [pinataResult, setPinataResult] = useState<PinataResult | null>(null);
  const [showImport, setShowImport] = useState(mode === 'import');
  const [importTarget] = useState<1 | 2>(mode === 'import' ? 2 : 1);

  const handleChange = (key: keyof FormState, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleImport = (imported: FormState) => {
    setForm(imported);
    setPinataResult(null); // a newly imported YAML needs its own validate/upload, not a stale one
    setShowImport(false);
    setStep(importTarget);
    toast.success(`YAML imported — "${imported.name || imported.slug || 'untitled'}" loaded.`);
  };

  const yaml = generateYaml(form);

  return (
    <div className="app">
      <AppBackground />
      <Header step={step} onBack={step === 1 ? () => router.push('/') : undefined} />

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
            onBack={pinataResult ? () => setStep(2) : () => router.push('/')}
          />
        )}
      </div>

      {showImport && (
        <ImportModal
          onImport={handleImport}
          onClose={() => { setShowImport(false); if (mode === 'import') router.push('/'); }}
        />
      )}
    </div>
  );
}
