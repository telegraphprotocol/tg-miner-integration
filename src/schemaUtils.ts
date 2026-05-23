import type { SchemaField, SchemaFieldType } from './types';
import { uid } from './formState';

export function schemaFieldsToJson(fields: SchemaField[]): Record<string, unknown> | null {
  if (!fields.length) return null;
  const required = fields.filter(f => f.required && f.name).map(f => f.name);
  const properties: Record<string, unknown> = {};

  for (const f of fields) {
    if (!f.name) continue;
    const prop: Record<string, unknown> = {};
    if (f.type) prop.type = f.type;
    if (f.description) prop.description = f.description;
    if (f.format) prop.format = f.format;
    if (f.pattern) prop.pattern = f.pattern;
    if (f.minimum !== '') prop.minimum = Number(f.minimum);
    if (f.maximum !== '') prop.maximum = Number(f.maximum);
    if (f.min_length !== '') prop.minLength = Number(f.min_length);
    if (f.max_length !== '') prop.maxLength = Number(f.max_length);
    if (f.enum_values.trim()) {
      const vals = f.enum_values.split(',').map(v => v.trim()).filter(Boolean);
      if (vals.length) prop.enum = vals;
    }
    if (f.type === 'array' && f.items_type) {
      prop.items = { type: f.items_type };
    }
    properties[f.name] = prop;
  }

  const schema: Record<string, unknown> = { type: 'object', properties };
  if (required.length) schema.required = required;
  return schema;
}

export function schemaJsonToFields(schema: unknown): SchemaField[] | null {
  if (!schema || typeof schema !== 'object') return null;
  const s = schema as Record<string, unknown>;
  if (!s.properties || typeof s.properties !== 'object') return null;

  const required = Array.isArray(s.required) ? (s.required as string[]) : [];
  const fields: SchemaField[] = [];

  for (const [name, propRaw] of Object.entries(s.properties as Record<string, unknown>)) {
    const prop = (propRaw && typeof propRaw === 'object' ? propRaw : {}) as Record<string, unknown>;
    const itemsRaw = prop.items && typeof prop.items === 'object' ? prop.items as Record<string, unknown> : null;

    fields.push({
      _id: uid(),
      name,
      type: (prop.type as SchemaFieldType) || '',
      description: String(prop.description ?? ''),
      required: required.includes(name),
      enum_values: Array.isArray(prop.enum) ? (prop.enum as unknown[]).map(String).join(', ') : '',
      minimum: prop.minimum != null ? String(prop.minimum) : '',
      maximum: prop.maximum != null ? String(prop.maximum) : '',
      min_length: prop.minLength != null ? String(prop.minLength) : '',
      max_length: prop.maxLength != null ? String(prop.maxLength) : '',
      pattern: String(prop.pattern ?? ''),
      format: String(prop.format ?? ''),
      items_type: itemsRaw ? String(itemsRaw.type ?? '') : '',
    });
  }

  return fields.length ? fields : null;
}

export function outputFieldPaths(fields: SchemaField[]): string[] {
  return fields.filter(f => f.name).map(f => f.name);
}
