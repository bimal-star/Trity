'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/database';

export type BomHeaderListRow = Database['public']['Views']['vw_bom_costing']['Row'] & {
  bom_id: string;
};

interface UseBomHeadersReturn {
  boms: BomHeaderListRow[];
  isLoading: boolean;
  error: string | null;
  refreshBoms: () => Promise<void>;
}

function mapBomRow(
  row: Database['public']['Views']['vw_bom_costing']['Row']
): BomHeaderListRow | null {
  if (!row.bom_id) return null;
  return { ...row, bom_id: row.bom_id };
}

export function useBomHeaders(): UseBomHeadersReturn {
  const { effectiveTenantId: tenant_id } = useTenant();
  const [boms, setBoms] = useState<BomHeaderListRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBoms = useCallback(async () => {
    if (!tenant_id) {
      setBoms([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('vw_bom_costing')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('product_sku', { ascending: true })
        .order('version', { ascending: true });

      if (err) throw err;
      const mapped = (data ?? [])
        .map((row) => mapBomRow(row as Database['public']['Views']['vw_bom_costing']['Row']))
        .filter((r): r is BomHeaderListRow => r != null);
      setBoms(mapped);
    } catch (err: unknown) {
      console.error('Error fetching BOM headers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bills of materials');
      setBoms([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id]);

  useEffect(() => {
    void refreshBoms();
  }, [refreshBoms]);

  return { boms, isLoading, error, refreshBoms };
}
