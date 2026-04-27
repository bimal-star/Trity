'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import WarehouseList from '@/components/warehouses/WarehouseList';
import WarehouseMasterCard from '@/components/warehouses/WarehouseMasterCard';
import WarehouseDetailsTabs from '@/components/warehouses/WarehouseDetailsTabs';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useTenant } from '@/contexts/TenantContext';
import type { Warehouse, WarehouseRecordVisibility, WarehouseStatus } from '@/types/warehouse';
import {
  pillarAccent,
  premiumPrimaryButton,
  premiumTertiaryButton,
  premiumTypography,
} from '@/lib/premiumUi';
import { Plus, Warehouse as WarehouseIcon } from 'lucide-react';
import { ExportFormatDropdown } from '@/components/common/ExportFormatDropdown';
import { logWarehouseArchived, logWarehouseRestored } from '@/lib/auditLog';

const bc = pillarAccent('businessCore');

export default function WarehousePage() {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WarehouseStatus>('all');
  const [recordVisibility, setRecordVisibility] = useState<WarehouseRecordVisibility>('active');
  const [defaultOnly, setDefaultOnly] = useState(false);

  const filters = useMemo(() => {
    const f: {
      searchQuery?: string;
      status?: WarehouseStatus;
      visibility: WarehouseRecordVisibility;
      defaultOnly?: boolean;
    } = { visibility: recordVisibility };
    const q = search.trim();
    if (q) f.searchQuery = q;
    if (statusFilter !== 'all') f.status = statusFilter;
    if (defaultOnly) f.defaultOnly = true;
    return f;
  }, [search, statusFilter, recordVisibility, defaultOnly]);

  const filterActive =
    Boolean(search.trim()) ||
    statusFilter !== 'all' ||
    recordVisibility !== 'active' ||
    defaultOnly;

  const {
    warehouses,
    isLoading,
    error,
    updateWarehouse,
    refreshWarehouses,
    archiveWarehouse,
    restoreWarehouse,
  } = useWarehouses(filters);

  const selectedWarehouse = useMemo((): Warehouse | null => {
    if (!selectedWarehouseId) return null;
    return warehouses.find((w) => w.id === selectedWarehouseId) ?? null;
  }, [warehouses, selectedWarehouseId]);

  const handleArchive = async (w: Warehouse) => {
    if (!confirm(`Archive warehouse “${w.name}”?`)) return;
    const r = await archiveWarehouse(w.id);
    if (r.success && tenant_id) {
      await logWarehouseArchived(tenant_id, w.id, w.name, user?.id ?? null);
      if (selectedWarehouseId === w.id) setSelectedWarehouseId(null);
    } else if (!r.success) alert(r.error ?? 'Failed');
  };

  const handleRestore = async (w: Warehouse) => {
    if (!confirm(`Restore warehouse “${w.name}”?`)) return;
    const r = await restoreWarehouse(w.id);
    if (r.success && tenant_id) {
      await logWarehouseRestored(tenant_id, w.id, w.name, user?.id ?? null);
    } else if (!r.success) alert(r.error ?? 'Failed');
  };

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          icon={WarehouseIcon}
          title="Warehouses"
          subtitle="Sites for stock, fulfilment, and default shipping"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
          right={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <ExportFormatDropdown
                filenameBase={`warehouses_export_${new Date().toISOString().split('T')[0]}`}
                title="Export warehouse list as CSV"
                getData={() => ({
                  headers: [
                    'name',
                    'warehouse_type',
                    'status',
                    'is_default',
                    'address_line1',
                    'city',
                    'country',
                    'contact_email',
                  ],
                  rows: warehouses.map((w) => [
                    w.name,
                    w.warehouse_type ?? '',
                    w.status,
                    w.is_default ? 'true' : 'false',
                    w.address_line1 ?? '',
                    w.city ?? '',
                    w.country ?? '',
                    w.contact_email ?? '',
                  ]),
                })}
                buttonClassName={premiumTertiaryButton('sm', 'standard')}
              />
              <Link
                href="/warehouse/new"
                className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                New Warehouse
              </Link>
            </div>
          }
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-3 lg:items-stretch">
            <div className="flex h-full min-h-0 flex-col lg:col-span-1">
              <WarehouseList
                warehouses={warehouses}
                selectedWarehouseId={selectedWarehouseId}
                isLoading={isLoading}
                error={error}
                search={search}
                onSearchChange={setSearch}
                onSelect={(w) => setSelectedWarehouseId(w.id)}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                recordVisibility={recordVisibility}
                onRecordVisibilityChange={setRecordVisibility}
                defaultOnly={defaultOnly}
                onDefaultOnlyChange={setDefaultOnly}
                filterActive={filterActive}
              />
            </div>

            <div className="flex h-full min-h-0 flex-col space-y-4 overflow-hidden lg:col-span-2">
              <div className="shrink-0">
                <WarehouseMasterCard
                  warehouse={selectedWarehouse}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                />
              </div>
              {selectedWarehouse && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <WarehouseDetailsTabs
                    warehouse={selectedWarehouse}
                    updateWarehouse={updateWarehouse}
                    onWarehouseUpdated={() => void refreshWarehouses()}
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
