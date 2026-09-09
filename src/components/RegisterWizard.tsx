'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import AppBackground from './AppBackground';
import Header from './Header';
import YamlWizard from './YamlWizard';
import ContractRegister from './ContractRegister';
import { DEFAULT_FORM } from '../formState';
import type { Step, FormState } from '../types';

export default function RegisterWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode'); // 'create' | 'hash' | null

  const [step, setStep] = useState<Step>(mode === 'hash' ? 2 : 1);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const handleChange = (key: keyof FormState, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="app">
      <AppBackground />
      <Header step={step} onBack={step === 1 ? () => router.push('/') : undefined} />

      <div className="app-body">
        {step === 1 && (
          <YamlWizard state={form} onChange={handleChange} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <ContractRegister
            intents={form.semantics_intents}
            minPriceUsdc={form.onchain_min_price_usdc}
            onBack={mode !== 'hash' ? () => setStep(1) : () => router.push('/')}
          />
        )}
      </div>
    </div>
  );
}
