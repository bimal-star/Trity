'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import FilterDrawer, { FILTER_DRAWER_DEFAULT_WIDTH_PX } from '@/components/common/FilterDrawer';
import { ExportFormatDropdown } from '@/components/common/ExportFormatDropdown';
import SupplierList, { type SupplierSortOption } from '@/components/suppliers/SupplierList';
import { useSuppliers } from '@/hooks/useSuppliers';
import type { SupplierRecordVisibility, SupplierStatus } from '@/types/supplier';
import {
  pillarAccent,
  premiumInputCompact,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumTertiaryButton,
  premiumTypography,
} from '@/lib/premiumUi';
import { Plus, Truck } from 'lucide-react';

const bc = pillarAccent('businessCore');

const DRAWER_STATUS_FILTERS: { value: 'all' | SupplierStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'on_hold', label: 'On hold' },
];

export default function SuppliersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SupplierStatus>('all');
  const [recordVisibility, setRecordVisibility] = useState<SupplierRecordVisibility>('active');
  const [sortUiValue, setSortUiValue] = useState<SupplierSortOption>('recent');
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  const filters = useMemo(() => {
    const f: {
      searchQuery?: string;
      status?: SupplierStatus;
      visibility: SupplierRecordVisibility;
    } = { visibility: recordVisibility };
    const q = search.trim();
    if (q) f.searchQuery = q;
    if (statusFilter !== 'all') f.status = statusFilter;
    return f;
  }, [search, statusFilter, recordVisibility]);

  const filterActive =
    Boolean(search.trim()) || statusFilter !== 'all' || recordVisibility !== 'active';

  const filtersBadgeCount = useMemo(() => {
    let n = 0;
    if (search.trim()) n += 1;
    if (statusFilter !== 'all') n += 1;
    if (recordVisibility !== 'active') n += 1;
    return n;
  }, [search, statusFilter, recordVisibility]);

  const { suppliers, isLoading, error } = useSuppliers(filters);

  const sortedSuppliers = useMemo(() => {
    const list = [...suppliers];
    if (sortUiValue === 'name_asc') {
      list.sort((a, b) =>
        a.legal_name.localeCompare(b.legal_name, undefined, { sensitivity: 'base' })
      );
    }
    return list;
  }, [suppliers, sortUiValue]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('all');
    setRecordVisibility('active');
  }, []);

  const drawerFilterControlClass = `${premiumInputCompact} h-9 ${premiumTypography.tableCell}`;

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
            icon={Truck}
            title="Suppliers"
            subtitle="Manage vendor records, contacts, and commercial terms"
            subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
            right={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <ExportFormatDropdown
                  filenameBase={`suppliers_export_${new Date().toISOString().split('T')[0]}`}
                  title="Export supplier list as CSV"
                  getData={() => ({
                    headers: [
                      'legal_name',
                      'trading_name',
                      'email',
                      'phone',
                      'supplier_type',
                      'status',
                      'address_line1',
                      'city',
                      'country',
                      'payment_terms',
                      'currency',
                    ],
                    rows: sortedSuppliers.map((s) => [
                      s.legal_name,
                      s.trading_name ?? '',
                      s.email ?? '',
                      s.phone ?? '',
                      s.supplier_type ?? '',
                      s.status,
                      s.address_line1 ?? '',
                      s.city ?? '',
                      s.country ?? '',
                      s.payment_terms ?? '',
                      s.currency ?? '',
                    ]),
                  })}
                  buttonClassName={premiumSecondaryButton('businessCore', 'sm', 'standard')}
                />
                <Link href="/suppliers/pricing" className={premiumTertiaryButton('sm', 'standard')}>
                  Supplier pricing
                </Link>
                <Link
                  href="/suppliers/new"
                  className={premiumPrimaryButton('businessCore', 'md', 'standard')}
                >
                  <Plus className="w-4 h-4 shrink-0" aria-hidden />
                  New Supplier
                </Link>
              </div>
            }
          />

          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-[margin-inline-end] duration-[250ms] [transition-timing-function:ease]"
            style={{
              marginInlineEnd: filtersDrawerOpen ? FILTER_DRAWER_DEFAULT_WIDTH_PX : 0,
            }}
          >
            <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
              <SupplierList
                suppliers={sortedSuppliers}
                isLoading={isLoading}
                error={error}
                search={search}
                onSearchChange={setSearch}
                onSelect={(s) => router.push(`/suppliers/${s.id}`)}
                recordVisibility={recordVisibility}
                onRecordVisibilityChange={setRecordVisibility}
                sortUiValue={sortUiValue}
                onSortUiChange={setSortUiValue}
                filterActive={filterActive}
                filtersBadgeCount={filtersBadgeCount}
                onClearFilters={clearFilters}
                filtersDrawerOpen={filtersDrawerOpen}
                onOpenFilters={() => setFiltersDrawerOpen(true)}
              />
            </div>
          </div>
        </div>
      </PageContainer>

      <FilterDrawer
        isOpen={filtersDrawerOpen}
        onClose={() => setFiltersDrawerOpen(false)}
        onApply={() => setFiltersDrawerOpen(false)}
        onClear={clearFilters}
        title="Filters"
        width={FILTER_DRAWER_DEFAULT_WIDTH_PX}
      >
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label
              className={`mb-1 block ${premiumTypography.helper} font-medium text-gray-700 dark:text-gray-300`}
            >
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | SupplierStatus)}
              className={`${drawerFilterControlClass} w-full`}
              aria-label="Filter by supplier status"
            >
              {DRAWER_STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FilterDrawer>
    </ProtectedRoute>
  );
}
