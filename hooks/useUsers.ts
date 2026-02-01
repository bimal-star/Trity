/**
 * useUsers Hook
 * 
 * Custom React hook for fetching users list
 * Used for user management and collaboration features
 * 
 * Note: This requires Supabase Auth Admin API or a users profile table
 * For now, we'll use a simplified approach
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface User {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}

interface UseUsersReturn {
  users: User[];
  isLoading: boolean;
  error: string | null;
  searchUsers: (query: string) => Promise<User[]>;
  refreshUsers: () => Promise<void>;
}

/**
 * Note: Supabase Auth doesn't expose user list via client SDK
 * Options:
 * 1. Create a users profile table that syncs with auth.users
 * 2. Use Supabase Admin API (server-side only)
 * 3. For now, we'll return empty and let the user implement based on their setup
 */
export function useUsers(tenantId?: string): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch users
  // TODO: Implement based on your user management setup
  // This might require:
  // - A users profile table
  // - Admin API calls
  // - Or fetching from group_members to show users in groups
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Option 1: If you have a users profile table
      // const { data, error: fetchError } = await supabase
      //   .from('user_profiles')
      //   .select('id, email, name, avatar_url')
      //   .order('name');

      // Option 2: Get users from group members (limited visibility)
      const { data: groupMembers, error: fetchError } = await supabase
        .from('group_members')
        .select('user_id')
        .order('added_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Extract unique user IDs
      const uniqueUserIds = Array.from(new Set((groupMembers || []).map((gm: any) => gm.user_id)));

      // For now, we'll just store user IDs
      // In production, you'd fetch user details from auth.users via Admin API
      // or from a user_profiles table
      const usersList: User[] = uniqueUserIds.map((userId: string) => ({
        id: userId,
        // email and name would come from auth.users or user_profiles table
      }));

      setUsers(usersList);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Search users by query
  const searchUsers = async (query: string): Promise<User[]> => {
    try {
      // TODO: Implement user search
      // This would search in user_profiles table or use Admin API
      // For now, return filtered users from current list
      const searchLower = query.toLowerCase();
      return users.filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.name?.toLowerCase().includes(searchLower)
      );
    } catch (err: any) {
      console.error('Error searching users:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [tenantId]);

  return {
    users,
    isLoading,
    error,
    searchUsers,
    refreshUsers: fetchUsers,
  };
}
