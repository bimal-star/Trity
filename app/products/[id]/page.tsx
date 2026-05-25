'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, FileDown, Loader2, MoreVertical, Package2, Plus, Trash2 } from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import ProductDetailsTabs from '@/components/products/ProductDetailsTabs';
import ProductImageGallery from '@/components/products/ProductImageGallery';
import ProductKeyDetailsModal from '@/components/products/ProductKeyDetailsModal';
import ProductRecordSummaryCard from '@/components/products/ProductRecordSummaryCard';
import { type ProductUsagePatch } from '@/components/products/ProductUsageToggles';
import { logProductCreated } from '@/lib/auditLog';
import {
  emptyProductKeyDetailsDraft,
  keyDetailsToCreateFormData,
  keyDetailsToProductPreview,
  productToKeyDetailsDraft,
} from '@/lib/productKeyDetails';
import { defaultUsageForProductType } from '@/lib/productUsageDefaults';
import { ArchiveRestoreActions } from '@/components/common/ArchiveRestoreActions';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProduct } from '@/hooks/useProduct';
import { useProductRecordNav } from '@/hooks/useProductRecordNav';
import { useProducts } from '@/hooks/useProducts';
import { logProductArchived, logProductRestored } from '@/lib/auditLog';
import { pillarAccent, premiumTypography } from '@/lib/premiumUi';
import { downloadTableCsv } from '@/lib/csvDownload';
import { getImpersonationFromSession } from '@/lib/impersonation';
import {
  appendProductImages,
  buildProductImagesRemovePatch,
  clampImageIndex,
  getDefaultImageIndex,
  normalizeProductImages,
  productImageDefaultPatch,
} from '@/lib/productImages';
import { deleteProductImageByUrl, uploadProductImage } from '@/lib/productImageStorage';
import { getProductStockStatus, stockRecordBorderClass } from '@/lib/productStockStatus';
import { useToast } from '@/lib/toast';
import type { Product, StatusType } from '@/types/product';

