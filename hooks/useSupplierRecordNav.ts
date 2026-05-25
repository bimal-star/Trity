'use client';

import { useCallback, useEffect, useState } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';

export interface SupplierRecordNav {
  prevId: string | null;
  nextId: string | null;
  index: number;
  total: number;
  isLoading: boolean;
}

/**
 * Prev/next supplier ids for the detail pager (tenant active suppliers, newest first).
 * Does not mirror list filters yet.
 */
export function useSupplierRecordNav(
  tenantId: string | undefined,
  supplierId: string | undefined
): SupplierRecordNav {
  const [ids, setIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(tenantId));

  const load = useCallback(async () => {
    if (!tenantId || supplierId === 'new') {
      setIds([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await tenantedSupabase
        .from('suppliers')
        .select('id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIds(
        (data ?? [])
          .map((r: { id: string }) => r.id)
          .filter((id: string | null | undefined): id is string => typeof id === 'string')
      );
    } catch {
      setIds([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const index = supplierId ? ids.indexOf(supplierId) : -1;
  const total = ids.length;

  return {
    prevId: index > 0 ? ids[index - 1]! : null,
    nextId: index >= 0 && index < ids.length - 1 ? ids[index + 1]! : null,
    index: index >= 0 ? index + 1 : 0,
    total,
    isLoading,
  };
}
