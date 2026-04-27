export interface SupplierProductPrice {
  id: string;
  tenant_id: string;
  supplier_id: string;
  product_id: string;
  unit_price: number;
  min_order_qty: number;
  currency: string | null;
  supplier_sku: string | null;
  uom: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface SupplierProductPriceUpsertInput {
  supplier_id: string;
  product_id: string;
  unit_price: number;
  min_order_qty: number;
  currency?: string | null;
  supplier_sku?: string | null;
  uom?: string | null;
  notes?: string | null;
}
