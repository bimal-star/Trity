'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import type { Customer } from '@/types/customer';
import { useTenant } from '@/contexts/TenantContext';

/**
 * Load a single customer for the detail route.
 */
export function useCustomer(customerId: string | undefined) {
  const { effectiveTenantId: tenant_id } = useTenant();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(
    Boolean(customerId && tenant_id && customerId !== 'new')
  );
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const refreshCustomer = useCallback(async () => {
    if (!tenant_id || !customerId || customerId === 'new') {
      setCustomer(null);
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
        .from('customers')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('id', customerId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) {
        setCustomer(null);
        setError('Customer not found or you do not have access.');
        return null;
      }
      const mapped = data as unknown as Customer;
      setCustomer(mapped);
      hasLoadedOnceRef.current = true;
      return mapped;
    } catch (err: unknown) {
      console.error('Error fetching customer:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load customer';
      setError(msg);
      if (!hasLoadedOnceRef.current) {
        setCustomer(null);
      }
      return null;
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }, [tenant_id, customerId]);

  const patchCustomer = useCallback((patch: Partial<Customer>) => {
    setCustomer((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  useEffect(() => {
    void refreshCustomer();
  }, [refreshCustomer]);

  return { customer, isLoading, error, refreshCustomer, patchCustomer };
}
