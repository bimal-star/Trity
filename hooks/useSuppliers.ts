'use client';

import { useState, useEffect, useCallback } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import type { Supplier, SupplierFilters, SupplierFormData } from '@/types/supplier';
import { useTenant } from '@/contexts/TenantContext';

interface UseSuppliersReturn {
  suppliers: Supplier[];
  isLoading: boolean;
  error: string | null;
  createSupplier: (
    data: SupplierFormData
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  updateSupplier: (
    id: string,
    data: Partial<SupplierFormData>
  ) => Promise<{ success: boolean; error?: string }>;
  archiveSupplier: (id: string) => Promise<{ success: boolean; error?: string }>;
  restoreSupplier: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshSuppliers: () => Promise<void>;
}

export interface UseSuppliersOptions {
  loadSuppliers?: boolean;
}

function searchPattern(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = raw
    .trim()
    .replace(/[,()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return null;
  const safe = t.replace(/[%_]/g, '');
  if (!safe) return null;
  return `%${safe}%`;
}

export function useSuppliers(
  filters?: SupplierFilters,
  options?: UseSuppliersOptions
): UseSuppliersReturn {
  const loadSuppliers = options?.loadSuppliers !== false;
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    if (!tenant_id) {
      setSuppliers([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = tenantedSupabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('created_at', { ascending: false });

      const visibility = filters?.visibility ?? 'active';
      if (visibility === 'active') {
        query = query.is('deleted_at', null);
      } else if (visibility === 'archived') {
        query = query.not('deleted_at', 'is', null);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const pattern = searchPattern(filters?.searchQuery);
      if (pattern) {
        query = query.or(
          `legal_name.ilike.${pattern},trading_name.ilike.${pattern},email.ilike.${pattern},supplier_code.ilike.${pattern}`
        );
      }

      const { data, error: err } = await query;

      if (err) throw err;
      setSuppliers((data || []) as unknown as Supplier[]);
    } catch (err: unknown) {
      console.error('Error fetching suppliers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id, filters?.status, filters?.searchQuery, filters?.visibility]);

  useEffect(() => {
    if (!tenant_id) {
      setSuppliers([]);
      setIsLoading(false);
      return;
    }
    if (loadSuppliers) {
      void fetchSuppliers();
    } else {
      setSuppliers([]);
      setError(null);
      setIsLoading(false);
    }
  }, [tenant_id, loadSuppliers, fetchSuppliers]);

  const createSupplier = async (
    data: SupplierFormData
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err, data: created } = await tenantedSupabase
        .from('suppliers')
        .insert([
          {
            tenant_id,
            created_by: user?.id ?? null,
            updated_by: user?.id ?? null,
            supplier_type: data.supplier_type,
            logo_url: data.logo_url?.trim() || null,
            legal_name: data.legal_name.trim(),
            trading_name: data.trading_name?.trim() || null,
            email: data.email?.trim() || null,
            phone: data.phone?.trim() || null,
            status: data.status,
            address_line1: data.address_line1?.trim() || null,
            address_line2: data.address_line2?.trim() || null,
            city: data.city?.trim() || null,
            state: data.state?.trim() || null,
            postcode: data.postcode?.trim() || null,
            country: data.country?.trim() || null,
            payment_terms: data.payment_terms?.trim() || null,
            currency: data.currency?.trim() || null,
            tax_id: data.tax_id?.trim() || null,
            notes: data.notes?.trim() || null,
            metadata: data.metadata ?? {},
          },
        ])
        .select('id')
        .single();

      if (err) return { success: false, error: err.message };
      if (loadSuppliers) await fetchSuppliers();
      const row = created as { id?: string } | null | undefined;
      return { success: true, id: row?.id };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create' };
    }
  };

  const updateSupplier = async (
    id: string,
    data: Partial<SupplierFormData>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const patch: Record<string, unknown> = {
        updated_by: user?.id ?? null,
      };
      if (data.supplier_type !== undefined) patch.supplier_type = data.supplier_type;
      if (data.logo_url !== undefined) patch.logo_url = data.logo_url?.trim() || null;
      if (data.legal_name !== undefined) patch.legal_name = data.legal_name.trim();
      if (data.trading_name !== undefined) patch.trading_name = data.trading_name?.trim() || null;
      if (data.email !== undefined) patch.email = data.email?.trim() || null;
      if (data.phone !== undefined) patch.phone = data.phone?.trim() || null;
      if (data.status !== undefined) patch.status = data.status;
      if (data.address_line1 !== undefined)
        patch.address_line1 = data.address_line1?.trim() || null;
      if (data.address_line2 !== undefined)
        patch.address_line2 = data.address_line2?.trim() || null;
      if (data.city !== undefined) patch.city = data.city?.trim() || null;
      if (data.state !== undefined) patch.state = data.state?.trim() || null;
      if (data.postcode !== undefined) patch.postcode = data.postcode?.trim() || null;
      if (data.country !== undefined) patch.country = data.country?.trim() || null;
      if (data.payment_terms !== undefined)
        patch.payment_terms = data.payment_terms?.trim() || null;
      if (data.currency !== undefined) patch.currency = data.currency?.trim() || null;
      if (data.tax_id !== undefined) patch.tax_id = data.tax_id?.trim() || null;
      if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;
      if (data.metadata !== undefined) patch.metadata = data.metadata;

      const { error: err } = await tenantedSupabase.from('suppliers').update(patch).eq('id', id);

      if (err) return { success: false, error: err.message };
      if (loadSuppliers) await fetchSuppliers();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update' };
    }
  };

  const archiveSupplier = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err } = await tenantedSupabase
        .from('suppliers')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id ?? null,
        } as any)
        .eq('id', id);

      if (err) return { success: false, error: err.message };
      if (loadSuppliers) await fetchSuppliers();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to archive' };
    }
  };

  const restoreSupplier = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err } = await tenantedSupabase
        .from('suppliers')
        .update({
          deleted_at: null,
          deleted_by: null,
        } as any)
        .eq('id', id);

      if (err) return { success: false, error: err.message };
      if (loadSuppliers) await fetchSuppliers();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to restore' };
    }
  };

  return {
    suppliers,
    isLoading,
    error,
    createSupplier,
    updateSupplier,
    archiveSupplier,
    restoreSupplier,
    refreshSuppliers: fetchSuppliers,
  };
}
