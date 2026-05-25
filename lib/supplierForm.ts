import type { Supplier, SupplierFormData, SupplierStatus, SupplierType } from '@/types/supplier';
import { emptySupplierFormData } from '@/lib/supplierPreview';

export function supplierToFormData(s: Supplier): SupplierFormData {
  return {
    supplier_type: (s.supplier_type as SupplierType) || 'distributor',
    logo_url: s.logo_url ?? null,
    legal_name: s.legal_name || '',
    trading_name: s.trading_name || '',
    email: s.email || '',
    phone: s.phone || '',
    status: (s.status as SupplierStatus) || 'active',
    address_line1: s.address_line1 || '',
    address_line2: s.address_line2 || '',
    city: s.city || '',
    state: s.state || '',
    postcode: s.postcode || '',
    country: s.country || '',
    payment_terms: s.payment_terms || '',
    currency: s.currency || '',
    tax_id: s.tax_id || '',
    notes: s.notes || '',
    metadata: (s.metadata && typeof s.metadata === 'object' ? s.metadata : {}) as Record<
      string,
      unknown
    >,
  };
}

export function resolveSupplierFormData(
  supplier: Supplier | undefined,
  liveForm: SupplierFormData | null
): SupplierFormData {
  if (liveForm) return liveForm;
  if (supplier) return supplierToFormData(supplier);
  return emptySupplierFormData;
}
