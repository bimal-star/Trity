import { tenantedSupabase } from '@/lib/supabaseSchemaClient';

const db = tenantedSupabase as any;

/** Posted goods receipt quantities summed by purchase_order_line_id. */
export async function fetchQtyReceivedByPoLineIds(
  tenantId: string,
  poLineIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!poLineIds.length) return map;

  const { data, error } = await db
    .from('goods_receipt_lines')
    .select('purchase_order_line_id, quantity_received, goods_receipt_id')
    .eq('tenant_id', tenantId)
    .in('purchase_order_line_id', poLineIds);

  if (error || !data?.length) return map;

  const grIds = [...new Set(data.map((r: { goods_receipt_id: string }) => r.goods_receipt_id))];
  const { data: grs } = await db
    .from('goods_receipts')
    .select('id,status')
    .in('id', grIds)
    .eq('tenant_id', tenantId);

  const posted = new Set(
    (grs || []).filter((g: { status: string }) => g.status === 'posted').map((g: { id: string }) => g.id)
  );

  for (const row of data as {
    purchase_order_line_id: string;
    quantity_received: number;
    goods_receipt_id: string;
  }[]) {
    if (!posted.has(row.goods_receipt_id)) continue;
    const prev = map.get(row.purchase_order_line_id) ?? 0;
    map.set(row.purchase_order_line_id, prev + Number(row.quantity_received));
  }
  return map;
}
