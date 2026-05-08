import { supabase } from '@/lib/supabaseClient';
import { productTracksInventory } from '@/lib/productInventoryPolicy';

export type TenantProductCounts = {
  catalogActive: number;
  archived: number;
  lowStock: number;
};

/**
 * Tenant-wide catalog stats for the products header strip.
 * Low stock uses `vw_products_full` aggregates (matches list badges).
 */
export async function fetchTenantProductCounts(tenantId: string): Promise<TenantProductCounts> {
  const [activeHead, archivedHead, lowRows] = await Promise.all([
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', true),
    supabase
      .from('vw_products_full')
      .select('total_stock,reorder_point,tracks_inventory')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false),
  ]);

  const catalogActive = activeHead.count ?? 0;
  const archived = archivedHead.count ?? 0;

  let lowStock = 0;
  const rows = lowRows.data ?? [];
  for (const row of rows) {
    const p = {
      tracks_inventory: row.tracks_inventory,
      total_stock: row.total_stock,
      reorder_point: row.reorder_point,
    };
    if (!productTracksInventory(p)) continue;
    if (row.reorder_point == null) continue;
    const stock = row.total_stock == null ? NaN : Number(row.total_stock);
    const reorder = Number(row.reorder_point);
    if (Number.isNaN(stock) || Number.isNaN(reorder)) continue;
    if (stock <= reorder) lowStock += 1;
  }

  return { catalogActive, archived, lowStock };
}
