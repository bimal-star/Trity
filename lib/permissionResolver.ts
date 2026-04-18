import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccessLevel } from '@/types/access';
import type { TenantRole } from '@/types/access';
import { getRoleDefaultAccess, mapAccessRecord } from '@/lib/accessControl';
import { normalizeTenantRole } from '@/lib/permissions';

/** Prefix for navigation-linked permission resources (maps to navigation.id). */
export const NAV_RESOURCE_PREFIX = 'nav.';

export function toNavResourceKey(moduleId: string): string {
  return `${NAV_RESOURCE_PREFIX}${moduleId}`;
}

export function accessLevelToActions(level: AccessLevel): string[] {
  if (level === 'blocked') return [];
  if (level === 'readonly') return ['read'];
  return ['read', 'write'];
}

export function actionsToAccessLevel(actions: string[] | null | undefined): AccessLevel {
  const a = actions ?? [];
  const hasRead = a.includes('read');
  const hasWrite = a.includes('write');
  if (!hasRead && !hasWrite) return 'blocked';
  if (hasRead && !hasWrite) return 'readonly';
  return 'allowed';
}

function roleDefaultActions(role: TenantRole | string | null | undefined): string[] {
  return accessLevelToActions(getRoleDefaultAccess(role as TenantRole));
}

type UserGrantRow = {
  resource_id: string;
  allowed_actions: string[];
  effect: 'allow' | 'deny';
};

function mergeActionsForResource(args: {
  userGrant?: UserGrantRow;
  roleGrantActions?: string[] | null;
  groupGrants: UserGrantRow[];
  role: TenantRole | string | null | undefined;
}): string[] {
  const { userGrant, roleGrantActions, groupGrants, role } = args;

  if (userGrant?.effect === 'deny') return [];
  if (userGrant?.effect === 'allow') {
    const acts = userGrant.allowed_actions ?? [];
    if (acts.length > 0) return [...acts];
    // Empty allow_actions: treat as no per-user override (avoid showing Override + blocked).
  }

  let base =
    roleGrantActions && roleGrantActions.length > 0
      ? [...roleGrantActions]
      : roleDefaultActions(role);

  for (const g of groupGrants) {
    if (g.effect === 'deny') return [];
    base = [...new Set([...base, ...(g.allowed_actions ?? [])])];
  }

  return base;
}

