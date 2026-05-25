import { supabase } from '@/lib/supabaseClient';

export type HardDeleteTenantResult =
  | { ok: true; deleted_tenant_id: string }
  | { ok: false; error: string };

/**
 * Permanently delete a tenant (platform super admin only). Requires session bearer token.
 */
export async function hardDeleteTenant(
  tenantId: string,
  confirmName: string
): Promise<HardDeleteTenantResult> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let token = session?.access_token;
  if (!token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    token = refreshed.session?.access_token;
  }
  if (!token) {
    return { ok: false, error: 'Not authenticated' };
  }

  const res = await fetch(`/api/admin/tenants/${tenantId}/hard-delete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmName }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    detail?: string;
    deleted_tenant_id?: string;
  };

  if (!res.ok) {
    const msg = [payload.error, payload.detail].filter(Boolean).join(' — ');
    return { ok: false, error: msg || `Delete failed (${res.status})` };
  }

  return { ok: true, deleted_tenant_id: payload.deleted_tenant_id ?? tenantId };
}
