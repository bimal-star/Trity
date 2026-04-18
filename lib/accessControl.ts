import { supabase } from '@/lib/supabaseClient';
import { defaultNavigationItems } from '@/lib/navigation-default';
import { normalizeTenantRole } from '@/lib/permissions';
import { AccessLevel, TenantRole } from '@/types/access';
import { resolveEffectiveModuleAccess } from '@/lib/permissionResolver';
import {
  flattenNavigationTreeForAccess,
  organizeHierarchy,
} from '@/lib/navigation-hierarchy';
import type { NavigationItem } from '@/types/navigation';

/**
 * Core access-control helpers used to resolve module permissions from role defaults
 * plus per-user overrides stored in `user_module_access`.
 */

export const ROLE_DEFAULT_ACCESS: Record<TenantRole, AccessLevel> = {
  super_admin: 'allowed',
  admin: 'allowed',
  member: 'readonly',
};

export function getRoleDefaultAccess(role: TenantRole | string | null | undefined): AccessLevel {
  if (role == null) return 'blocked';
  const s = typeof role === 'string' ? role : String(role);
  if (!s.trim()) return 'blocked';
  const canonical = normalizeTenantRole(s) ?? 'member';
  return ROLE_DEFAULT_ACCESS[canonical] ?? 'blocked';
}

export function mapAccessRecord(record: { has_access: boolean; is_readonly?: boolean | null }): AccessLevel {
  if (!record.has_access) return 'blocked';
  return record.is_readonly ? 'readonly' : 'allowed';
}

export function mapAccessToRecord(access: AccessLevel): { has_access: boolean; is_readonly: boolean } {
  if (access === 'blocked') return { has_access: false, is_readonly: false };
  return { has_access: true, is_readonly: access === 'readonly' };
}

export function getDefaultModuleList(): Array<{ id: string; label: string }> {
  const tree = organizeHierarchy(defaultNavigationItems as NavigationItem[]);
  return flattenNavigationTreeForAccess(tree).map((row) => ({ id: row.id, label: row.label }));
}

/**
 * Returns effective module access using the permission catalog + grants when present,
 * with legacy `user_module_access` fallback for modules without a catalog row.
 */
export async function getEffectiveModuleAccess(
  userId: string,
  moduleIds?: string[],
  tenantId?: string | null
): Promise<Record<string, AccessLevel>> {
  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('user_id, tenant_id, role')
    .eq('user_id', userId)
    .single();

  if (profileErr || !profile) {
    return {};
  }

  const modules = moduleIds ?? getDefaultModuleList().map((item) => item.id);
  const effectiveTenantId = tenantId ?? profile.tenant_id;
  if (!effectiveTenantId) {
    return {};
  }

  return resolveEffectiveModuleAccess(
    supabase,
    effectiveTenantId,
    userId,
    modules,
    profile.role
  );
}
