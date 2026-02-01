'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { TenantInvite } from '@/types/profile';

interface UseTenantInvitesReturn {
  createInvite: (email: string, role: string, groupId?: string | null) => Promise<{ success: boolean; inviteLink?: string; error?: string }>;
  pendingInvites: TenantInvite[];
  fetchPending: (tenantId: string | null) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Create tenant invites and optionally list pending ones.
 * All operations filter by tenant_id and require tenant admin.
 */
export function useTenantInvites(tenantId: string | null, userId: string | undefined): UseTenantInvitesReturn {
  const [pendingInvites, setPendingInvites] = useState<TenantInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async (tid: string | null) => {
    if (!tid) {
      setPendingInvites([]);
      return;
    }
    try {
      setError(null);
      const { data, err } = await supabase
        .from('tenant_invites')
        .select('*')
        .eq('tenant_id', tid)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (err) throw err;
      setPendingInvites((data ?? []) as TenantInvite[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load invites');
      setPendingInvites([]);
    }
  }, []);

  const createInvite = useCallback(
    async (email: string, role: string, groupId?: string | null): Promise<{ success: boolean; inviteLink?: string; error?: string }> => {
      if (!tenantId || !userId) return { success: false, error: 'Missing tenant or user' };
      setIsLoading(true);
      setError(null);
      try {
        const { data, err } = await supabase
          .from('tenant_invites')
          .insert({
            tenant_id: tenantId,
            email: email.trim().toLowerCase(),
            role: role || 'member',
            group_id: groupId ?? null,
            invited_by: userId,
          } as Record<string, unknown>)
          .select('token')
          .single();

        if (err) {
          if (err.code === '23505') return { success: false, error: 'An invite for this email already exists.' };
          throw err;
        }
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const inviteLink = `${origin}/signup?invite=${(data as { token: string }).token}`;
        await fetchPending(tenantId);
        return { success: true, inviteLink };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to create invite';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [tenantId, userId, fetchPending]
  );

  return { createInvite, pendingInvites, fetchPending, isLoading, error };
}
