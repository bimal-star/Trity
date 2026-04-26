'use client';

import { useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTenant } from '@/contexts/TenantContext';
import type { Database } from '@/types/database';

export type ProductGroupRow = Database['public']['Tables']['product_groups']['Row'];
type ProductGroupInsert = Database['public']['Tables']['product_groups']['Insert'];
type ProductGroupUpdate = Database['public']['Tables']['product_groups']['Update'];

export function useProductGroups() {
  const { effectiveTenantId: tenantId, user } = useTenant();

  const fetchGroups = useCallback(async (): Promise<ProductGroupRow[]> => {
    if (!tenantId) return [];
    const { data, error } = await supabase
      .from('product_groups')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('name');
    if (error) throw error;
    return (data as ProductGroupRow[]) ?? [];
  }, [tenantId]);

  const createGroup = useCallback(
    async (input: Omit<ProductGroupInsert, 'tenant_id'>): Promise<ProductGroupRow> => {
      if (!tenantId) throw new Error('No tenant');
      const row: ProductGroupInsert = {
        ...input,
        tenant_id: tenantId,
        created_by: user?.id ?? input.created_by ?? null,
      };
      const { data, error } = await supabase
        .from('product_groups')
        .insert(row)
        .select('*')
        .single();
      if (error) throw error;
      return data as ProductGroupRow;
    },
    [tenantId, user?.id]
  );

  const updateGroup = useCallback(
    async (id: string, patch: ProductGroupUpdate): Promise<void> => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase
        .from('product_groups')
        .update(patch)
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    [tenantId]
  );

  const archiveGroup = useCallback(
    async (id: string): Promise<void> => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase
        .from('product_groups')
        .update({ is_deleted: true, is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    [tenantId]
  );

  const addProductToGroup = useCallback(
    async (productId: string, groupId: string): Promise<void> => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase
        .from('products')
        .update({ product_group_id: groupId })
        .eq('id', productId)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    [tenantId]
  );

  const removeFromGroup = useCallback(
    async (productId: string): Promise<void> => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase
        .from('products')
        .update({ product_group_id: null })
        .eq('id', productId)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    [tenantId]
  );

  const fetchGroupProducts = useCallback(
    async (groupId: string) => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('vw_products_full')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('product_group_id', groupId)
        .eq('is_deleted', false)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    [tenantId]
  );

  return {
    fetchGroups,
    createGroup,
    updateGroup,
    archiveGroup,
    addProductToGroup,
    removeFromGroup,
    fetchGroupProducts,
  };
}
