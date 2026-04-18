'use client';

import { useCallback, useEffect, useState } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import { useTenant } from '@/contexts/TenantContext';
import type {
  SupplierProductPrice,
  SupplierProductPriceUpsertInput,
} from '@/types/supplierProductPrice';

const db = tenantedSupabase as any;

export interface UseSupplierProductCatalogReturn {
  catalog: SupplierProductPrice[];
  isLoading: boolean;
  error: string | null;
  refreshCatalog: () => Promise<void>;
  upsertPrice: (
    input: SupplierProductPriceUpsertInput
  ) => Promise<{ success: boolean; error?: string }>;
  deletePrice: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export function useSupplierProductCatalog(
  supplierId: string | null | undefined
): UseSupplierProductCatalogReturn {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [catalog, setCatalog] = useState<SupplierProductPrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCatalog = useCallback(async () => {
    if (!tenant_id || !supplierId) {
      setCatalog([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const { data, error: err } = await db
        .from('supplier_product_prices')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('supplier_id', supplierId)
        .order('updated_at', { ascending: false });
      if (err) throw err;
      setCatalog((data || []) as SupplierProductPrice[]);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to load supplier pricing');
      setCatalog([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id, supplierId]);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  const upsertPrice = async (
    input: SupplierProductPriceUpsertInput
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    if (!input.supplier_id || !input.product_id) {
      return { success: false, error: 'Supplier and product are required' };
    }
    try {
      const row = {
        tenant_id,
        supplier_id: input.supplier_id,
        product_id: input.product_id,
        unit_price: input.unit_price,
        min_order_qty: input.min_order_qty,
        currency: input.currency?.trim() ? input.currency.trim().toUpperCase().slice(0, 3) : null,
        supplier_sku: input.supplier_sku?.trim() || null,
        uom: input.uom?.trim() || null,
        notes: input.notes?.trim() || null,
        updated_by: user?.id ?? null,
        created_by: user?.id ?? null,
      };

      const { error: err } = await db.from('supplier_product_prices').upsert(row, {
        onConflict: 'tenant_id,supplier_id,product_id',
      });
      if (err) throw err;
      await refreshCatalog();
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Save failed' };
    }
  };

  const deletePrice = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    try {
      const { error: err } = await db
        .from('supplier_product_prices')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenant_id);
      if (err) throw err;
      await refreshCatalog();
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Delete failed' };
    }
  };

  return {
    catalog,
    isLoading,
    error,
    refreshCatalog,
    upsertPrice,
    deletePrice,
  };
}
