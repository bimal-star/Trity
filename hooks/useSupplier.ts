'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import type { Supplier } from '@/types/supplier';
import { useTenant } from '@/contexts/TenantContext';

/**
 * Load a single supplier for the detail route.
 */
export function useSupplier(supplierId: string | undefined) {
  const { effectiveTenantId: tenant_id } = useTenant();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(
    Boolean(supplierId && tenant_id && supplierId !== 'new')
  );
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const refreshSupplier = useCallback(async () => {
    if (!tenant_id || !supplierId || supplierId === 'new') {
      setSupplier(null);
      setIsLoading(false);
      setError(null);
      hasLoadedOnceRef.current = false;
      return null;
    }
    const isInitialLoad = !hasLoadedOnceRef.current;
    if (isInitialLoad) setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await tenantedSupabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('id', supplierId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) {
        setSupplier(null);
        setError('Supplier not found or you do not have access.');
        return null;
      }
      const mapped = data as unknown as Supplier;
      setSupplier(mapped);
      hasLoadedOnceRef.current = true;
      return mapped;
    } catch (err: unknown) {
      console.error('Error fetching supplier:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load supplier';
      setError(msg);
      if (!hasLoadedOnceRef.current) {
        setSupplier(null);
      }
      return null;
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }, [tenant_id, supplierId]);

  const patchSupplier = useCallback((patch: Partial<Supplier>) => {
    setSupplier((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  useEffect(() => {
    void refreshSupplier();
  }, [refreshSupplier]);

  return { supplier, isLoading, error, refreshSupplier, patchSupplier };
}
