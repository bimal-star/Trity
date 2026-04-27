import { supabase } from '@/lib/supabaseClient';
import { defaultNavigationItems } from '@/lib/navigation-default';

/** Flat rows matching `defaultNavigationItems` for dashboard fallback (code ids, not DB UUIDs). */
export function getFlatDefaultNavigationForDashboard(): Array<{
  id: string;
  label: string;
  position: string;
  is_enabled: boolean;
  is_deleted: boolean | null;
}> {
  return defaultNavigationItems.map((item) => ({
    id: item.id,
    label: item.label,
    position: String(item.position ?? '1'),
    is_enabled: item.is_enabled,
    is_deleted: false,
  }));
}

/**
 * Inserts default navigation rows for a tenant when the table has none (server-side, SECURITY DEFINER).
 * `navigation.id` is UUID in the database; this does not pass string ids.
 */
export async function seedTenantDefaultNavigation(
  tenantId: string
): Promise<{ inserted: number; error: string | null }> {
  const { data, error } = await supabase.rpc('seed_tenant_default_navigation', {
    p_tenant_id: tenantId,
  });
  if (error) {
    return { inserted: 0, error: error.message };
  }
  const n = typeof data === 'number' ? data : Number(data ?? 0);
  return { inserted: Number.isFinite(n) ? n : 0, error: null };
}
