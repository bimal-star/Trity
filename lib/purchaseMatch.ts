import type { InvoiceLineMatchStatus, PurchaseOrderLine } from '@/types/purchase';
import { poLineNetUnitFromRow } from '@/lib/purchaseLinePricing';

const EPS = 0.0001;

export interface MatchLineInput {
  lineId: string;
  purchase_order_line_id: string | null;
  product_id: string;
  quantity_invoiced: number;
  unit_price: number;
}

export interface MatchLineResult {
  lineId: string;
  match_status: InvoiceLineMatchStatus;
  qty_ordered_snapshot: number | null;
  qty_received_snapshot: number | null;
  po_unit_price_snapshot: number | null;
}

function qtyReceivedForPol(
  polId: string,
  receivedByPol: Map<string, number>
): number {
  return receivedByPol.get(polId) ?? 0;
}

/**
 * 3-way style match: compare invoice line to PO line (price + ordered) and cumulative GR qty.
 */
export function computeInvoiceLineMatches(
  lines: MatchLineInput[],
  poLinesById: Map<string, PurchaseOrderLine>,
  qtyReceivedByPolId: Map<string, number>
): MatchLineResult[] {
  return lines.map((ln) => {
    if (!ln.purchase_order_line_id) {
      return {
        lineId: ln.lineId,
        match_status: 'unlinked' as const,
        qty_ordered_snapshot: null,
        qty_received_snapshot: null,
        po_unit_price_snapshot: null,
      };
    }

    const pol = poLinesById.get(ln.purchase_order_line_id);
    if (!pol) {
      return {
        lineId: ln.lineId,
        match_status: 'unlinked' as const,
        qty_ordered_snapshot: null,
        qty_received_snapshot: null,
        po_unit_price_snapshot: null,
      };
    }

    const qtyRecv = qtyReceivedForPol(pol.id, qtyReceivedByPolId);
    const poNetUnit = poLineNetUnitFromRow(pol);
    const priceOk = Math.abs(ln.unit_price - poNetUnit) < EPS;
    const qtyOk = Math.abs(ln.quantity_invoiced - qtyRecv) < EPS;

    let match_status: InvoiceLineMatchStatus = 'ok';
    if (!priceOk) {
      match_status = 'price_variance';
    } else if (!qtyOk) {
      match_status = 'qty_variance';
    }

    return {
      lineId: ln.lineId,
      match_status,
      qty_ordered_snapshot: Number(pol.quantity_ordered),
      qty_received_snapshot: qtyRecv,
      po_unit_price_snapshot: poNetUnit,
    };
  });
}
