'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import CustomerList from '@/components/customers/CustomerList';
import CustomerMasterCard from '@/components/customers/CustomerMasterCard';
import CustomerDetailsTabs from '@/components/customers/CustomerDetailsTabs';
import { useTenant } from '@/contexts/TenantContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useCustomers } from '@/hooks/useCustomers';
import type { Customer, CustomerRecordVisibility, CustomerStatus } from '@/types/customer';
import { logCustomerArchived, logCustomerRestored } from '@/lib/auditLog';
import { pillarAccent, premiumPrimaryButton, premiumSurfaces, premiumTertiaryButton, premiumTypography } from '@/lib/premiumUi';
import { Users, Plus, Loader2 } from 'lucide-react';
import { ExportFormatDropdown } from '@/components/common/ExportFormatDropdown';

const bc = pillarAccent('businessCore');

export default function CustomersPage() {
  const router = useRouter();
  const { user, effectiveTenantId: tenant_id, ready, isLoading: tenantBootLoading, profile } =
    useTenant();
  const { can } = usePermissions();
  const canManageCustomers = can('manage_users');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CustomerStatus>('all');
  const [recordVisibility, setRecordVisibility] = useState<CustomerRecordVisibility>('active');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const listFilters = useMemo(
    () => ({
      status: statusFilter === 'all' ? undefined : statusFilter,
      searchTerm: debouncedSearch || undefined,
      visibility: recordVisibility,
    }),
    [statusFilter, debouncedSearch, recordVisibility]
  );

  const filterActive =
    Boolean(debouncedSearch) || statusFilter !== 'all' || recordVisibility !== 'active';

  const {
    customers,
    isLoading,
    error,
    updateCustomer,
    archiveCustomer,
    restoreCustomer,
    refreshCustomers,
  } = useCustomers(listFilters);

  const selectedCustomer = useMemo((): Customer | null => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) ?? null;
  }, [customers, selectedCustomerId]);

  useEffect(() => {
    if (!ready || tenantBootLoading || !user) return;
    if (profile && !canManageCustomers) {
      router.replace('/');
    }
  }, [ready, tenantBootLoading, user, profile, canManageCustomers, router]);

  const handleRestore = async (customer: Customer) => {
    if (!confirm('Restore this customer to active lists?')) return;
    const result = await restoreCustomer(customer.id);
    if (result.success && tenant_id) {
      await logCustomerRestored(tenant_id, customer.id, user?.id ?? null);
      void refreshCustomers();
    }
  };

  const handleArchive = async (customer: Customer) => {
    if (
      !confirm(
        'Archive this customer? They will be hidden from lists (soft delete) but data is retained.'
      )
    )
      return;
    const result = await archiveCustomer(customer.id);
    if (result.success && tenant_id) {
      await logCustomerArchived(tenant_id, customer.id, user?.id ?? null);
      if (selectedCustomerId === customer.id) {
        setSelectedCustomerId(null);
      }
    }
  };

  const isBootstrapping = !ready || tenantBootLoading || !user;
  const waitingPermission = Boolean(
    ready && !tenantBootLoading && user && profile && !canManageCustomers
  );

  if (isBootstrapping) {
    return (
      <ProtectedRoute>
        <PageContainer module="businessCore">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-green-700 dark:text-green-500" aria-hidden />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  if (waitingPermission) {
    return (
      <ProtectedRoute>
        <PageContainer module="businessCore">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-green-700 dark:text-green-500" aria-hidden />
            <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting…</p>
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  if (!profile || !canManageCustomers) {
    return (
      <ProtectedRoute>
        <PageContainer module="businessCore">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-green-700 dark:text-green-500" aria-hidden />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          icon={Users}
          title="Customers"
          subtitle="Manage customer records and business relationships"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
          right={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <ExportFormatDropdown
                filenameBase={`customers_export_${new Date().toISOString().split('T')[0]}`}
                title="Export visible customers as CSV"
                getData={() => ({
                  headers: [
                    'customer_code',
                    'legal_name',
                    'trading_name',
                    'email',
                    'phone',
                    'customer_type',
                    'status',
                    'address_line1',
                    'address_line2',
                    'city',
                    'state',
                    'postcode',
                    'country',
                    'registration_number',
                    'vat_number',
                    'tax_scheme',
                    'credit_rating',
                    'risk_category',
                    'payment_terms',
                    'credit_limit',
                    'credit_hold',
                    'currency',
                    'discount_rate',
                    'tax_inclusive',
                    'delivery_instructions',
                    'preferred_carrier',
                    'incoterms',
                    'channel',
                    'region',
                  ],
                  rows: customers.map((c) => [
                    c.customer_code || '',
                    c.legal_name || '',
                    c.trading_name || '',
                    c.email || '',
                    c.phone || '',
                    c.customer_type || '',
                    c.status || '',
                    c.address_line1 || '',
                    c.address_line2 || '',
                    c.city || '',
                    c.state || '',
                    c.postcode || '',
                    c.country || '',
                    c.registration_number || '',
                    c.vat_number || '',
                    c.tax_scheme || '',
                    c.credit_rating || '',
                    c.risk_category || '',
                    c.payment_terms || '',
                    c.credit_limit ?? '',
                    c.credit_hold ?? false,
                    c.currency || '',
                    c.discount_rate ?? '',
                    c.tax_inclusive ?? false,
                    c.delivery_instructions || '',
                    c.preferred_carrier || '',
                    c.incoterms || '',
                    c.channel || '',
                    c.region || '',
                  ]),
                })}
                buttonClassName={premiumTertiaryButton('sm', 'standard')}
              />
              <Link
                href="/customers/new"
                className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                New Customer
              </Link>
            </div>
          }
        />

        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        <div className="flex h-[calc(100vh-132px)] min-h-[min(560px,calc(100vh-132px))] w-full flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-3 lg:items-stretch">
            <div className="flex h-full min-h-0 flex-col lg:col-span-1">
              <CustomerList
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                isLoading={isLoading}
                error={error}
                search={search}
                onSearchChange={setSearch}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                recordVisibility={recordVisibility}
                onRecordVisibilityChange={setRecordVisibility}
                onSelect={(c) => setSelectedCustomerId(c.id)}
                filterActive={filterActive}
              />
            </div>

            <div className="flex h-full min-h-0 flex-col space-y-4 overflow-hidden lg:col-span-2">
              <div className="shrink-0">
                <CustomerMasterCard
                  customer={selectedCustomer}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                />
              </div>
              {selectedCustomer && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <CustomerDetailsTabs
                    customer={selectedCustomer}
                    updateCustomer={updateCustomer}
                    onCustomerUpdated={() => void refreshCustomers()}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
