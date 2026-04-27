export type SupplierStatus = 'active' | 'inactive' | 'on_hold';

export type SupplierType = 'manufacturer' | 'distributor' | 'service' | 'other';

export interface Supplier {
  id: string;
  tenant_id: string;
  supplier_code: string | null;
  supplier_type: SupplierType | string | null;
  /** Public logo URL (e.g. supplier-logos bucket). */
  logo_url?: string | null;
  legal_name: string;
  trading_name: string | null;
  email: string | null;
  phone: string | null;
  status: SupplierStatus | string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  payment_terms: string | null;
  currency: string | null;
  tax_id: string | null;
  notes: string | null;
  external_system: string | null;
  external_id: string | null;
  integration_metadata: Record<string, unknown>;
  last_synced_at: string | null;
  metadata: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface SupplierFormData {
  supplier_type: SupplierType;
  logo_url?: string | null;
  legal_name: string;
  trading_name: string;
  email: string;
  phone: string;
  status: SupplierStatus;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  payment_terms: string;
  currency: string;
  tax_id: string;
  notes: string;
  metadata: Record<string, unknown>;
}

export type SupplierRecordVisibility = 'active' | 'archived' | 'all';

export interface SupplierFilters {
  searchQuery?: string;
  status?: SupplierStatus;
  /** Default `active` (non-deleted rows only). */
  visibility?: SupplierRecordVisibility;
}
