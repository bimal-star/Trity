'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import AddCategoryModal from '@/components/products/AddCategoryModal';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import ProductList from '@/components/products/ProductList';
import ProductMasterCard from '@/components/products/ProductMasterCard';
import ProductDetailsTabs from '@/components/products/ProductDetailsTabs';
import { useProducts } from '@/hooks/useProducts';
import { useTenant } from '@/contexts/TenantContext';
import { useCatalogueMode } from '@/hooks/useCatalogueMode';
import { Product, ProductFilters, StatusType, ProductType } from '@/types/product';
import {
  pillarAccent,
  premiumPrimaryButton,
  premiumSurfaces,
  premiumTertiaryButton,
  premiumTypography,
} from '@/lib/premiumUi';
import { Package2, Plus } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ExportFormatDropdown } from '@/components/common/ExportFormatDropdown';
import { logProductArchived, logProductRestored } from '@/lib/auditLog';

const bc = pillarAccent('businessCore');

type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName: string;
  onConfirm: () => void | Promise<void>;
};

export default function ProductsPage() {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const { supportsGroups } = useCatalogueMode();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StatusType>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | ProductType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const filters = useMemo((): ProductFilters | undefined => {
    const q = search.trim();
    const base: ProductFilters = {
      recordVisibility: showArchived ? 'all' : 'active',
      status: statusFilter === 'all' ? 'all' : statusFilter,
    };
    if (productTypeFilter !== 'all') base.product_type = productTypeFilter;
    if (categoryFilter !== 'all') base.categories = [categoryFilter];
    if (q) base.searchQuery = q;
    return base;
  }, [search, statusFilter, productTypeFilter, categoryFilter, showArchived]);

  const { products, isLoading, error, deleteProduct, restoreProduct, refreshProducts } =
    useProducts(filters, 'created_at', 'desc');

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  const handleProductUpdated = async () => {
    const list = await refreshProducts();
    setSelectedProduct((prev) => (prev ? (list.find((p) => p.id === prev.id) ?? prev) : null));
  };

  const categoryOptions = ['all'];

  const filterActive =
    Boolean(search.trim()) ||
    statusFilter !== 'all' ||
    productTypeFilter !== 'all' ||
    categoryFilter !== 'all';

  const handleArchive = (product: Product) => {
    setConfirmDialog({
      title: `Archive “${product.name}”?`,
      description: 'The product will be hidden from default catalog lists but data is preserved.',
      confirmLabel: 'Archive',
      confirmClassName:
        'px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white',
      onConfirm: async () => {
        setConfirmDialog(null);
        const r = await deleteProduct(product.id);
        if (r.success && tenant_id) {
          await logProductArchived(tenant_id, product.id, product.name, user?.id ?? null);
          if (selectedProduct?.id === product.id) setSelectedProduct(null);
        } else if (!r.success) {
          setPageError(r.error ?? 'Archive failed');
        }
      },
    });
  };

  const handleSelectProductById = useCallback(
    (id: string) => {
      const p = products.find((x) => x.id === id);
      if (p) setSelectedProduct(p);
    },
    [products]
  );

  const handleRestore = (product: Product) => {
    setConfirmDialog({
      title: `Restore “${product.name}”?`,
      description: 'The product will return to the active catalog and appear in default lists.',
      confirmLabel: 'Restore',
      confirmClassName:
        'px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white',
      onConfirm: async () => {
        setConfirmDialog(null);
        const r = await restoreProduct(product.id);
        if (r.success && tenant_id) {
          await logProductRestored(tenant_id, product.id, product.name, user?.id ?? null);
        } else if (!r.success) {
          setPageError(r.error ?? 'Restore failed');
        }
      },
    });
  };

  const confirmDialogEl = confirmDialog ? (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setConfirmDialog(null);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="page-confirm-title"
        aria-describedby="page-confirm-desc"
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2
          id="page-confirm-title"
          className="text-base font-semibold text-gray-900 dark:text-white"
        >
          {confirmDialog.title}
        </h2>
        <p id="page-confirm-desc" className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {confirmDialog.description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
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

  return (
    <ProtectedRoute>
      {confirmDialogEl}
      <AddCategoryModal
        open={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
        onCreated={({ name }) => {
          void refreshProducts();
          setCategoryFilter(name);
        }}
      />
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          icon={Package2}
          title="Products"
          subtitle="Create and manage product catalog, specifications, and pricing"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
          right={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <ExportFormatDropdown
                filenameBase={`products_export_${new Date().toISOString().split('T')[0]}`}
                title="Export visible list as CSV"
                getData={() => ({
                  headers: [
                    'sku',
                    'name',
                    'short_description',
                    'product_type',
                    'industry_type',
                    'status',
                    'cost_price',
                    'sell_price',
                  ],
                  rows: products.map((p) => [
                    p.sku,
                    p.name,
                    p.short_description ?? '',
                    p.product_type,
                    p.industry_type,
                    p.status,
                    p.cost_price ?? '',
                    p.sell_price ?? '',
                  ]),
                })}
                buttonClassName={premiumTertiaryButton('sm', 'standard')}
              />
              {supportsGroups && (
                <Link href="/products/groups" className={premiumTertiaryButton('sm', 'standard')}>
                  Product groups
                </Link>
              )}
              <Link
                href="/products/new"
                className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
              >
                <Plus className="w-3.5 h-3.5" aria-hidden />
                New Product
              </Link>
            </div>
          }
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
        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        {/* Fill main column (~sidebar h-screen): chrome ≈ PageContainer pt/pb + header + divider */}
        <div className="flex h-[calc(100vh-132px)] min-h-[min(560px,calc(100vh-132px))] w-full flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-3 lg:items-stretch">
            <div className="flex h-full min-h-0 flex-col lg:col-span-1">
              <ProductList
                products={products}
                productTypeFilter={productTypeFilter}
                onProductTypeFilterChange={setProductTypeFilter}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                categoryOptions={categoryOptions}
                selectedProductId={selectedProduct?.id ?? null}
                isLoading={isLoading}
                error={error}
                search={search}
                onSearchChange={setSearch}
                onSelect={setSelectedProduct}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                filterActive={filterActive}
                onOpenAddCategory={() => setAddCategoryOpen(true)}
                showGroupColumn={supportsGroups}
                showArchived={showArchived}
                onShowArchivedChange={setShowArchived}
              />
            </div>

            <div className="lg:col-span-2 space-y-4 min-w-0 overflow-hidden min-h-0 h-full flex flex-col">
              <div className="shrink-0">
                <ProductMasterCard
                  product={selectedProduct}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                />
              </div>
              {selectedProduct && (
                <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
                  <ProductDetailsTabs
                    product={selectedProduct}
                    onProductUpdated={handleProductUpdated}
                    onSelectProduct={handleSelectProductById}
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
