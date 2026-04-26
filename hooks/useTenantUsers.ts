'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTenant } from '@/contexts/TenantContext';
import type { UserProfile } from '@/types/profile';
import type { Database } from '@/types/database';

type UserProfileDbUpdate = Database['public']['Tables']['user_profiles']['Update'];

export interface TenantUser extends UserProfile {
  /** Resolved from profile.email or auth; may be empty if not in profile */
  displayEmail?: string | null;
  primary_group_name?: string | null;
}

interface UseTenantUsersReturn {
  users: TenantUser[];
  isLoading: boolean;
  error: string | null;
  updateUserRole: (userId: string, role: string) => Promise<{ success: boolean; error?: string }>;
  updateUserGroup: (
    userId: string,
    groupId: string | null
  ) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

/**
 * Fetches all users in the given tenant from public.user_profiles.
 * All queries filter by tenant_id. Use only in admin context (e.g. User Management page).
 */
export function useTenantUsers(tenantId: string | null): UseTenantUsersReturn {
  const { user } = useTenant();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!tenantId) {
      setUsers([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from('user_profiles')
        .select(
          'id, user_id, tenant_id, full_name, email, role, primary_group_id, created_at, updated_at, user_groups(name)'
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      const list = (data ?? []).map((r: any) => ({
        ...r,
        displayEmail: r.email ?? null,
        primary_group_name: r.user_groups?.name ?? null,
      })) as TenantUser[];
      setUsers(list);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load users';
      setError(msg);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUserRole = useCallback(
    async (userId: string, role: string): Promise<{ success: boolean; error?: string }> => {
      if (!tenantId) return { success: false, error: 'No tenant' };
      try {
        const { error: err } = await supabase
          .from('user_profiles')
          .update({ role } as UserProfileDbUpdate)
          .eq('user_id', userId)
          .eq('tenant_id', tenantId);

        if (err) return { success: false, error: err.message };
        await fetchUsers();
        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to update role';
        return { success: false, error: msg };
      }
    },
    [tenantId, fetchUsers]
  );

  const updateUserGroup = useCallback(
    async (
      userId: string,
      groupId: string | null
    ): Promise<{ success: boolean; error?: string }> => {
      if (!tenantId) return { success: false, error: 'No tenant' };
      try {
        const { error: err } = await supabase
          .from('user_profiles')
          .update({ primary_group_id: groupId })
          .eq('user_id', userId)
          .eq('tenant_id', tenantId);

        if (err) return { success: false, error: err.message };

        if (groupId) {
          await supabase.from('group_members').upsert(
            {
              group_id: groupId,
              user_id: userId,
              role: 'member',
              added_by: user?.id ?? userId,
            },
            { onConflict: 'group_id,user_id' }
          );
        }

        await fetchUsers();
        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to update group';
        return { success: false, error: msg };
      }
    },
    [tenantId, user?.id, fetchUsers]
  );

  return { users, isLoading, error, updateUserRole, updateUserGroup, refresh: fetchUsers };
}
