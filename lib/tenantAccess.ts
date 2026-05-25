import type { SupabaseClient } from '@supabase/supabase-js';

/** Stable error string for UI and context (not shown to end users verbatim in all paths). */
export const TENANT_INACTIVE_MESSAGE =
  'This organization has been deactivated. Contact your administrator or support if you need access.';

export const TENANT_STATUS_CHANGED_EVENT = 'tenant-status-changed';

export type TenantAccessGateResult = { allowed: true } | { allowed: false; message: string };

export function isTenantInactiveError(error: string | null | undefined): boolean {
  return error === TENANT_INACTIVE_MESSAGE;
}

/**
 * Whether a non–platform-super-admin session should be blocked for this tenant.
 * `null` / `true` → allow; `false` → block regular tenant users.
 */
export function evaluateTenantAccess(
  tenantIsActive: boolean | null | undefined,
  isPlatformSuperAdmin: boolean
): TenantAccessGateResult {
  if (isPlatformSuperAdmin) return { allowed: true };
  if (tenantIsActive === false) {
    return { allowed: false, message: TENANT_INACTIVE_MESSAGE };
  }
  return { allowed: true };
}

export async function fetchTenantIsActive(
  client: SupabaseClient,
  tenantId: string
): Promise<boolean | null> {
  const { data, error } = await client
    .from('tenants')
    .select('is_active')
    .eq('id', tenantId)
    .maybeSingle();

  if (error || !data) return null;
  return data.is_active !== false;
}

/** Align optional per-tenant schema row with tenants.is_active (no-op if row missing). */
export async function syncTenantSchemaStatus(
  client: SupabaseClient,
  tenantId: string,
  isActive: boolean
): Promise<void> {
  const status = isActive ? 'active' : 'inactive';
  const { error } = await client
    .from('tenant_schemas')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId);

  if (error) {
    console.warn('syncTenantSchemaStatus:', error.message);
  }
}

export function dispatchTenantStatusChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(TENANT_STATUS_CHANGED_EVENT));
  }
}
