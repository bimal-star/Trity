'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import BomProductImagePreview from '@/components/bom/BomProductImagePreview';
import ProductUsageToggles, {
  type ProductUsagePatch,
} from '@/components/products/ProductUsageToggles';
import type { BomKeyDetailsDraft } from '@/lib/bomKeyDetails';
import type { Product } from '@/types/product';
import { pillarAccent, recordDetail, premiumTypography } from '@/lib/premiumUi';
import type { BomOutputProductOption } from '@/hooks/useBomOutputProducts';
import { formInputClass as inputClass } from '@/lib/formTokens';
import { normalizeProductImages } from '@/lib/productImages';

export interface BomRecordSummaryCardProps {
  isCreateMode: boolean;
  product: Product | null;
  keyDetails: BomKeyDetailsDraft;
  onKeyDetailsChange: (draft: BomKeyDetailsDraft) => void;
  onKeyDetailsCommit?: () => void | Promise<void>;
  outputUnitSymbol?: string | null;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  updatedAt?: string;
  /** Create mode only: pick output product before BOM exists */
  outputProducts?: BomOutputProductOption[];
  outputProductsLoading?: boolean;
  selectedOutputProductId?: string;
  onOutputProductChange?: (productId: string) => void;
  onUsageUpdate?: (patch: ProductUsagePatch) => Promise<void>;
  bomCode?: string | null;
  className?: string;
}

function productSkuSubtitle(product: Product): string {
  return `SKU ${product.sku || '—'} · ${product.currency?.trim() || 'GBP'}`;
}

