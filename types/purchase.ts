export type PurchaseOrderStatus =
  | 'draft'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled';

export type GoodsReceiptStatus = 'draft' | 'posted';

export type SupplierInvoiceStatus = 'draft' | 'matched' | 'exception' | 'closed';

export type InvoiceLineMatchStatus =
  | 'pending'
  | 'ok'
  | 'price_variance'
  | 'qty_variance'
  | 'unlinked';

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  supplier_id: string;
  warehouse_id: string;
  po_number: string;
  status: PurchaseOrderStatus;
  currency: string;
  order_date: string;
  expected_date: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PurchaseOrderLine {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  line_no: number;
  product_id: string;
  description: string | null;
  uom: string | null;
  quantity_ordered: number;
  /** List / gross unit price before line discount_pct / discount_amount. */
  unit_price: number;
  discount_pct?: number | null;
  discount_amount?: number | null;
  /** Estimated line tax % (informational). */
  tax_rate_pct?: number | null;
  /** DB-generated: qty × unit_price × (1 − discount_pct/100) − discount_amount */
  line_net_extended?: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PurchaseOrderLineInput {
  line_no: number;
  product_id: string;
  description?: string | null;
  uom?: string | null;
  quantity_ordered: number;
  unit_price: number;
  discount_pct?: number;
  discount_amount?: number;
  tax_rate_pct?: number;
}

export interface PurchaseOrderCreateInput {
  supplier_id: string;
  warehouse_id: string;
  currency?: string;
  order_date?: string;
  expected_date?: string | null;
  notes?: string | null;
  status?: PurchaseOrderStatus;
  lines: PurchaseOrderLineInput[];
}

export interface GoodsReceipt {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  warehouse_id: string;
  gr_number: string;
  received_at: string;
  status: GoodsReceiptStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface GoodsReceiptLine {
  id: string;
  tenant_id: string;
  goods_receipt_id: string;
  purchase_order_line_id: string;
  quantity_received: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SupplierInvoice {
  id: string;
  tenant_id: string;
  supplier_id: string;
  purchase_order_id: string | null;
  invoice_number: string;
  invoice_date: string;
  currency: string;
  status: SupplierInvoiceStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface SupplierInvoiceLine {
  id: string;
  tenant_id: string;
  supplier_invoice_id: string;
  line_no: number;
  purchase_order_line_id: string | null;
  product_id: string;
  description: string | null;
  quantity_invoiced: number;
  unit_price: number;
  tax_amount: number;
  line_total: number | null;
  match_status: InvoiceLineMatchStatus;
  match_computed_at: string | null;
  qty_ordered_snapshot: number | null;
  qty_received_snapshot: number | null;
  po_unit_price_snapshot: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SupplierInvoiceLineInput {
  line_no: number;
  purchase_order_line_id?: string | null;
  product_id: string;
  description?: string | null;
  quantity_invoiced: number;
  unit_price: number;
  tax_amount?: number;
}

export interface SupplierInvoiceCreateInput {
  supplier_id: string;
  purchase_order_id?: string | null;
  invoice_number: string;
  invoice_date?: string;
  currency?: string;
  notes?: string | null;
  status?: SupplierInvoiceStatus;
  lines: SupplierInvoiceLineInput[];
}

export interface PurchaseOrderFilters {
  status?: PurchaseOrderStatus;
  searchQuery?: string;
}
