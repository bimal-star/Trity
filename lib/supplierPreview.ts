import type { Supplier, SupplierFormData } from '@/types/supplier';

export const emptySupplierFormData: SupplierFormData = {
  supplier_type: 'distributor',
  logo_url: null,
  legal_name: '',
  trading_name: '',
  email: '',
  phone: '',
  status: 'active',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postcode: '',
  country: '',
  payment_terms: '',
  currency: '',
  tax_id: '',
  notes: '',
  metadata: {},
};

/** Display-only supplier row for create-mode summary card (not persisted). */
export function formDataToSupplierPreview(
  formData: SupplierFormData,
  tenantId: string = ''
): Supplier {
  const now = new Date().toISOString();
  return {
    id: '',
    tenant_id: tenantId,
    supplier_code: null,
    supplier_type: formData.supplier_type,
    logo_url: formData.logo_url?.trim() || null,
    legal_name: formData.legal_name.trim() || 'New supplier',
    trading_name: formData.trading_name.trim() || null,
    email: formData.email.trim() || null,
    phone: formData.phone.trim() || null,
    status: formData.status,
    address_line1: formData.address_line1.trim() || null,
    address_line2: formData.address_line2.trim() || null,
    city: formData.city.trim() || null,
    state: formData.state.trim() || null,
    postcode: formData.postcode.trim() || null,
    country: formData.country.trim() || null,
    payment_terms: formData.payment_terms.trim() || null,
    currency: formData.currency.trim() || null,
    tax_id: formData.tax_id.trim() || null,
    notes: formData.notes.trim() || null,
    external_system: null,
    external_id: null,
    integration_metadata: {},
    last_synced_at: null,
    metadata: formData.metadata ?? {},
    version: 0,
    created_at: now,
    updated_at: now,
    created_by: null,
    updated_by: null,
    deleted_at: null,
    deleted_by: null,
  };
}
