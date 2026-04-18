/**
 * Tenant catalogue mode and matrix attribute helpers (UI + variant generation).
 */

export type CatalogueMode = 'simple' | 'grouped' | 'matrix';

export function normalizeCatalogueMode(raw: string | null | undefined): CatalogueMode {
  if (raw === 'grouped' || raw === 'matrix') return raw;
  return 'simple';
}

/**
 * Explains impact of changing `tenants.catalogue_mode` after the tenant exists (no schema migration).
 * Use in admin UI before saving a different mode.
 */
export function catalogueModeChangeGuidance(previous: CatalogueMode, next: CatalogueMode): string {
  if (previous === next) {
    return '';
  }
  if (next === 'simple') {
    return (
      'You are switching to Simple catalogue mode. The Products UI will hide groups and variant/matrix tools. ' +
      'Existing product groups, group assignments, and variant data are not deleted—they stay in the database. ' +
      'You can switch back to Grouped or Matrix later to manage them again.'
    );
  }
  if (previous === 'simple') {
    return (
      'You are enabling Grouped or Matrix features. No database migration runs and the schema does not change. ' +
      'After saving, the workspace will show the matching product UI (groups and/or matrix tooling).'
    );
  }
  return (
    'You are changing between Grouped and Matrix. The schema stays the same; Matrix emphasizes attribute-dimension tooling for groups. ' +
    'Existing products and groups are kept—review group settings if you rely on matrix combinations.'
  );
}

export function parseAttributeDimensions(json: unknown): { key: string; values: string[] }[] {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return [];
  const o = json as Record<string, unknown>;
  const order = Array.isArray(o.dimensions)
    ? (o.dimensions as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    : [];
  const keys =
    order.length > 0 ? order : Object.keys(o).filter((k) => k !== 'dimensions');
  const result: { key: string; values: string[] }[] = [];
  for (const k of keys) {
    const v = o[k];
    if (Array.isArray(v)) {
      const vals = v
        .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
        .map((s) => s.trim());
      if (vals.length) result.push({ key: k, values: vals });
    }
  }
  return result;
}

export function cartesianCombinations(
  dims: { key: string; values: string[] }[]
): Record<string, string>[] {
  if (dims.length === 0) return [];
  let acc: Record<string, string>[] = [{}];
  for (const d of dims) {
    const next: Record<string, string>[] = [];
    for (const row of acc) {
      for (const val of d.values) {
        next.push({ ...row, [d.key]: val });
      }
    }
    acc = next;
  }
  return acc;
}

function slugSegment(s: string): string {
  return s
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, 32);
}

/** Build SKU from user-provided prefix and variant attribute values (order = dimension order). */
export function skuFromPrefix(prefix: string, attrs: Record<string, string>, dimensionOrder: string[]): string {
  const p = prefix.trim().replace(/\s+/g, '-');
  const segs: string[] = [];
  for (const key of dimensionOrder) {
    const v = attrs[key];
    if (v) {
      const seg = slugSegment(v);
      if (seg) segs.push(seg);
    }
  }
  return [slugSegment(p) || 'SKU', ...segs].join('-');
}

export function variantAttributesKey(attrs: Record<string, string>): string {
  const keys = Object.keys(attrs).sort();
  return JSON.stringify(keys.map((k) => [k, attrs[k]]));
}
