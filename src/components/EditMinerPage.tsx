'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import AppBackground from './AppBackground';
import Header from './Header';
import Spinner from './Spinner';
import ContractRegister from './ContractRegister';
import type { MinerRecordApi } from '../wasmAbi';

export default function EditMinerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<MinerRecordApi | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/registrations/by-id/${params.id}`);
        const data = await res.json();
        if (!res.ok) { if (!cancelled) setError(data.error || 'Could not load this registration.'); return; }
        if (!cancelled) setRecord(data.miner ?? data);
      } catch {
        if (!cancelled) setError('Network error loading this registration.');
      }
    })();
    return () => { cancelled = true; };
  }, [params.id]);

  return (
    <div className="app">
      <AppBackground />
      <Header onBack={() => router.push('/dashboard')} />
      <div className="app-body">
        {error ? (
          <div className="dashboard-empty">
            <p className="dashboard-empty-title">Could not load registration #{params.id}</p>
            <p className="dashboard-empty-desc">{error}</p>
          </div>
        ) : !record ? (
          <div className="dashboard-empty">
            <p className="dashboard-empty-title"><Spinner /> Loading registration…</p>
          </div>
        ) : (
          <ContractRegister
            yaml=""
            pinataResult={null}
            intents={[]}
            minPriceUsdc=""
            editRecord={record}
            onBack={() => router.push('/dashboard')}
          />
        )}
      </div>
    </div>
  );
}