const bc = pillarAccent('businessCore');

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
  const isCreateMode = productId === 'new';

  const { effectiveTenantId: tenant_id, user } = useTenant();
  const { product, isLoading, error, refreshProduct, patchProduct } = useProduct(
    isCreateMode ? undefined : productId
  );
  const { deleteProduct, restoreProduct, updateProduct, createProduct } = useProducts(
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
  const [imageUploading, setImageUploading] = useState(false);
  const [imageRemoving, setImageRemoving] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [keyDetails, setKeyDetails] = useState(emptyProductKeyDetailsDraft);
  const [usageDraft, setUsageDraft] = useState<ProductUsagePatch>(() => {
    const u = defaultUsageForProductType('finished_good');
    return {
      is_sellable: u.is_sellable,
      is_purchasable: u.is_purchasable,
      is_manufacturable: u.is_manufacturable,
      is_component: u.is_component,
    };
  });
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const recordNav = useProductRecordNav(
    tenant_id ?? undefined,
    isCreateMode ? undefined : productId
  );

  const displayProduct = useMemo(() => {
    if (isCreateMode) {
      const preview = keyDetailsToProductPreview(keyDetails, tenant_id ?? '');
      return { ...preview, ...usageDraft };
    }
    return product;
  }, [isCreateMode, keyDetails, tenant_id, usageDraft, product]);

  const galleryEntries = useMemo(
    () => (displayProduct ? normalizeProductImages(displayProduct) : []),
    [displayProduct]
  );

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [productId]);

  useEffect(() => {
    if (!product || product.id !== productId) return;
    const entries = normalizeProductImages(product);
    setSelectedImageIndex((prev) => {
      if (entries.length === 0) return 0;
      if (prev >= entries.length) {
        return getDefaultImageIndex(entries, product.image_url);
      }
      return prev;
    });
  }, [product, productId]);

  const mediaDisabled = useMemo(() => {
    if (isCreateMode) return true;
    if (!product || product.is_deleted) return true;
    if (user) {
      const imp = getImpersonationFromSession(user);
      if (imp?.readOnly) return true;
    }
    return false;
  }, [isCreateMode, product, user]);

  const handleProductUpdated = useCallback(async () => {
    await refreshProduct();
  }, [refreshProduct]);

  const handleUsageUpdate = useCallback(
    async (patch: ProductUsagePatch) => {
      if (isCreateMode) {
        setUsageDraft((prev) => ({ ...prev, ...patch }));
        return;
      }
      if (!product) return;
      const prev: ProductUsagePatch = {
        is_sellable: product.is_sellable,
        is_purchasable: product.is_purchasable,
        is_manufacturable: product.is_manufacturable,
        is_component: product.is_component,
      };
      patchProduct(patch);
      const result = await updateProduct(product.id, patch);
      if (!result.success) {
        patchProduct(prev);
        toast.error(result.error ?? 'Failed to update product usage');
        throw new Error(result.error);
      }
    },
    [isCreateMode, product, updateProduct, patchProduct, toast]
  );

  const handleStatusChange = useCallback(
    async (status: StatusType) => {
      if (isCreateMode) {
        setKeyDetails((prev) => ({ ...prev, status }));
        return;
      }
      if (!product || product.status === status) return;
      setStatusUpdating(true);
      try {
        const result = await updateProduct(product.id, { status });
        if (!result.success) {
          toast.error(result.error ?? 'Failed to update status');
          return;
        }
        await refreshProduct();
        toast.success('Status updated.');
      } finally {
        setStatusUpdating(false);
      }
    },
    [isCreateMode, product, updateProduct, refreshProduct, toast]
  );

  const handleKeyDetailsSave = useCallback(
    async (draft: typeof keyDetails) => {
      if (isCreateMode) {
        setKeyDetails(draft);
        const usage = defaultUsageForProductType(draft.product_type);
        setUsageDraft({
          is_sellable: usage.is_sellable,
          is_purchasable: usage.is_purchasable,
          is_manufacturable: usage.is_manufacturable,
          is_component: usage.is_component,
        });
        return;
      }
      if (!product) return;
      const result = await updateProduct(product.id, {
        name: draft.name.trim(),
        short_description: draft.short_description.trim() || undefined,
        description: draft.description.trim() || undefined,
        industry_type: draft.industry_type,
        product_type: draft.product_type,
        status: draft.status,
      });
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to update product');
      }
      await refreshProduct();
      toast.success('Product details updated.');
    },
    [isCreateMode, product, updateProduct, refreshProduct, toast]
  );

  const handleCreateProduct = useCallback(async () => {
    if (!keyDetails.sku.trim() || !keyDetails.name.trim()) {
      toast.error('Open Edit and enter SKU and name before creating.');
      setDetailsModalOpen(true);
      return;
    }
    setCreating(true);
    try {
      const payload = {
        ...keyDetailsToCreateFormData(keyDetails),
        ...usageDraft,
      };
      const result = await createProduct(payload);
      if (!result.success || !result.data?.id) {
        toast.error(result.error ?? 'Failed to create product');
        return;
      }
      if (tenant_id) {
        await logProductCreated(
          tenant_id,
          result.data.id,
          payload.name,
          payload.sku || 'N/A',
          user?.id ?? null
        );
      }
      toast.success('Product created.');
      router.replace(`/products/${result.data.id}`);
    } finally {
      setCreating(false);
    }
  }, [keyDetails, usageDraft, createProduct, tenant_id, user?.id, router, toast]);

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

  const handleImageUpload = useCallback(
    async (files: File[]) => {
      if (!product || files.length === 0) return;
      if (!tenant_id) {
        toast.error('Workspace is not available. Sign in again or select a tenant.');
        return;
      }

      try {
        setImageUploading(true);
        const urls: string[] = [];
        for (const file of files) {
          urls.push(await uploadProductImage(tenant_id, file));
        }
        if (urls.length === 0) {
          throw new Error('No images were uploaded.');
        }

        const current = normalizeProductImages(product);
        const nextGallery = appendProductImages(current, urls);
        if (nextGallery.length === current.length) {
          throw new Error('Image was not added to the gallery.');
        }

        const hasCover = Boolean(product.image_url?.trim());
        const patch: { images: typeof nextGallery; image_url?: string } = {
          images: nextGallery,
        };
        if (!hasCover && urls[0]) {
          patch.image_url = urls[0];
        }

        const result = await updateProduct(product.id, patch);
        if (!result.success) throw new Error(result.error ?? 'Update failed');

        const firstNewIdx = nextGallery.findIndex((e) => urls.includes(e.url));
        if (firstNewIdx >= 0) {
          setSelectedImageIndex(firstNewIdx);
        }

        const refreshed = await refreshProduct();
        if (refreshed) {
          const synced = normalizeProductImages(refreshed);
          setSelectedImageIndex(
            clampImageIndex(
              synced.findIndex((e) => urls.includes(e.url)),
              synced.length
            )
          );
        }
        toast.success(urls.length === 1 ? 'Image added.' : `${urls.length} images added.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to upload image');
      } finally {
        setImageUploading(false);
      }
    },
    [tenant_id, product, updateProduct, refreshProduct, toast]
  );

  const handleImageRemove = useCallback(
    async (url: string) => {
      if (!product || !url.trim()) return;

      try {
        setImageRemoving(true);
        const patch = buildProductImagesRemovePatch(product, url);
        const result = await updateProduct(product.id, patch);
        if (!result.success) throw new Error(result.error ?? 'Update failed');

        try {
          await deleteProductImageByUrl(url);
        } catch (storageErr) {
          console.warn('Storage delete failed (gallery updated):', storageErr);
        }

        await refreshProduct();
        toast.success('Image removed.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove image');
      } finally {
        setImageRemoving(false);
      }
    },
    [product, updateProduct, refreshProduct, toast]
  );

  const handleSetDefaultImage = useCallback(async () => {
    if (!product) return;
    const entries = normalizeProductImages(product);
    const entry = entries[selectedImageIndex];
    if (!entry) return;
    if (product.image_url?.trim() === entry.url) return;

    try {
      setSettingDefault(true);
      const result = await updateProduct(product.id, productImageDefaultPatch(entry.url));
      if (!result.success) throw new Error(result.error ?? 'Update failed');
      await refreshProduct();
      toast.success('Default image updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default image');
    } finally {
      setSettingDefault(false);
    }
  }, [product, selectedImageIndex, updateProduct, refreshProduct, toast]);

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

  const renderSummaryCard = (p: Product) => {
    const entries = galleryEntries;
    const stock = getProductStockStatus(p);
    const isArchived = !isCreateMode && Boolean(p.is_deleted);
    const skuSubtitle =
      isCreateMode && !keyDetails.sku.trim()
        ? 'SKU required · GBP'
        : `SKU ${p.sku || '—'} · ${p.currency?.trim() || 'GBP'}`;

    return (
      <ProductRecordSummaryCard
        product={p}
        title={p.name}
        subtitle={<>{skuSubtitle}</>}
        updatedAt={isCreateMode ? undefined : formatShortDate(p.updated_at)}
        accentClassName={stockRecordBorderClass(stock.bucket)}
        onEditDetails={() => setDetailsModalOpen(true)}
        editDetailsLabel={isCreateMode ? 'Details' : 'Edit'}
        imagePanel={
          <ProductImageGallery
            entries={entries}
            defaultUrl={p.image_url}
            selectedIndex={selectedImageIndex}
            onSelectIndex={setSelectedImageIndex}
            onUpload={handleImageUpload}
            onSetDefault={handleSetDefaultImage}
            onRemove={mediaDisabled ? undefined : handleImageRemove}
            uploading={imageUploading}
            settingDefault={settingDefault}
            removing={imageRemoving}
            disabled={mediaDisabled}
          />
        }
        actions={
          isCreateMode ? (
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleCreateProduct()}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-green-600 px-3 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              Create product
            </button>
          ) : (
            <>
              <ArchiveRestoreActions
                entity={p}
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
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
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
                        onClick={() => handleArchive(p)}
                      >
                        <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )
        }
        footer={
          isCreateMode ? (
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Draft — not saved yet
            </p>
          ) : isArchived ? (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Archived — hidden from default catalog lists.
            </p>
          ) : undefined
        }
        isArchived={isArchived}
        statusUpdating={statusUpdating}
        onStatusChange={(s) => void handleStatusChange(s)}
        onUsageUpdate={handleUsageUpdate}
        recordNav={
          !isCreateMode && recordNav.total > 0
            ? {
                index: recordNav.index,
                total: recordNav.total,
                prevId: recordNav.prevId,
                nextId: recordNav.nextId,
                isLoading: recordNav.isLoading,
                onNavigate: (id) => router.push(`/products/${id}`),
              }
            : undefined
        }
        className="mb-0 shrink-0"
      />
    );
  };

  return (
    <ProtectedRoute>
      {confirmDialogEl}
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          backHref="/products"
          backLabel="Products"
          className="!mb-0 !border-b-0 !py-0 [&_a]:!mb-2.5"
          {...(!isCreateMode && error && !isLoading
            ? {
                icon: Package2,
                title: 'Product',
                subtitle: typeof error === 'string' ? error : 'Unable to load this product',
                subtitleClassName: `${premiumTypography.pageSubtitle} ${bc.subtitleTint}`,
              }
            : !isCreateMode && isLoading
              ? {
                  icon: Package2,
                  title: 'Product',
                  subtitle: 'Loading…',
                  subtitleClassName: `${premiumTypography.pageSubtitle} ${bc.subtitleTint}`,
                }
              : !isCreateMode && !product
                ? {
                    icon: Package2,
                    title: 'Product',
                    subtitle: 'Select a product from the list',
                    subtitleClassName: `${premiumTypography.pageSubtitle} ${bc.subtitleTint}`,
                  }
                : {})}
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
          {!isCreateMode && isLoading && (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-gray-500"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-8 w-8 animate-spin text-green-600 dark:text-green-500" />
              <span className={premiumTypography.body}>Loading product…</span>
            </div>
          )}

          {!isCreateMode && !isLoading && error && (
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

          {displayProduct && (isCreateMode || (!isLoading && product)) && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {renderSummaryCard(displayProduct)}
              <ProductDetailsTabs
                product={displayProduct}
                createMode={isCreateMode}
                creating={creating}
                onCreateProduct={handleCreateProduct}
                onProductUpdated={handleProductUpdated}
                onSelectProduct={(id) => {
                  router.push(`/products/${id}`);
                }}
              />
            </div>
          )}
        </div>
      </PageContainer>
      <ProductKeyDetailsModal
        open={detailsModalOpen}
        isCreateMode={isCreateMode}
        initial={
          isCreateMode ? keyDetails : product ? productToKeyDetailsDraft(product) : keyDetails
        }
        onClose={() => setDetailsModalOpen(false)}
        onSave={handleKeyDetailsSave}
      />
    </ProtectedRoute>
  );
}
