/**
 * Permission checking utilities for multi-tenant access control
 * 
 * Provides functions to check user permissions and access levels
 * Used throughout the app for authorization decisions
 */

import { TenantRole, PermissionAction, ROLE_PERMISSIONS } from '@/types/access';
import { UserProfile } from '@/types/profile';

/**
 * Check if a role has a specific permission
 * @param role - User's tenant role
 * @param action - Permission action to check
 * @returns true if role has permission
 */
export function roleHasPermission(role: TenantRole | string, action: PermissionAction): boolean {
  const normalizedRole = (role as TenantRole) || 'member';
  const permissions = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.member;
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
export function canManageUser(managerRole: TenantRole | string, targetRole: TenantRole | string): boolean {
  const roleHierarchy: Record<string, number> = {
    member: 1,
    admin: 2,
    super_admin: 3,
  };
  
  const managerLevel = roleHierarchy[managerRole as string] || 0;
  const targetLevel = roleHierarchy[targetRole as string] || 0;
  
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
  // Only admins and super_admins can change roles
  if (currentUserRole !== 'admin' && currentUserRole !== 'super_admin') {
    return false;
  }
  
  // Super_admin can assign any role
  if (currentUserRole === 'super_admin') {
    return true;
  }
  
  // Regular admin cannot promote to super_admin
  if (targetNewRole === 'super_admin') {
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
  if (!userTenantId) return false;
  
  // Super admins can access any tenant
  if (userRole === 'super_admin') {
    return true;
  }
  
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
  return ACCESS_LEVELS[role as TenantRole] || ACCESS_LEVELS.member;
}
