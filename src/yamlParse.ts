import * as yaml from 'js-yaml';
import type { FormState, EndpointItem, OnChainFieldItem, OnChainRequestItem, OnChainBodyField } from './types';
import { DEFAULT_FORM, uid } from './formState';
import { schemaJsonToFields } from './schemaUtils';

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function parseFieldItems(arr: unknown): OnChainFieldItem[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item: Record<string, unknown>) => ({
    _id: uid(),
    index: str(item.index),
    name: str(item.name),
    description: str(item.description),
    source_path: str(item.source_path),
    multiplier: item.multiplier != null ? str(item.multiplier) : '',
    transform_rule: str(item.transform_rule),
  }));
}

function parseBodyFields(obj: unknown): OnChainBodyField[] {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj as Record<string, unknown>).map(([field_name, spec]) => {
    const s = (spec && typeof spec === 'object' ? spec : {}) as Record<string, unknown>;
    return {
      _id: uid(),
      field_name,
      source: str(s.source),
      optional: s.optional === true,
      type: str(s.type),
      format: str(s.format),
    };
  });
}

export function parseYamlToForm(yamlStr: string): FormState {
  let doc: Record<string, unknown>;
  try {
    doc = yaml.load(yamlStr) as Record<string, unknown>;
    if (!doc || typeof doc !== 'object') throw new Error('Not an object');
  } catch (e) {
    throw new Error(`Invalid YAML: ${(e as Error).message}`);
  }

  const auth = (doc.auth ?? {}) as Record<string, unknown>;
  const polling = (doc.polling ?? {}) as Record<string, unknown>;
  const semantics = (doc.semantics ?? {}) as Record<string, unknown>;
  const signalMapping = (semantics.signal_mapping ?? {}) as Record<string, unknown>;
  const onchain = (doc.on_chain ?? {}) as Record<string, unknown>;
  const fields = (onchain.fields ?? {}) as Record<string, unknown>;

  const endpoints: EndpointItem[] = Array.isArray(doc.endpoints)
    ? (doc.endpoints as Record<string, unknown>[]).map(ep => ({
        _id: uid(),
        path: str(ep.path),
        external_path: str(ep.external_path),
        method: str(ep.method) || 'POST',
        description: str(ep.description),
        endpoint_base_url: str(ep.endpoint_base_url),
        content_type: str(ep.content_type),
        multipart_fields: Array.isArray(ep.multipart_fields)
          ? (ep.multipart_fields as string[]).join(', ')
          : str(ep.multipart_fields),
        param_map: ep.param_map && typeof ep.param_map === 'object'
          ? Object.entries(ep.param_map as Record<string, string>).map(([key, value]) => ({ _id: uid(), key, value: str(value) }))
          : [],
        sample_request_json: '',
        sample_response_json: '',
      }))
    : [];

  const onchainRequest: OnChainRequestItem[] = Array.isArray(onchain.request)
    ? (onchain.request as Record<string, unknown>[]).map(r => ({
        _id: uid(),
        endpoint: str(r.endpoint),
        method: str(r.method) || 'POST',
        content_type: str(r.content_type),
        body_fields: parseBodyFields(r.body),
        query_fields: parseBodyFields(r.query_params),
      }))
    : [];

  // input/output schema → JSON string + attempt visual field parse
  const inputSchemaRaw = doc.input_schema != null
    ? JSON.stringify(doc.input_schema, null, 2)
    : '';
  const outputSchemaRaw = doc.output_schema != null
    ? JSON.stringify(doc.output_schema, null, 2)
    : '';

  const inputSchemaFields = doc.input_schema != null
    ? (schemaJsonToFields(doc.input_schema) ?? [])
    : [];
  const outputSchemaFields = doc.output_schema != null
    ? (schemaJsonToFields(doc.output_schema) ?? [])
    : [];

  // Read kind from the doc, but normalize the legacy `miner` value to `subnet`
  // so it round-trips through the form (chips only allow subnet/validator).
  const rawKind = str(doc.kind);
  const normalizedKind = rawKind === 'miner' ? 'subnet' : (rawKind || 'subnet');

  return {
    ...DEFAULT_FORM,
    kind: normalizedKind,
    id: doc.id != null ? str(doc.id) : '',
    slug: str(doc.slug),
    protocol: str(doc.protocol) || 'bittensor',
    name: str(doc.name),
    description: str(doc.description),

    base_url: str(doc.base_url),
    rate_limit_per_sec: doc.rate_limit_per_sec != null ? str(doc.rate_limit_per_sec) : '',
    cache_ttl_sec: doc.cache_ttl_sec != null ? str(doc.cache_ttl_sec) : '',
    circuit_threshold: doc.circuit_threshold != null ? str(doc.circuit_threshold) : '',
    circuit_cooldown_seconds: doc.circuit_cooldown_seconds != null ? str(doc.circuit_cooldown_seconds) : '',

    auth_type: str(auth.type) || 'bearer',
    auth_env_var: str(auth.env_var),
    auth_header_name: str(auth.header_name),

    endpoints,

    semantics_signal_type: str(signalMapping.type),
    semantics_confidence_field: str(signalMapping.confidence_field),
    semantics_label_field: str(signalMapping.label_field),
    semantics_reason_field: str(signalMapping.reason_field),
    semantics_intents: Array.isArray(semantics.supported_intents)
      ? (semantics.supported_intents as string[]).map(str)
      : [],

    onchain_enabled: doc.on_chain != null,
    onchain_description: str(onchain.description),
    onchain_transform: str(onchain.transform) || 'direct',
    onchain_prompt_template: str(onchain.prompt_template),
    onchain_min_price_usdc: onchain.min_price_usdc != null ? str(onchain.min_price_usdc) : '',
    onchain_strings: parseFieldItems(fields.strings),
    onchain_integers: parseFieldItems(fields.integers),
    onchain_bools: parseFieldItems(fields.bools),
    onchain_addresses: parseFieldItems(fields.addresses),
    onchain_request: onchainRequest,

    polling_interval_seconds: polling.interval_seconds != null ? str(polling.interval_seconds) : '',
    polling_cache_ttl_seconds: polling.cache_ttl_seconds != null ? str(polling.cache_ttl_seconds) : '',

    input_schema_raw: inputSchemaRaw,
    input_schema_fields: inputSchemaFields,
    output_schema_raw: outputSchemaRaw,
    output_schema_fields: outputSchemaFields,
  };
}
