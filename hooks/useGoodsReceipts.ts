'use client';

import { useCallback, useEffect, useState } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import { useTenant } from '@/contexts/TenantContext';
import type { GoodsReceipt, GoodsReceiptLine } from '@/types/purchase';

const db = tenantedSupabase as any;

export interface UseGoodsReceiptsReturn {
  goodsReceipts: GoodsReceipt[];
  isLoading: boolean;
  error: string | null;
  refreshGoodsReceipts: () => Promise<void>;
  createDraftForPo: (
    purchaseOrderId: string
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  fetchLines: (goodsReceiptId: string) => Promise<GoodsReceiptLine[]>;
  upsertLines: (
    goodsReceiptId: string,
    rows: { purchase_order_line_id: string; quantity_received: number }[]
  ) => Promise<{ success: boolean; error?: string }>;
  postReceipt: (goodsReceiptId: string) => Promise<{ success: boolean; error?: string }>;
  deleteDraft: (goodsReceiptId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useGoodsReceipts(purchaseOrderId?: string | null): UseGoodsReceiptsReturn {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshGoodsReceipts = useCallback(async () => {
    if (!tenant_id) {
      setGoodsReceipts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = db
        .from('goods_receipts')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('created_at', { ascending: false });

      if (purchaseOrderId) {
        query = query.eq('purchase_order_id', purchaseOrderId);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setGoodsReceipts((data || []) as GoodsReceipt[]);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to load goods receipts');
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id, purchaseOrderId]);

  useEffect(() => {
    void refreshGoodsReceipts();
  }, [refreshGoodsReceipts]);

  const createDraftForPo = async (
    purchaseOrderIdArg: string
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    try {
      const { data: po, error: poErr } = await db
        .from('purchase_orders')
        .select('id,warehouse_id,status')
        .eq('id', purchaseOrderIdArg)
        .eq('tenant_id', tenant_id)
        .single();
      if (poErr) throw poErr;
      if (!['sent', 'partially_received'].includes(po.status)) {
        return {
          success: false,
          error: 'Purchase order must be sent or partially received to create a goods receipt',
        };
      }

      const { data: gr, error: grErr } = await db
        .from('goods_receipts')
        .insert([
          {
            tenant_id,
            purchase_order_id: purchaseOrderIdArg,
            warehouse_id: po.warehouse_id,
            status: 'draft',
            created_by: user?.id ?? null,
            updated_by: user?.id ?? null,
          },
        ])
        .select('id')
        .single();
      if (grErr) throw grErr;

      await refreshGoodsReceipts();
      return { success: true, id: gr.id as string };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to create receipt' };
    }
  };

  const fetchLines = useCallback(
    async (goodsReceiptId: string): Promise<GoodsReceiptLine[]> => {
      if (!tenant_id) return [];
      const { data, error: err } = await db
        .from('goods_receipt_lines')
        .select('*')
        .eq('goods_receipt_id', goodsReceiptId)
        .eq('tenant_id', tenant_id);
      if (err) {
        console.error(err);
        return [];
      }
      return (data || []) as GoodsReceiptLine[];
    },
    [tenant_id]
  );

  const upsertLines = async (
    goodsReceiptId: string,
    rows: { purchase_order_line_id: string; quantity_received: number }[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    try {
      const { error: delErr } = await db
        .from('goods_receipt_lines')
        .delete()
        .eq('goods_receipt_id', goodsReceiptId)
        .eq('tenant_id', tenant_id);
      if (delErr) throw delErr;

      if (!rows.length) return { success: true };

      const inserts = rows
        .filter((r) => r.quantity_received > 0)
        .map((r) => ({
          tenant_id,
          goods_receipt_id: goodsReceiptId,
          purchase_order_line_id: r.purchase_order_line_id,
          quantity_received: r.quantity_received,
        }));

      if (inserts.length) {
        const { error: insErr } = await db.from('goods_receipt_lines').insert(inserts);
        if (insErr) throw insErr;
      }

      await refreshGoodsReceipts();
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to save lines' };
    }
  };

  const postReceipt = async (
    goodsReceiptId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    try {
      const { error: err } = await db
        .from('goods_receipts')
        .update({ status: 'posted', updated_by: user?.id ?? null })
        .eq('id', goodsReceiptId)
        .eq('tenant_id', tenant_id)
        .eq('status', 'draft');
      if (err) throw err;
      await refreshGoodsReceipts();
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to post receipt' };
    }
  };

  const deleteDraft = async (
    goodsReceiptId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    try {
      const { error: err } = await db
        .from('goods_receipts')
        .delete()
        .eq('id', goodsReceiptId)
        .eq('tenant_id', tenant_id)
        .eq('status', 'draft');
      if (err) throw err;
      await refreshGoodsReceipts();
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to delete' };
    }
  };

  return {
    goodsReceipts,
    isLoading,
    error,
    refreshGoodsReceipts,
    createDraftForPo,
    fetchLines,
    upsertLines,
    postReceipt,
    deleteDraft,
  };
}
