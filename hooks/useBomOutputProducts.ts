'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/lib/supabaseClient';

export interface BomOutputProductOption {
  id: string;
  sku: string;
  name: string;
  base_unit_id: string | null;
  base_unit_symbol: string | null;
  product_type: string | null;
  is_manufacturable: boolean;
}

interface UseBomOutputProductsReturn {
  products: BomOutputProductOption[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Products eligible as BOM output (manufacturable or typical output types).
 */
export function useBomOutputProducts(enabled = true): UseBomOutputProductsReturn {
  const { effectiveTenantId: tenant_id } = useTenant();
  const [products, setProducts] = useState<BomOutputProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tenant_id || !enabled) {
      setProducts([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('vw_products_full')
        .select('id, sku, name, base_unit_id, base_unit_symbol, product_type, is_manufacturable')
        .eq('tenant_id', tenant_id)
        .eq('is_deleted', false)
        .or('is_manufacturable.eq.true,product_type.in.(finished_good,assembly,semi_finished)')
        .order('name')
        .limit(1000);

      if (err) throw err;
      setProducts(
        (data ?? []).map((row) => ({
          id: row.id as string,
          sku: row.sku as string,
          name: row.name as string,
          base_unit_id: row.base_unit_id,
          base_unit_symbol: row.base_unit_symbol,
          product_type: row.product_type as string | null,
          is_manufacturable: Boolean(row.is_manufacturable),
        }))
      );
    } catch (err: unknown) {
      console.error('Error loading BOM output products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { products, isLoading, error, refresh };
}
