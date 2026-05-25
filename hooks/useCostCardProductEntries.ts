'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import type {
  CostCardProductEntryFormData,
  CostCardProductEntryWithRelations,
} from '@/types/costCard';

const ENTRY_SELECT = `
  *,
  product:products(id, sku, name),
  customer:customers(id, legal_name, trading_name),
  cost_lines(*)
`;

interface UseCostCardProductEntriesReturn {
  entries: CostCardProductEntryWithRelations[];
  isLoading: boolean;
  error: string | null;
  createEntry: (
    versionId: string,
    data: CostCardProductEntryFormData
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  refreshEntries: () => Promise<void>;
}

export function useCostCardProductEntries(
  versionId: string | null
): UseCostCardProductEntriesReturn {
  const { effectiveTenantId: tenant_id } = useTenant();
  const [entries, setEntries] = useState<CostCardProductEntryWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!tenant_id || !versionId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const { data, error: err } = await tenantedSupabase
        .from('cost_card_product_entries')
        .select(ENTRY_SELECT)
        .eq('version_id', versionId)
        .order('created_at', { ascending: true });

      if (err) throw err;
      setEntries((data ?? []) as unknown as CostCardProductEntryWithRelations[]);
    } catch (err: unknown) {
      console.error('Error fetching cost card entries:', err);
      setError(err instanceof Error ? err.message : 'Failed to load product entries');
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id, versionId]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const createEntry = async (
    vid: string,
    data: CostCardProductEntryFormData
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const targetMargin = data.target_margin_pct.trim()
        ? parseFloat(data.target_margin_pct)
        : null;
      const sellingPrice = data.selling_price_resolved.trim()
        ? parseFloat(data.selling_price_resolved)
        : null;

      const { data: created, error: err } = await tenantedSupabase
        .from('cost_card_product_entries')
        .insert([
          {
            version_id: vid,
            tenant_id,
            product_id: data.product_id,
            customer_id: data.customer_id.trim() || null,
            base_currency: data.base_currency.trim() || 'GBP',
            target_margin_pct: Number.isFinite(targetMargin) ? targetMargin : null,
            selling_price_resolved: Number.isFinite(sellingPrice) ? sellingPrice : null,
          },
        ])
        .select('id')
        .single();

      if (err) return { success: false, error: err.message };
      await fetchEntries();
      const row = created as { id?: string } | null;
      return { success: true, id: row?.id };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add product',
      };
    }
  };

  return {
    entries,
    isLoading,
    error,
    createEntry,
    refreshEntries: fetchEntries,
  };
}
