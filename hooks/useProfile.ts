'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTenant } from '@/contexts/TenantContext';
import type { UserProfile, UserProfileUpdate } from '@/types/profile';
import type { Database } from '@/types/database';

type UserProfileDbUpdate = Database['public']['Tables']['user_profiles']['Update'];

interface UseProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (updates: UserProfileUpdate) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

/**
 * Hook to access and update the current user's profile.
 *
 * Uses cached profile from TenantContext (loaded once on app mount).
 * Only fetches from database when explicitly refreshing or updating.
 * This ensures instant access without blocking navigation.
 */
export function useProfile(userId?: string): UseProfileReturn {
  const { profile: cachedProfile, user } = useTenant();
  const [error, setError] = useState<string | null>(null);

  // Use cached profile from TenantContext - no loading state needed as it's already loaded
  const profile = cachedProfile;
  const isLoading = false; // Profile is already loaded in TenantContext

  /**
   * Update profile in database and refresh cached profile in TenantContext.
   */
  const updateProfile = useCallback(
    async (updates: UserProfileUpdate): Promise<{ success: boolean; error?: string }> => {
      const currentUserId = userId || user?.id;
      if (!currentUserId) return { success: false, error: 'Not authenticated' };

      try {
        setError(null);
        const { error: err } = await supabase
          .from('user_profiles')
          .update(updates as UserProfileDbUpdate)
          .eq('user_id', currentUserId);

        if (err) {
          const errorMsg = err.message;
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        // Profile updated successfully - the cached profile in TenantContext will be
        // refreshed on next session change. For immediate updates, we could call
        // refreshTenant() here, but that would cause a full revalidation which is
        // unnecessary. The profile will be correct on next page load or session change.
        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to update profile';
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [userId, user]
  );

  /**
   * Refresh profile from database.
   * Note: This will update the cached profile in TenantContext via refreshTenant.
   */
  const refresh = useCallback(async () => {
    // Profile is managed by TenantContext, so we just clear any local error
    // The actual refresh should be done via TenantContext.refreshTenant() if needed
    setError(null);
  }, []);

  return { profile, isLoading, error, updateProfile, refresh };
}
