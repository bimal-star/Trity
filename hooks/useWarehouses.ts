'use client';

import { useState, useEffect, useCallback } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import type { Warehouse, WarehouseFilters, WarehouseFormData } from '@/types/warehouse';
import type { Database } from '@/types/database';
import { useTenant } from '@/contexts/TenantContext';

type WarehouseRowUpdate = Database['public']['Tables']['warehouses']['Update'];

interface UseWarehousesReturn {
  warehouses: Warehouse[];
  isLoading: boolean;
  error: string | null;
  createWarehouse: (
    data: WarehouseFormData
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  updateWarehouse: (
    id: string,
    data: Partial<WarehouseFormData>
  ) => Promise<{ success: boolean; error?: string }>;
  archiveWarehouse: (id: string) => Promise<{ success: boolean; error?: string }>;
  restoreWarehouse: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshWarehouses: () => Promise<void>;
}

export interface UseWarehousesOptions {
  loadWarehouses?: boolean;
}

function searchPattern(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const safe = t.replace(/%/g, '').replace(/_/g, '');
  if (!safe) return null;
  return `%${safe}%`;
}

export function useWarehouses(
  filters?: WarehouseFilters,
  options?: UseWarehousesOptions
): UseWarehousesReturn {
  const loadWarehouses = options?.loadWarehouses !== false;
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearOtherDefaults = async () => {
    if (!tenant_id) return;
    await tenantedSupabase
      .from('warehouses')
      .update({ is_default: false, updated_by: user?.id ?? null } as WarehouseRowUpdate)
      .eq('tenant_id', tenant_id)
      .eq('is_default', true)
      .is('deleted_at', null);
  };

  const fetchWarehouses = useCallback(async () => {
    if (!tenant_id) {
      setWarehouses([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = tenantedSupabase
        .from('warehouses')
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

      if (filters?.defaultOnly) {
        query = query.eq('is_default', true);
      }

      const pattern = searchPattern(filters?.searchQuery);
      if (pattern) {
        query = query.or(
          `name.ilike.${pattern},warehouse_code.ilike.${pattern},city.ilike.${pattern},contact_email.ilike.${pattern}`
        );
      }

      const { data, error: err } = await query;

      if (err) throw err;
      setWarehouses((data || []) as unknown as Warehouse[]);
    } catch (err: unknown) {
      console.error('Error fetching warehouses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load warehouses');
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id, filters?.status, filters?.searchQuery, filters?.visibility, filters?.defaultOnly]);

  useEffect(() => {
    if (!tenant_id) {
      setWarehouses([]);
      setIsLoading(false);
      return;
    }
    if (loadWarehouses) {
      void fetchWarehouses();
    } else {
      setWarehouses([]);
      setError(null);
      setIsLoading(false);
    }
  }, [tenant_id, loadWarehouses, fetchWarehouses]);

  const createWarehouse = async (
    data: WarehouseFormData
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      if (data.is_default) {
        await clearOtherDefaults();
      }

      const { error: err, data: created } = await tenantedSupabase
        .from('warehouses')
        .insert([
          {
            tenant_id,
            created_by: user?.id ?? null,
            updated_by: user?.id ?? null,
            name: data.name.trim(),
            logo_url: data.logo_url?.trim() || null,
            warehouse_type: data.warehouse_type,
            status: data.status,
            is_default: data.is_default,
            address_line1: data.address_line1?.trim() || null,
            address_line2: data.address_line2?.trim() || null,
            city: data.city?.trim() || null,
            state: data.state?.trim() || null,
            postcode: data.postcode?.trim() || null,
            country: data.country?.trim() || null,
            contact_name: data.contact_name?.trim() || null,
            contact_email: data.contact_email?.trim() || null,
            contact_phone: data.contact_phone?.trim() || null,
            notes: data.notes?.trim() || null,
            metadata: data.metadata ?? {},
          },
        ])
        .select('id')
        .single();

      if (err) return { success: false, error: err.message };
      if (loadWarehouses) await fetchWarehouses();
      const row = created as { id?: string } | null | undefined;
      return { success: true, id: row?.id };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create' };
    }
  };

  const updateWarehouse = async (
    id: string,
    data: Partial<WarehouseFormData>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      if (data.is_default === true) {
        await clearOtherDefaults();
      }

      const patch: Record<string, unknown> = {
        updated_by: user?.id ?? null,
      };
      if (data.name !== undefined) patch.name = data.name.trim();
      if (data.logo_url !== undefined) patch.logo_url = data.logo_url?.trim() || null;
      if (data.warehouse_type !== undefined) patch.warehouse_type = data.warehouse_type;
      if (data.status !== undefined) patch.status = data.status;
      if (data.is_default !== undefined) patch.is_default = data.is_default;
      if (data.address_line1 !== undefined)
        patch.address_line1 = data.address_line1?.trim() || null;
      if (data.address_line2 !== undefined)
        patch.address_line2 = data.address_line2?.trim() || null;
      if (data.city !== undefined) patch.city = data.city?.trim() || null;
      if (data.state !== undefined) patch.state = data.state?.trim() || null;
      if (data.postcode !== undefined) patch.postcode = data.postcode?.trim() || null;
      if (data.country !== undefined) patch.country = data.country?.trim() || null;
      if (data.contact_name !== undefined) patch.contact_name = data.contact_name?.trim() || null;
      if (data.contact_email !== undefined)
        patch.contact_email = data.contact_email?.trim() || null;
      if (data.contact_phone !== undefined)
        patch.contact_phone = data.contact_phone?.trim() || null;
      if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;
      if (data.metadata !== undefined) patch.metadata = data.metadata;

      const { error: err } = await tenantedSupabase
        .from('warehouses')
        .update(patch as WarehouseRowUpdate)
        .eq('id', id);

      if (err) return { success: false, error: err.message };
      if (loadWarehouses) await fetchWarehouses();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update' };
    }
  };

  const archiveWarehouse = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err } = await tenantedSupabase
        .from('warehouses')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id ?? null,
        } as any)
        .eq('id', id);

      if (err) return { success: false, error: err.message };
      if (loadWarehouses) await fetchWarehouses();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to archive' };
    }
  };

  const restoreWarehouse = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err } = await tenantedSupabase
        .from('warehouses')
        .update({
          deleted_at: null,
          deleted_by: null,
        } as any)
        .eq('id', id);

      if (err) return { success: false, error: err.message };
      if (loadWarehouses) await fetchWarehouses();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to restore' };
    }
  };

  return {
    warehouses,
    isLoading,
    error,
    createWarehouse,
    updateWarehouse,
    archiveWarehouse,
    restoreWarehouse,
    refreshWarehouses: fetchWarehouses,
  };
}
