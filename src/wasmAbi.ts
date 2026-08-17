export const intentRegistryAbi = [
  {
    type: 'function',
    name: 'registerWasm',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'wasmHash', type: 'bytes32' },
      { name: 'wasmUrl', type: 'string' },
      { name: 'intent', type: 'string' },
    ],
    outputs: [{ name: 'registrationId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'registerMiner',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'yamlUrl', type: 'string' },
      { name: 'yamlHash', type: 'bytes32' },
      { name: 'feeAddress', type: 'address' },
      { name: 'minPriceUsdc', type: 'uint256' },
      { name: 'supportedIntents', type: 'string[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'updateMiner',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'oldRegistrationId', type: 'uint256' },
      { name: 'yamlUrl', type: 'string' },
      { name: 'yamlHash', type: 'bytes32' },
      { name: 'feeAddress', type: 'address' },
      { name: 'minPriceUsdc', type: 'uint256' },
      { name: 'supportedIntents', type: 'string[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'deregisterMiner',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'registrationId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'deregisterEntity',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'registrationId', type: 'uint256' },
      { name: 'entityType', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getWasm',
    stateMutability: 'view',
    inputs: [{ name: 'registrationId', type: 'uint256' }],
    outputs: [
      { name: 'author', type: 'address' },
      { name: 'intentId', type: 'bytes32' },
      { name: 'wasmHash', type: 'bytes32' },
      { name: 'wasmUrl', type: 'string' },
      { name: 'intent', type: 'string' },
      { name: 'active', type: 'bool' },
      { name: 'bondAmount', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'entityCount',
    stateMutability: 'view',
    inputs: [{ name: 'entityType', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getEntitiesForIntent',
    stateMutability: 'view',
    inputs: [{ name: 'intentId', type: 'bytes32' }],
    outputs: [
      { name: 'minerIds', type: 'uint256[]' },
      { name: 'wasmIds', type: 'uint256[]' },
    ],
  },
  {
    type: 'function',
    name: 'getCanonicalIntentsWithDescriptions',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'intents', type: 'string[]' },
      { name: 'descriptions', type: 'string[]' },
    ],
  },
  {
    type: 'event',
    name: 'IntentRegistered',
    inputs: [
      { name: 'registrationId', type: 'uint256', indexed: true },
      { name: 'registrant', type: 'address', indexed: true },
      { name: 'entityType', type: 'uint8', indexed: false },
      { name: 'intentId', type: 'bytes32', indexed: false },
      { name: 'contentUrl', type: 'string', indexed: false },
      { name: 'contentHash', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'EntityDeregistered',
    inputs: [
      { name: 'registrationId', type: 'uint256', indexed: true },
      { name: 'registrant', type: 'address', indexed: true },
      { name: 'entityType', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MinerRegistered',
    inputs: [
      { name: 'registrationId', type: 'uint256', indexed: true },
      { name: 'miner', type: 'address', indexed: true },
      { name: 'yamlUrl', type: 'string', indexed: false },
      { name: 'yamlHash', type: 'bytes32', indexed: false },
      { name: 'feeAddress', type: 'address', indexed: false },
      { name: 'minPriceUsdc', type: 'uint256', indexed: false },
      { name: 'supportedIntents', type: 'string[]', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'WasmRegistered',
    inputs: [
      { name: 'registrationId', type: 'uint256', indexed: true },
      { name: 'author', type: 'address', indexed: true },
      { name: 'intentId', type: 'bytes32', indexed: true },
      { name: 'intent', type: 'string', indexed: false },
      { name: 'wasmHash', type: 'bytes32', indexed: false },
      { name: 'wasmUrl', type: 'string', indexed: false },
    ],
  },
] as const;

export const DIAMOND_ADDRESS = (process.env.NEXT_PUBLIC_REGISTRY_CONTRACT ?? '') as `0x${string}`;
export const ENTITY_MINER = 0;
export const ENTITY_COLLECTOR = 1;
export const ENTITY_WASM_AUTHOR = 2;

export const TELEGRAPH_NODE_URL = process.env.NEXT_PUBLIC_TELEGRAPH_NODE_URL ?? 'http://13.237.89.59:7044';

export interface WasmRecordApi {
  RegistrationID: number;
  AuthorAddress: string;
  WasmURL: string;
  WasmHash: string;
  WasmRaw: string | null;
  ActivationStatus: 'pending' | 'active' | 'rejected' | 'superseded' | 'deregistered' | string;
  /** The intent NAME (e.g. "CHAT_COMPLETION"), not a hex nonce. */
  IntentID: string;
  BondAmount: number;
  RejectionReason: string | null;
  RegisteredAt: string;
  UpdatedAt: string;
}

export interface WasmIntentResponse {
  intent_id: string;
  count: number;
  wasm: WasmRecordApi[];
}

export interface MinerRecordApi {
  RegistrationID: number;
  MinerAddress: string;
  YamlURL: string;
  YamlHash: string;
  Slug: string;
  ActivationStatus: 'pending' | 'active' | 'rejected' | 'superseded' | 'deregistered' | string;
  IntentID: string;
  FeeAddress: string;
  MinPriceUsdc: number;
  SupportedIntents: string[];
  RegisteredAt: string;
  UpdatedAt: string;
}

export interface AddressBundleResponse {
  address: string;
  miners: MinerRecordApi[];
  miner_count: number;
  wasm: WasmRecordApi[];
  wasm_count: number;
}

export interface LeaderboardEntry {
  miner_slug: string;
  score: number | null;
  rank: number | null;
  activation_status: 'pending' | 'active' | 'rejected' | 'superseded' | 'deregistered' | string;
}

/**
 * GET /leaderboard/miners (optionally ?intent=X, ?limit=N) and
 * GET /leaderboard/miners/epoch/:n both return this shape — entries grouped by intent for one epoch.
 * There is no separate "overall" list from the backend; build one client-side if needed.
 */
export interface LeaderboardResponse {
  epoch: number;
  intents: Record<string, LeaderboardEntry[]>;
}

export const REVERT_MESSAGES: Record<string, string> = {
  'empty hash': 'wasmHash was empty.',
  'empty URL': 'wasmUrl was empty.',
  'empty intent': 'Pick an intent — it cannot be blank.',
  'unsupported intent': 'Not a canonical intent. Choose one from the list.',
  'MinerRegistryFacet: unsupported intent': 'Not a canonical intent. Choose one from the list.',
  'duplicate wasm hash': 'You have already registered this exact binary. Deregister it first, or change the binary.',
  'not the registrant': 'Only the original author can deregister this entry.',
  'already deregistered': 'This entry has already been deregistered.',
};

export function friendlyRevertMessage(raw: string): string {
  for (const [key, msg] of Object.entries(REVERT_MESSAGES)) {
    if (raw.includes(key)) return msg;
  }

  if (/user rejected|user denied/i.test(raw)) return 'Transaction rejected in wallet.';

  // viem puts the actual revert reason on the line(s) AFTER this phrase, not on
  // the same line — naively taking the first line (as we used to) returns the
  // empty/truncated phrase itself with no reason attached.
  const reasonMatch = raw.match(/reverted with the following reason:\s*\n*\s*([^\n]+)/i);
  if (reasonMatch?.[1]?.trim()) return reasonMatch[1].trim();

  const shortMatch = raw.match(/execution reverted:?\s*([^\n]*)/i);
  if (shortMatch?.[1]?.trim()) return shortMatch[1].trim();

  const firstNonEmptyLine = raw.split('\n').map(l => l.trim()).find(Boolean);
  return firstNonEmptyLine || 'Transaction failed.';
}
