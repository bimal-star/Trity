/**
 * useUserGroups Hook
 * 
 * Custom React hook for managing user groups
 * Provides CRUD operations for groups and group membership
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { UserGroup, GroupMember, UserGroupFormData, GroupMemberRole } from '@/types/access';
import { useTenant } from '@/contexts/TenantContext';

interface UseUserGroupsReturn {
  groups: UserGroup[];
  isLoading: boolean;
  error: string | null;
  createGroup: (data: UserGroupFormData) => Promise<{ success: boolean; error?: string; data?: UserGroup }>;
  updateGroup: (id: string, data: Partial<UserGroupFormData>) => Promise<{ success: boolean; error?: string }>;
  deleteGroup: (id: string) => Promise<{ success: boolean; error?: string }>;
  addGroupMember: (groupId: string, userId: string, role?: GroupMemberRole) => Promise<{ success: boolean; error?: string }>;
  removeGroupMember: (groupId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  getGroupMembers: (groupId: string) => Promise<GroupMember[]>;
  refreshGroups: () => Promise<void>;
}

export function useUserGroups(tenantId?: string): UseUserGroupsReturn {
  const { user } = useTenant();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user groups
  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('user_groups')
        .select(`
          *,
          group_members (id, user_id, role, added_at)
        `)
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Calculate member count and format groups
      const groupsWithCounts = (data || []).map((group: any) => {
        const members = group.group_members || [];
        return {
          ...group,
          member_count: members.length,
          members: members as GroupMember[],
        } as UserGroup;
      });

      setGroups(groupsWithCounts);
    } catch (err: any) {
      console.error('Error fetching user groups:', err);
      setError(err.message || 'Failed to fetch user groups');
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshGroups = fetchGroups;

  // Create a new group
  const createGroup = async (data: UserGroupFormData): Promise<{ success: boolean; error?: string; data?: UserGroup }> => {
    try {
      setError(null);

      const currentUserId = user?.id;

      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      const currentTenantId = tenantId ?? null;

      const { data: newGroup, error: insertError } = await supabase
        .from('user_groups')
        .insert([{
          name: data.name,
          description: data.description || null,
          tenant_id: currentTenantId,
          created_by: currentUserId,
          updated_by: currentUserId,
        }] as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // Add members if provided
      if (data.member_ids && data.member_ids.length > 0) {
        const membersData = data.member_ids.map(userId => ({
          group_id: newGroup.id,
          user_id: userId,
          role: 'member' as GroupMemberRole,
          added_by: currentUserId,
        }));

        const { error: membersError } = await supabase
          .from('group_members')
          .insert(membersData as any);

        if (membersError) throw membersError;
      }

      await refreshGroups();
      return { success: true, data: newGroup };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create group';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update an existing group
  const updateGroup = async (id: string, data: Partial<UserGroupFormData>): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);

      const currentUserId = user?.id;

      const updateData: any = {
        updated_by: currentUserId,
        updated_at: new Date().toISOString(),
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;

      const { error: updateError } = await supabase
        .from('user_groups')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      await refreshGroups();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update group';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Delete a group (soft delete)
  const deleteGroup = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);

      const currentUserId = user?.id;

      const { error: deleteError } = await supabase
        .from('user_groups')
        .update({
          is_deleted: true,
          updated_by: currentUserId,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id);

      if (deleteError) throw deleteError;

      await refreshGroups();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete group';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Add a member to a group
  const addGroupMember = async (groupId: string, userId: string, role: GroupMemberRole = 'member'): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);

      const currentUserId = user?.id;

      const { error: insertError } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          user_id: userId,
          role,
          added_by: currentUserId,
        }] as any);

      if (insertError) throw insertError;

      await refreshGroups();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to add group member';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Remove a member from a group
  const removeGroupMember = async (groupId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      await refreshGroups();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to remove group member';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Get members of a specific group
  const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('added_at', { ascending: true });

      if (fetchError) throw fetchError;

      return (data || []) as GroupMember[];
    } catch (err: any) {
      console.error('Error fetching group members:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [tenantId]);

  return {
    groups,
    isLoading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    addGroupMember,
    removeGroupMember,
    getGroupMembers,
    refreshGroups: fetchGroups,
  };
}
