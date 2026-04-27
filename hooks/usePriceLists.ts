import { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/lib/supabaseClient';
import type { PriceList } from '@/types/product';

export type PriceListUpsertInput = {
  name: string;
  description?: string | null;
  currency?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active?: boolean;
  is_default?: boolean;
  rounding_mode?: string | null;
  tax_inclusive?: boolean;
};

async function clearDefaultExcept(tenantId: string, exceptId: string | null) {
  let q = supabase.from('price_lists').update({ is_default: false }).eq('tenant_id', tenantId);
  if (exceptId) {
    q = q.neq('id', exceptId);
  }
  const { error } = await q;
  if (error) throw error;
}

export function usePriceLists() {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [lists, setLists] = useState<PriceList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tenant_id) {
      setLists([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('price_lists')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('is_deleted', false)
        .order('name');
      if (fetchError) throw fetchError;
      setLists((data || []) as PriceList[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load price tiers';
      setError(msg);
      setLists([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createList = async (
    input: PriceListUpsertInput
  ): Promise<{ success: boolean; error?: string; data?: PriceList }> => {
    if (!tenant_id || !user) {
      return { success: false, error: 'Sign in and select a tenant.' };
    }
    try {
      if (input.is_default) {
        await clearDefaultExcept(tenant_id, null);
      }
      const { data, error: insertError } = await supabase
        .from('price_lists')
        .insert([
          {
            name: input.name.trim(),
            description: input.description?.trim() || null,
            currency: input.currency?.trim() || 'GBP',
            effective_from: input.effective_from || null,
            effective_to: input.effective_to || null,
            is_active: input.is_active !== false,
            is_default: !!input.is_default,
            rounding_mode: input.rounding_mode?.trim() || null,
            tax_inclusive: !!input.tax_inclusive,
            tenant_id,
            created_by: user.id,
            updated_by: user.id,
            is_deleted: false,
          },
        ])
        .select()
        .single();
      if (insertError) throw insertError;
      await refresh();
      return { success: true, data: data as PriceList };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create price tier';
      return { success: false, error: msg };
    }
  };

  const updateList = async (
    id: string,
    input: PriceListUpsertInput
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id || !user) {
      return { success: false, error: 'Sign in and select a tenant.' };
    }
    try {
      if (input.is_default) {
        await clearDefaultExcept(tenant_id, id);
      }
      const { error: updateError } = await supabase
        .from('price_lists')
        .update({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          currency: input.currency?.trim() || 'GBP',
          effective_from: input.effective_from || null,
          effective_to: input.effective_to || null,
          is_active: input.is_active !== false,
          is_default: !!input.is_default,
          rounding_mode: input.rounding_mode?.trim() || null,
          tax_inclusive: !!input.tax_inclusive,
          updated_by: user.id,
        })
        .eq('id', id)
        .eq('tenant_id', tenant_id);
      if (updateError) throw updateError;
      await refresh();
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update price tier';
      return { success: false, error: msg };
    }
  };

  const archiveList = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) {
      return { success: false, error: 'Tenant not available.' };
    }
    try {
      const { error: archiveError } = await supabase
        .from('price_lists')
        .update({
          is_deleted: true,
          updated_by: user?.id ?? null,
        })
        .eq('id', id)
        .eq('tenant_id', tenant_id);
      if (archiveError) throw archiveError;
      await refresh();
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to archive price tier';
      return { success: false, error: msg };
    }
  };

  return {
    lists,
    isLoading,
    error,
    refresh,
    createList,
    updateList,
    archiveList,
  };
}
