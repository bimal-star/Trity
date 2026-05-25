'use client';

import { useState, useEffect, useCallback } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import { Customer, CustomerFormData, CustomerFilters } from '@/types/customer';
import { useTenant } from '@/contexts/TenantContext';

interface UseCustomersReturn {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  createCustomer: (
    data: CustomerFormData
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  updateCustomer: (
    id: string,
    data: Partial<CustomerFormData>
  ) => Promise<{ success: boolean; error?: string }>;
  archiveCustomer: (id: string) => Promise<{ success: boolean; error?: string }>;
  restoreCustomer: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshCustomers: () => Promise<void>;
}

/** When `loadCustomers` is false, skip list fetch (e.g. create-customer page). */
export interface UseCustomersOptions {
  loadCustomers?: boolean;
}

/** Safe fragment for PostgREST `ilike` inside `.or()` (strips %, _, comma, and grouping chars). */
function customerSearchPattern(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = raw
    .trim()
    .replace(/[,()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return null;
  const safe = t.replace(/[%_]/g, '');
  if (!safe) return null;
  return `%${safe}%`;
}

export function useCustomers(
  filters?: CustomerFilters,
  options?: UseCustomersOptions
): UseCustomersReturn {
  const loadCustomers = options?.loadCustomers !== false;
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!tenant_id) {
      setCustomers([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = tenantedSupabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('created_at', { ascending: false });

      const visibility = filters?.visibility ?? 'active';
      if (visibility === 'active') {
        query = query.is('deleted_at', null);
      } else if (visibility === 'archived') {
        query = query.not('deleted_at', 'is', null);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const pattern = customerSearchPattern(filters?.searchTerm);
      if (pattern) {
        query = query.or(
          `legal_name.ilike.${pattern},trading_name.ilike.${pattern},email.ilike.${pattern},customer_code.ilike.${pattern}`
        );
      }

      const { data, error: err } = await query;

      if (err) throw err;
      setCustomers((data || []) as unknown as Customer[]);
    } catch (err: unknown) {
      console.error('Error fetching customers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id, filters?.status, filters?.searchTerm, filters?.visibility]);

  useEffect(() => {
    if (!tenant_id) {
      setCustomers([]);
      setIsLoading(false);
      return;
    }
    if (loadCustomers) {
      void fetchCustomers();
    } else {
      setCustomers([]);
      setError(null);
      setIsLoading(false);
    }
  }, [tenant_id, loadCustomers, fetchCustomers]);

  const createCustomer = async (
    data: CustomerFormData
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err, data: created } = await tenantedSupabase
        .from('customers')
        .insert([
          {
            tenant_id,
            created_by: user?.id ?? null,
            updated_by: user?.id ?? null,
            customer_type: data.customer_type || null,
            logo_url: data.logo_url ?? null,
            email: data.email,
            phone: data.phone || null,
            address_line1: data.address_line1 || null,
            address_line2: data.address_line2 || null,
            city: data.city || null,
            state: data.state || null,
            postcode: data.postcode || null,
            country: data.country || null,
            status: data.status || 'active',
            legal_name: data.legal_name || null,
            trading_name: data.trading_name || null,
            registration_number: data.registration_number || null,
            vat_number: data.vat_number || null,
            tax_scheme: data.tax_scheme || null,
            credit_rating: data.credit_rating || null,
            risk_category: data.risk_category || null,
            payment_terms: data.payment_terms || null,
            credit_limit: data.credit_limit ?? null,
            credit_hold: data.credit_hold ?? false,
            currency: data.currency || null,
            price_list_id: data.price_list_id || null,
            discount_rate: data.discount_rate ?? null,
            tax_inclusive: data.tax_inclusive ?? false,
            default_warehouse_id: data.default_warehouse_id || null,
            delivery_instructions: data.delivery_instructions || null,
            preferred_carrier: data.preferred_carrier || null,
            shipping_account_number: data.shipping_account_number || null,
            incoterms: data.incoterms || null,
            sales_rep_id: data.sales_rep_id || null,
            channel: data.channel || null,
            region: data.region || null,
            forecast_group: data.forecast_group || null,
            demand_profile: data.demand_profile || null,
            metadata: data.metadata ?? {},
          },
        ] as any)
        .select('id, customer_code')
        .single();

      if (err) return { success: false, error: err.message };
      if (loadCustomers) await fetchCustomers();
      const row = created as { id?: string } | null | undefined;
      return { success: true, id: row?.id };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create' };
    }
  };

  const updateCustomer = async (
    id: string,
    data: Partial<CustomerFormData>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const d = data as Record<string, unknown>;
      const { error: err } = await tenantedSupabase
        .from('customers')
        .update({
          customer_type: d.customer_type !== undefined ? d.customer_type : undefined,
          logo_url: d.logo_url !== undefined ? d.logo_url : undefined,
          email: d.email,
          phone: d.phone !== undefined ? d.phone : undefined,
          address_line1: d.address_line1 !== undefined ? d.address_line1 : undefined,
          address_line2: d.address_line2 !== undefined ? d.address_line2 : undefined,
          city: d.city !== undefined ? d.city : undefined,
          state: d.state !== undefined ? d.state : undefined,
          postcode: d.postcode !== undefined ? d.postcode : undefined,
          country: d.country !== undefined ? d.country : undefined,
          status: d.status,
          legal_name: d.legal_name !== undefined ? d.legal_name : undefined,
          trading_name: d.trading_name !== undefined ? d.trading_name : undefined,
          registration_number:
            d.registration_number !== undefined ? d.registration_number : undefined,
          vat_number: d.vat_number !== undefined ? d.vat_number : undefined,
          tax_scheme: d.tax_scheme !== undefined ? d.tax_scheme : undefined,
          credit_rating: d.credit_rating !== undefined ? d.credit_rating : undefined,
          risk_category: d.risk_category !== undefined ? d.risk_category : undefined,
          payment_terms: d.payment_terms !== undefined ? d.payment_terms : undefined,
          credit_limit: d.credit_limit !== undefined ? d.credit_limit : undefined,
          credit_hold: d.credit_hold !== undefined ? d.credit_hold : undefined,
          currency: d.currency !== undefined ? d.currency : undefined,
          price_list_id: d.price_list_id !== undefined ? d.price_list_id : undefined,
          discount_rate: d.discount_rate !== undefined ? d.discount_rate : undefined,
          tax_inclusive: d.tax_inclusive !== undefined ? d.tax_inclusive : undefined,
          default_warehouse_id:
            d.default_warehouse_id !== undefined ? d.default_warehouse_id : undefined,
          delivery_instructions:
            d.delivery_instructions !== undefined ? d.delivery_instructions : undefined,
          preferred_carrier: d.preferred_carrier !== undefined ? d.preferred_carrier : undefined,
          shipping_account_number:
            d.shipping_account_number !== undefined ? d.shipping_account_number : undefined,
          incoterms: d.incoterms !== undefined ? d.incoterms : undefined,
          sales_rep_id: d.sales_rep_id !== undefined ? d.sales_rep_id : undefined,
          channel: d.channel !== undefined ? d.channel : undefined,
          region: d.region !== undefined ? d.region : undefined,
          forecast_group: d.forecast_group !== undefined ? d.forecast_group : undefined,
          demand_profile: d.demand_profile !== undefined ? d.demand_profile : undefined,
          metadata: d.metadata !== undefined ? d.metadata : undefined,
        } as any)
        .eq('id', id);

      if (err) return { success: false, error: err.message };
      if (loadCustomers) await fetchCustomers();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update' };
    }
  };

  const archiveCustomer = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err } = await tenantedSupabase
        .from('customers')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id || null,
        } as any)
        .eq('id', id);

      if (err) return { success: false, error: err.message };
      if (loadCustomers) await fetchCustomers();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to archive' };
    }
  };

  const restoreCustomer = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err } = await tenantedSupabase
        .from('customers')
        .update({
          deleted_at: null,
          deleted_by: null,
        } as any)
        .eq('id', id);

      if (err) return { success: false, error: err.message };
      if (loadCustomers) await fetchCustomers();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to restore' };
    }
  };

  return {
    customers,
    isLoading,
    error,
    createCustomer,
    updateCustomer,
    archiveCustomer,
    restoreCustomer,
    refreshCustomers: fetchCustomers,
  };
}