async function tenantGroupIdsForUser(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<string[]> {
  const { data: groups } = await supabase
    .from('user_groups')
    .select('id')
    .eq('tenant_id', tenantId);

  const ids = (groups ?? []).map((g) => g.id).filter(Boolean);
  if (ids.length === 0) return [];

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .in('group_id', ids);

  return [...new Set((memberships ?? []).map((m) => m.group_id).filter(Boolean))] as string[];
}

/**
 * Ensures a catalog row exists for a navigation module id. Seeds role template grants + action rows.
 */
export async function ensurePermissionResourceForModule(
  supabase: SupabaseClient,
  tenantId: string,
  moduleId: string,
  displayName?: string
): Promise<{ resourceId: string } | { error: string }> {
  const resource_key = toNavResourceKey(moduleId);
  const { data: existing } = await (supabase as any)
    .from('permission_resources')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('resource_key', resource_key)
    .maybeSingle();

  if (existing?.id) {
    return { resourceId: existing.id as string };
  }

  const { data: inserted, error: insErr } = await (supabase as any)
    .from('permission_resources')
    .insert({
      tenant_id: tenantId,
      resource_key,
      display_name: displayName ?? moduleId,
      resource_type: 'module',
    })
    .select('id')
    .single();

  if (insErr || !inserted?.id) {
    return { error: insErr?.message ?? 'Failed to create permission resource' };
  }

  const resourceId = inserted.id as string;

  const roles: Array<{ role: string; actions: string[] }> = [
    { role: 'member', actions: ['read'] },
    { role: 'admin', actions: ['read', 'write'] },
    { role: 'super_admin', actions: ['read', 'write'] },
  ];

  for (const r of roles) {
    await (supabase as any).from('role_resource_grants').upsert(
      {
        tenant_id: tenantId,
        role: r.role,
        resource_id: resourceId,
        allowed_actions: r.actions,
      },
      { onConflict: 'tenant_id,role,resource_id' }
    );
  }

  for (const key of ['read', 'write'] as const) {
    await (supabase as any).from('permission_actions').upsert(
      { resource_id: resourceId, action_key: key },
      { onConflict: 'resource_id,action_key' }
    );
  }

  return { resourceId };
}

/**
 * Resolves effective {@link AccessLevel} per module id for a subject user.
 * Uses catalog + grants when available; falls back to legacy `user_module_access` when no catalog row exists.
 */
export async function resolveEffectiveModuleAccess(
  supabase: SupabaseClient,
  tenantId: string,
  subjectUserId: string,
  moduleIds: string[],
  roleHint?: TenantRole | string | null
): Promise<Record<string, AccessLevel>> {
  const out: Record<string, AccessLevel> = {};
  if (moduleIds.length === 0) return out;

  const keys = moduleIds.map(toNavResourceKey);
  const { data: resources } = await (supabase as any)
    .from('permission_resources')
    .select('id, resource_key')
    .eq('tenant_id', tenantId)
    .in('resource_key', keys);

  const resourceByKey = new Map<string, string>(
    (resources ?? []).map((r: { resource_key: string; id: string }) => [r.resource_key, r.id])
  );

  let rawRole = roleHint ?? null;
  if (rawRole == null) {
    const { data: prof } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', subjectUserId)
      .maybeSingle();
    rawRole = prof?.role ?? null;
  }
  const canonicalRole: TenantRole = normalizeTenantRole(rawRole) ?? 'member';

  const resourceIds = [...new Set([...resourceByKey.values()])];

  const missingCatalogModuleIds = moduleIds.filter((mid) => !resourceByKey.has(toNavResourceKey(mid)));

  let userGrantsByResource = new Map<string, UserGrantRow>();
  let roleGrantsByResource = new Map<string, string[]>();
  const groupGrantsByResource = new Map<string, UserGrantRow[]>();

  if (resourceIds.length > 0) {
    const [ug, rg, groupIds] = await Promise.all([
      (supabase as any)
        .from('user_resource_grants')
        .select('resource_id, allowed_actions, effect')
        .eq('tenant_id', tenantId)
        .eq('user_id', subjectUserId)
        .in('resource_id', resourceIds),
      (supabase as any)
        .from('role_resource_grants')
        .select('resource_id, allowed_actions')
        .eq('tenant_id', tenantId)
        .eq('role', canonicalRole)
        .in('resource_id', resourceIds),
      tenantGroupIdsForUser(supabase, tenantId, subjectUserId),
    ]);

    (ug.data ?? []).forEach((row: UserGrantRow) => {
      userGrantsByResource.set(row.resource_id, row);
    });
    (rg.data ?? []).forEach((row: { resource_id: string; allowed_actions: string[] }) => {
      roleGrantsByResource.set(row.resource_id, row.allowed_actions ?? []);
    });

    if (groupIds.length > 0) {
      const { data: ggr } = await (supabase as any)
        .from('group_resource_grants')
        .select('group_id, resource_id, allowed_actions, effect')
        .in('group_id', groupIds)
        .in('resource_id', resourceIds);

      for (const row of ggr ?? []) {
        const list = groupGrantsByResource.get(row.resource_id) ?? [];
        list.push({
          resource_id: row.resource_id,
          allowed_actions: row.allowed_actions ?? [],
          effect: row.effect,
        });
        groupGrantsByResource.set(row.resource_id, list);
      }
    }
  }

  for (const moduleId of moduleIds) {
    const rk = toNavResourceKey(moduleId);
    const rid = resourceByKey.get(rk);

    if (!rid) {
      continue;
    }

    const actions = mergeActionsForResource({
      userGrant: userGrantsByResource.get(rid),
      roleGrantActions: roleGrantsByResource.get(rid),
      groupGrants: groupGrantsByResource.get(rid) ?? [],
      role: canonicalRole,
    });
    out[moduleId] = actionsToAccessLevel(actions);
  }

  if (missingCatalogModuleIds.length > 0) {
    const { data: legacy } = await (supabase as any)
      .from('user_module_access')
      .select('module_id, has_access, is_readonly')
      .eq('tenant_id', tenantId)
      .eq('user_id', subjectUserId)
      .in('module_id', missingCatalogModuleIds);

    const legacyMap = new Map<string, AccessLevel>();
    (legacy ?? []).forEach((row: { module_id: string; has_access: boolean; is_readonly?: boolean }) => {
      legacyMap.set(row.module_id, mapAccessRecord(row));
    });

    for (const mid of missingCatalogModuleIds) {
      if (out[mid] !== undefined) continue;
      out[mid] = legacyMap.get(mid) ?? getRoleDefaultAccess(canonicalRole);
    }
  }

  for (const mid of moduleIds) {
    if (out[mid] === undefined) {
      out[mid] = getRoleDefaultAccess(canonicalRole);
    }
  }

  return out;
}

/**
 * Optional: resolve a single module via `effective_resource_actions` (DB source of truth).
 * Returns null when the catalog has no row for the key or the RPC fails.
 */
export async function resolveAccessLevelViaRpc(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  moduleId: string
): Promise<AccessLevel | null> {
  const { data, error } = await supabase.rpc('effective_resource_actions', {
    p_tenant_id: tenantId,
    p_user_id: userId,
    p_resource_key: toNavResourceKey(moduleId),
  });
  if (error || data === null) return null;
  return actionsToAccessLevel(data as string[]);
}
