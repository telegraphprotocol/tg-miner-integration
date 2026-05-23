import type { FormState } from './types';

export const DEFAULT_FORM: FormState = {
  kind: 'subnet',
  id: '',
  slug: '',
  protocol: '',
  name: '',
  description: '',

  base_url: '',
  rate_limit_per_sec: '',
  cache_ttl_sec: '',
  circuit_threshold: '',
  circuit_cooldown_seconds: '',

  auth_type: 'bearer',
  auth_env_var: '',
  auth_header_name: '',

  endpoints: [],

  semantics_signal_type: '',
  semantics_confidence_field: '',
  semantics_label_field: '',
  semantics_reason_field: '',
  semantics_intents: [],

  onchain_enabled: false,
  onchain_description: '',
  onchain_transform: 'direct',
  onchain_prompt_template: '',
  onchain_min_price_usdc: '',
  onchain_strings: [],
  onchain_integers: [],
  onchain_bools: [],
  onchain_addresses: [],
  onchain_request: [],

  polling_interval_seconds: '',
  polling_cache_ttl_seconds: '',
  input_schema_raw: '',
  input_schema_fields: [],
  output_schema_raw: '',
  output_schema_fields: [],
};

let _id = 0;
export const uid = () => `_${++_id}`;
