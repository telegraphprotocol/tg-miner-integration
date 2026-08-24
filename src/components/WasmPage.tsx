'use client';

import { useRouter } from 'nextjs-toploader/app';
import AppBackground from './AppBackground';
import Header from './Header';
import WasmWizard from './WasmWizard';

export default function WasmPage() {
  const router = useRouter();
  return (
    <div className="app">
      <AppBackground />
      <Header onBack={() => router.push('/')} />
      <div className="app-body">
        <WasmWizard />
      </div>
    </div>
  );
}
