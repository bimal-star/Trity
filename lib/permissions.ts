/**
 * Permission checking utilities for multi-tenant access control
 *
 * Provides functions to check user permissions and access levels
 * Used throughout the app for authorization decisions
 */

import type { User } from '@supabase/supabase-js';
import { TenantRole, PermissionAction, ROLE_PERMISSIONS } from '@/types/access';
import { UserProfile } from '@/types/profile';

function tenantRoleRank(role: TenantRole): number {
  if (role === 'super_admin') return 3;
  if (role === 'admin') return 2;
  return 1;
}

/**
 * Pick the higher-privilege of two normalized roles (e.g. merge DB + trusted JWT claim).
 */
export function mergeTenantRoles(
  a: TenantRole | null | undefined,
  b: TenantRole | null | undefined
): TenantRole | null {
  const na = a ?? null;
  const nb = b ?? null;
  if (na == null) return nb;
  if (nb == null) return na;
  return tenantRoleRank(na) >= tenantRoleRank(nb) ? na : nb;
}

/** DB role + trusted `app_metadata.role` (higher privilege wins). */
export function resolveProfileRole(
  dbRole: string | null | undefined,
  appMetadataRole: string | null | undefined
): TenantRole {
  return (
    mergeTenantRoles(normalizeTenantRole(dbRole), normalizeTenantRole(appMetadataRole)) ?? 'member'
  );
}

/**
 * Map DB / legacy role strings to canonical TenantRole.
 * Returns null only when the value is missing; unknown strings fall back via callers (typically member).
 */
export function normalizeTenantRole(role: string | null | undefined): TenantRole | null {
  if (role == null || typeof role !== 'string') return null;
  const r = role.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (r === 'member') return 'member';
  if (r === 'admin' || r === 'administrator' || r === 'tenant_admin') return 'admin';
  if (
    r === 'super_admin' ||
    r === 'superadmin' ||
    r === 'super_administrator' ||
    r === 'platform_admin' ||
    r === 'global_admin' ||
    r === 'system_admin'
  ) {
    return 'super_admin';
  }
  return null;
}

/** True when normalized role is super_admin (handles casing / spacing variants). */
export function isSuperAdminRole(role: string | null | undefined): boolean {
  return normalizeTenantRole(role) === 'super_admin';
}

/**
 * True when this auth session is a platform super_admin, using DB profile and/or JWT claims.
 * Used when tenant_id may be absent (platform shell, e.g. /admin/tenants).
 */
export function isSuperAdminSession(user: User, profile: UserProfile | null): boolean {
  if (isSuperAdminRole(profile?.role)) return true;
  const jwtRole = user.app_metadata?.role ?? user.user_metadata?.role;
  return isSuperAdminRole(typeof jwtRole === 'string' ? jwtRole : undefined);
}

/**
 * Check if a role has a specific permission
 * @param role - User's tenant role
 * @param action - Permission action to check
 * @returns true if role has permission
 */
export function roleHasPermission(role: TenantRole | string, action: PermissionAction): boolean {
  const canonical = normalizeTenantRole(role) ?? ('member' as TenantRole);
  const permissions = ROLE_PERMISSIONS[canonical] || ROLE_PERMISSIONS.member;
  return permissions.includes(action);
}

/**
 * Check if a user can perform an action in their current tenant
 * @param userProfile - User's profile with role
 * @param action - Permission action to check
 * @returns true if user has permission
 */
export function canUserPerform(
  userProfile: UserProfile | null | undefined,
  action: PermissionAction
): boolean {
  if (!userProfile) return false;
  return roleHasPermission(userProfile.role, action);
}

/**
 * Check if a user can manage (edit/delete) another user
 * Only users with higher role can manage users with lower role
 * @param managerRole - Role of person trying to manage
 * @param targetRole - Role of person being managed
 * @returns true if manager can manage target
 */
export function canManageUser(
  managerRole: TenantRole | string,
  targetRole: TenantRole | string
): boolean {
  const roleHierarchy: Record<TenantRole, number> = {
    member: 1,
    admin: 2,
    super_admin: 3,
  };

  const m = normalizeTenantRole(managerRole) ?? 'member';
  const t = normalizeTenantRole(targetRole) ?? 'member';
  const managerLevel = roleHierarchy[m] ?? 0;
  const targetLevel = roleHierarchy[t] ?? 0;

  return managerLevel > targetLevel;
}

/**
 * Check if a user can change another user's role
 * @param currentUserRole - Role of user attempting the change
 * @param targetNewRole - New role to assign to target user
 * @returns true if change is allowed
 */
export function canChangeUserRole(
  currentUserRole: TenantRole | string,
  targetNewRole: TenantRole | string
): boolean {
  const current = normalizeTenantRole(currentUserRole) ?? 'member';
  const target = normalizeTenantRole(targetNewRole) ?? 'member';

  if (current !== 'admin' && current !== 'super_admin') {
    return false;
  }

  if (current === 'super_admin') {
    return true;
  }

  if (target === 'super_admin') {
    return false;
  }

  return true;
}

/**
 * Check if user can access a specific tenant
 * Users can only access their own tenant unless they're super_admin
 * @param userTenantId - User's tenant ID
 * @param targetTenantId - Tenant they're trying to access
 * @param userRole - User's role
 * @returns true if access is allowed
 */
export function canAccessTenant(
  userTenantId: string | null | undefined,
  targetTenantId: string,
  userRole?: TenantRole | string
): boolean {
  if (normalizeTenantRole(userRole) === 'super_admin') {
    return true;
  }

  if (!userTenantId) return false;

  // Others can only access their own tenant
  return userTenantId === targetTenantId;
}

/**
 * Get all access level info with descriptions and permissions
 * Used for UI display of roles and their capabilities
 */
export const ACCESS_LEVELS = {
  member: {
    role: 'member' as TenantRole,
    label: 'Member',
    description: 'Can view resources and access apps, no management capabilities',
    color: 'blue',
    permissions: ROLE_PERMISSIONS.member,
  },
  admin: {
    role: 'admin' as TenantRole,
    label: 'Admin',
    description: 'Can manage users, groups, and tenant settings',
    color: 'amber',
    permissions: ROLE_PERMISSIONS.admin,
  },
  super_admin: {
    role: 'super_admin' as TenantRole,
    label: 'Super Admin',
    description: 'Full access including feature flags and multi-tenant administration',
    color: 'red',
    permissions: ROLE_PERMISSIONS.super_admin,
  },
};

/**
 * Get display info for a role
 * @param role - The role to get info for
 * @returns Display info with label, description, and permissions
 */
export function getRoleInfo(role: TenantRole | string) {
  const canonical = normalizeTenantRole(role) ?? 'member';
  return ACCESS_LEVELS[canonical] || ACCESS_LEVELS.member;
}
