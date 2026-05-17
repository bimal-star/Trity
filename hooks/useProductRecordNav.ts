'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface ProductRecordNav {
  prevId: string | null;
  nextId: string | null;
  index: number;
  total: number;
  isLoading: boolean;
}

/**
 * Prev/next product ids for the detail pager (tenant active products, newest first).
 * Does not mirror list filters yet — see plan follow-up.
 */
export function useProductRecordNav(
  tenantId: string | undefined,
  productId: string | undefined
): ProductRecordNav {
  const [ids, setIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(tenantId));

  const load = useCallback(async () => {
    if (!tenantId) {
      setIds([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vw_products_full')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIds((data ?? []).map((r) => r.id).filter((id): id is string => typeof id === 'string'));
    } catch {
      setIds([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const index = productId ? ids.indexOf(productId) : -1;
  const total = ids.length;

  return {
    prevId: index > 0 ? ids[index - 1]! : null,
    nextId: index >= 0 && index < ids.length - 1 ? ids[index + 1]! : null,
    index: index >= 0 ? index + 1 : 0,
    total,
    isLoading,
  };
}
