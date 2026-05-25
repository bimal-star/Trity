'use client';

import { Pencil } from 'lucide-react';
import SupplierLifecycleBar from '@/components/suppliers/SupplierLifecycleBar';
import SupplierQuickFacts from '@/components/suppliers/SupplierQuickFacts';
import SupplierRecordNavigator from '@/components/suppliers/SupplierRecordNavigator';
import { formatSupplierCode } from '@/lib/supplierDisplay';
import { pillarAccent, recordDetail } from '@/lib/premiumUi';
import type { Supplier, SupplierFormData, SupplierStatus } from '@/types/supplier';

export interface SupplierRecordSummaryCardProps {
  supplier: Supplier;
  formData: SupplierFormData;
  logoPanel?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  isArchived?: boolean;
  isDraft?: boolean;
  statusUpdating?: boolean;
  onStatusChange?: (status: SupplierStatus) => void;
  recordNav?: {
    index: number;
    total: number;
    prevId: string | null;
    nextId: string | null;
    isLoading: boolean;
    onNavigate: (supplierId: string) => void;
  };
  updatedAt?: string;
  onEditDetails?: () => void;
  editDetailsLabel?: string;
  className?: string;
}

export default function SupplierRecordSummaryCard({
  supplier,
  formData,
  logoPanel,
  actions,
  footer,
  isArchived = false,
  isDraft = false,
  statusUpdating = false,
  onStatusChange,
  recordNav,
  updatedAt,
  onEditDetails,
  editDetailsLabel = 'Edit',
  className = '',
}: SupplierRecordSummaryCardProps) {
  const accent = pillarAccent('businessCore');
  const showRecordNav = Boolean(recordNav && recordNav.total > 0);

  const subtitleParts: string[] = [];
  if (isDraft) {
    subtitleParts.push('Code assigned on save');
  } else {
    subtitleParts.push(formatSupplierCode(supplier.supplier_code));
  }
  if (formData.currency?.trim()) subtitleParts.push(formData.currency.trim());
  if (formData.trading_name?.trim()) subtitleParts.push(formData.trading_name.trim());
  const subtitleLine = subtitleParts.join(' · ');

  const title = formData.legal_name.trim() || supplier.legal_name || 'New supplier';

  return (
    <article
      className={`relative ${recordDetail.headerShell} ${recordDetail.headerAccent} border-l-green-600 dark:border-l-green-500 ${updatedAt != null ? 'pb-7' : ''} ${className}`.trim()}
    >
      <div className="flex flex-wrap items-stretch gap-3">
        {logoPanel ? <div className="shrink-0">{logoPanel}</div> : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <h1 className={`truncate ${recordDetail.title}`}>{title}</h1>
              <p className={`${recordDetail.meta} ${accent.subtitleTint}`}>{subtitleLine}</p>
            </div>

            {(showRecordNav || onEditDetails || actions) && (
              <div className="flex shrink-0 items-center gap-1.5">
                {onEditDetails ? (
                  <button
                    type="button"
                    onClick={onEditDetails}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-gray-300 px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {editDetailsLabel}
                  </button>
                ) : null}
                {showRecordNav && recordNav ? (
                  <SupplierRecordNavigator
                    index={recordNav.index}
                    total={recordNav.total}
                    prevId={recordNav.prevId}
                    nextId={recordNav.nextId}
                    isLoading={recordNav.isLoading}
                    onNavigate={recordNav.onNavigate}
                  />
                ) : null}
                {actions ? <div className="flex items-center gap-1.5">{actions}</div> : null}
              </div>
            )}
          </div>

          <div className="mt-2.5 flex w-full items-start justify-between gap-x-6 gap-y-3 pt-2.5">
            <div className="min-w-0 shrink space-y-1 pr-4">
              <SupplierLifecycleBar
                status={formData.status}
                isArchived={isArchived}
                disabled={statusUpdating || isArchived}
                onStatusChange={onStatusChange}
              />
              {footer}
            </div>

            <SupplierQuickFacts formData={formData} />
          </div>
        </div>
      </div>

      {updatedAt != null ? (
        <p
          className={`absolute bottom-2.5 right-3 text-right ${recordDetail.meta} text-gray-600 dark:text-gray-400`}
        >
          <span className={recordDetail.fieldLabelCompact}>Updated </span>
          <span className="text-gray-900 dark:text-gray-100">{updatedAt}</span>
        </p>
      ) : null}
    </article>
  );
}
