'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/database';
import type { Product } from '@/types/product';
import { useTenant } from '@/contexts/TenantContext';
import { mapViewRowToProduct } from '@/hooks/useProducts';

type VwProductRow = Database['public']['Views']['vw_products_full']['Row'];

/**
 * Load a single product from `vw_products_full` for the detail route.
 */
export function useProduct(productId: string | undefined) {
  const { effectiveTenantId: tenant_id } = useTenant();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(
    Boolean(productId && tenant_id && productId !== 'new')
  );
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const refreshProduct = useCallback(async () => {
    if (!tenant_id || !productId || productId === 'new') {
      setProduct(null);
      setIsLoading(false);
      setError(null);
      hasLoadedOnceRef.current = false;
      return null;
    }
    const isInitialLoad = !hasLoadedOnceRef.current;
    if (isInitialLoad) setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('vw_products_full')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('id', productId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) {
        setProduct(null);
        setError('Product not found or you do not have access.');
        return null;
      }
      const mapped = mapViewRowToProduct(data as VwProductRow);
      setProduct(mapped);
      hasLoadedOnceRef.current = true;
      return mapped;
    } catch (err: unknown) {
      console.error('Error fetching product:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load product';
      setError(msg);
      if (!hasLoadedOnceRef.current) {
        setProduct(null);
      }
      return null;
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }, [tenant_id, productId]);

  const patchProduct = useCallback((patch: Partial<Product>) => {
    setProduct((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  useEffect(() => {
    void refreshProduct();
  }, [refreshProduct]);

  return { product, isLoading, error, refreshProduct, patchProduct };
}
