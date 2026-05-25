/**
 * BOM read models (vw_bom_costing, vw_bom_line_costing, vw_product_last_purchase_price).
 * Regenerate types/database.ts after applying migration 20260525120000.
 */

export interface BomLineCostingRow {
  bom_line_id: string;
  bom_header_id: string;
  tenant_id: string;
  sequence: number;
  component_product_id: string;
  component_sku: string | null;
  component_name: string | null;
  quantity: number;
  unit_id: string | null;
  uom_symbol: string | null;
  base_unit_symbol: string | null;
  line_waste_percentage: number | null;
  product_waste_percentage: number | null;
  effective_quantity: number;
  standard_unit_cost: number | null;
  avg_landing_unit_cost: number | null;
  last_buy_unit_price: number | null;
  last_buy_uom: string | null;
  last_buy_currency: string | null;
  line_total_cost_standard: number;
  line_total_cost_landing: number;
  line_total_cost_last_buy: number;
}

export interface BomCostingHeaderRow {
  bom_id: string;
  tenant_id: string;
  product_id: string;
  product_name: string | null;
  product_sku: string | null;
  bom_code: string | null;
  version: string;
  output_quantity: number;
  output_unit_id: string | null;
  output_unit_symbol: string | null;
  is_active: boolean | null;
  component_count: number;
  total_component_cost: number;
  total_component_cost_landing: number;
  total_component_cost_last_buy: number;
  cost_per_unit: number | null;
  cost_per_unit_landing: number | null;
  cost_per_unit_last_buy: number | null;
}

export interface ProductLastPurchasePriceRow {
  tenant_id: string;
  product_id: string;
  purchased_at: string;
  purchase_order_date: string | null;
  purchase_order_id: string;
  po_number: string;
  purchase_order_status: string;
  last_buy_unit_price: number;
  last_buy_uom: string | null;
  currency: string;
}
