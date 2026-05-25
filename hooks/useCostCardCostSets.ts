'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import type {
  CostCardCostSet,
  CostCardCostSetFormData,
  CloneCostCardCostSetResult,
} from '@/types/costCard';

interface UseCostCardCostSetsReturn {
  costSets: CostCardCostSet[];
  isLoading: boolean;
  error: string | null;
  createCostSet: (
    data: CostCardCostSetFormData
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  updateCostSet: (
    id: string,
    data: CostCardCostSetFormData
  ) => Promise<{ success: boolean; error?: string }>;
  archiveCostSet: (id: string) => Promise<{ success: boolean; error?: string }>;
  cloneCostSet: (
    sourceCostSetId: string,
    newLabel: string,
    effectiveDateFrom: string,
    effectiveDateTo: string | null,
    includeArchivedVersions?: boolean
  ) => Promise<{ success: boolean; result?: CloneCostCardCostSetResult; error?: string }>;
  refreshCostSets: () => Promise<void>;
}

export function useCostCardCostSets(): UseCostCardCostSetsReturn {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [costSets, setCostSets] = useState<CostCardCostSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCostSets = useCallback(async () => {
    if (!tenant_id) {
      setCostSets([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const { data, error: err } = await tenantedSupabase
        .from('cost_card_cost_sets')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setCostSets((data ?? []) as unknown as CostCardCostSet[]);
    } catch (err: unknown) {
      console.error('Error fetching cost card cost sets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cost sets');
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id]);

  useEffect(() => {
    void fetchCostSets();
  }, [fetchCostSets]);

  const createCostSet = async (
    data: CostCardCostSetFormData
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { data: created, error: err } = await tenantedSupabase
        .from('cost_card_cost_sets')
        .insert([
          {
            tenant_id,
            label: data.label.trim(),
            cost_set_type: data.cost_set_type,
            effective_date_from: data.effective_date_from,
            effective_date_to: data.effective_date_to.trim() || null,
            status: data.status,
            created_by: user?.id ?? null,
          },
        ])
        .select('id')
        .single();

      if (err) return { success: false, error: err.message };
      await fetchCostSets();
      const row = created as { id?: string } | null;
      return { success: true, id: row?.id };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create cost set',
      };
    }
  };

  const updateCostSet = async (
    id: string,
    data: CostCardCostSetFormData
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err } = await tenantedSupabase
        .from('cost_card_cost_sets')
        .update({
          label: data.label.trim(),
          cost_set_type: data.cost_set_type,
          effective_date_from: data.effective_date_from,
          effective_date_to: data.effective_date_to.trim() || null,
          status: data.status,
        })
        .eq('id', id);

      if (err) return { success: false, error: err.message };
      await fetchCostSets();
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update cost set',
      };
    }
  };

  const archiveCostSet = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err } = await tenantedSupabase
        .from('cost_card_cost_sets')
        .update({ status: 'archived' })
        .eq('id', id);

      if (err) return { success: false, error: err.message };
      await fetchCostSets();
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to archive cost set',
      };
    }
  };

  const cloneCostSet = async (
    sourceCostSetId: string,
    newLabel: string,
    effectiveDateFrom: string,
    effectiveDateTo: string | null,
    includeArchivedVersions = true
  ): Promise<{ success: boolean; result?: CloneCostCardCostSetResult; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { data, error: err } = await tenantedSupabase.rpc('clone_cost_card_cost_set', {
        source_cost_set_id: sourceCostSetId,
        new_label: newLabel.trim(),
        new_effective_date_from: effectiveDateFrom,
        new_effective_date_to: effectiveDateTo?.trim() || null,
        include_archived_versions: includeArchivedVersions,
      });

      if (err) return { success: false, error: err.message };

      const parsed = data as CloneCostCardCostSetResult | null;
      if (!parsed?.cost_set_id) {
        return { success: false, error: 'Invalid clone response' };
      }

      await fetchCostSets();
      return { success: true, result: parsed };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to clone cost set',
      };
    }
  };

  return {
    costSets,
    isLoading,
    error,
    createCostSet,
    updateCostSet,
    archiveCostSet,
    cloneCostSet,
    refreshCostSets: fetchCostSets,
  };
}
