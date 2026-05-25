import type { SellablePackLevelOption } from '@/types/sellablePackLevel';

/** Built-in codes seeded for every tenant (labels may be customized in DB). */
export const SYSTEM_SELLABLE_PACK_CODES = ['unit', 'inner', 'case', 'pallet', 'container'] as const;

export type SystemSellablePackCode = (typeof SYSTEM_SELLABLE_PACK_CODES)[number];

const DEFAULT_LABELS: Record<SystemSellablePackCode, string> = {
  unit: 'Unit',
  inner: 'Inner (breakpack)',
  case: 'Case',
  pallet: 'Pallet',
  container: 'Container',
};

/** Default catalog when tenant rows are not loaded yet. */
export const DEFAULT_SELLABLE_PACK_OPTIONS: SellablePackLevelOption[] =
  SYSTEM_SELLABLE_PACK_CODES.map((code, i) => ({
    code,
    label: DEFAULT_LABELS[code],
    sort_order: (i + 1) * 10,
  }));

/** Slug for `tenant_sellable_pack_levels.code` (lowercase snake). */
export function slugifySellablePackCode(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  if (!slug) return 'pack';
  if (!/^[a-z]/.test(slug)) return `pack_${slug}`.slice(0, 48);
  return slug;
}

export function sortSellablePackOptions(
  options: SellablePackLevelOption[]
): SellablePackLevelOption[] {
  return [...options].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
}

export function buildSellablePackLabelMap(
  options: SellablePackLevelOption[]
): Record<string, string> {
  const map: Record<string, string> = { ...DEFAULT_LABELS };
  for (const o of options) {
    map[o.code] = o.label;
  }
  return map;
}

export function sellablePackCodes(options: SellablePackLevelOption[]): string[] {
  return options.map((o) => o.code);
}

export function isKnownSellablePackCode(
  code: string | null | undefined,
  options: SellablePackLevelOption[]
): boolean {
  if (!code) return false;
  return options.some((o) => o.code === code);
}

export function mergeSellablePackOptions(
  catalog: SellablePackLevelOption[],
  extraCodes: Iterable<string | null | undefined>
): SellablePackLevelOption[] {
  const byCode = new Map<string, SellablePackLevelOption>();
  for (const o of sortSellablePackOptions(catalog)) {
    byCode.set(o.code, o);
  }
  for (const raw of extraCodes) {
    const code = raw?.trim();
    if (!code || byCode.has(code)) continue;
    byCode.set(code, {
      code,
      label: code.replace(/_/g, ' '),
      sort_order: 999,
    });
  }
  return sortSellablePackOptions([...byCode.values()]);
}
