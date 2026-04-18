export type WarehouseStatus = 'active' | 'inactive' | 'closed';

export type WarehouseType = 'distribution' | 'manufacturing' | 'retail' | '3pl' | 'other';

export interface Warehouse {
  id: string;
  tenant_id: string;
  warehouse_code: string | null;
  /** Public logo URL (e.g. warehouse-logos bucket). */
  logo_url?: string | null;
  name: string;
  warehouse_type: WarehouseType | string | null;
  status: WarehouseStatus | string;
  is_default: boolean;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
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

export interface WarehouseFormData {
  logo_url?: string | null;
  name: string;
  warehouse_type: WarehouseType;
  status: WarehouseStatus;
  is_default: boolean;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  metadata: Record<string, unknown>;
}

export type WarehouseRecordVisibility = 'active' | 'archived' | 'all';

export interface WarehouseFilters {
  searchQuery?: string;
  status?: WarehouseStatus;
  /** When true, only warehouses with `is_default`. */
  defaultOnly?: boolean;
  /** Default `active` (non-deleted rows only). */
  visibility?: WarehouseRecordVisibility;
}
