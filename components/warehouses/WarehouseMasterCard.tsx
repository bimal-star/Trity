'use client';

import PremiumCard from '@/components/layout/premium/PremiumCard';
import { ArchiveRestoreActions } from '@/components/common/ArchiveRestoreActions';
import { EntityStatusBadge } from '@/components/common/EntityStatusBadge';
import { MasterCardEmptyState } from '@/components/common/MasterCardEmptyState';
import { premiumTypography } from '@/lib/premiumUi';
import type { Warehouse } from '@/types/warehouse';
import { formatWarehouseCode } from '@/lib/warehouseDisplay';
import { Warehouse as WarehouseIcon, Star } from 'lucide-react';

interface WarehouseMasterCardProps {
  warehouse: Warehouse | null;
  onArchive?: (warehouse: Warehouse) => void;
  onRestore?: (warehouse: Warehouse) => void;
}

const WAREHOUSE_STATUS_MAP: Record<string, string> = {
  closed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function WarehouseMasterCard({
  warehouse,
  onArchive,
  onRestore,
}: WarehouseMasterCardProps) {
  if (!warehouse) {
    return (
      <MasterCardEmptyState
        icon={WarehouseIcon}
        message="Select a warehouse from the list to view details."
      />
    );
  }

  const logoUrl = warehouse.logo_url?.trim() || null;
  const isArchived = Boolean(warehouse.deleted_at);

  return (
    <PremiumCard className="relative flex items-center gap-4 overflow-hidden border-l-[5px] border-l-green-600 bg-gradient-to-r from-green-50/70 via-white to-white !px-4 !py-3 dark:border-l-green-500 dark:from-green-950/25 dark:via-gray-800 dark:to-gray-800">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-green-200/80 bg-gray-100 shadow-sm dark:border-green-800/50 dark:bg-gray-900">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <WarehouseIcon className="h-7 w-7 text-green-700 dark:text-green-500" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate ${premiumTypography.helper}`}>
          {formatWarehouseCode(warehouse.warehouse_code)}
        </p>
        <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white">
          {warehouse.name}
        </h2>
        {warehouse.city && (
          <p className="truncate text-xs text-gray-600 dark:text-gray-400">{warehouse.city}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {warehouse.is_default && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            <Star className="h-3 w-3 fill-current" aria-hidden />
            Default
          </span>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ArchiveRestoreActions
            entity={warehouse}
            isArchived={isArchived}
            onArchive={onArchive}
            onRestore={onRestore}
            archiveTitle="Soft-delete: hidden from lists, data retained."
            restoreTitle="Restore warehouse to active lists."
          />
          <EntityStatusBadge status={String(warehouse.status)} statusMap={WAREHOUSE_STATUS_MAP} />
        </div>
      </div>
    </PremiumCard>
  );
}
