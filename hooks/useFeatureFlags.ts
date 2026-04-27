/**
 * useFeatureFlags Hook
 *
 * Check feature flag status for current tenant
 */

'use client';

import { useMemo } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useTenantDetails } from '@/hooks/useTenantDetails';
import { FeatureFlag, isFeatureEnabled, getAllFeatureFlags } from '@/lib/featureFlags';

export interface UseFeaturesReturn {
  isEnabled: (flag: FeatureFlag) => boolean;
  allFlags: ReturnType<typeof getAllFeatureFlags>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to check feature flags for current tenant
 * @returns Feature flag checking functions and data
 *
 * @example
 * const { isEnabled, allFlags } = useFeatureFlags();
 *
 * if (isEnabled('product_management')) {
 *   // Show products feature
 * }
 */
export function useFeatureFlags(): UseFeaturesReturn {
  const { effectiveTenantId: tenant_id } = useTenant();
  const { tenant, isLoading, error } = useTenantDetails(tenant_id);

  return useMemo(() => {
    const isEnabled = (flag: FeatureFlag): boolean => {
      return isFeatureEnabled(tenant, flag);
    };

    const allFlags = getAllFeatureFlags(tenant);

    return {
      isEnabled,
      allFlags,
      isLoading,
      error,
    };
  }, [tenant, isLoading, error]);
}
