'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import type {
  LogisticsRateCardFormData,
  LogisticsRateCardWithLines,
  LogisticsRateLine,
  LogisticsRateLineFormData,
} from '@/types/logistics';

interface UseLogisticsRateCardReturn {
  rateCard: LogisticsRateCardWithLines | null;
  isLoading: boolean;
  error: string | null;
  updateRateCard: (
    id: string,
    data: LogisticsRateCardFormData
  ) => Promise<{ success: boolean; error?: string }>;
  archiveRateCard: (id: string) => Promise<{ success: boolean; error?: string }>;
  saveLines: (
    rateCardId: string,
    lines: Array<LogisticsRateLineFormData & { rowKey: string }>
  ) => Promise<{ success: boolean; error?: string }>;
  refreshRateCard: () => Promise<void>;
}

function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export function useLogisticsRateCard(rateCardId: string | undefined): UseLogisticsRateCardReturn {
  const { effectiveTenantId: tenant_id } = useTenant();
  const [rateCard, setRateCard] = useState<LogisticsRateCardWithLines | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRateCard = useCallback(async () => {
    if (!tenant_id || !rateCardId || rateCardId === 'new') {
      setRateCard(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const { data, error: err } = await tenantedSupabase
        .from('logistics_rate_cards')
        .select('*, logistics_rate_lines(*)')
        .eq('id', rateCardId)
        .maybeSingle();

      if (err) throw err;
      if (!data) {
        setRateCard(null);
        setError('Rate card not found');
        return;
      }
      const row = data as LogisticsRateCardWithLines;
      row.logistics_rate_lines = (row.logistics_rate_lines ?? []).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setRateCard(row);
    } catch (err: unknown) {
      console.error('Error fetching logistics rate card:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rate card');
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id, rateCardId]);

  useEffect(() => {
    void fetchRateCard();
  }, [fetchRateCard]);

  const updateRateCard = async (
    id: string,
    data: LogisticsRateCardFormData
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err } = await tenantedSupabase
        .from('logistics_rate_cards')
        .update({
          label: data.label.trim(),
          provider: data.provider.trim() || null,
          direction: data.direction,
          effective_date_from: data.effective_date_from,
          effective_date_to: data.effective_date_to.trim() || null,
          status: data.status,
          notes: data.notes.trim() || null,
        })
        .eq('id', id);

      if (err) return { success: false, error: err.message };
      await fetchRateCard();
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update rate card',
      };
    }
  };

  const archiveRateCard = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err } = await tenantedSupabase
        .from('logistics_rate_cards')
        .update({ status: 'archived' })
        .eq('id', id);

      if (err) return { success: false, error: err.message };
      await fetchRateCard();
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to archive rate card',
      };
    }
  };

  const saveLines = async (
    cardId: string,
    lines: Array<LogisticsRateLineFormData & { rowKey: string }>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const existingIds = (rateCard?.logistics_rate_lines ?? []).map((l) => l.id);
      const keptIds = new Set<string>();

      for (const line of lines) {
        const isExisting = existingIds.includes(line.rowKey);
        const payload = {
          rate_card_id: cardId,
          lane: line.lane.trim() || null,
          charge_type: line.charge_type,
          rate: parseFloat(line.rate) || 0,
          currency: line.currency.trim() || 'GBP',
          min_charge: parseOptionalNumber(line.min_charge),
          fuel_surcharge_pct: parseOptionalNumber(line.fuel_surcharge_pct),
          notes: line.notes.trim() || null,
        };

        if (isExisting) {
          const { error: updErr } = await tenantedSupabase
            .from('logistics_rate_lines')
            .update(payload)
            .eq('id', line.rowKey);
          if (updErr) return { success: false, error: updErr.message };
          keptIds.add(line.rowKey);
        } else {
          const { data: inserted, error: insErr } = await tenantedSupabase
            .from('logistics_rate_lines')
            .insert([payload])
            .select('id')
            .single();
          if (insErr) return { success: false, error: insErr.message };
          const row = inserted as LogisticsRateLine | null;
          if (row?.id) keptIds.add(row.id);
        }
      }

      const toDelete = existingIds.filter((id) => !keptIds.has(id));
      if (toDelete.length > 0) {
        const { error: delErr } = await tenantedSupabase
          .from('logistics_rate_lines')
          .delete()
          .in('id', toDelete);
        if (delErr) return { success: false, error: delErr.message };
      }

      await fetchRateCard();
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save rate lines',
      };
    }
  };

  return {
    rateCard,
    isLoading,
    error,
    updateRateCard,
    archiveRateCard,
    saveLines,
    refreshRateCard: fetchRateCard,
  };
}
