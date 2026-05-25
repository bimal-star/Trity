import type { User } from '@supabase/supabase-js';
import { isSuperAdminRole } from '@/lib/permissions';
import { getSupabaseUrlAndAnonKey } from '@/lib/supabasePublicEnv';
import { createSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { createSupabaseBearerClient } from '@/lib/server/supabaseBearerClient';

export type PlatformSuperAdminCheck =
  | { ok: true; user: User; profileTenantId: string | null }
  | { ok: false; status: 401 | 403 | 404 | 503; error: string };

/**
 * Validates bearer token and platform super_admin (profile and/or JWT role).
 * Uses anon key + Authorization header (same as /api/access/update); service role for profile read.
 */
export async function verifyPlatformSuperAdmin(token: string): Promise<PlatformSuperAdminCheck> {
  const supabaseEnv = getSupabaseUrlAndAnonKey();
  if (!supabaseEnv) {
    return {
      ok: false,
      status: 503,
      error: 'Server misconfigured: Supabase URL or anon key missing',
    };
  }

  const userClient = createSupabaseBearerClient(token);

  const { data: authData, error: userErr } = await userClient.auth.getUser();
  const user = authData?.user;

  if (userErr || !user) {
    return { ok: false, status: 401, error: 'Invalid session' };
  }

  const jwtRole = user.app_metadata?.role ?? user.user_metadata?.role;
  const jwtSuper = isSuperAdminRole(typeof jwtRole === 'string' ? jwtRole : undefined);

  const appMetaRole =
    typeof user.app_metadata?.role === 'string' ? user.app_metadata.role : undefined;

  // JWT super_admin (platform shell / template workspace) — do not require a profile row.
  if (jwtSuper) {
    let profileTenantId: string | null = null;
    try {
      const admin = createSupabaseAdmin();
      const { data: profileRows } = await admin
        .from('user_profiles')
        .select('role, tenant_id')
        .eq('user_id', user.id);
      const superRow = profileRows?.find((p) => p.role === 'super_admin');
      const pick = superRow ?? profileRows?.[0];
      profileTenantId = pick?.tenant_id ?? null;
    } catch {
      /* optional — audit tenant_id falls back to deleted tenant */
    }
    return { ok: true, user, profileTenantId };
  }

  const admin = createSupabaseAdmin();
  const { data: profileRows, error: profErr } = await admin
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('user_id', user.id);

  if (profErr || !profileRows?.length) {
    console.error(
      '[verifyPlatformSuperAdmin] user_profiles:',
      profErr?.message ?? 'no rows',
      'user_id=',
      user.id
    );
    return { ok: false, status: 404, error: 'User profile not found' };
  }

  const profile = profileRows.find((p) => p.role === 'super_admin') ?? profileRows[0] ?? null;

  const userMetaRole =
    typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : undefined;
  const isPlatformSuper =
    isSuperAdminRole(profile?.role) ||
    isSuperAdminRole(appMetaRole) ||
    isSuperAdminRole(userMetaRole);

  if (!isPlatformSuper) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return {
    ok: true,
    user,
    profileTenantId: profile?.tenant_id ?? null,
  };
}
