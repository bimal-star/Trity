/**
 * Types for multi-tenant profile, tenant, and invite flows.
 * Matches public.user_profiles, public.tenants, and public.tenant_invites.
 */

import { TenantRole } from './access';

export type ProfileRole = TenantRole | string;

export interface UserProfile {
  id: string;
  user_id: string;
  tenant_id: string;
  full_name: string | null;
  email: string | null;
  role: ProfileRole;
  primary_group_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpdate {
  full_name?: string | null;
  email?: string | null;
  role?: ProfileRole;
}

export interface TenantDetails {
  id: string;
  name: string;
  company_name: string | null;
  slug: string | null;
  is_active: boolean;
  logo_url?: string | null;
  settings?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface TenantDetailsUpdate {
  name?: string;
  company_name?: string | null;
  slug?: string | null;
  logo_url?: string | null;
  settings?: Record<string, unknown> | null;
}

export interface TenantInvite {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  group_id?: string | null;
  invited_by: string | null;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface TenantInviteInsert {
  tenant_id: string;
  email: string;
  role: string;
  group_id?: string | null;
}
