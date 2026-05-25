import { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { slugifySellablePackCode, sortSellablePackOptions } from '@/lib/sellablePackLevel';
import { supabase } from '@/lib/supabaseClient';
import type { SellablePackLevel, SellablePackLevelOption } from '@/types/sellablePackLevel';

export type CreateSellablePackLevelInput = {
  label: string;
  code?: string;
  sort_order?: number;
};

export function useSellablePackLevels() {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [levels, setLevels] = useState<SellablePackLevelOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tenant_id) {
      setLevels([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('tenant_sellable_pack_levels')
        .select('code, label, sort_order')
        .eq('tenant_id', tenant_id)
        .eq('is_deleted', false)
        .eq('is_active', true)
        .order('sort_order')
        .order('label');
      if (fetchError) throw fetchError;
      setLevels(sortSellablePackOptions((data || []) as SellablePackLevelOption[]));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load sellable pack levels';
      setError(msg);
      setLevels([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createLevel = async (
    input: CreateSellablePackLevelInput
  ): Promise<{ success: boolean; error?: string; data?: SellablePackLevelOption }> => {
    if (!tenant_id || !user) {
      return { success: false, error: 'Sign in and select a tenant.' };
    }
    const label = input.label.trim();
    if (!label) {
      return { success: false, error: 'Label is required.' };
    }
    const code = (input.code?.trim() || slugifySellablePackCode(label)).toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(code)) {
      return {
        success: false,
        error:
          'Code must start with a letter and use only lowercase letters, numbers, and underscores.',
      };
    }
    try {
      const { data, error: insertError } = await supabase
        .from('tenant_sellable_pack_levels')
        .insert([
          {
            tenant_id,
            code,
            label,
            sort_order: input.sort_order ?? 100,
            is_system: false,
            is_active: true,
            created_by: user.id,
            updated_by: user.id,
          },
        ])
        .select('code, label, sort_order')
        .single();
      if (insertError) throw insertError;
      const row = data as SellablePackLevelOption;
      setLevels((prev) => sortSellablePackOptions([...prev, row]));
      return { success: true, data: row };
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message.includes('uq_tenant_sellable_pack_levels')
            ? 'A pack level with this code already exists.'
            : e.message
          : 'Failed to create pack level';
      return { success: false, error: msg };
    }
  };

  return {
    levels,
    isLoading,
    error,
    refresh,
    createLevel,
  };
}
