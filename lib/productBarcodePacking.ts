import {
  buildSellablePackLabelMap,
  DEFAULT_SELLABLE_PACK_OPTIONS,
  isKnownSellablePackCode,
  type SystemSellablePackCode,
} from '@/lib/sellablePackLevel';
import type { SellablePackLevelOption } from '@/types/sellablePackLevel';

/** @deprecated Use tenant catalog codes; kept for backward-compatible imports. */
export type PackingLevel = SystemSellablePackCode;

/** @deprecated Use tenant `tenant_sellable_pack_levels` or DEFAULT_SELLABLE_PACK_OPTIONS. */
export const PACKING_LEVEL_OPTIONS: readonly PackingLevel[] = [
  'unit',
  'inner',
  'case',
  'pallet',
  'container',
] as const;

/** @deprecated Use buildSellablePackLabelMap(catalog). */
export const PACKING_LEVEL_LABELS: Record<PackingLevel, string> = {
  unit: 'Unit',
  inner: 'Inner (breakpack)',
  case: 'Case',
  pallet: 'Pallet',
  container: 'Container',
};

export function isValidPackingLevel(
  value: string | null | undefined,
  catalog: SellablePackLevelOption[] = DEFAULT_SELLABLE_PACK_OPTIONS
): boolean {
  return isKnownSellablePackCode(value, catalog);
}

export function resolveBarcodePackingLevel(
  value: string | null | undefined,
  catalog: SellablePackLevelOption[] = DEFAULT_SELLABLE_PACK_OPTIONS
): string {
  if (value && isKnownSellablePackCode(value, catalog)) return value;
  const fallback = catalog.find((o) => o.code === 'unit')?.code ?? catalog[0]?.code ?? 'unit';
  return fallback;
}

/** Human-readable sellable pack, e.g. "Case × 12" or "Unit". */
export function formatBarcodePackLabel(
  level: string | null | undefined,
  quantity: number | null | undefined,
  catalog: SellablePackLevelOption[] = DEFAULT_SELLABLE_PACK_OPTIONS
): string {
  const labelMap = buildSellablePackLabelMap(catalog);
  const resolved = resolveBarcodePackingLevel(level, catalog);
  const qty = quantity != null && quantity > 0 ? quantity : 1;
  const label = labelMap[resolved] ?? resolved.replace(/_/g, ' ');
  if (resolved === 'unit' && qty <= 1) return label;
  return `${label} × ${qty}`;
}
