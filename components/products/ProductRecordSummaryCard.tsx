'use client';

import { Pencil } from 'lucide-react';
import ProductRecordNavigator from '@/components/products/ProductRecordNavigator';
import ProductUsageToggles, {
  type ProductUsagePatch,
} from '@/components/products/ProductUsageToggles';
import RecordLifecycleBar from '@/components/products/RecordLifecycleBar';
import type { Product, StatusType } from '@/types/product';
import { pillarAccent, recordDetail } from '@/lib/premiumUi';

export interface ProductRecordSummaryCardProps {
  product: Product;
  title: string;
  subtitle: React.ReactNode;
  accentClassName?: string;
  imagePanel?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  isArchived?: boolean;
  statusUpdating?: boolean;
  onStatusChange?: (status: StatusType) => void;
  onUsageUpdate: (patch: ProductUsagePatch) => Promise<void>;
  recordNav?: {
    index: number;
    total: number;
    prevId: string | null;
    nextId: string | null;
    isLoading: boolean;
    onNavigate: (productId: string) => void;
  };
  updatedAt?: string;
  /** Opens key-details editor (name, SKU on create only, etc.). */
  onEditDetails?: () => void;
  editDetailsLabel?: string;
  className?: string;
}

export default function ProductRecordSummaryCard({
  product,
  title,
  subtitle,
  accentClassName = '',
  imagePanel,
  actions,
  footer,
  isArchived = false,
  statusUpdating = false,
  onStatusChange,
  onUsageUpdate,
  recordNav,
  updatedAt,
  onEditDetails,
  editDetailsLabel = 'Edit',
  className = '',
}: ProductRecordSummaryCardProps) {
  const accent = pillarAccent('businessCore');
  const showRecordNav = Boolean(recordNav && recordNav.total > 0);

  return (
    <article
      className={`relative ${recordDetail.headerShell} ${updatedAt != null ? 'pb-7' : ''} ${accentClassName} ${className}`.trim()}
    >
      <div className="flex flex-wrap items-stretch gap-3">
        {imagePanel ? <div className="shrink-0">{imagePanel}</div> : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <h1 className={`truncate ${recordDetail.title}`}>{title}</h1>
              {subtitle != null && subtitle !== '' ? (
                <p className={`${recordDetail.meta} ${accent.subtitleTint}`}>{subtitle}</p>
              ) : null}
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
                  <ProductRecordNavigator
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
              <RecordLifecycleBar
                status={product.status}
                isArchived={isArchived}
                disabled={statusUpdating || isArchived}
                onStatusChange={onStatusChange}
              />
              {footer}
            </div>

            <ProductUsageToggles
              product={product}
              disabled={isArchived}
              onUpdate={onUsageUpdate}
              className="ml-auto max-w-none shrink-0 pl-6 sm:max-w-[15.75rem]"
            />
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
