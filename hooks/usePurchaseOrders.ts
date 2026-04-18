'use client';

import { useCallback, useEffect, useState } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import { useTenant } from '@/contexts/TenantContext';
import type {
  PurchaseOrder,
  PurchaseOrderCreateInput,
  PurchaseOrderFilters,
  PurchaseOrderLine,
  PurchaseOrderStatus,
} from '@/types/purchase';

const db = tenantedSupabase as any;

export interface UsePurchaseOrdersReturn {
  purchaseOrders: PurchaseOrder[];
  isLoading: boolean;
  error: string | null;
  refreshPurchaseOrders: () => Promise<void>;
  createPurchaseOrder: (
    input: PurchaseOrderCreateInput
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  updatePurchaseOrder: (
    id: string,
    patch: Partial<{
      status: PurchaseOrderStatus;
      notes: string | null;
      expected_date: string | null;
      currency: string;
    }>
  ) => Promise<{ success: boolean; error?: string }>;
  fetchLines: (purchaseOrderId: string) => Promise<PurchaseOrderLine[]>;
  replaceLines: (
    purchaseOrderId: string,
    lines: PurchaseOrderCreateInput['lines']
  ) => Promise<{ success: boolean; error?: string }>;
}

function searchPattern(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const safe = t.replace(/%/g, '').replace(/_/g, '');
  if (!safe) return null;
  return `%${safe}%`;
}

export interface UsePurchaseOrdersOptions {
  loadPurchaseOrders?: boolean;
}

export function usePurchaseOrders(
  filters?: PurchaseOrderFilters,
  options?: UsePurchaseOrdersOptions
): UsePurchaseOrdersReturn {
  const loadList = options?.loadPurchaseOrders !== false;
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshPurchaseOrders = useCallback(async () => {
    if (!tenant_id) {
      setPurchaseOrders([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = db
        .from('purchase_orders')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const pattern = searchPattern(filters?.searchQuery);
      if (pattern) {
        query = query.ilike('po_number', pattern);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setPurchaseOrders((data || []) as PurchaseOrder[]);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to load purchase orders');
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id, filters?.status, filters?.searchQuery]);

  useEffect(() => {
    if (!loadList) {
      setPurchaseOrders((prev) => (prev.length === 0 ? prev : []));
      setIsLoading(false);
      setError(null);
      return;
    }
    void refreshPurchaseOrders();
  }, [loadList, refreshPurchaseOrders]);

  const createPurchaseOrder = async (
    input: PurchaseOrderCreateInput
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    if (!input.lines?.length) return { success: false, error: 'At least one line is required' };

    try {
      const { data: header, error: hErr } = await db
        .from('purchase_orders')
        .insert([
          {
            tenant_id,
            supplier_id: input.supplier_id,
            warehouse_id: input.warehouse_id,
            currency: input.currency ?? 'GBP',
            order_date: input.order_date ?? new Date().toISOString().slice(0, 10),
            expected_date: input.expected_date ?? null,
            notes: input.notes ?? null,
            status: input.status ?? 'draft',
            created_by: user?.id ?? null,
            updated_by: user?.id ?? null,
          },
        ])
        .select('id')
        .single();

      if (hErr) throw hErr;
      const poId = header.id as string;

      const lineRows = input.lines.map((l) => ({
        tenant_id,
        purchase_order_id: poId,
        line_no: l.line_no,
        product_id: l.product_id,
        description: l.description ?? null,
        uom: l.uom ?? null,
        quantity_ordered: l.quantity_ordered,
        unit_price: l.unit_price,
        discount_pct: l.discount_pct ?? 0,
        discount_amount: l.discount_amount ?? 0,
        tax_rate_pct: l.tax_rate_pct ?? 0,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      }));

      const { error: lErr } = await db.from('purchase_order_lines').insert(lineRows);
      if (lErr) throw lErr;

      await refreshPurchaseOrders();
      return { success: true, id: poId };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create purchase order';
      return { success: false, error: msg };
    }
  };

  const updatePurchaseOrder = async (
    id: string,
    patch: Partial<{
      status: PurchaseOrderStatus;
      notes: string | null;
      expected_date: string | null;
      currency: string;
    }>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    try {
      if (patch.status) {
        if (patch.status !== 'draft') {
          const { data: poLines, error: linesErr } = await db
            .from('purchase_order_lines')
            .select('id')
            .eq('purchase_order_id', id)
            .eq('tenant_id', tenant_id)
            .limit(1);
          if (linesErr) throw linesErr;
          if (!Array.isArray(poLines) || poLines.length === 0) {
            return {
              success: false,
              error: 'Status cannot move past draft until at least one line is added.',
            };
          }
        }

        const { data: receipts, error: grErr } = await db
          .from('goods_receipts')
          .select('id')
          .eq('purchase_order_id', id)
          .eq('tenant_id', tenant_id)
          .limit(1);
        if (grErr) throw grErr;
        if (Array.isArray(receipts) && receipts.length > 0) {
          return {
            success: false,
            error:
              'Status cannot be changed because a goods receipt already exists for this purchase order.',
          };
        }
      }

      const { error: err } = await db
        .from('purchase_orders')
        .update({ ...patch, updated_by: user?.id ?? null })
        .eq('id', id)
        .eq('tenant_id', tenant_id);
      if (err) throw err;
      await refreshPurchaseOrders();
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Update failed' };
    }
  };

  const fetchLines = useCallback(
    async (purchaseOrderId: string): Promise<PurchaseOrderLine[]> => {
      if (!tenant_id) return [];
      const { data, error: err } = await db
        .from('purchase_order_lines')
        .select('*')
        .eq('purchase_order_id', purchaseOrderId)
        .eq('tenant_id', tenant_id)
        .order('line_no', { ascending: true });
      if (err) {
        console.error(err);
        return [];
      }
      return (data || []) as PurchaseOrderLine[];
    },
    [tenant_id]
  );

  const replaceLines = async (
    purchaseOrderId: string,
    lines: PurchaseOrderCreateInput['lines']
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    try {
      const { data: po, error: poErr } = await db
        .from('purchase_orders')
        .select('id,status')
        .eq('id', purchaseOrderId)
        .eq('tenant_id', tenant_id)
        .single();
      if (poErr) throw poErr;
      if (po.status !== 'draft') {
        return { success: false, error: 'Only draft purchase orders can be edited' };
      }

      const { error: delErr } = await db
        .from('purchase_order_lines')
        .delete()
        .eq('purchase_order_id', purchaseOrderId)
        .eq('tenant_id', tenant_id);
      if (delErr) throw delErr;

      if (!lines.length) return { success: false, error: 'At least one line is required' };

      const lineRows = lines.map((l) => ({
        tenant_id,
        purchase_order_id: purchaseOrderId,
        line_no: l.line_no,
        product_id: l.product_id,
        description: l.description ?? null,
        uom: l.uom ?? null,
        quantity_ordered: l.quantity_ordered,
        unit_price: l.unit_price,
        discount_pct: l.discount_pct ?? 0,
        discount_amount: l.discount_amount ?? 0,
        tax_rate_pct: l.tax_rate_pct ?? 0,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      }));

      const { error: insErr } = await db.from('purchase_order_lines').insert(lineRows);
      if (insErr) throw insErr;

      await refreshPurchaseOrders();
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to update lines' };
    }
  };

  return {
    purchaseOrders,
    isLoading,
    error,
    refreshPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    fetchLines,
    replaceLines,
  };
}
