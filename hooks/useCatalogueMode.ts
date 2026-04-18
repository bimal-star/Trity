'use client';

import { useTenant } from '@/contexts/TenantContext';

export function useCatalogueMode() {
  const { catalogue_mode } = useTenant();

  return {
    mode: catalogue_mode,
    isSimple: catalogue_mode === 'simple',
    isGrouped: catalogue_mode === 'grouped',
    isMatrix: catalogue_mode === 'matrix',
    supportsGroups: catalogue_mode !== 'simple',
    supportsMatrix: catalogue_mode === 'matrix',
  };
}
