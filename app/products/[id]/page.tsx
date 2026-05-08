'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, FileDown, Loader2, MoreVertical, Package2, Trash2, Upload } from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import ProductDetailsTabs from '@/components/products/ProductDetailsTabs';
import { ArchiveRestoreActions } from '@/components/common/ArchiveRestoreActions';
import { EntityStatusBadge } from '@/components/common/EntityStatusBadge';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProduct } from '@/hooks/useProduct';
import { useProducts } from '@/hooks/useProducts';
import { logProductArchived, logProductRestored } from '@/lib/auditLog';
import { pillarAccent, premiumTypography } from '@/lib/premiumUi';
import { downloadTableCsv } from '@/lib/csvDownload';
import { getProductPrimaryImageUrl, uploadProductImage } from '@/lib/productImageStorage';
import { productTracksInventory } from '@/lib/productInventoryPolicy';
import { getProductStockStatus, stockHeroBorderClass } from '@/lib/productStockStatus';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/lib/toast';
import type { Product } from '@/types/product';

const bc = pillarAccent('businessCore');

const PRODUCT_STATUS_MAP: Record<string, string> = {
  discontinued: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName: string;
  onConfirm: () => void | Promise<void>;
};

function formatShortDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const rawId = params?.id;
  const productId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;

  const { effectiveTenantId: tenant_id, user } = useTenant();
  const { product, isLoading, error, refreshProduct } = useProduct(productId);
  const { deleteProduct, restoreProduct, updateProduct } = useProducts(
    undefined,
    'created_at',
    'desc',
    {
      loadProducts: false,
    }
  );

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [detailCounts, setDetailCounts] = useState<{
    activeBarcodes: number;
    linkedSuppliers: number;
  } | null>(null);

  const handleProductUpdated = useCallback(async () => {
    await refreshProduct();
  }, [refreshProduct]);

  useEffect(() => {
    if (!overflowOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [overflowOpen]);

  useEffect(() => {
    if (!product?.id) {
      setDetailCounts(null);
      return;
    }
    const pid = product.id;
    let cancelled = false;

    async function load() {
      try {
        const [{ data: barcodes }, priceQuery] = await Promise.all([
          supabase.from('product_barcodes').select('is_active').eq('product_id', pid),
          tenant_id
            ? supabase
                .from('supplier_product_prices')
                .select('supplier_id')
                .eq('product_id', pid)
                .eq('tenant_id', tenant_id)
            : Promise.resolve({ data: [] as { supplier_id: string }[] | null, error: null }),
        ]);
        const priceLinks = priceQuery.data;

        if (cancelled) return;

        const activeBarcodes = (barcodes ?? []).filter((b) => b.is_active !== false).length ?? 0;
        const suppliers = new Set(
          (priceLinks ?? [])
            .map((row) => row.supplier_id)
            .filter((id): id is string => typeof id === 'string' && Boolean(id))
        );

        setDetailCounts({
          activeBarcodes,
          linkedSuppliers: suppliers.size,
        });
      } catch {
        if (!cancelled) setDetailCounts({ activeBarcodes: 0, linkedSuppliers: 0 });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [product?.id, tenant_id]);

  const exportProductCsv = useCallback(() => {
    if (!product) return;
    const {
      sku,
      name,
      short_description,
      product_type,
      industry_type,
      status,
      cost_price,
      sell_price,
    } = product;
    downloadTableCsv(
      `product_${sku || product.id}`,
      [
        'sku',
        'name',
        'short_description',
        'product_type',
        'industry_type',
        'status',
        'cost_price',
        'sell_price',
      ],
      [
        [
          sku,
          name,
          short_description ?? '',
          product_type,
          industry_type,
          status,
          cost_price ?? '',
          sell_price ?? '',
        ],
      ]
    );
    setOverflowOpen(false);
  }, [product]);

  const handlePickImage = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !tenant_id || !product) return;

    try {
      setImageUploading(true);
      const url = await uploadProductImage(tenant_id, file);
      const result = await updateProduct(product.id, { image_url: url });
      if (!result.success) throw new Error(result.error ?? 'Update failed');
      await refreshProduct();
      toast.success('Image updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleArchive = (p: Product) => {
    setOverflowOpen(false);
    setConfirmDialog({
      title: `Archive “${p.name}”?`,
      description: 'The product will be hidden from default catalog lists but data is preserved.',
      confirmLabel: 'Archive',
      confirmClassName:
        'px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white',
      onConfirm: async () => {
        setConfirmDialog(null);
        const r = await deleteProduct(p.id);
        if (r.success && tenant_id) {
          await logProductArchived(tenant_id, p.id, p.name, user?.id ?? null);
          router.replace('/products');
        } else if (!r.success) {
          setPageError(r.error ?? 'Archive failed');
        }
      },
    });
  };

  const handleRestore = (p: Product) => {
    setOverflowOpen(false);
    setConfirmDialog({
      title: `Restore “${p.name}”?`,
      description: 'The product will return to the active catalog and appear in default lists.',
      confirmLabel: 'Restore',
      confirmClassName:
        'px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white',
      onConfirm: async () => {
        setConfirmDialog(null);
        const r = await restoreProduct(p.id);
        if (r.success && tenant_id) {
          await logProductRestored(tenant_id, p.id, p.name, user?.id ?? null);
          await refreshProduct();
        } else if (!r.success) {
          setPageError(r.error ?? 'Restore failed');
        }
      },
    });
  };

  const confirmDialogEl = confirmDialog ? (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setConfirmDialog(null);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="product-detail-confirm-title"
        aria-describedby="product-detail-confirm-desc"
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2
          id="product-detail-confirm-title"
          className="text-base font-semibold text-gray-900 dark:text-white"
        >
          {confirmDialog.title}
        </h2>
        <p
          id="product-detail-confirm-desc"
          className="mt-2 text-sm text-gray-600 dark:text-gray-300"
        >
          {confirmDialog.description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            onClick={() => setConfirmDialog(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={confirmDialog.confirmClassName}
            onClick={() => void confirmDialog.onConfirm()}
          >
            {confirmDialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const loadingTitleSlot = (
    <div className="flex min-w-0 items-center gap-3">
      <div className={bc.iconTile}>
        <Package2 className={`h-5 w-5 ${bc.iconColor}`} aria-hidden />
      </div>
      <div className="min-w-0">
        <h1 className={`truncate ${premiumTypography.pageTitle} ${bc.titleText}`}>Product</h1>
        <p className={`mt-0.5 ${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}>Loading…</p>
      </div>
    </div>
  );

  const heroTitleSlot =
    product &&
    (() => {
      const primaryImage = getProductPrimaryImageUrl(product);
      const stock = getProductStockStatus(product);
      const borderAccent = stockHeroBorderClass(stock.bucket);
      const isArchived = Boolean(product.is_deleted);
      const tracked = productTracksInventory(product);
      const totalStockDisplay =
        product.total_stock != null && tracked ? String(product.total_stock) : tracked ? '0' : '—';

      return (
        <div
          className={`relative rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/80 border-l-[5px] ${borderAccent}`}
        >
          <div className="flex flex-wrap gap-4 p-4 sm:gap-5">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="h-28 w-28 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-inner dark:border-gray-600 dark:bg-gray-950">
                {primaryImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={primaryImage}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package2 className="h-10 w-10 text-gray-400" aria-hidden />
                  </div>
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                aria-hidden
                onChange={(e) => void handleImageChange(e)}
              />
              <button
                type="button"
                disabled={imageUploading}
                onClick={handlePickImage}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {imageUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                )}
                {imageUploading ? 'Uploading…' : 'Change image'}
              </button>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1
                    className={`${premiumTypography.pageTitle} leading-tight text-gray-950 dark:text-white`}
                  >
                    {product.name}
                  </h1>
                  <p
                    className={`mt-0.5 text-sm ${bc.subtitleTint} ${premiumTypography.pageSubtitle}`}
                  >
                    SKU {product.sku || '—'}
                    {' · '}
                    {product.currency?.trim() || 'GBP'}
                  </p>
                  <dl className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 ${premiumTypography.helper}`}>
                    <div className="flex gap-1.5 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      <dt className="font-semibold text-gray-800 dark:text-gray-200">
                        Total stock
                      </dt>
                      <dd className="tabular-nums">{totalStockDisplay}</dd>
                    </div>
                    <div className="flex gap-1.5 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      <dt className="font-semibold text-gray-800 dark:text-gray-200">
                        Active barcodes
                      </dt>
                      <dd className="tabular-nums">
                        {detailCounts ? detailCounts.activeBarcodes : '—'}
                      </dd>
                    </div>
                    <div className="flex gap-1.5 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      <dt className="font-semibold text-gray-800 dark:text-gray-200">
                        Linked suppliers
                      </dt>
                      <dd className="tabular-nums">
                        {detailCounts ? detailCounts.linkedSuppliers : '—'}
                      </dd>
                    </div>
                    <div className="flex min-w-[10rem] gap-1.5 text-gray-600 dark:text-gray-400">
                      <dt className="shrink-0 font-semibold text-gray-800 dark:text-gray-200">
                        Last updated
                      </dt>
                      <dd className="min-w-0 truncate">{formatShortDate(product.updated_at)}</dd>
                    </div>
                  </dl>
                  {isArchived && (
                    <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                      Archived — hidden from default catalog lists.
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <ArchiveRestoreActions
                      entity={product}
                      isArchived={isArchived}
                      onArchive={handleArchive}
                      onRestore={handleRestore}
                      archiveTitle="Archive: keep data but hide from default lists."
                      restoreTitle="Restore this product to the active catalog."
                    />

                    <div className="relative" ref={overflowRef}>
                      <button
                        type="button"
                        aria-expanded={overflowOpen}
                        aria-haspopup="menu"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOverflowOpen((o) => !o);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        title="More actions"
                      >
                        <MoreVertical className="h-4 w-4" aria-hidden />
                      </button>
                      {overflowOpen && (
                        <div
                          role="menu"
                          className="absolute right-0 z-40 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-900"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            disabled
                            title="Coming soon"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-400 dark:text-gray-500"
                          >
                            <Copy className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                            Duplicate
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                            onClick={exportProductCsv}
                          >
                            <FileDown className="h-4 w-4 shrink-0" aria-hidden />
                            Export CSV
                          </button>
                          {!isArchived && (
                            <button
                              type="button"
                              role="menuitem"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                              onClick={() => handleArchive(product)}
                            >
                              <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <EntityStatusBadge status={product.status} statusMap={PRODUCT_STATUS_MAP} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    })();

  return (
    <ProtectedRoute>
      {confirmDialogEl}
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          backHref="/products"
          backLabel="Products"
          {...(product && !isLoading
            ? { titleSlot: heroTitleSlot }
            : error && !isLoading
              ? {
                  icon: Package2,
                  title: 'Product',
                  subtitle: typeof error === 'string' ? error : 'Unable to load this product',
                  subtitleClassName: `${premiumTypography.pageSubtitle} ${bc.subtitleTint}`,
                }
              : isLoading
                ? { titleSlot: loadingTitleSlot }
                : {
                    icon: Package2,
                    title: 'Product',
                    subtitle: 'Select a product from the list',
                    subtitleClassName: `${premiumTypography.pageSubtitle} ${bc.subtitleTint}`,
                  })}
        />

        {pageError && (
          <div
            className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-400"
            role="alert"
          >
            <span>{pageError}</span>
            <button
              type="button"
              onClick={() => setPageError(null)}
              className="shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
          {isLoading && (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-gray-500"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-8 w-8 animate-spin text-green-600 dark:text-green-500" />
              <span className={premiumTypography.body}>Loading product…</span>
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-sm text-amber-900 dark:text-amber-200">{error}</p>
              <Link
                href="/products"
                className="mt-4 inline-block text-sm font-medium text-green-700 underline dark:text-green-400"
              >
                Back to products
              </Link>
            </div>
          )}

          {!isLoading && product && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-2">
              <ProductDetailsTabs
                product={product}
                onProductUpdated={handleProductUpdated}
                onSelectProduct={(id) => {
                  router.push(`/products/${id}`);
                }}
              />
            </div>
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
