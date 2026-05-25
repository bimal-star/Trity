import type { Database } from '@/types/database';
import type { PackingConfiguration } from '@/types/product';
import { resolveBarcodePackingLevel } from '@/lib/productBarcodePacking';
import type { SellablePackLevelOption } from '@/types/sellablePackLevel';
import { DEFAULT_SELLABLE_PACK_OPTIONS } from '@/lib/sellablePackLevel';

function normalizeLevel(
  raw: string | null | undefined,
  catalog: SellablePackLevelOption[]
): string {
  const trimmed = raw?.trim();
  if (!trimmed) return resolveBarcodePackingLevel('unit', catalog);
  if (catalog.some((o) => o.code === trimmed)) return trimmed;
  return resolveBarcodePackingLevel('unit', catalog);
}

function normalizePreviousLevel(
  raw: string | null | undefined,
  catalog: SellablePackLevelOption[]
): string | null {
  if (!raw || raw === '') return null;
  const trimmed = raw.trim();
  if (catalog.some((o) => o.code === trimmed)) return trimmed;
  return null;
}

/** Rows for `packing_configurations` insert (replace-all pattern per product). */
export function packingConfigurationInserts(
  productId: string,
  tenantId: string,
  userId: string | null,
  configs: PackingConfiguration[],
  catalog: SellablePackLevelOption[] = DEFAULT_SELLABLE_PACK_OPTIONS
): Database['public']['Tables']['packing_configurations']['Insert'][] {
  return configs.map((cfg) => ({
    product_id: productId,
    tenant_id: tenantId,
    level: normalizeLevel(cfg.level, catalog),
    quantity: cfg.quantity ?? 1,
    length: cfg.length ?? null,
    width: cfg.width ?? null,
    height: cfg.height ?? null,
    weight: cfg.weight ?? null,
    weight_unit_id: cfg.weight_unit_id && cfg.weight_unit_id !== '' ? cfg.weight_unit_id : null,
    dimension_unit_id:
      cfg.dimension_unit_id && cfg.dimension_unit_id !== '' ? cfg.dimension_unit_id : null,
    is_default: cfg.is_default ?? false,
    description: cfg.description ?? null,
    barcode: cfg.barcode ?? null,
    gtin: cfg.gtin ?? null,
    previous_level: normalizePreviousLevel(cfg.previous_level ?? null, catalog),
    created_by: userId,
    updated_by: userId,
    is_deleted: false,
  }));
}

/** Returns invalid level codes not present in the tenant catalog. */
export function findUnknownPackingLevels(
  configs: PackingConfiguration[],
  catalog: SellablePackLevelOption[]
): string[] {
  const known = new Set(catalog.map((o) => o.code));
  const unknown = new Set<string>();
  for (const cfg of configs) {
    const level = cfg.level?.trim();
    if (level && !known.has(level)) unknown.add(level);
    const prev = cfg.previous_level?.trim();
    if (prev && !known.has(prev)) unknown.add(prev);
  }
  return [...unknown];
}
