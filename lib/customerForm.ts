import type { Customer, CustomerFormData, CustomerStatus, CustomerType } from '@/types/customer';
import { emptyCustomerFormData } from '@/lib/customerPreview';

export function customerToFormData(c: Customer): CustomerFormData {
  return {
    customer_type: (c.customer_type as CustomerType) ?? 'business',
    logo_url: c.logo_url ?? null,
    email: c.email,
    phone: c.phone ?? '',
    address_line1: c.address_line1 ?? '',
    address_line2: c.address_line2 ?? '',
    city: c.city ?? '',
    state: c.state ?? '',
    postcode: c.postcode ?? '',
    country: c.country ?? '',
    status: (c.status as CustomerStatus) ?? 'active',
    legal_name: c.legal_name ?? '',
    trading_name: c.trading_name ?? '',
    registration_number: c.registration_number ?? '',
    vat_number: c.vat_number ?? '',
    tax_scheme: c.tax_scheme ?? '',
    credit_rating: c.credit_rating ?? '',
    risk_category: c.risk_category ?? '',
    payment_terms: c.payment_terms ?? '',
    credit_limit: c.credit_limit ?? undefined,
    credit_hold: c.credit_hold ?? false,
    currency: c.currency ?? '',
    price_list_id: c.price_list_id ?? '',
    discount_rate: c.discount_rate ?? undefined,
    tax_inclusive: c.tax_inclusive ?? false,
    default_warehouse_id: c.default_warehouse_id ?? '',
    delivery_instructions: c.delivery_instructions ?? '',
    preferred_carrier: c.preferred_carrier ?? '',
    shipping_account_number: c.shipping_account_number ?? '',
    incoterms: c.incoterms ?? '',
    sales_rep_id: c.sales_rep_id ?? '',
    channel: c.channel ?? '',
    region: c.region ?? '',
    forecast_group: c.forecast_group ?? '',
    demand_profile: c.demand_profile ?? '',
    metadata: (c.metadata && typeof c.metadata === 'object' ? c.metadata : {}) as Record<
      string,
      unknown
    >,
  };
}

export function resolveCustomerFormData(
  customer: Customer | undefined,
  liveForm: CustomerFormData | null
): CustomerFormData {
  if (liveForm) return liveForm;
  if (customer) return customerToFormData(customer);
  return emptyCustomerFormData;
}
