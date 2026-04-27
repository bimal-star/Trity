'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AddCategoryModal from '@/components/products/AddCategoryModal';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import ProductList from '@/components/products/ProductList';
import ProductMasterCard from '@/components/products/ProductMasterCard';
import ProductDetailsTabs from '@/components/products/ProductDetailsTabs';
import { useProducts } from '@/hooks/useProducts';
import { useTenant } from '@/contexts/TenantContext';
import { useCatalogueMode } from '@/hooks/useCatalogueMode';
import {
  Product,
  ProductFilters,
  ProductRecordVisibility,
  ProductType,
  StatusType,
} from '@/types/product';
import {
  pillarAccent,
  premiumPrimaryButton,
  premiumTertiaryButton,
  premiumTypography,
} from '@/lib/premiumUi';
import { Package2, Plus } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ExportFormatDropdown } from '@/components/common/ExportFormatDropdown';
import { logProductArchived, logProductRestored } from '@/lib/auditLog';
import { CategoryNode, CategoryTier, loadCategoryStructure } from '@/lib/categories';

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
  const [selectedCategoryNodeIdsByTier, setSelectedCategoryNodeIdsByTier] = useState<
    Record<number, string[]>
  >({});
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [recordVisibility, setRecordVisibility] = useState<ProductRecordVisibility>('active');
  const [categoryTiers, setCategoryTiers] = useState<CategoryTier[]>([]);
  const [categoryNodesByTier, setCategoryNodesByTier] = useState<Record<number, CategoryNode[]>>(
    {}
  );
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const filters = useMemo((): ProductFilters | undefined => {
    const q = search.trim();
    const base: ProductFilters = {
      recordVisibility,
      status: statusFilter === 'all' ? 'all' : statusFilter,
    };
    if (productTypeFilter !== 'all') base.product_type = productTypeFilter;
    if (Object.values(selectedCategoryNodeIdsByTier).some((ids) => ids.length > 0)) {
      base.categoryNodeIdsByTier = selectedCategoryNodeIdsByTier;
    }
    if (tagFilter !== 'all') base.tags = [tagFilter];
    if (q) base.searchQuery = q;
    return base;
  }, [
    search,
    statusFilter,
    productTypeFilter,
    selectedCategoryNodeIdsByTier,
    tagFilter,
    recordVisibility,
  ]);

  const { products, isLoading, error, deleteProduct, restoreProduct, refreshProducts } =
    useProducts(filters, 'created_at', 'desc');

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  const reloadCategoryStructure = useCallback(async () => {
    if (!tenant_id) {
      setCategoryTiers([]);
      setCategoryNodesByTier({});
      setCategoriesError(null);
      return;
    }
    try {
      const structure = await loadCategoryStructure(tenant_id);
      setCategoryTiers(structure.tiers);
      setCategoryNodesByTier(structure.nodesByTier);
      setCategoriesError(null);
    } catch (err) {
      console.error('Failed to load category tier structure:', err);
      setCategoryTiers([]);
      setCategoryNodesByTier({});
      setCategoriesError(err instanceof Error ? err.message : 'Failed to load categories');
    }
  }, [tenant_id]);

  useEffect(() => {
    void reloadCategoryStructure();
  }, [reloadCategoryStructure]);

  const handleProductUpdated = async () => {
    const list = await refreshProducts();
    setSelectedProduct((prev) => (prev ? (list.find((p) => p.id === prev.id) ?? prev) : null));
  };

  const tagOptions = useMemo(() => {
    const tagSet = new Set<string>();
    products.forEach((product) => {
      product.tags?.forEach((tag) => {
        const normalized = tag.trim();
        if (normalized) tagSet.add(normalized);
      });
    });
    if (tagFilter !== 'all') tagSet.add(tagFilter);
    return ['all', ...Array.from(tagSet).sort((a, b) => a.localeCompare(b))];
  }, [products, tagFilter]);

  const filterActive =
    Boolean(search.trim()) ||
    statusFilter !== 'all' ||
    productTypeFilter !== 'all' ||
    Object.values(selectedCategoryNodeIdsByTier).some((ids) => ids.length > 0) ||
    tagFilter !== 'all' ||
    recordVisibility !== 'active';

  const handleToggleCategoryNode = useCallback(
    (tierNumber: number, nodeId: string, isMultiSelect: boolean) => {
      setSelectedCategoryNodeIdsByTier((prev) => {
        const current = prev[tierNumber] ?? [];
        const exists = current.includes(nodeId);
        let nextForTier: string[];

        if (isMultiSelect) {
          nextForTier = exists ? current.filter((id) => id !== nodeId) : [...current, nodeId];
        } else {
          nextForTier = exists ? [] : [nodeId];
        }

        const next: Record<number, string[]> = {};
        Object.entries(prev).forEach(([key, ids]) => {
          const numKey = Number(key);
          if (numKey <= tierNumber) next[numKey] = ids;
        });
        if (nextForTier.length > 0) next[tierNumber] = nextForTier;
        else delete next[tierNumber];

        return next;
      });
    },
    []
  );

  const clearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('all');
    setProductTypeFilter('all');
    setSelectedCategoryNodeIdsByTier({});
    setTagFilter('all');
    setRecordVisibility('active');
  }, []);

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
        onCreated={() => {
          void refreshProducts();
          void reloadCategoryStructure();
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
        {/* Fill remaining column below header (flex chain from LayoutWrapper → PageContainer) */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1.35fr_1.65fr] lg:items-stretch">
            <div className="flex h-full min-h-0 flex-col">
              <ProductList
                products={products}
                productTypeFilter={productTypeFilter}
                onProductTypeFilterChange={setProductTypeFilter}
                categoryTiers={categoryTiers}
                categoryNodesByTier={categoryNodesByTier}
                selectedCategoryNodeIdsByTier={selectedCategoryNodeIdsByTier}
                onToggleCategoryNode={handleToggleCategoryNode}
                tagFilter={tagFilter}
                onTagFilterChange={setTagFilter}
                tagOptions={tagOptions}
                recordVisibility={recordVisibility}
                onRecordVisibilityChange={setRecordVisibility}
                selectedProductId={selectedProduct?.id ?? null}
                isLoading={isLoading}
                error={error}
                categoriesError={categoriesError}
                search={search}
                onSearchChange={setSearch}
                onSelect={setSelectedProduct}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                filterActive={filterActive}
                onClearFilters={clearFilters}
                onOpenAddCategory={() => setAddCategoryOpen(true)}
                showGroupColumn={supportsGroups}
              />
            </div>

            <div className="space-y-4 min-w-0 overflow-hidden min-h-0 h-full flex flex-col">
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
