import { tenantedSupabase } from '@/lib/supabaseSchemaClient';

const db = tenantedSupabase as any;

export type PurchaseReportPreset =
  | 'open_pos'
  | 'posted_receipts'
  | 'invoice_price_exceptions'
  | 'invoice_qty_exceptions';

export async function runPurchaseReport(
  tenantId: string,
  preset: PurchaseReportPreset,
  opts: { fromDate?: string; toDate?: string; supplierId?: string }
): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const from = opts.fromDate ?? '1970-01-01';
  const to = opts.toDate ?? '2099-12-31';

  if (preset === 'open_pos') {
    let q = db
      .from('purchase_orders')
      .select('po_number,status,order_date,supplier_id,warehouse_id,currency')
      .eq('tenant_id', tenantId)
      .in('status', ['draft', 'sent', 'partially_received'])
      .gte('order_date', from)
      .lte('order_date', to)
      .order('order_date', { ascending: false });
    if (opts.supplierId) q = q.eq('supplier_id', opts.supplierId);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data || []) as Record<string, unknown>[];
    return {
      columns: ['po_number', 'status', 'order_date', 'supplier_id', 'warehouse_id', 'currency'],
      rows,
    };
  }

  if (preset === 'posted_receipts') {
    let q = db
      .from('goods_receipts')
      .select('gr_number,status,received_at,purchase_order_id,warehouse_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'posted')
      .gte('received_at', `${from}T00:00:00`)
      .lte('received_at', `${to}T23:59:59`)
      .order('received_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data || []) as Record<string, unknown>[];
    return {
      columns: ['gr_number', 'status', 'received_at', 'purchase_order_id', 'warehouse_id'],
      rows,
    };
  }

  if (preset === 'invoice_price_exceptions' || preset === 'invoice_qty_exceptions') {
    const match = preset === 'invoice_price_exceptions' ? 'price_variance' : 'qty_variance';
    let q = db
      .from('supplier_invoice_lines')
      .select(
        'line_no,quantity_invoiced,unit_price,match_status,qty_ordered_snapshot,qty_received_snapshot,po_unit_price_snapshot,supplier_invoice_id'
      )
      .eq('tenant_id', tenantId)
      .eq('match_status', match);
    const { data: lines, error: lErr } = await q;
    if (lErr) throw lErr;
    const invIds = [
      ...new Set((lines || []).map((l: { supplier_invoice_id: string }) => l.supplier_invoice_id)),
    ];
    let invMap = new Map<
      string,
      { invoice_number: string; invoice_date: string; supplier_id: string }
    >();
    if (invIds.length) {
      const { data: invs, error: iErr } = await db
        .from('supplier_invoices')
        .select('id,invoice_number,invoice_date,supplier_id')
        .eq('tenant_id', tenantId)
        .in('id', invIds);
      if (iErr) throw iErr;
      for (const inv of invs || []) {
        invMap.set(inv.id, {
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          supplier_id: inv.supplier_id,
        });
      }
    }
    const rows = (lines || []).map((l: Record<string, unknown>) => {
      const meta = invMap.get(l.supplier_invoice_id as string);
      return {
        ...l,
        invoice_number: meta?.invoice_number,
        invoice_date: meta?.invoice_date,
        supplier_id: meta?.supplier_id,
      };
    });
    if (opts.supplierId) {
      const filtered = rows.filter(
        (r: Record<string, unknown>) => r.supplier_id === opts.supplierId
      );
      return {
        columns: [
          'invoice_number',
          'invoice_date',
          'supplier_id',
          'line_no',
          'quantity_invoiced',
          'unit_price',
          'match_status',
          'qty_ordered_snapshot',
          'qty_received_snapshot',
          'po_unit_price_snapshot',
        ],
        rows: filtered,
      };
    }
    return {
      columns: [
        'invoice_number',
        'invoice_date',
        'supplier_id',
        'line_no',
        'quantity_invoiced',
        'unit_price',
        'match_status',
        'qty_ordered_snapshot',
        'qty_received_snapshot',
        'po_unit_price_snapshot',
      ],
      rows,
    };
  }

  return { columns: [], rows: [] };
}
