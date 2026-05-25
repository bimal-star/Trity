'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import type { LogisticsRateCardFormData, LogisticsRateCardListRow } from '@/types/logistics';

interface UseLogisticsRateCardsReturn {
  rateCards: LogisticsRateCardListRow[];
  isLoading: boolean;
  error: string | null;
  createRateCard: (
    data: LogisticsRateCardFormData
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  refreshRateCards: () => Promise<void>;
}

export function useLogisticsRateCards(): UseLogisticsRateCardsReturn {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [rateCards, setRateCards] = useState<LogisticsRateCardListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRateCards = useCallback(async () => {
    if (!tenant_id) {
      setRateCards([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const { data, error: err } = await tenantedSupabase
        .from('logistics_rate_cards')
        .select('*, logistics_rate_lines(count)')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setRateCards((data ?? []) as unknown as LogisticsRateCardListRow[]);
    } catch (err: unknown) {
      console.error('Error fetching logistics rate cards:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rate cards');
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id]);

  useEffect(() => {
    void fetchRateCards();
  }, [fetchRateCards]);

  const createRateCard = async (
    data: LogisticsRateCardFormData
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { data: created, error: err } = await tenantedSupabase
        .from('logistics_rate_cards')
        .insert([
          {
            tenant_id,
            label: data.label.trim(),
            provider: data.provider.trim() || null,
            direction: data.direction,
            effective_date_from: data.effective_date_from,
            effective_date_to: data.effective_date_to.trim() || null,
            status: data.status,
            notes: data.notes.trim() || null,
            created_by: user?.id ?? null,
          },
        ])
        .select('id')
        .single();

      if (err) return { success: false, error: err.message };
      await fetchRateCards();
      const row = created as { id?: string } | null;
      return { success: true, id: row?.id };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create rate card',
      };
    }
  };

  return {
    rateCards,
    isLoading,
    error,
    createRateCard,
    refreshRateCards: fetchRateCards,
  };
}
