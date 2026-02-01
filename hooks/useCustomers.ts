'use client';

import { useState, useEffect } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import { Customer, CustomerFormData, CustomerFilters } from '@/types/customer';
import { useTenant } from '@/contexts/TenantContext';

interface UseCustomersReturn {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  createCustomer: (data: CustomerFormData) => Promise<{ success: boolean; id?: string; error?: string }>;
  updateCustomer: (id: string, data: Partial<CustomerFormData>) => Promise<{ success: boolean; error?: string }>;
  archiveCustomer: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshCustomers: () => Promise<void>;
}

export function useCustomers(filters?: CustomerFilters): UseCustomersReturn {
  const { tenant_id, user } = useTenant();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
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
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error: err } = await query;

      if (err) throw err;
      setCustomers(data || []);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err.message || 'Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [tenant_id, filters?.status]);

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
            metadata: data.metadata || {},
          },
        ])
        .select('id, customer_code')
        .single();

      if (err) return { success: false, error: err.message };
      await fetchCustomers();
      return { success: true, id: created?.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateCustomer = async (
    id: string,
    data: Partial<CustomerFormData>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err } = await tenantedSupabase
        .from('customers')
        .update({
          customer_code: data.customer_code !== undefined ? data.customer_code : undefined,
          customer_type: data.customer_type !== undefined ? data.customer_type : undefined,
          email: data.email,
          phone: data.phone !== undefined ? data.phone : undefined,
          address_line1: data.address_line1 !== undefined ? data.address_line1 : undefined,
          address_line2: data.address_line2 !== undefined ? data.address_line2 : undefined,
          city: data.city !== undefined ? data.city : undefined,
          state: data.state !== undefined ? data.state : undefined,
          postcode: data.postcode !== undefined ? data.postcode : undefined,
          country: data.country !== undefined ? data.country : undefined,
          status: data.status,
          legal_name: data.legal_name !== undefined ? data.legal_name : undefined,
          trading_name: data.trading_name !== undefined ? data.trading_name : undefined,
          registration_number: data.registration_number !== undefined ? data.registration_number : undefined,
          vat_number: data.vat_number !== undefined ? data.vat_number : undefined,
          tax_scheme: data.tax_scheme !== undefined ? data.tax_scheme : undefined,
          credit_rating: data.credit_rating !== undefined ? data.credit_rating : undefined,
          risk_category: data.risk_category !== undefined ? data.risk_category : undefined,
          payment_terms: data.payment_terms !== undefined ? data.payment_terms : undefined,
          credit_limit: data.credit_limit !== undefined ? data.credit_limit : undefined,
          credit_hold: data.credit_hold !== undefined ? data.credit_hold : undefined,
          currency: data.currency !== undefined ? data.currency : undefined,
          price_list_id: data.price_list_id !== undefined ? data.price_list_id : undefined,
          discount_rate: data.discount_rate !== undefined ? data.discount_rate : undefined,
          tax_inclusive: data.tax_inclusive !== undefined ? data.tax_inclusive : undefined,
          default_warehouse_id: data.default_warehouse_id !== undefined ? data.default_warehouse_id : undefined,
          delivery_instructions:
            data.delivery_instructions !== undefined ? data.delivery_instructions : undefined,
          preferred_carrier: data.preferred_carrier !== undefined ? data.preferred_carrier : undefined,
          shipping_account_number:
            data.shipping_account_number !== undefined ? data.shipping_account_number : undefined,
          incoterms: data.incoterms !== undefined ? data.incoterms : undefined,
          sales_rep_id: data.sales_rep_id !== undefined ? data.sales_rep_id : undefined,
          channel: data.channel !== undefined ? data.channel : undefined,
          region: data.region !== undefined ? data.region : undefined,
          forecast_group: data.forecast_group !== undefined ? data.forecast_group : undefined,
          demand_profile: data.demand_profile !== undefined ? data.demand_profile : undefined,
          metadata: data.metadata !== undefined ? data.metadata : undefined,
        })
        .eq('id', id);

      if (err) return { success: false, error: err.message };
      await fetchCustomers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
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
        })
        .eq('id', id);

      if (err) return { success: false, error: err.message };
      await fetchCustomers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    customers,
    isLoading,
    error,
    createCustomer,
    updateCustomer,
    archiveCustomer,
    refreshCustomers: fetchCustomers,
  };
}
