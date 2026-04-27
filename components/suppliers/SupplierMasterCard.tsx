'use client';

import PremiumCard from '@/components/layout/premium/PremiumCard';
import { ArchiveRestoreActions } from '@/components/common/ArchiveRestoreActions';
import { EntityStatusBadge } from '@/components/common/EntityStatusBadge';
import { MasterCardEmptyState } from '@/components/common/MasterCardEmptyState';
import { premiumTypography } from '@/lib/premiumUi';
import type { Supplier } from '@/types/supplier';
import { formatSupplierCode } from '@/lib/supplierDisplay';
import { Truck } from 'lucide-react';

interface SupplierMasterCardProps {
  supplier: Supplier | null;
  onArchive?: (supplier: Supplier) => void;
  onRestore?: (supplier: Supplier) => void;
}

const SUPPLIER_STATUS_MAP: Record<string, string> = {
  on_hold: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
};

export default function SupplierMasterCard({
  supplier,
  onArchive,
  onRestore,
}: SupplierMasterCardProps) {
  if (!supplier) {
    return (
      <MasterCardEmptyState
        icon={Truck}
        message="Select a supplier from the list to view details."
      />
    );
  }

  const logoUrl = supplier.logo_url?.trim() || null;
  const isArchived = Boolean(supplier.deleted_at);

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
          <Truck className="h-7 w-7 text-green-700 dark:text-green-500" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate ${premiumTypography.helper}`}>
          {formatSupplierCode(supplier.supplier_code)}
        </p>
        <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white">
          {supplier.legal_name}
        </h2>
        {supplier.trading_name && (
          <p className="truncate text-xs text-gray-600 dark:text-gray-400">
            {supplier.trading_name}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <ArchiveRestoreActions
          entity={supplier}
          isArchived={isArchived}
          onArchive={onArchive}
          onRestore={onRestore}
          archiveTitle="Soft-delete: hidden from lists, data retained."
          restoreTitle="Restore supplier to active lists."
        />
        <EntityStatusBadge status={String(supplier.status)} statusMap={SUPPLIER_STATUS_MAP} />
      </div>
    </PremiumCard>
  );
}
