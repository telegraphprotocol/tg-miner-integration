import type { SchemaField, OnChainFieldItem, OnChainBodyField, OnChainRequestItem } from './types';
import { uid } from './formState';

type JsType = 'string' | 'number' | 'boolean';
interface FlatField { path: string; value: unknown; jsType: JsType }

// Recursively flatten an object/array into dot-path leaf fields
function flattenPaths(obj: unknown, prefix = '', depth = 0): FlatField[] {
  if (depth > 3 || obj == null || typeof obj !== 'object') return [];
  const out: FlatField[] = [];

  const entries: [string, unknown][] = Array.isArray(obj)
    ? obj.length > 0 ? [['0', obj[0]]] : []
    : Object.entries(obj as Record<string, unknown>);

  for (const [k, v] of entries) {
    if (v == null) continue;
    const path = prefix ? `${prefix}.${k}` : k;

    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out.push({ path, value: v, jsType: typeof v as JsType });
    } else if (Array.isArray(v)) {
      if (v.length > 0 && v[0] != null && typeof v[0] === 'object') {
        out.push(...flattenPaths(v[0], `${path}.0`, depth + 1));
      }
    } else if (typeof v === 'object') {
      out.push(...flattenPaths(v, path, depth + 1));
    }
  }
  return out;
}

function inferSchemaField(name: string, value: unknown, autoConfigured = false): SchemaField {
  let type: SchemaField['type'] = 'string';
  let items_type = '';

  if (typeof value === 'boolean') type = 'boolean';
  else if (typeof value === 'number') type = Number.isInteger(value) ? 'integer' : 'number';
  else if (typeof value === 'string') type = 'string';
  else if (Array.isArray(value)) {
    type = 'array';
    if (value.length > 0) {
      const first = value[0];
      items_type = first == null ? '' : typeof first === 'object' ? 'object' : typeof first as string;
    }
  } else if (typeof value === 'object' && value !== null) {
    type = 'object';
  }

  return {
    _id: uid(), name, type, description: '', required: false,
    enum_values: '', minimum: '', maximum: '',
    min_length: '', max_length: '', pattern: '', format: '', items_type,
    autoConfigured,
  };
}

// Leaf names that are metadata / internal IDs — not useful on-chain
const SKIP_ONCHAIN = new Set([
  'id', 'object', 'created', 'created_at', 'updated_at',
  'type', 'role', 'index', 'fingerprint', 'system_fingerprint',
]);

// Request field names that carry chat message arrays
const CHAT_FIELD_NAMES = new Set(['messages', 'input', 'contents', 'conversation', 'history']);

export interface InferResult {
  input_schema_fields: SchemaField[];
  output_schema_fields: SchemaField[];
  onchain_strings: OnChainFieldItem[];
  onchain_integers: OnChainFieldItem[];
  onchain_bools: OnChainFieldItem[];
  onchain_request: OnChainRequestItem;
  summary: { inputs: number; outputs: number; strings: number; integers: number; bools: number };
}

export interface InferError {
  field: 'request' | 'response';
  message: string;
}

export function inferFromSamples(
  requestJson: string,
  responseJson: string,
  endpointPath: string,
): { result: InferResult } | { error: InferError } {
  let req: Record<string, unknown> | null = null;
  let res: Record<string, unknown> | null = null;

  if (requestJson.trim()) {
    try { req = JSON.parse(requestJson) as Record<string, unknown>; }
    catch (e) { return { error: { field: 'request', message: (e as Error).message } }; }
  }
  if (responseJson.trim()) {
    try { res = JSON.parse(responseJson) as Record<string, unknown>; }
    catch (e) { return { error: { field: 'response', message: (e as Error).message } }; }
  }

  // ── Input schema from request top-level keys ────────────────────────────
  const input_schema_fields: SchemaField[] = req
    ? Object.entries(req).map(([k, v]) => inferSchemaField(k, v, true))
    : [];

  // ── Output schema from response top-level keys ──────────────────────────
  const output_schema_fields: SchemaField[] = res
    ? Object.entries(res).map(([k, v]) => inferSchemaField(k, v, true))
    : [];

  // ── On-chain fields from flattened response ─────────────────────────────
  const onchain_strings: OnChainFieldItem[] = [];
  const onchain_integers: OnChainFieldItem[] = [];
  const onchain_bools: OnChainFieldItem[] = [];

  if (res) {
    let si = 0, ii = 0, bi = 0;
    for (const f of flattenPaths(res)) {
      const leaf = f.path.split('.').pop()!;
      if (SKIP_ONCHAIN.has(leaf)) continue;
      if (typeof f.value === 'string' && f.value.length > 500) continue; // skip base64 / large blobs

      const name = f.path.replace(/\./g, '_');
      const base: Omit<OnChainFieldItem, 'index' | 'multiplier' | 'transform_rule'> = {
        _id: uid(), name, description: '', source_path: f.path, autoConfigured: true,
      };

      if (f.jsType === 'string') {
        onchain_strings.push({ ...base, index: String(si++), multiplier: '', transform_rule: '' });
      } else if (f.jsType === 'number') {
        const isFloat = !Number.isInteger(f.value);
        onchain_integers.push({ ...base, index: String(ii++), multiplier: isFloat ? '10000' : '', transform_rule: '' });
      } else if (f.jsType === 'boolean') {
        onchain_bools.push({ ...base, index: String(bi++), multiplier: '', transform_rule: `bool_from_eq:${f.value}` });
      }
    }
  }

  // ── Request body mapping from request top-level keys ───────────────────
  const body_fields: OnChainBodyField[] = [];
  if (req) {
    let si = 0, ni = 0, bi = 0;
    for (const [key, val] of Object.entries(req)) {
      if (typeof val === 'string' || Array.isArray(val)) {
        body_fields.push({
          _id: uid(), field_name: key,
          source: `strings.${si++}`, optional: false,
          type: '', format: CHAT_FIELD_NAMES.has(key) ? 'chat_messages' : '',
          autoConfigured: true,
        });
      } else if (typeof val === 'number') {
        body_fields.push({
          _id: uid(), field_name: key,
          source: `numbers.${ni++}`, optional: true,
          type: Number.isInteger(val) ? 'int' : 'float', format: '',
          autoConfigured: true,
        });
      } else if (typeof val === 'boolean') {
        body_fields.push({
          _id: uid(), field_name: key,
          source: `bools.${bi++}`, optional: true,
          type: '', format: '',
          autoConfigured: true,
        });
      }
    }
  }

  // Endpoint keyword from path (last path segment)
  const keyword = (endpointPath.replace(/^\//, '').split('/').filter(Boolean).pop() ?? 'endpoint');

  const onchain_request: OnChainRequestItem = {
    _id: uid(),
    endpoint: keyword,
    method: 'POST',
    content_type: '',
    body_fields,
    query_fields: [],
  };

  return {
    result: {
      input_schema_fields,
      output_schema_fields,
      onchain_strings,
      onchain_integers,
      onchain_bools,
      onchain_request,
      summary: {
        inputs: input_schema_fields.length,
        outputs: output_schema_fields.length,
        strings: onchain_strings.length,
        integers: onchain_integers.length,
        bools: onchain_bools.length,
      },
    },
  };
}
