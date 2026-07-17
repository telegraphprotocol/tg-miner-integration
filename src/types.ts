export type Step = 1 | 2 | 3;

export type SchemaFieldType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

export interface SchemaField {
  _id: string;
  name: string;
  type: SchemaFieldType | '';
  description: string;
  required: boolean;
  enum_values: string;
  minimum: string;
  maximum: string;
  min_length: string;
  max_length: string;
  pattern: string;
  format: string;
  items_type: string;
  autoConfigured?: boolean;
}

export interface EndpointItem {
  _id: string;
  path: string;
  external_path: string;
  method: string;
  description: string;
  endpoint_base_url: string;
  content_type: string;
  multipart_fields: string; // comma-separated → array in YAML
  param_map: Array<{ _id: string; key: string; value: string }>;
  sample_request_json: string;
  sample_response_json: string;
}

export interface OnChainFieldItem {
  _id: string;
  index: string;
  name: string;
  description: string;
  source_path: string;
  multiplier: string;
  transform_rule: string;
  autoConfigured?: boolean;
}

export interface OnChainBodyField {
  _id: string;
  field_name: string;
  source: string;
  optional: boolean;
  type: string;
  format: string;
  autoConfigured?: boolean;
}

export interface OnChainRequestItem {
  _id: string;
  endpoint: string;
  method: string;
  content_type: string;
  body_fields: OnChainBodyField[];
  query_fields: OnChainBodyField[];
}

export interface FormState {
  // Basics
  kind: string;
  id: string;
  slug: string;
  protocol: string;
  name: string;
  description: string;

  // Connection
  base_url: string;
  rate_limit_per_sec: string;
  cache_ttl_sec: string;
  circuit_threshold: string;
  circuit_cooldown_seconds: string;

  // Auth
  auth_type: string;
  auth_env_var: string;
  auth_header_name: string;

  // Endpoints
  endpoints: EndpointItem[];

  // Semantics
  semantics_signal_type: string;
  semantics_confidence_field: string;
  semantics_label_field: string;
  semantics_reason_field: string;
  semantics_intents: string[];

  // On-Chain
  onchain_enabled: boolean;
  onchain_description: string;
  onchain_transform: string;
  onchain_prompt_template: string;
  onchain_min_price_usdc: string;
  onchain_strings: OnChainFieldItem[];
  onchain_integers: OnChainFieldItem[];
  onchain_bools: OnChainFieldItem[];
  onchain_addresses: OnChainFieldItem[];
  onchain_request: OnChainRequestItem[];

  // Advanced
  polling_interval_seconds: string;
  polling_cache_ttl_seconds: string;
  input_schema_raw: string;
  input_schema_fields: SchemaField[];
  output_schema_raw: string;
  output_schema_fields: SchemaField[];
}

export interface PinataResult {
  hash: string;
  url: string;
  gateway: string;
}

// Fixed enum — must match the node's canonical values exactly
export const SIGNAL_TYPES = [
  'media_authenticity',
  'weather_risk',
  'text_authenticity',
  'search_relevance',
  'language_response',
  'multimodal_response',
  'task_completion',
] as const;

// Canonical intents registered on-chain — UPPER_SNAKE_CASE as the registry expects
export const CANONICAL_INTENTS = [
  'CHAT_COMPLETION',
  'TASK_COMPLETION',
  'AGENT_TASK',
  'WEB_SEARCH',
  'IMAGE_GENERATION',
  'IMAGE_VERIFICATION',
  'VIDEO_VERIFICATION',
  'WEATHER_CHECK',
  'WEATHER_FORECAST',
  'WEATHER_RISK_ASSESSMENT',
  'STORM_ALERT',
  'DEEPFAKE_DETECTION',
  'MEDIA_AUTHENTICITY_CHECK',
  'AI_DETECTION',
] as const;

export type CanonicalIntent = typeof CANONICAL_INTENTS[number];

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
