'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { TenantDetails, TenantDetailsUpdate } from '@/types/profile';
import type { Database } from '@/types/database';

type TenantDbUpdate = Database['public']['Tables']['tenants']['Update'];

interface UseTenantDetailsReturn {
  tenant: TenantDetails | null;
  isLoading: boolean;
  error: string | null;
  updateTenant: (updates: TenantDetailsUpdate) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

/**
 * Fetches and updates tenant by id from public.tenants.
 * Enforces tenant_id filter; RLS restricts to own tenant.
 */
export function useTenantDetails(tenantId: string | null): UseTenantDetailsReturn {
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = useCallback(async () => {
    if (!tenantId) {
      setTenant(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from('tenants')
        .select(
          'id, name, company_name, slug, is_active, logo_url, subscription_tier, subscription_package_id, catalogue_mode, settings, created_at, updated_at'
        )
        .eq('id', tenantId)
        .single();

      if (fetchErr) throw fetchErr;
      setTenant(data as TenantDetails);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load tenant';
      setError(msg);
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const updateTenant = useCallback(
    async (updates: TenantDetailsUpdate): Promise<{ success: boolean; error?: string }> => {
      if (!tenantId) return { success: false, error: 'No tenant' };
      try {
        const { error: err } = await supabase
          .from('tenants')
          .update(updates as TenantDbUpdate)
          .eq('id', tenantId);

        if (err) return { success: false, error: err.message };
        await fetchTenant();
        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to update tenant';
        return { success: false, error: msg };
      }
    },
    [tenantId, fetchTenant]
  );

  return { tenant, isLoading, error, updateTenant, refresh: fetchTenant };
}
