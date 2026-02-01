/**
 * usePermissions Hook
 * 
 * Provides permission checking within React components
 * Integrates with TenantContext and user profile for authorization
 */

'use client';

import { useMemo } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import {
  PermissionAction,
  TenantRole,
} from '@/types/access';
import {
  canUserPerform,
  canManageUser,
  canChangeUserRole,
  canAccessTenant,
  getRoleInfo,
} from '@/lib/permissions';

export interface UsePermissionsReturn {
  can: (action: PermissionAction) => boolean;
  canManage: (targetRole: TenantRole | string) => boolean;
  canChangeRole: (targetRole: TenantRole | string) => boolean;
  canAccess: (targetTenantId: string) => boolean;
  getRoleLabel: (role: TenantRole | string) => string;
  role: TenantRole | string | null;
  isMember: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
}

/**
 * Hook to check permissions for current user
 * @returns Object with permission checking functions
 * 
 * @example
 * const { can, isAdmin } = usePermissions();
 * 
 * if (can('manage_users')) {
 *   // Show user management UI
 * }
 */
export function usePermissions(): UsePermissionsReturn {
  const { user, tenant_id } = useTenant();
  const { profile, isLoading } = useProfile(user?.id);

  return useMemo(() => {
    const can = (action: PermissionAction): boolean => {
      return canUserPerform(profile, action);
    };

    const canManage = (targetRole: TenantRole | string): boolean => {
      if (!profile) return false;
      return canManageUser(profile.role, targetRole);
    };

    const canChangeRole = (targetRole: TenantRole | string): boolean => {
      if (!profile) return false;
      return canChangeUserRole(profile.role, targetRole);
    };

    const canAccess = (targetTenantId: string): boolean => {
      return canAccessTenant(tenant_id, targetTenantId, profile?.role);
    };

    const getRoleLabel = (role: TenantRole | string): string => {
      return getRoleInfo(role).label;
    };

    const role = profile?.role ?? null;
    const isMember = role === 'member';
    const isAdmin = role === 'admin';
    const isSuperAdmin = role === 'super_admin';

    return {
      can,
      canManage,
      canChangeRole,
      canAccess,
      getRoleLabel,
      role,
      isMember,
      isAdmin,
      isSuperAdmin,
      isLoading,
    };
  }, [profile, tenant_id, isLoading]);
}
