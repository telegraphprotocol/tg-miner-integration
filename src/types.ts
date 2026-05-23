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

// 27 canonical intents — lowercase snake_case as the node expects
export const CANONICAL_INTENTS = [
  'language_generation',
  'chat_completion',
  'text_generation',
  'high_performance_inference',
  'embeddings',
  'content_moderation',
  'weather_check',
  'storm_alert',
  'weather_forecast',
  'weather_risk_assessment',
  'multimodal_inference',
  'image_generation',
  'text_to_image',
  'task_completion',
  'agent_task',
  'web_search',
  'twitter_search',
  'news_search',
  'research_synthesis',
  'fact_check',
  'text_authenticity_check',
  'ai_text_detection',
  'content_verification',
  'deepfake_detection',
  'media_authenticity_check',
  'image_verification',
  'video_verification',
] as const;

export type CanonicalIntent = typeof CANONICAL_INTENTS[number];

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
