'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import CustomerList from '@/components/customers/CustomerList';
import { useTenant } from '@/contexts/TenantContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useCustomers } from '@/hooks/useCustomers';
import type { CustomerRecordVisibility, CustomerStatus } from '@/types/customer';
import {
  pillarAccent,
  premiumPrimaryButton,
  premiumTertiaryButton,
  premiumTypography,
} from '@/lib/premiumUi';
import { Users, Plus, Loader2 } from 'lucide-react';
import { ExportFormatDropdown } from '@/components/common/ExportFormatDropdown';

const bc = pillarAccent('businessCore');

export default function CustomersPage() {
  const router = useRouter();
  const { user, ready, isLoading: tenantBootLoading, profile } = useTenant();
  const { can } = usePermissions();
  const canManageCustomers = can('manage_users');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CustomerStatus>('all');
  const [recordVisibility, setRecordVisibility] = useState<CustomerRecordVisibility>('active');

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

  const { customers, isLoading, error } = useCustomers(listFilters);

  useEffect(() => {
    if (!ready || tenantBootLoading || !user) return;
    if (profile && !canManageCustomers) {
      router.replace('/');
    }
  }, [ready, tenantBootLoading, user, profile, canManageCustomers, router]);

  const isBootstrapping = !ready || tenantBootLoading || !user;
  const waitingPermission = Boolean(
    ready && !tenantBootLoading && user && profile && !canManageCustomers
  );

  if (isBootstrapping) {
    return (
      <ProtectedRoute>
        <PageContainer module="businessCore">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2
              className="mb-4 h-8 w-8 animate-spin text-green-700 dark:text-green-500"
              aria-hidden
            />
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
            <Loader2
              className="mb-4 h-8 w-8 animate-spin text-green-700 dark:text-green-500"
              aria-hidden
            />
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
            <Loader2
              className="mb-4 h-8 w-8 animate-spin text-green-700 dark:text-green-500"
              aria-hidden
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageContainer
        module="businessCore"
        rootClassName="flex min-h-0 max-h-dvh flex-1 flex-col overflow-hidden bg-gray-50 px-3 pb-2 pt-4 dark:bg-gray-900 sm:px-6"
        innerClassName="mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <PremiumStickyHeader
            module="businessCore"
            sticky={false}
            className="relative z-20 mb-3 shrink-0"
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
                      'city',
                      'country',
                      'payment_terms',
                      'currency',
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
                      c.city || '',
                      c.country || '',
                      c.payment_terms || '',
                      c.currency || '',
                    ]),
                  })}
                  buttonClassName={premiumTertiaryButton('sm', 'standard')}
                />
                <Link
                  href="/customers/new"
                  className={premiumPrimaryButton('businessCore', 'md', 'standard')}
                >
                  <Plus className="w-4 h-4 shrink-0" aria-hidden />
                  New Customer
                </Link>
              </div>
            }
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <CustomerList
              customers={customers}
              isLoading={isLoading}
              error={error}
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              recordVisibility={recordVisibility}
              onRecordVisibilityChange={setRecordVisibility}
              onSelect={(c) => router.push(`/customers/${c.id}`)}
              filterActive={filterActive}
            />
          </div>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
