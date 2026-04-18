'use client';

import PremiumCard from '@/components/layout/premium/PremiumCard';
import { ArchiveRestoreActions } from '@/components/common/ArchiveRestoreActions';
import { EntityStatusBadge } from '@/components/common/EntityStatusBadge';
import { MasterCardEmptyState } from '@/components/common/MasterCardEmptyState';
import type { Customer } from '@/types/customer';
import { Users } from 'lucide-react';

interface CustomerMasterCardProps {
  customer: Customer | null;
  onArchive?: (customer: Customer) => void;
  onRestore?: (customer: Customer) => void;
}

const CUSTOMER_STATUS_MAP: Record<string, string> = {
  on_hold: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

export default function CustomerMasterCard({ customer, onArchive, onRestore }: CustomerMasterCardProps) {
  if (!customer) {
    return (
      <MasterCardEmptyState
        icon={Users}
        message="Select a customer from the list to view details."
      />
    );
  }

  const title = customer.legal_name || customer.trading_name || customer.email;
  const logoUrl = customer.logo_url?.trim() || null;
  const isArchived = Boolean(customer.deleted_at);

  return (
    <PremiumCard className="relative flex items-center gap-4 overflow-hidden border-l-[5px] border-l-green-600 bg-gradient-to-r from-green-50/70 via-white to-white !px-4 !py-3 dark:border-l-green-500 dark:from-green-950/25 dark:via-gray-800 dark:to-gray-800">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-green-200/80 bg-white shadow-sm dark:border-green-800/50 dark:bg-gray-900">
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
          <div
            className="flex h-full w-full items-center justify-center"
            aria-hidden
          >
            <Users className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <EntityStatusBadge status={customer.status ?? 'inactive'} statusMap={CUSTOMER_STATUS_MAP} />
        <ArchiveRestoreActions
          entity={customer}
          isArchived={isArchived}
          onArchive={onArchive}
          onRestore={onRestore}
          archiveTitle="Soft delete: customer is hidden from lists but data is kept."
          restoreTitle="Restore customer to active lists."
        />
      </div>
    </PremiumCard>
  );
}
