'use client';

import { useCallback, useEffect, useState } from 'react';
import { TELEGRAPH_NODE_URL, type AddressBundleResponse, type MinerRecordApi, type WasmRecordApi } from '../wasmAbi';

export function useAddressRegistrations(address: string | undefined): {
  miners: MinerRecordApi[];
  wasm: WasmRecordApi[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [miners, setMiners] = useState<MinerRecordApi[]>([]);
  const [wasm, setWasm] = useState<WasmRecordApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBundle = useCallback(async () => {
    if (!address) {
      setMiners([]);
      setWasm([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${TELEGRAPH_NODE_URL}/engine/validator/v1/addresses/${address}`);
      if (!res.ok) throw new Error(`Node returned HTTP ${res.status}`);
      const data = (await res.json()) as AddressBundleResponse;
      setMiners(data.miners ?? []);
      setWasm(data.wasm ?? []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchBundle();
  }, [fetchBundle]);

  return { miners, wasm, isLoading, error, refetch: fetchBundle };
}
