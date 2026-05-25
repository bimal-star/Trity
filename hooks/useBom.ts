'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/lib/supabaseClient';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import type { Database } from '@/types/database';
import type { BomHeader } from '@/types/product';

export type BomLineCostingRow = Database['public']['Views']['vw_bom_line_costing']['Row'] & {
  bom_line_id: string;
};

export type BomHeaderCostingRow = Database['public']['Views']['vw_bom_costing']['Row'] & {
  bom_id: string;
};

export interface BomHeaderUpdate {
  name?: string | null;
  version?: string;
  output_quantity?: number;
  output_unit_id?: string | null;
  is_active?: boolean | null;
  notes?: string | null;
}

export interface BomLineUpdate {
  quantity?: number;
  waste_percentage?: number | null;
  unit_id?: string | null;
  notes?: string | null;
}

interface UseBomReturn {
  header: BomHeaderCostingRow | null;
  headerMeta: BomHeader | null;
  lines: BomLineCostingRow[];
  isLoading: boolean;
  error: string | null;
  refreshBom: () => Promise<void>;
  updateHeader: (patch: BomHeaderUpdate) => Promise<{ success: boolean; error?: string }>;
  addLine: (
    componentProductId: string,
    quantity?: number
  ) => Promise<{ success: boolean; error?: string }>;
  updateLine: (
    lineId: string,
    patch: BomLineUpdate
  ) => Promise<{ success: boolean; error?: string }>;
  removeLine: (lineId: string) => Promise<{ success: boolean; error?: string }>;
  reorderLines: (orderedLineIds: string[]) => Promise<{ success: boolean; error?: string }>;
}

function mapHeaderRow(
  row: Database['public']['Views']['vw_bom_costing']['Row'] | null
): BomHeaderCostingRow | null {
  if (!row?.bom_id) return null;
  return { ...row, bom_id: row.bom_id };
}

function mapLineRow(
  row: Database['public']['Views']['vw_bom_line_costing']['Row']
): BomLineCostingRow | null {
  if (!row.bom_line_id) return null;
  return { ...row, bom_line_id: row.bom_line_id };
}

export function useBom(bomHeaderId: string | undefined): UseBomReturn {
  const { effectiveTenantId: tenant_id } = useTenant();
  const [header, setHeader] = useState<BomHeaderCostingRow | null>(null);
  const [headerMeta, setHeaderMeta] = useState<BomHeader | null>(null);
  const [lines, setLines] = useState<BomLineCostingRow[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(bomHeaderId && tenant_id));
  const [error, setError] = useState<string | null>(null);

  const refreshBom = useCallback(async () => {
    if (!tenant_id || !bomHeaderId) {
      setHeader(null);
      setHeaderMeta(null);
      setLines([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [costingRes, metaRes, linesRes] = await Promise.all([
        supabase
          .from('vw_bom_costing')
          .select('*')
          .eq('tenant_id', tenant_id)
          .eq('bom_id', bomHeaderId)
          .maybeSingle(),
        tenantedSupabase
          .from('bom_headers')
          .select('*')
          .eq('tenant_id', tenant_id)
          .eq('id', bomHeaderId)
          .eq('is_deleted', false)
          .maybeSingle(),
        supabase
          .from('vw_bom_line_costing')
          .select('*')
          .eq('tenant_id', tenant_id)
          .eq('bom_header_id', bomHeaderId)
          .order('sequence', { ascending: true }),
      ]);

      if (costingRes.error) throw costingRes.error;
      if (metaRes.error) throw metaRes.error;
      if (linesRes.error) throw linesRes.error;

      setHeader(
        mapHeaderRow(costingRes.data as Database['public']['Views']['vw_bom_costing']['Row'])
      );
      setHeaderMeta((metaRes.data as BomHeader | null) ?? null);
      const mappedLines = (linesRes.data ?? [])
        .map((r) => mapLineRow(r as Database['public']['Views']['vw_bom_line_costing']['Row']))
        .filter((r): r is BomLineCostingRow => r != null);
      setLines(mappedLines);
    } catch (err: unknown) {
      console.error('Error fetching BOM:', err);
      setError(err instanceof Error ? err.message : 'Failed to load BOM');
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id, bomHeaderId]);

  useEffect(() => {
    void refreshBom();
  }, [refreshBom]);

  const updateHeader = async (
    patch: BomHeaderUpdate
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id || !bomHeaderId) return { success: false, error: 'No tenant or BOM' };
    try {
      const { error: err } = await tenantedSupabase
        .from('bom_headers')
        .update(patch)
        .eq('tenant_id', tenant_id)
        .eq('id', bomHeaderId);
      if (err) return { success: false, error: err.message };
      await refreshBom();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Update failed' };
    }
  };

  const addLine = async (
    componentProductId: string,
    quantity = 1
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id || !bomHeaderId) return { success: false, error: 'No tenant or BOM' };
    const nextSeq = lines.length > 0 ? Math.max(...lines.map((l) => l.sequence ?? 0)) + 10 : 10;
    try {
      const { error: err } = await tenantedSupabase.from('bom_lines').insert([
        {
          tenant_id,
          bom_header_id: bomHeaderId,
          component_product_id: componentProductId,
          quantity,
          sequence: nextSeq,
        },
      ]);
      if (err) return { success: false, error: err.message };
      await refreshBom();
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add component',
      };
    }
  };

  const updateLine = async (
    lineId: string,
    patch: BomLineUpdate
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    try {
      const { error: err } = await tenantedSupabase
        .from('bom_lines')
        .update(patch)
        .eq('tenant_id', tenant_id)
        .eq('id', lineId);
      if (err) return { success: false, error: err.message };
      await refreshBom();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Update failed' };
    }
  };

  const removeLine = async (lineId: string): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    try {
      const { error: err } = await tenantedSupabase
        .from('bom_lines')
        .update({ is_deleted: true })
        .eq('tenant_id', tenant_id)
        .eq('id', lineId);
      if (err) return { success: false, error: err.message };
      await refreshBom();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Remove failed' };
    }
  };

  const reorderLines = async (
    orderedLineIds: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    try {
      for (let i = 0; i < orderedLineIds.length; i++) {
        const { error: err } = await tenantedSupabase
          .from('bom_lines')
          .update({ sequence: (i + 1) * 10 })
          .eq('tenant_id', tenant_id)
          .eq('id', orderedLineIds[i]);
        if (err) return { success: false, error: err.message };
      }
      await refreshBom();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Reorder failed' };
    }
  };

  return {
    header,
    headerMeta,
    lines,
    isLoading,
    error,
    refreshBom,
    updateHeader,
    addLine,
    updateLine,
    removeLine,
    reorderLines,
  };
}

/**
 * Create a new BOM header for a finished product.
 */
export async function createBomHeader(
  tenantId: string,
  productId: string,
  opts?: {
    version?: string;
    output_quantity?: number;
    output_unit_id?: string | null;
    name?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await tenantedSupabase
      .from('bom_headers')
      .insert([
        {
          tenant_id: tenantId,
          product_id: productId,
          version: opts?.version ?? '1',
          output_quantity: opts?.output_quantity ?? 1,
          output_unit_id: opts?.output_unit_id ?? null,
          name: opts?.name ?? null,
          notes: opts?.notes ?? null,
          is_active: true,
        },
      ])
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    const row = data as { id?: string } | null;
    return { success: true, id: row?.id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create BOM' };
  }
}
