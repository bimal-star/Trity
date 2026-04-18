// Packing Configuration Type
export interface PackingConfiguration {
  id?: string;
  product_id?: string;
  barcode?: string | null;
  description?: string | null;
  dimension_unit_id?: string | null;
  gtin?: string | null;
  height?: number | null;
  is_default?: boolean | null;
  length?: number | null;
  level?: string; // packing level (enum in DB)
  previous_level?: string | null;
  quantity?: number;
  weight?: number | null;
  weight_unit_id?: string | null;
  width?: number | null;
  created_at?: string;
}

// Product-related tables inferred from Supabase Snippet Public Schema Column Catalog.csv

export interface ProductBarcode {
  id: string;
  product_id: string;
  barcode: string;
  barcode_type: string; // USER-DEFINED enum (e.g. 'ean13')
  packing_level: string | null; // USER-DEFINED enum
  quantity: number | null;
  description: string | null;
  is_active: boolean | null;
  is_primary: boolean | null;
  created_at: string | null;
}

export interface ProductCategoryLink {
  id: string;
  product_id: string;
  category_id: string;
  created_at: string;
  created_by: string | null;
}

export interface CategorySummary {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  industry_type: string;
  code: string | null;
  icon: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface PriceList {
  id: string;
  name: string;
  description: string | null;
  currency: string | null;
  effective_from: string | null; // date
  effective_to: string | null; // date
  is_active: boolean | null;
  is_default: boolean | null;
  created_at: string | null;
  /** From business_core_schema_consolidation migration. */
  rounding_mode?: string | null;
  tax_inclusive?: boolean | null;
  tenant_id?: string;
  is_deleted?: boolean;
  updated_at?: string | null;
}

export interface PriceListItem {
  id: string;
  price_list_id: string;
  product_id: string;
  unit_price: number;
  min_quantity: number | null;
  max_quantity: number | null;
  created_at: string | null;
  price_list?: PriceList;
}

export interface ProductCostHistory {
  id: string;
  product_id: string;
  cost_price: number;
  cost_method: string | null;
  effective_from: string; // date
  notes: string | null;
  created_at: string | null;
  created_by: string | null;
}

export interface ProductMetric {
  id: string;
  product_id: string;
  metric_date: string; // date
  period_type: string;
  average_stock: number | null;
  opening_stock: number | null;
  closing_stock: number | null;
  days_of_stock: number | null;
  produced_quantity: number | null;
  production_cost: number | null;
  sales_count: number | null;
  sales_quantity: number | null;
  sales_revenue: number | null;
  stock_out_days: number | null;
  stock_value: number | null;
  turnover_rate: number | null;
  created_at: string | null;
}

export interface BomHeader {
  id: string;
  product_id: string;
  name: string | null;
  description: string | null;
  notes: string | null;
  version: string;
  output_quantity: number;
  output_unit_id: string | null;
  standard_cost: number | null;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BomLine {
  id: string;
  bom_header_id: string;
  component_product_id: string;
  quantity: number;
  unit_id: string | null;
  sequence: number;
  substitute_group: number | null;
  is_optional: boolean | null;
  waste_percentage: number | null;
  notes: string | null;
  created_at: string | null;
}

export interface DemandForecast {
  id: string;
  product_id: string;
  period_start: string; // date
  period_end: string; // date
  forecast_quantity: number;
  actual_quantity: number | null;
  confidence_level: number | null;
  forecast_method: string | null;
  notes: string | null;
  created_at: string | null;
  created_by: string | null;
}

export interface StockLevel {
  id: string;
  product_id: string;
  location_id: string | null;
  quantity: number;
  available_quantity: number | null;
  reserved_quantity: number | null;
  batch_number: string | null;
  lot_number: string | null;
  serial_number: string | null;
  expiry_date: string | null; // date
  last_counted_by: string | null;
  last_counted_date: string | null; // date
  updated_at: string | null;
}

export interface StockTransaction {
  id: string;
  product_id: string;
  quantity: number;
  transaction_type: string;
  transaction_date: string | null; // timestamp
  unit_id: string | null;
  from_location_id: string | null;
  to_location_id: string | null;
  batch_number: string | null;
  lot_number: string | null;
  serial_number?: string | null;
  cost_per_unit: number | null;
  total_cost: number | null;
  reference_id: string | null;
  reference_type: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string | null;
  created_by: string | null;
}

export interface ProductionPlan {
  id: string;
  product_id: string;
  bom_header_id: string | null;
  planned_quantity: number;
  actual_quantity: number | null;
  planned_start_date: string; // date
  planned_end_date: string; // date
  actual_start_date: string | null;
  actual_end_date: string | null;
  priority: number | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductActivityLog {
  id: string;
  product_id: string;
  action: string;
  changed_fields: string | null;
  old_values: string | null;
  new_values: any;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
/**
 * Product Type Definitions
 * 
 * Defines interfaces and types for the products management system
 * Based on the Supabase products table schema
 */

export type IndustryType = 'bakery' | 'ready_meals' | 'pizza' | 'construction' | 'manufacturing' | 'retail' | 'other';
export type ProductType =
  | 'raw_material'
  | 'semi_finished'
  | 'finished_good'
  | 'service'
  | 'assembly'
  | 'packaging';
export type StatusType = 'active' | 'inactive' | 'discontinued' | 'planned' | 'development';

export interface Product {
  id: string; // UUID
  user_id: string | null;
  sku: string;
  name: string;
  description: string | null;
  short_description: string | null;
  product_type: ProductType;
  industry_type: IndustryType;
  category_id: string | null;
  base_unit_id: string | null;
  status: StatusType;
  
  // Pricing
  cost_price: number | null;
  /** Weighted-average inventory unit cost; null until costing updates it. */
  weighted_avg_unit_cost?: number | null;
  sell_price: number | null;
  currency: string | null;
  
  // Physical attributes
  weight: number | null;
  weight_unit_id: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dimension_unit_id: string | null;
  volume: number | null;
  volume_unit_id: string | null;
  
  // Inventory
  /** When false, SKU is non-stocked (e.g. service); defaults true when omitted. */
  tracks_inventory?: boolean | null;
  min_stock_level: number | null;
  max_stock_level: number | null;
  reorder_point: number | null;
  reorder_quantity: number | null;
  /** Aggregated from stock levels when loaded via `vw_products_full`. */
  total_stock?: number | null;
  lead_time_days: number | null;
  
  // Quality & Safety
  shelf_life_days: number | null;
  storage_conditions: string | null;
  allergens: string[] | null;
  certifications: string[] | null;
  safety_rating: string | null;
  
  // Manufacturing
  default_supplier_id: string | null;
  manufacturer_part_number: string | null;
  batch_tracked: boolean | null;
  serial_tracked: boolean | null;
  lot_controlled: boolean | null;
  
  // Media & Documentation
  image_url: string | null;
  images: any | null;
  documents: any | null;
  specifications_url: string | null;
  
  // Custom attributes
  attributes: any | null;
  metadata: any | null;
  tags: string[] | null;
  categories: string[] | null;

  /** Optional product group (grouped / matrix catalogue modes). */
  product_group_id?: string | null;
  variant_attributes?: Record<string, unknown> | null;
  product_group_name?: string | null;
  product_group_attribute_dimensions?: unknown | null;
  
  // Audit
  is_active: boolean | null;
  /** Soft-delete flag when present in DB (non-deleted products are false or omitted). */
  is_deleted?: boolean | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface ProductFormData {
  // Basic Info
  sku: string;
  name: string;
  description?: string;
  short_description?: string;
  product_type?: ProductType;
  industry_type: IndustryType;
  status?: StatusType;
  categories?: string[];

  // Pricing
  cost_price?: number;
  sell_price?: number;

  // Inventory
  tracks_inventory?: boolean | null;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  total_stock?: number;

  // Physical Attributes
  weight?: number;
  weight_unit_id?: string;
  weight_unit_symbol?: string;
  length?: number;
  width?: number;
  height?: number;
  volume?: number;
  volume_unit_id?: string;
  volume_unit_symbol?: string;

  // Compliance & Quality
  shelf_life_days?: number;
  storage_conditions?: string;
  safety_rating?: string;
  lot_controlled?: boolean;
  serial_tracked?: boolean;

  // Manufacturer & Docs
  manufacturer_part_number?: string;
  specifications_url?: string;

  // Media
  image_url?: string | null;
  images?: any;

  // Metadata & Tags
  metadata?: any;
  tags?: string[];

  // Audit/Other
  is_active?: boolean;
  lead_time_days?: number;
  updated_at?: string;
  updated_by?: string;
  user_id?: string;

  product_group_id?: string | null;
  /** Attribute map for variants in a group (e.g. { size: "M", colour: "Red" }). */
  variant_attributes?: Record<string, unknown> | null;

  // Packing Configurations
  packing_configurations?: PackingConfiguration[];
}

export interface ProductFilters {
  industry_type?: IndustryType;
  product_type?: ProductType;
  status?: StatusType | 'all';
  minPrice?: number;
  maxPrice?: number;
  lowStock?: boolean;
  searchQuery?: string;
  categories?: string[];
  recordVisibility?: ProductRecordVisibility;
}

export type ProductSortField = 'name' | 'sku' | 'cost_price' | 'sell_price' | 'created_at';
export type SortDirection = 'asc' | 'desc';

/** Which product rows to load: active (default), archived only, or all. */
export type ProductRecordVisibility = 'active' | 'archived' | 'all';
