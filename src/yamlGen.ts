import type { FormState, OnChainFieldItem, OnChainRequestItem } from './types';
import { schemaFieldsToJson } from './schemaUtils';

const i2 = (s: string) => s.split('\n').map(l => `  ${l}`).join('\n');

function blockOrInline(text: string, baseIndent: string): string {
  if (!text) return '""';
  const lines = text.trim().split('\n');
  if (lines.length > 1 || text.length > 80) {
    return `>\n${lines.map(l => `${baseIndent}  ${l}`).join('\n')}`;
  }
  return text;
}

function renderOnChainFields(items: OnChainFieldItem[], type: string): string {
  if (!items.length) return '';
  const rows = items.map((f, i) => {
    const idx = f.index !== '' ? f.index : String(i);
    let block = `      - index: ${idx}\n`;
    if (f.name) block += `        name: ${f.name}\n`;
    if (f.description) block += `        description: ${blockOrInline(f.description, '        ')}\n`;
    if (f.source_path) block += `        source_path: ${f.source_path}\n`;
    if (f.multiplier) block += `        multiplier: ${f.multiplier}\n`;
    if (f.transform_rule) block += `        transform_rule: ${f.transform_rule}\n`;
    return block;
  });
  return `    ${type}:\n${rows.join('')}`;
}

function renderRequestItem(req: OnChainRequestItem): string {
  let block = `    - endpoint: ${req.endpoint}\n`;
  block += `      method: ${req.method || 'POST'}\n`;
  if (req.content_type) block += `      content_type: ${req.content_type}\n`;

  if (req.query_fields.length) {
    block += `      query_params:\n`;
    for (const f of req.query_fields) {
      if (!f.field_name || !f.source) continue;
      const extras = [
        f.optional ? 'optional: true' : '',
        f.type ? `type: ${f.type}` : '',
        f.format ? `format: ${f.format}` : '',
      ].filter(Boolean);
      const inline = [`source: ${f.source}`, ...extras].join(', ');
      block += `        ${f.field_name}: { ${inline} }\n`;
    }
  }

  if (req.body_fields.length) {
    block += `      body:\n`;
    for (const f of req.body_fields) {
      if (!f.field_name || !f.source) continue;
      const extras = [
        f.optional ? 'optional: true' : '',
        f.type ? `type: ${f.type}` : '',
        f.format ? `format: ${f.format}` : '',
      ].filter(Boolean);
      const inline = [`source: ${f.source}`, ...extras].join(', ');
      block += `        ${f.field_name}: { ${inline} }\n`;
    }
  }
  return block;
}

