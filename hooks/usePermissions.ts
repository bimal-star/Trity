/**
 * usePermissions Hook
 * 
 * Provides permission checking within React components
 * Integrates with TenantContext and user profile for authorization
 */

'use client';

import type { User } from '@supabase/supabase-js';
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
  resolveProfileRole,
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
function jwtRoleClaim(user: User | null): string | undefined {
  const raw = user?.app_metadata?.role;
  return typeof raw === 'string' ? raw : undefined;
}

export function usePermissions(): UsePermissionsReturn {
  const { user, tenant_id, isLoading } = useTenant();
  const { profile } = useProfile(user?.id);

  return useMemo(() => {
    const effectiveRole: TenantRole | null = profile
      ? resolveProfileRole(
          typeof profile.role === 'string' ? profile.role : String(profile.role),
          jwtRoleClaim(user)
        )
      : null;
    const roleForChecks = effectiveRole ?? 'member';

    const profileForChecks =
      profile != null ? { ...profile, role: roleForChecks } : null;

    const can = (action: PermissionAction): boolean => {
      return canUserPerform(profileForChecks, action);
    };

    const canManage = (targetRole: TenantRole | string): boolean => {
      if (!profileForChecks) return false;
      return canManageUser(profileForChecks.role, targetRole);
    };

    const canChangeRole = (targetRole: TenantRole | string): boolean => {
      if (!profileForChecks) return false;
      return canChangeUserRole(profileForChecks.role, targetRole);
    };

    const canAccess = (targetTenantId: string): boolean => {
      return canAccessTenant(tenant_id, targetTenantId, roleForChecks);
    };

    const getRoleLabel = (r: TenantRole | string): string => {
      return getRoleInfo(r).label;
    };

    const role = profile ? roleForChecks : null;
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
  }, [profile, tenant_id, isLoading, user]);
}
