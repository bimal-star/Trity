import type { Database } from '@/types/database';
import type { PackingConfiguration } from '@/types/product';

type PackingLevel = Database['public']['Enums']['packing_level'];

const VALID_LEVELS: readonly PackingLevel[] = ['unit', 'inner', 'case', 'pallet', 'container'];

function coercePackingLevel(raw: string | null | undefined): PackingLevel {
  if (raw && (VALID_LEVELS as readonly string[]).includes(raw)) {
    return raw as PackingLevel;
  }
  return 'unit';
}

function coercePreviousLevel(raw: string | null | undefined): PackingLevel | null {
  if (!raw || raw === '') return null;
  if ((VALID_LEVELS as readonly string[]).includes(raw)) return raw as PackingLevel;
  return null;
}

/** Rows for `packing_configurations` insert (replace-all pattern per product). */
export function packingConfigurationInserts(
  productId: string,
  tenantId: string,
  userId: string | null,
  configs: PackingConfiguration[]
): Database['public']['Tables']['packing_configurations']['Insert'][] {
  return configs.map((cfg) => ({
    product_id: productId,
    tenant_id: tenantId,
    level: coercePackingLevel(cfg.level),
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
    previous_level: coercePreviousLevel(cfg.previous_level ?? null),
    created_by: userId,
    updated_by: userId,
    is_deleted: false,
  }));
}
