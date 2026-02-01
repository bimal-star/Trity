/**
 * Access Control Type Definitions
 * 
 * Defines interfaces and types for user access, groups, and permissions
 * Multi-tenant role-based access control with granular permissions
 */

// User roles within a tenant
export type TenantRole = 'member' | 'admin' | 'super_admin';
export type GroupMemberRole = 'member' | 'admin';

// Granular permissions for actions
export type PermissionAction = 
  | 'view_users'
  | 'invite_users'
  | 'manage_users'
  | 'change_user_roles'
  | 'remove_users'
  | 'manage_groups'
  | 'view_tenant_settings'
  | 'edit_tenant_settings'
  | 'view_audit_logs'
  | 'manage_features'
  | 'manage_invites'
  | 'access_calendar'
  | 'access_products'
  | 'access_workstreams'
  | 'access_okrs';

// Permission matrix: which roles can perform which actions
export const ROLE_PERMISSIONS: Record<TenantRole, PermissionAction[]> = {
  member: [
    'view_users',
    'access_calendar',
    'access_products',
    'access_workstreams',
    'access_okrs',
  ],
  admin: [
    'view_users',
    'invite_users',
    'manage_users',
    'change_user_roles',
    'remove_users',
    'manage_groups',
    'view_tenant_settings',
    'edit_tenant_settings',
    'view_audit_logs',
    'manage_invites',
    'access_calendar',
    'access_products',
    'access_workstreams',
    'access_okrs',
  ],
  super_admin: [
    // Super admin has all permissions
    'view_users',
    'invite_users',
    'manage_users',
    'change_user_roles',
    'remove_users',
    'manage_groups',
    'view_tenant_settings',
    'edit_tenant_settings',
    'view_audit_logs',
    'manage_features',
    'manage_invites',
    'access_calendar',
    'access_products',
    'access_workstreams',
    'access_okrs',
  ],
};

// Access level display info
export interface AccessLevelInfo {
  role: TenantRole;
  label: string;
  description: string;
  color: string;
  permissions: PermissionAction[];
}

export interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  is_deleted: boolean;
  // Computed/joined fields
  member_count?: number;
  members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string; // References auth.users(id)
  role: GroupMemberRole;
  added_at: string;
  added_by: string | null;
  // Computed/joined fields
  user_email?: string; // From auth.users
  user_name?: string; // From auth.users metadata
}

export interface UserGroupFormData {
  name: string;
  description?: string;
  member_ids?: string[]; // User IDs to add as members
}
