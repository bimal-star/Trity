'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import SupplierList from '@/components/suppliers/SupplierList';
import SupplierMasterCard from '@/components/suppliers/SupplierMasterCard';
import SupplierDetailsTabs from '@/components/suppliers/SupplierDetailsTabs';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useTenant } from '@/contexts/TenantContext';
import type { Supplier, SupplierRecordVisibility, SupplierStatus } from '@/types/supplier';
import { pillarAccent, premiumPrimaryButton, premiumSurfaces, premiumTertiaryButton, premiumTypography } from '@/lib/premiumUi';
import { Plus, Truck } from 'lucide-react';
import { ExportFormatDropdown } from '@/components/common/ExportFormatDropdown';
import { logSupplierArchived, logSupplierRestored } from '@/lib/auditLog';

const bc = pillarAccent('businessCore');

export default function SuppliersPage() {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SupplierStatus>('all');
  const [recordVisibility, setRecordVisibility] = useState<SupplierRecordVisibility>('active');

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

  const {
    suppliers,
    isLoading,
    error,
    updateSupplier,
    refreshSuppliers,
    archiveSupplier,
    restoreSupplier,
  } = useSuppliers(filters);

  const selectedSupplier = useMemo((): Supplier | null => {
    if (!selectedSupplierId) return null;
    return suppliers.find((s) => s.id === selectedSupplierId) ?? null;
  }, [suppliers, selectedSupplierId]);

  const handleArchive = async (s: Supplier) => {
    if (!confirm(`Archive supplier “${s.legal_name}”?`)) return;
    const r = await archiveSupplier(s.id);
    if (r.success && tenant_id) {
      await logSupplierArchived(tenant_id, s.id, s.legal_name, user?.id ?? null);
      if (selectedSupplierId === s.id) setSelectedSupplierId(null);
    } else if (!r.success) alert(r.error ?? 'Failed');
  };

  const handleRestore = async (s: Supplier) => {
    if (!confirm(`Restore supplier “${s.legal_name}”?`)) return;
    const r = await restoreSupplier(s.id);
    if (r.success && tenant_id) {
      await logSupplierRestored(tenant_id, s.id, s.legal_name, user?.id ?? null);
    } else if (!r.success) alert(r.error ?? 'Failed');
  };

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
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
                  rows: suppliers.map((s) => [
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
                buttonClassName={premiumTertiaryButton('sm', 'standard')}
              />
              <Link
                href="/suppliers/new"
                className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                New Supplier
              </Link>
            </div>
          }
        />

        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        <div className="flex h-[calc(100vh-132px)] min-h-[min(560px,calc(100vh-132px))] w-full flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-3 lg:items-stretch">
            <div className="flex h-full min-h-0 flex-col lg:col-span-1">
              <SupplierList
                suppliers={suppliers}
                selectedSupplierId={selectedSupplierId}
                isLoading={isLoading}
                error={error}
                search={search}
                onSearchChange={setSearch}
                onSelect={(s) => setSelectedSupplierId(s.id)}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                recordVisibility={recordVisibility}
                onRecordVisibilityChange={setRecordVisibility}
                filterActive={filterActive}
              />
            </div>

            <div className="flex h-full min-h-0 flex-col space-y-4 overflow-hidden lg:col-span-2">
              <div className="shrink-0">
                <SupplierMasterCard
                  supplier={selectedSupplier}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                />
              </div>
              {selectedSupplier && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <SupplierDetailsTabs
                    supplier={selectedSupplier}
                    updateSupplier={updateSupplier}
                    onSupplierUpdated={() => void refreshSuppliers()}
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
