export interface WasmRegistrationRecord {
  registrationId: string;
  intentId: string;
  wasmUrl: string;
  wasmHash: string;
  intents: string[];
  txHash: string;
  registeredAt: string;
  deregistered?: boolean;
}

export interface YamlRegistrationRecord {
  yamlUrl: string;
  yamlHash: string;
  feeAddress: string;
  minPriceUsdc: string;
  intents: string[];
  txHash: string;
  registeredAt: string;
}

function storageKey(kind: 'wasm' | 'yaml', address: string): string {
  return `telegraph_${kind}_registrations_${address.toLowerCase()}`;
}

function readList<T>(kind: 'wasm' | 'yaml', address: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(kind, address));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(kind: 'wasm' | 'yaml', address: string, list: T[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(kind, address), JSON.stringify(list));
}

export function getWasmRegistrations(address: string): WasmRegistrationRecord[] {
  return readList<WasmRegistrationRecord>('wasm', address);
}

export function addWasmRegistration(address: string, record: WasmRegistrationRecord): void {
  const list = getWasmRegistrations(address);
  writeList('wasm', address, [record, ...list]);
}

export function markWasmDeregistered(address: string, registrationId: string): void {
  const list = getWasmRegistrations(address).map(r =>
    r.registrationId === registrationId ? { ...r, deregistered: true } : r,
  );
  writeList('wasm', address, list);
}

export function getYamlRegistrations(address: string): YamlRegistrationRecord[] {
  return readList<YamlRegistrationRecord>('yaml', address);
}

export function addYamlRegistration(address: string, record: YamlRegistrationRecord): void {
  const list = getYamlRegistrations(address);
  writeList('yaml', address, [record, ...list]);
}
