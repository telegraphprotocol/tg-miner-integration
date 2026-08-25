'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import AppBackground from './AppBackground';
import Header from './Header';
import Spinner from './Spinner';
import ContractRegister from './ContractRegister';
import type { MinerRecordApi } from '../wasmAbi';

// /api/miners/{id} (proxied via /api/registrations/by-id/[id]) returns snake_case
// fields, unlike the Go-cased MinerRecordApi shape used everywhere else in the UI.
interface MinerByIdApi {
  registration_id: number;
  miner_address: string;
  yaml_url: string;
  yaml_hash: string;
  slug: string;
  activation_status: MinerRecordApi['ActivationStatus'];
  fee_address: string;
  min_price_usdc: number;
  supported_intents: string[];
  rejection_reason: string | null;
  registered_at: string;
  updated_at: string;
}

function toMinerRecordApi(raw: MinerByIdApi): MinerRecordApi {
  return {
    RegistrationID: raw.registration_id,
    MinerAddress: raw.miner_address,
    YamlURL: raw.yaml_url,
    YamlHash: raw.yaml_hash,
    Slug: raw.slug,
    ActivationStatus: raw.activation_status,
    IntentID: raw.supported_intents?.[0] ?? '',
    FeeAddress: raw.fee_address,
    MinPriceUsdc: raw.min_price_usdc,
    SupportedIntents: raw.supported_intents ?? [],
    RejectionReason: raw.rejection_reason,
    RegisteredAt: raw.registered_at,
    UpdatedAt: raw.updated_at,
  };
}

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
        if (!cancelled) setRecord(toMinerRecordApi(data.miner ?? data));
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
