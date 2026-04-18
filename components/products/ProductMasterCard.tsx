'use client';

import PremiumCard from '@/components/layout/premium/PremiumCard';
import { ArchiveRestoreActions } from '@/components/common/ArchiveRestoreActions';
import { EntityStatusBadge } from '@/components/common/EntityStatusBadge';
import { MasterCardEmptyState } from '@/components/common/MasterCardEmptyState';
import { Product } from '@/types/product';
import { premiumTypography } from '@/lib/premiumUi';
import { Package2 } from 'lucide-react';
import { getProductPrimaryImageUrl } from '@/lib/productImageStorage';
import { productTracksInventory } from '@/lib/productInventoryPolicy';

interface ProductMasterCardProps {
  product: Product | null;
  onArchive?: (product: Product) => void;
  onRestore?: (product: Product) => void;
}

const PRODUCT_STATUS_MAP: Record<string, string> = {
  discontinued: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function ProductMasterCard({ product, onArchive, onRestore }: ProductMasterCardProps) {
  if (!product) {
    return (
      <MasterCardEmptyState
        icon={Package2}
        message="Select a product from the list to view details."
      />
    );
  }

  const primaryImage = getProductPrimaryImageUrl(product);
  const isArchived = Boolean(product.is_deleted);

  return (
    <PremiumCard className="relative flex items-center gap-4 overflow-hidden border-l-[5px] border-l-green-600 bg-gradient-to-r from-green-50/70 via-white to-white !px-4 !py-3 dark:border-l-green-500 dark:from-green-950/25 dark:via-gray-800 dark:to-gray-800">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-green-200/80 bg-gray-100 shadow-sm dark:border-green-800/50 dark:bg-gray-900">
        {primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImage}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package2 className="h-7 w-7 text-gray-400 dark:text-gray-600" aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className={`truncate text-gray-900 dark:text-white ${premiumTypography.pageTitle}`}>
          {product.name}
        </h2>
        {product.total_stock != null && productTracksInventory(product) && (
          <p className={`mt-0.5 ${premiumTypography.helper} text-gray-600 dark:text-gray-400`}>
            Total stock: {product.total_stock}
          </p>
        )}
        {isArchived && (
          <p className={`mt-0.5 ${premiumTypography.helper} text-amber-700 dark:text-amber-400`}>
            Archived — hidden from default catalog lists.
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <ArchiveRestoreActions
          entity={product}
          isArchived={isArchived}
          onArchive={onArchive}
          onRestore={onRestore}
          archiveTitle="Archive: keep data but hide from default lists."
          restoreTitle="Restore this product to the active catalog."
        />
        <EntityStatusBadge status={product.status} statusMap={PRODUCT_STATUS_MAP} />
      </div>
    </PremiumCard>
  );
}
