/**
 * Customer types for multi-tenant SaaS
 */

export type CustomerStatus = 'active' | 'inactive' | 'on_hold' | 'prospect';
export type CustomerType = 'individual' | 'business' | 'distributor' | 'internal';

export interface Customer {
  id: string;
  tenant_id: string;
  customer_code: string | null;
  customer_type: CustomerType | null;
  email: string;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  status: CustomerStatus;
  legal_name: string | null;
  trading_name: string | null;
  registration_number: string | null;
  vat_number: string | null;
  tax_scheme: string | null;
  credit_rating: string | null;
  risk_category: string | null;

  payment_terms: string | null;
  credit_limit: number | null;
  credit_hold: boolean | null;
  currency: string | null;
  price_list_id: string | null;
  discount_rate: number | null;
  tax_inclusive: boolean | null;

  default_warehouse_id: string | null;
  delivery_instructions: string | null;
  preferred_carrier: string | null;
  shipping_account_number: string | null;
  incoterms: string | null;

  sales_rep_id: string | null;
  channel: string | null;
  region: string | null;
  forecast_group: string | null;
  demand_profile: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  version: number;
}

export interface CustomerFormData {
  customer_type?: CustomerType | null;
  email: string;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  status?: CustomerStatus;
  legal_name?: string | null;
  trading_name?: string | null;
  registration_number?: string | null;
  vat_number?: string | null;
  tax_scheme?: string | null;
  credit_rating?: string | null;
  risk_category?: string | null;

  payment_terms?: string | null;
  credit_limit?: number | null;
  credit_hold?: boolean | null;
  currency?: string | null;
  price_list_id?: string | null;
  discount_rate?: number | null;
  tax_inclusive?: boolean | null;

  default_warehouse_id?: string | null;
  delivery_instructions?: string | null;
  preferred_carrier?: string | null;
  shipping_account_number?: string | null;
  incoterms?: string | null;

  sales_rep_id?: string | null;
  channel?: string | null;
  region?: string | null;
  forecast_group?: string | null;
  demand_profile?: string | null;
  metadata?: Record<string, any>;
}

export interface CustomerFilters {
  status?: CustomerStatus;
  searchTerm?: string;
}

export interface CustomerAddress {
  id: string;
  tenant_id: string;
  customer_id: string;
  address_type: 'billing' | 'shipping' | 'registered' | 'returns';
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface CustomerContact {
  id: string;
  tenant_id: string;
  customer_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  role: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface CustomerNote {
  id: string;
  tenant_id: string;
  customer_id: string;
  note_text: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface CustomerAttachment {
  id: string;
  tenant_id: string;
  customer_id: string;
  file_name: string;
  file_type: string | null;
  file_url: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}
