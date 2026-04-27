'use client';

import { useCallback, useEffect, useState } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import { computeInvoiceLineMatches } from '@/lib/purchaseMatch';
import { useTenant } from '@/contexts/TenantContext';
import type {
  PurchaseOrderLine,
  SupplierInvoice,
  SupplierInvoiceCreateInput,
  SupplierInvoiceLine,
  SupplierInvoiceStatus,
} from '@/types/purchase';
import { fetchQtyReceivedByPoLineIds } from '@/lib/purchaseReceivedQty';

const db = tenantedSupabase as any;

export interface UseSupplierInvoicesReturn {
  invoices: SupplierInvoice[];
  isLoading: boolean;
  error: string | null;
  refreshInvoices: () => Promise<void>;
  createInvoice: (
    input: SupplierInvoiceCreateInput
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  updateInvoiceHeader: (
    id: string,
    patch: Partial<{
      status: SupplierInvoiceStatus;
      notes: string | null;
      purchase_order_id: string | null;
      invoice_date: string;
      currency: string;
    }>
  ) => Promise<{ success: boolean; error?: string }>;
  fetchLines: (invoiceId: string) => Promise<SupplierInvoiceLine[]>;
  replaceLines: (
    invoiceId: string,
    lines: SupplierInvoiceCreateInput['lines']
  ) => Promise<{ success: boolean; error?: string }>;
  runMatch: (
    invoiceId: string
  ) => Promise<{ success: boolean; error?: string; invoiceStatus?: SupplierInvoiceStatus }>;
}

export interface UseSupplierInvoicesOptions {
  loadInvoices?: boolean;
}

export function useSupplierInvoices(
  options?: UseSupplierInvoicesOptions
): UseSupplierInvoicesReturn {
  const loadList = options?.loadInvoices !== false;
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshInvoices = useCallback(async () => {
    if (!tenant_id) {
      setInvoices([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const { data, error: err } = await db
        .from('supplier_invoices')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('invoice_date', { ascending: false });
      if (err) throw err;
      setInvoices((data || []) as SupplierInvoice[]);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id]);

  useEffect(() => {
    if (!loadList) {
      setInvoices((prev) => (prev.length === 0 ? prev : []));
      setIsLoading(false);
      setError(null);
      return;
    }
    void refreshInvoices();
  }, [loadList, refreshInvoices]);

  const createInvoice = async (
    input: SupplierInvoiceCreateInput
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    if (!input.lines?.length) return { success: false, error: 'At least one line is required' };

    try {
      const { data: header, error: hErr } = await db
        .from('supplier_invoices')
        .insert([
          {
            tenant_id,
            supplier_id: input.supplier_id,
            purchase_order_id: input.purchase_order_id ?? null,
            invoice_number: input.invoice_number.trim(),
            invoice_date: input.invoice_date ?? new Date().toISOString().slice(0, 10),
            currency: input.currency ?? 'GBP',
            status: input.status ?? 'draft',
            notes: input.notes ?? null,
            created_by: user?.id ?? null,
            updated_by: user?.id ?? null,
          },
        ])
        .select('id')
        .single();
      if (hErr) throw hErr;
      const invId = header.id as string;

      const lineRows = input.lines.map((l) => {
        const subtotal = l.quantity_invoiced * l.unit_price;
        return {
          tenant_id,
          supplier_invoice_id: invId,
          line_no: l.line_no,
          purchase_order_line_id: l.purchase_order_line_id ?? null,
          product_id: l.product_id,
          description: l.description ?? null,
          quantity_invoiced: l.quantity_invoiced,
          unit_price: l.unit_price,
          tax_amount: l.tax_amount ?? 0,
          line_total: subtotal + (l.tax_amount ?? 0),
          match_status: 'pending',
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        };
      });

      const { error: lErr } = await db.from('supplier_invoice_lines').insert(lineRows);
      if (lErr) throw lErr;

      await refreshInvoices();
      return { success: true, id: invId };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to create invoice' };
    }
  };

  const updateInvoiceHeader = async (
    id: string,
    patch: Partial<{
      status: SupplierInvoiceStatus;
      notes: string | null;
      purchase_order_id: string | null;
      invoice_date: string;
      currency: string;
    }>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    try {
      const { error: err } = await db
        .from('supplier_invoices')
        .update({ ...patch, updated_by: user?.id ?? null })
        .eq('id', id)
        .eq('tenant_id', tenant_id);
      if (err) throw err;
      await refreshInvoices();
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Update failed' };
    }
  };

  const fetchLines = useCallback(
    async (invoiceId: string): Promise<SupplierInvoiceLine[]> => {
      if (!tenant_id) return [];
      const { data, error: err } = await db
        .from('supplier_invoice_lines')
        .select('*')
        .eq('supplier_invoice_id', invoiceId)
        .eq('tenant_id', tenant_id)
        .order('line_no', { ascending: true });
      if (err) {
        console.error(err);
        return [];
      }
      return (data || []) as SupplierInvoiceLine[];
    },
    [tenant_id]
  );

  const replaceLines = async (
    invoiceId: string,
    lines: SupplierInvoiceCreateInput['lines']
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    try {
      const { error: delErr } = await db
        .from('supplier_invoice_lines')
        .delete()
        .eq('supplier_invoice_id', invoiceId)
        .eq('tenant_id', tenant_id);
      if (delErr) throw delErr;

      if (!lines.length) return { success: false, error: 'At least one line is required' };

      const lineRows = lines.map((l) => {
        const subtotal = l.quantity_invoiced * l.unit_price;
        return {
          tenant_id,
          supplier_invoice_id: invoiceId,
          line_no: l.line_no,
          purchase_order_line_id: l.purchase_order_line_id ?? null,
          product_id: l.product_id,
          description: l.description ?? null,
          quantity_invoiced: l.quantity_invoiced,
          unit_price: l.unit_price,
          tax_amount: l.tax_amount ?? 0,
          line_total: subtotal + (l.tax_amount ?? 0),
          match_status: 'pending',
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        };
      });

      const { error: insErr } = await db.from('supplier_invoice_lines').insert(lineRows);
      if (insErr) throw insErr;

      await refreshInvoices();
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to update lines' };
    }
  };

  const runMatch = async (
    invoiceId: string
  ): Promise<{ success: boolean; error?: string; invoiceStatus?: SupplierInvoiceStatus }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };
    try {
      const lines = await fetchLines(invoiceId);
      const polIds = lines.map((l) => l.purchase_order_line_id).filter(Boolean) as string[];

      let poLineMap = new Map<string, PurchaseOrderLine>();
      if (polIds.length) {
        const { data: polRows, error: polErr } = await db
          .from('purchase_order_lines')
          .select('*')
          .eq('tenant_id', tenant_id)
          .in('id', polIds);
        if (polErr) throw polErr;
        for (const row of (polRows || []) as PurchaseOrderLine[]) {
          poLineMap.set(row.id, row);
        }
      }

      const qtyReceived = await fetchQtyReceivedByPoLineIds(tenant_id, polIds);

      const results = computeInvoiceLineMatches(
        lines.map((l) => ({
          lineId: l.id,
          purchase_order_line_id: l.purchase_order_line_id,
          product_id: l.product_id,
          quantity_invoiced: Number(l.quantity_invoiced),
          unit_price: Number(l.unit_price),
        })),
        poLineMap,
        qtyReceived
      );

      if (results.length === 0) {
        await db
          .from('supplier_invoices')
          .update({ status: 'draft', updated_by: user?.id ?? null })
          .eq('id', invoiceId)
          .eq('tenant_id', tenant_id);
        await refreshInvoices();
        return { success: true, invoiceStatus: 'draft' as SupplierInvoiceStatus };
      }

      const computedAt = new Date().toISOString();
      for (const r of results) {
        const { error: uErr } = await db
          .from('supplier_invoice_lines')
          .update({
            match_status: r.match_status,
            match_computed_at: computedAt,
            qty_ordered_snapshot: r.qty_ordered_snapshot,
            qty_received_snapshot: r.qty_received_snapshot,
            po_unit_price_snapshot: r.po_unit_price_snapshot,
            updated_by: user?.id ?? null,
          })
          .eq('id', r.lineId)
          .eq('tenant_id', tenant_id);
        if (uErr) throw uErr;
      }

      const statuses = results.map((r) => r.match_status);
      const allOk = statuses.length > 0 && statuses.every((s) => s === 'ok');
      const allUnlinked = statuses.length > 0 && statuses.every((s) => s === 'unlinked');
      const anyVariance = statuses.some((s) => s === 'price_variance' || s === 'qty_variance');

      let nextStatus: SupplierInvoiceStatus = 'draft';
      if (allUnlinked) nextStatus = 'draft';
      else if (allOk) nextStatus = 'matched';
      else if (anyVariance) nextStatus = 'exception';
      else nextStatus = 'exception';

      await db
        .from('supplier_invoices')
        .update({
          status: nextStatus,
          updated_by: user?.id ?? null,
        })
        .eq('id', invoiceId)
        .eq('tenant_id', tenant_id);

      await refreshInvoices();
      return { success: true, invoiceStatus: nextStatus };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Match failed' };
    }
  };

  return {
    invoices,
    isLoading,
    error,
    refreshInvoices,
    createInvoice,
    updateInvoiceHeader,
    fetchLines,
    replaceLines,
    runMatch,
  };
}