export function generateYaml(s: FormState): string {
  const lines: string[] = [];

  lines.push(`version: "1"`);
  if (s.kind) lines.push(`kind: ${s.kind}`);
  if (s.id) lines.push(`id: ${s.id}`);
  if (s.slug) lines.push(`slug: ${s.slug}`);
  if (s.protocol) lines.push(`protocol: ${s.protocol}`);
  if (s.name) lines.push(`name: ${s.name}`);
  if (s.description) {
    const desc = blockOrInline(s.description, '');
    lines.push(`description: ${desc}`);
  }
  lines.push('');

  if (s.base_url) lines.push(`base_url: ${s.base_url}`);
  lines.push('');

  // Auth
  if (s.auth_type && s.auth_type !== 'none') {
    lines.push(`auth:`);
    lines.push(`  type: ${s.auth_type}`);
    if (s.auth_env_var) lines.push(`  env_var: ${s.auth_env_var}`);
    if (s.auth_header_name) lines.push(`  header_name: ${s.auth_header_name}`);
    lines.push('');
  } else if (s.auth_type === 'none') {
    lines.push(`auth:`);
    lines.push(`  type: none`);
    lines.push('');
  }

  // Rate limits & circuit breaker
  if (s.rate_limit_per_sec !== '') lines.push(`rate_limit_per_sec: ${s.rate_limit_per_sec}`);
  if (s.cache_ttl_sec !== '') lines.push(`cache_ttl_sec: ${s.cache_ttl_sec}`);
  if (s.circuit_threshold !== '') lines.push(`circuit_threshold: ${s.circuit_threshold}`);
  if (s.circuit_cooldown_seconds !== '') lines.push(`circuit_cooldown_seconds: ${s.circuit_cooldown_seconds}`);
  lines.push('');

  // Endpoints
  if (s.endpoints.length) {
    lines.push(`endpoints:`);
    for (const ep of s.endpoints) {
      if (!ep.path && !ep.external_path) continue;
      lines.push(`  - path: ${ep.path}`);
      if (ep.external_path) lines.push(`    external_path: ${ep.external_path}`);
      if (ep.method) lines.push(`    method: ${ep.method}`);
      if (ep.description) {
        const desc = blockOrInline(ep.description, '    ');
        lines.push(`    description: ${desc}`);
      }
      if (ep.endpoint_base_url) lines.push(`    endpoint_base_url: ${ep.endpoint_base_url}`);
      if (ep.content_type) lines.push(`    content_type: ${ep.content_type}`);
      if (ep.multipart_fields) {
        const fields = ep.multipart_fields.split(',').map(f => f.trim()).filter(Boolean);
        if (fields.length) lines.push(`    multipart_fields: [${fields.join(', ')}]`);
      }
      if (ep.param_map.some(p => p.key)) {
        lines.push(`    param_map:`);
        for (const p of ep.param_map) {
          if (p.key && p.value) lines.push(`      ${p.key}: ${p.value}`);
        }
      }
    }
    lines.push('');
  }

  // Input schema
  const inputSchemaObj = s.input_schema_fields.length
    ? schemaFieldsToJson(s.input_schema_fields)
    : (() => { try { return JSON.parse(s.input_schema_raw); } catch { return null; } })();
  if (inputSchemaObj) {
    lines.push(`input_schema:`);
    lines.push(i2(jsonToYaml(inputSchemaObj)));
    lines.push('');
  } else if (s.input_schema_raw.trim()) {
    lines.push(`# input_schema: (invalid JSON — fix before uploading)`);
    lines.push('');
  }

  // Output schema
  const outputSchemaObj = s.output_schema_fields.length
    ? schemaFieldsToJson(s.output_schema_fields)
    : (() => { try { return JSON.parse(s.output_schema_raw); } catch { return null; } })();
  if (outputSchemaObj) {
    lines.push(`output_schema:`);
    lines.push(i2(jsonToYaml(outputSchemaObj)));
    lines.push('');
  } else if (s.output_schema_raw.trim()) {
    lines.push(`# output_schema: (invalid JSON — fix before uploading)`);
    lines.push('');
  }

  // Semantics
  const hasSemantics = s.semantics_signal_type || s.semantics_intents.filter(Boolean).length;
  if (hasSemantics) {
    lines.push(`semantics:`);
    if (s.semantics_signal_type) {
      lines.push(`  signal_mapping:`);
      lines.push(`    type: ${s.semantics_signal_type}`);
      if (s.semantics_confidence_field) lines.push(`    confidence_field: ${s.semantics_confidence_field}`);
      if (s.semantics_label_field) lines.push(`    label_field: ${s.semantics_label_field}`);
      if (s.semantics_reason_field) lines.push(`    reason_field: ${s.semantics_reason_field}`);
    }
    const intents = s.semantics_intents.filter(Boolean);
    if (intents.length) {
      lines.push(`  supported_intents:`);
      for (const intent of intents) lines.push(`    - ${intent}`);
    }
    lines.push('');
  }

  // On-chain
  if (s.onchain_enabled) {
    lines.push(`on_chain:`);
    if (s.onchain_description) {
      const desc = blockOrInline(s.onchain_description, '  ');
      lines.push(`  description: ${desc}`);
    }
    if (s.onchain_transform) lines.push(`  transform: ${s.onchain_transform}`);
    if (s.onchain_transform === 'llm' && s.onchain_prompt_template) {
      const tmpl = blockOrInline(s.onchain_prompt_template, '  ');
      lines.push(`  prompt_template: ${tmpl}`);
    }
    if (s.onchain_min_price_usdc) lines.push(`  min_price_usdc: ${s.onchain_min_price_usdc}`);

    const hasFields = s.onchain_strings.length || s.onchain_integers.length || s.onchain_bools.length || s.onchain_addresses.length;
    if (hasFields) {
      lines.push(`  fields:`);
      if (s.onchain_strings.length) {
        const block = renderOnChainFields(s.onchain_strings, 'strings');
        if (block) lines.push(block.trimEnd());
      }
      if (s.onchain_integers.length) {
        const block = renderOnChainFields(s.onchain_integers, 'integers');
        if (block) lines.push(block.trimEnd());
      }
      if (s.onchain_bools.length) {
        const block = renderOnChainFields(s.onchain_bools, 'bools');
        if (block) lines.push(block.trimEnd());
      }
      if (s.onchain_addresses.length) {
        const block = renderOnChainFields(s.onchain_addresses, 'addresses');
        if (block) lines.push(block.trimEnd());
      }
    }

    const validReqs = s.onchain_request.filter(r => r.endpoint);
    if (validReqs.length) {
      lines.push(`  request:`);
      for (const req of validReqs) {
        lines.push(renderRequestItem(req).trimEnd());
      }
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// Minimal JSON → YAML converter for schemas
function jsonToYaml(obj: unknown, depth = 0): string {
  const pad = '  '.repeat(depth);
  if (obj === null) return 'null';
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes(': ') || obj.startsWith('>')) return `"${obj.replace(/"/g, '\\"')}"`;
    if (obj.length > 80) return `>\n${pad}  ${obj}`;
    return obj;
  }
  if (Array.isArray(obj)) {
    if (!obj.length) return '[]';
    return obj.map(item => {
      const rendered = jsonToYaml(item, depth + 1);
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        const lines = rendered.split('\n');
        return `- ${lines[0]}\n${lines.slice(1).map(l => `  ${l}`).join('\n')}`;
      }
      return `- ${rendered}`;
    }).join('\n');
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (!entries.length) return '{}';
    return entries.map(([k, v]) => {
      const rendered = jsonToYaml(v, depth + 1);
      if (typeof v === 'object' && v !== null) {
        return `${k}:\n${pad}  ${rendered.split('\n').join(`\n${pad}  `)}`;
      }
      return `${k}: ${rendered}`;
    }).join('\n');
  }
  return String(obj);
}