export default function BomRecordSummaryCard({
  isCreateMode,
  product,
  keyDetails,
  onKeyDetailsChange,
  onKeyDetailsCommit,
  outputUnitSymbol,
  actions,
  footer,
  updatedAt,
  outputProducts = [],
  outputProductsLoading = false,
  selectedOutputProductId = '',
  onOutputProductChange,
  onUsageUpdate,
  bomCode,
  className = '',
}: BomRecordSummaryCardProps) {
  const accent = pillarAccent('businessCore');
  const compactInput = `${inputClass} py-1 text-xs`;
  const uom = outputUnitSymbol?.trim() || product?.base_unit_symbol?.trim() || 'unit';

  const showOutputPicker = isCreateMode && !selectedOutputProductId;
  const pendingOption =
    isCreateMode && selectedOutputProductId && !product
      ? outputProducts.find((p) => p.id === selectedOutputProductId)
      : null;
  const showProductHeader = Boolean(product) || Boolean(pendingOption);
  const galleryEntries = product ? normalizeProductImages(product) : [];

  const setField = <K extends keyof BomKeyDetailsDraft>(key: K, value: BomKeyDetailsDraft[K]) => {
    onKeyDetailsChange({ ...keyDetails, [key]: value });
  };

  const commitIfEdit = () => {
    if (!isCreateMode && onKeyDetailsCommit) void onKeyDetailsCommit();
  };

  return (
    <article
      className={`relative ${recordDetail.headerShell} ${updatedAt != null ? 'pb-7' : ''} ${className}`.trim()}
    >
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="shrink-0">
          {product ? (
            <BomProductImagePreview
              entries={galleryEntries}
              defaultUrl={product.image_url}
              alt={product.name}
            />
          ) : (
            <BomProductImagePreview entries={[]} defaultUrl={null} alt="No product selected" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              {showOutputPicker && onOutputProductChange ? (
                <div className="max-w-md space-y-1">
                  <label className={recordDetail.fieldLabelCompact} htmlFor="bom-output-product">
                    Output product
                  </label>
                  <div className="relative">
                    <select
                      id="bom-output-product"
                      value={selectedOutputProductId}
                      onChange={(e) => onOutputProductChange(e.target.value)}
                      disabled={outputProductsLoading}
                      className={`${compactInput} w-full appearance-none pr-8`}
                    >
                      <option value="">
                        {outputProductsLoading
                          ? 'Loading products…'
                          : 'Choose a product for this BOM…'}
                      </option>
                      {outputProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                      aria-hidden
                    />
                  </div>
                  <p className={recordDetail.meta}>
                    Select the finished or manufacturable product this BOM produces.
                  </p>
                </div>
              ) : showProductHeader ? (
                <>
                  <h1 className={`truncate ${recordDetail.title}`}>
                    {product?.name ?? pendingOption?.name ?? 'Loading product…'}
                  </h1>
                  <p className={`${recordDetail.meta} ${accent.subtitleTint}`}>
                    {product
                      ? productSkuSubtitle(product)
                      : pendingOption
                        ? `SKU ${pendingOption.sku || '—'}`
                        : 'Loading…'}
                  </p>
                  {bomCode ? (
                    <p className="font-mono text-xs text-gray-600 dark:text-gray-400">
                      BOM {bomCode}
                    </p>
                  ) : null}
                  {isCreateMode && onOutputProductChange ? (
                    <button
                      type="button"
                      onClick={() => onOutputProductChange('')}
                      className="text-xs font-medium text-green-700 hover:underline dark:text-green-400"
                    >
                      Change output product
                    </button>
                  ) : null}
                </>
              ) : (
                <h1 className={`truncate ${recordDetail.title}`}>Bill of materials</h1>
              )}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
          </div>

          {(product || pendingOption) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              {product?.product_type ? (
                <span className="rounded-md bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                  {product.product_type.replace(/_/g, ' ')}
                </span>
              ) : null}
              {product?.categories?.length ? (
                <span className="truncate">{product.categories.join(' · ')}</span>
              ) : product?.category_name ? (
                <span className="truncate">{product.category_name}</span>
              ) : null}
              <Link
                href={`/products/${selectedOutputProductId || product?.id}`}
                className="font-medium text-green-700 hover:underline dark:text-green-400"
              >
                Open product
              </Link>
            </div>
          )}

          <div className="mt-2.5 border-t border-gray-200/80 pt-2.5 dark:border-gray-700/80">
            <p className={`mb-1.5 ${recordDetail.sectionTitle}`}>BOM details</p>
            <div className={recordDetail.formGrid}>
              <div className="sm:col-span-2 lg:col-span-2">
                <label className={recordDetail.fieldLabelCompact} htmlFor="bom-version">
                  Version
                </label>
                <input
                  id="bom-version"
                  value={keyDetails.version}
                  onChange={(e) => setField('version', e.target.value)}
                  onBlur={commitIfEdit}
                  className={compactInput}
                />
              </div>
              <div className="sm:col-span-3 lg:col-span-2">
                <label className={recordDetail.fieldLabelCompact} htmlFor="bom-output-qty">
                  Output quantity
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id="bom-output-qty"
                    type="number"
                    min="0.0001"
                    step="any"
                    value={keyDetails.output_quantity}
                    onChange={(e) => setField('output_quantity', e.target.value)}
                    onBlur={commitIfEdit}
                    className={`${compactInput} tabular-nums`}
                  />
                  <span className={`shrink-0 ${premiumTypography.helper}`}>{uom}</span>
                </div>
              </div>
              <div className="sm:col-span-7 lg:col-span-8">
                <label className={recordDetail.fieldLabelCompact} htmlFor="bom-notes">
                  Notes
                </label>
                <input
                  id="bom-notes"
                  value={keyDetails.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  onBlur={commitIfEdit}
                  className={compactInput}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex w-full flex-wrap items-start justify-between gap-x-6 gap-y-3 pt-2.5">
            <div className="min-w-0 shrink space-y-1">{footer}</div>
            {product && onUsageUpdate ? (
              <ProductUsageToggles
                product={product}
                disabled={isCreateMode}
                onUpdate={onUsageUpdate}
                className="ml-auto max-w-none shrink-0 pl-0 sm:max-w-[15.75rem] sm:pl-6"
              />
            ) : null}
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
