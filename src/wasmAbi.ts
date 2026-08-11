export const intentRegistryAbi = [
  {
    type: 'function',
    name: 'registerWasm',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'wasmHash', type: 'bytes32' },
      { name: 'wasmUrl', type: 'string' },
      { name: 'whitelistedUrls', type: 'string[]' },
    ],
    outputs: [{ name: 'registrationId', type: 'uint256' }],
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
      { name: 'whitelistedUrls', type: 'string[]' },
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
] as const;

export const DIAMOND_ADDRESS = (process.env.NEXT_PUBLIC_REGISTRY_CONTRACT ?? '') as `0x${string}`;
export const ENTITY_MINER = 1;
export const ENTITY_WASM_AUTHOR = 2;

export const TELEGRAPH_NODE_URL = process.env.NEXT_PUBLIC_TELEGRAPH_NODE_URL ?? 'http://13.237.89.59:7044';

export interface WasmRecordApi {
  RegistrationID: number;
  AuthorAddress: string;
  WasmURL: string;
  WasmHash: string;
  WasmRaw: string | null;
  ActivationStatus: 'pending' | 'active' | 'rejected' | 'superseded' | 'deregistered' | string;
  IntentID: string;
  WhitelistedURLs: string[];
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
  /** Only present on entries from GET /leaderboard/miners — the by-intent breakdown omits it. */
  activation_status?: 'pending' | 'active' | 'rejected' | 'superseded' | 'deregistered' | string;
  avg_score: number | null;
  best_rank: number | null;
  epochs_participated: number;
  total_requests_served: number;
  position: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  epoch_start: number;
  epoch_end: number;
}

export interface LeaderboardByIntentResponse {
  intents: Record<string, LeaderboardEntry[]>;
  epoch_start: number;
  epoch_end: number;
}

export const REVERT_MESSAGES: Record<string, string> = {
  'empty hash': 'wasmHash was empty.',
  'empty URL': 'wasmUrl was empty.',
  'machina token not set': 'Protocol misconfiguration — this is not a user error. Please contact support.',
  'bond transfer failed': 'Insufficient MACHINA balance or allowance.',
  'duplicate wasm intentId': 'Same author + same hash registered in the same block. Please retry.',
  'not the registrant': 'Only the original author can deregister this entry.',
  'already deregistered': 'This entry has already been deregistered.',
};

export function friendlyRevertMessage(raw: string): string {
  for (const [key, msg] of Object.entries(REVERT_MESSAGES)) {
    if (raw.includes(key)) return msg;
  }
  return raw.split('\n')[0] ?? 'Transaction failed.';
}
