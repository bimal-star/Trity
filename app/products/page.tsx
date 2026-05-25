'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AddCategoryModal from '@/components/products/AddCategoryModal';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import ProductList from '@/components/products/ProductList';
import { useProducts } from '@/hooks/useProducts';
import { useTenant } from '@/contexts/TenantContext';
import { useCatalogueMode } from '@/hooks/useCatalogueMode';
import {
  ProductFilters,
  ProductRecordVisibility,
  ProductSortField,
  ProductType,
  SortDirection,
  StatusType,
} from '@/types/product';
import { fetchTenantProductCounts } from '@/lib/productTenantStats';
import {
  pillarAccent,
  premiumFocusRing,
  premiumInputComfortableBase,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumInputCompact,
  premiumSurfaces,
  premiumTertiaryButton,
  premiumTypography,
} from '@/lib/premiumUi';
import { Loader2, Package2, Plus } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ExportFormatDropdown } from '@/components/common/ExportFormatDropdown';
import { CategoryNode, CategoryTier, loadCategoryStructure } from '@/lib/categories';
import FilterDrawer, { FILTER_DRAWER_DEFAULT_WIDTH_PX } from '@/components/common/FilterDrawer';
import { useTableView } from '@/src/hooks/useTableView';
import {
  buildDefinitionFromPageState,
  buildSystemDefinitionV1,
  deserializeCategoryTiers,
} from '@/lib/productListViewDefinition';
import {
  isProductListViewDefinitionV1,
  type ProductListViewDefinitionV1,
} from '@/types/productListViews';
import {
  getDefaultProductListColumnOrder,
  getProductListTableColumnDefinitions,
  getSystemDefaultHidden,
  PRODUCT_LIST_PAGE_KEY,
} from '@/lib/productListColumnCatalog';

const bc = pillarAccent('businessCore');

/** Lifecycle status dropdown (Products list drawer). */
const DRAWER_STATUS_FILTERS: { value: 'all' | StatusType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'discontinued', label: 'Discontinued' },
  { value: 'planned', label: 'Planned' },
  { value: 'development', label: 'Development' },
];

export default function ProductsPage() {
  const router = useRouter();
  const { effectiveTenantId: tenant_id, user, profile } = useTenant();
  const { supportsGroups } = useCatalogueMode();
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
  const [sortField, setSortField] = useState<ProductSortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  type SortOption = 'recent' | 'name_asc' | 'price_asc';

  const handleSortUiChange = useCallback((key: SortOption) => {
    switch (key) {
      case 'name_asc':
        setSortField('name');
        setSortDirection('asc');
        break;
      case 'price_asc':
        setSortField('sell_price');
        setSortDirection('asc');
        break;
      case 'recent':
      default:
        setSortField('created_at');
        setSortDirection('desc');
        break;
    }
  }, []);

  const sortUiValue: SortOption =
    sortField === 'name' && sortDirection === 'asc'
      ? 'name_asc'
      : sortField === 'sell_price' && sortDirection === 'asc'
        ? 'price_asc'
        : 'recent';

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

  const { products, isLoading, error, refreshProducts, deleteProduct } = useProducts(
    filters,
    sortField,
    sortDirection
  );

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [tenantCounts, setTenantCounts] = useState<{
    catalogActive: number;
    archived: number;
    lowStock: number;
  } | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    getDefaultProductListColumnOrder(supportsGroups)
  );
  const [columnHidden, setColumnHidden] = useState<string[]>(() => [
    ...getSystemDefaultHidden(supportsGroups),
  ]);
  const [listViewSelection, setListViewSelection] = useState<string>('system');
  const [saveListViewOpen, setSaveListViewOpen] = useState(false);
  const [saveListViewName, setSaveListViewName] = useState('');
  const [saveListViewSaving, setSaveListViewSaving] = useState(false);
  const [saveListViewError, setSaveListViewError] = useState<string | null>(null);
  const saveListViewNameInputRef = useRef<HTMLInputElement>(null);
  const listBootstrapRef = useRef(false);
  const listTableViewApiRef = useRef<ReturnType<
    typeof useTableView<ProductListViewDefinitionV1>
  > | null>(null);

  const columnDefinitions = useMemo(
    () => getProductListTableColumnDefinitions(supportsGroups),
    [supportsGroups]
  );

  const coerceProductListViewDefinition = useCallback(
    (raw: unknown): ProductListViewDefinitionV1 =>
      isProductListViewDefinitionV1(raw) ? raw : buildSystemDefinitionV1(supportsGroups),
    [supportsGroups]
  );

  const buildProductListSystemDefinition = useCallback(
    () => buildSystemDefinitionV1(supportsGroups),
    [supportsGroups]
  );

  const listTableViewApi = useTableView<ProductListViewDefinitionV1>({
    pageKey: PRODUCT_LIST_PAGE_KEY,
    tenantId: tenant_id,
    userId: user?.id ?? null,
    columnDefinitions,
    coerceDefinition: coerceProductListViewDefinition,
    buildSystemDefinition: buildProductListSystemDefinition,
  });
  listTableViewApiRef.current = listTableViewApi;

  const canWorkspaceDefault =
    profile?.role === 'admin' ||
    profile?.role === 'super_admin' ||
    profile?.role === 'platform_admin';

  const applyViewDefinition = useCallback((def: ProductListViewDefinitionV1) => {
    setSearch(def.filters.search);
    setStatusFilter(def.filters.statusFilter);
    setProductTypeFilter(def.filters.productTypeFilter);
    setTagFilter(def.filters.tagFilter);
    setRecordVisibility(def.filters.recordVisibility);
    setSelectedCategoryNodeIdsByTier(
      deserializeCategoryTiers(def.filters.selectedCategoryNodeIdsByTier)
    );
    setSortField(def.sort.sortField);
    setSortDirection(def.sort.sortDirection);
    setColumnOrder(def.columns.order);
    setColumnHidden(def.columns.hidden);
  }, []);

  useEffect(() => {
    listBootstrapRef.current = false;
  }, [tenant_id, user?.id]);

  useEffect(() => {
    if (!listTableViewApi.ready || !tenant_id || !user?.id) return;
    if (listBootstrapRef.current) return;
    listBootstrapRef.current = true;
    const api = listTableViewApiRef.current;
    if (!api) return;
    const def = api.pickInitialDefinition();
    applyViewDefinition(def);
    const personal = api.views.find((v) => v.is_personal_default);
    if (personal) setListViewSelection(personal.id);
    else if (api.workspaceDefinition) setListViewSelection('workspace');
    else setListViewSelection('system');
  }, [listTableViewApi.ready, tenant_id, user?.id, applyViewDefinition]);

  useEffect(() => {
    setColumnOrder((prev) => {
      let next = [...prev];
      if (supportsGroups && !next.includes('product_group')) {
        const i = next.indexOf('sku');
        if (i >= 0) next.splice(i + 1, 0, 'product_group');
        else next.push('product_group');
      }
      if (!supportsGroups) next = next.filter((id) => id !== 'product_group');
      return next;
    });
    setColumnHidden((h) => (supportsGroups ? h : h.filter((id) => id !== 'product_group')));
  }, [supportsGroups]);

  const loadTenantCounts = useCallback(async () => {
    if (!tenant_id) {
      setTenantCounts(null);
      return;
    }
    try {
      const c = await fetchTenantProductCounts(tenant_id);
      setTenantCounts(c);
    } catch (e) {
      console.error('Failed to load product counts', e);
      setTenantCounts(null);
    }
  }, [tenant_id]);

  useEffect(() => {
    void loadTenantCounts();
  }, [loadTenantCounts]);

  const refreshProductsAndCounts = useCallback(async () => {
    await refreshProducts();
    await loadTenantCounts();
  }, [refreshProducts, loadTenantCounts]);

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

  const tagsSelectKey = useMemo(
    () => tagOptions.filter((t) => t !== 'all').join('\u0001'),
    [tagOptions]
  );

  const drawerFilterControlClass = `${premiumInputCompact} h-9 ${premiumTypography.tableCell}`;

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

  const handleListViewSelectionChange = useCallback(
    (key: string) => {
      setListViewSelection(key);
      const api = listTableViewApiRef.current;
      if (!api) return;
      if (key === 'system') {
        applyViewDefinition(buildSystemDefinitionV1(supportsGroups));
        return;
      }
      if (key === 'workspace') {
        applyViewDefinition(api.workspaceDefinition ?? buildSystemDefinitionV1(supportsGroups));
        return;
      }
      const row = api.views.find((v) => v.id === key);
      if (row) applyViewDefinition(row.definition);
    },
    [applyViewDefinition, supportsGroups]
  );

  const openSaveListViewDialog = useCallback(() => {
    setSaveListViewName('');
    setSaveListViewError(null);
    setSaveListViewOpen(true);
  }, []);

  const closeSaveListViewDialog = useCallback(() => {
    if (saveListViewSaving) return;
    setSaveListViewOpen(false);
  }, [saveListViewSaving]);

  useEffect(() => {
    if (!saveListViewOpen) return;
    const id = window.requestAnimationFrame(() => {
      saveListViewNameInputRef.current?.focus();
      saveListViewNameInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [saveListViewOpen]);

  useEffect(() => {
    if (!saveListViewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSaveListViewDialog();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [saveListViewOpen, closeSaveListViewDialog]);

  const submitSaveListView = useCallback(async () => {
    const name = saveListViewName.trim();
    if (!name) {
      setSaveListViewError('Enter a view name');
      return;
    }
    const api = listTableViewApiRef.current;
    if (!api) return;
    const def = buildDefinitionFromPageState({
      includeProductGroup: supportsGroups,
      search,
      statusFilter,
      productTypeFilter,
      tagFilter,
      selectedCategoryNodeIdsByTier,
      recordVisibility,
      sortField,
      sortDirection,
      columnOrder,
      columnHidden,
    });
    setSaveListViewSaving(true);
    setSaveListViewError(null);
    const r = await api.saveNewView(name, def);
    setSaveListViewSaving(false);
    if (!r.success) {
      setSaveListViewError(r.error ?? 'Could not save view');
      return;
    }
    setSaveListViewOpen(false);
  }, [
    saveListViewName,
    supportsGroups,
    search,
    statusFilter,
    productTypeFilter,
    tagFilter,
    selectedCategoryNodeIdsByTier,
    recordVisibility,
    sortField,
    sortDirection,
    columnOrder,
    columnHidden,
  ]);

  const handleSetListViewPersonalDefault = useCallback(async () => {
    if (listViewSelection === 'system' || listViewSelection === 'workspace') {
      window.alert('Pick a saved view first.');
      return;
    }
    const api = listTableViewApiRef.current;
    if (!api) return;
    const r = await api.setPersonalDefault(listViewSelection);
    if (!r.success) window.alert(r.error ?? 'Could not set default');
  }, [listViewSelection]);

  const handleClearListViewPersonalDefault = useCallback(async () => {
    const api = listTableViewApiRef.current;
    if (!api) return;
    const r = await api.clearPersonalDefault();
    if (!r.success) window.alert(r.error ?? 'Could not clear default');
  }, []);

  const handleDeleteSelectedListView = useCallback(async () => {
    if (listViewSelection === 'system' || listViewSelection === 'workspace') return;
    const api = listTableViewApiRef.current;
    if (!api) return;
    const row = api.views.find((v) => v.id === listViewSelection);
    if (!row) return;
    if (!window.confirm(`Delete saved view "${row.name}"? This cannot be undone.`)) return;
    const r = await api.deleteView(listViewSelection);
    if (!r.success) {
      window.alert(r.error ?? 'Could not delete view');
      return;
    }
    setListViewSelection('system');
    applyViewDefinition(buildSystemDefinitionV1(supportsGroups));
  }, [listViewSelection, supportsGroups, applyViewDefinition]);

  const handleSaveWorkspaceListDefault = useCallback(async () => {
    if (!canWorkspaceDefault) return;
    const api = listTableViewApiRef.current;
    if (!api) return;
    const def = buildDefinitionFromPageState({
      includeProductGroup: supportsGroups,
      search,
      statusFilter,
      productTypeFilter,
      tagFilter,
      selectedCategoryNodeIdsByTier,
      recordVisibility,
      sortField,
      sortDirection,
      columnOrder,
      columnHidden,
    });
    const r = await api.saveWorkspaceDefault(def);
    if (!r.success) window.alert(r.error ?? 'Could not save workspace default');
  }, [
    canWorkspaceDefault,
    supportsGroups,
    search,
    statusFilter,
    productTypeFilter,
    tagFilter,
    selectedCategoryNodeIdsByTier,
    recordVisibility,
    sortField,
    sortDirection,
    columnOrder,
    columnHidden,
  ]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AddCategoryModal
          open={addCategoryOpen}
          onClose={() => setAddCategoryOpen(false)}
          onCreated={() => {
            void refreshProductsAndCounts();
            void reloadCategoryStructure();
          }}
        />
        {saveListViewOpen && (
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeSaveListViewDialog();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="save-list-view-title"
              className={`${premiumSurfaces.cardElevated} w-full max-w-md`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h2
                id="save-list-view-title"
                className={`${premiumTypography.pageTitle} ${bc.titleText}`}
              >
                Save list view
              </h2>
              <p className={`mt-1 ${premiumTypography.helper}`}>
                Saves filters, sort, and column layout so you can reopen this setup from the View
                menu.
              </p>
              <form
                className="mt-4 space-y-3"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void submitSaveListView();
                }}
              >
                <div>
                  <label
                    htmlFor="save-list-view-name"
                    className={`mb-1 block ${premiumTypography.label}`}
                  >
                    View name
                  </label>
                  <input
                    ref={saveListViewNameInputRef}
                    id="save-list-view-name"
                    type="text"
                    value={saveListViewName}
                    onChange={(e) => setSaveListViewName(e.target.value)}
                    className={`${premiumInputComfortableBase} ${premiumFocusRing('businessCore')}`}
                    placeholder="e.g. Low stock review"
                    autoComplete="off"
                    disabled={saveListViewSaving}
                    maxLength={120}
                  />
                </div>
                {saveListViewError && (
                  <p
                    className={`${premiumTypography.helper} text-red-600 dark:text-red-400`}
                    role="alert"
                  >
                    {saveListViewError}
                  </p>
                )}
                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <button
                    type="button"
                    className={premiumSecondaryButton('businessCore', 'sm', 'auto')}
                    onClick={closeSaveListViewDialog}
                    disabled={saveListViewSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
                    disabled={saveListViewSaving}
                  >
                    {saveListViewSaving ? (
                      <>
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
                        Saving…
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <PageContainer
          module="businessCore"
          rootClassName="flex min-h-0 max-h-dvh flex-1 flex-col overflow-hidden bg-gray-50 px-3 pb-2 pt-4 dark:bg-gray-900 sm:px-6"
          innerClassName="mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <PremiumStickyHeader
              module="businessCore"
              sticky={false}
              className="relative z-20 mb-3 shrink-0"
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
                    buttonClassName={premiumSecondaryButton('businessCore', 'sm', 'standard')}
                  />
                  {supportsGroups && (
                    <Link
                      href="/products/groups"
                      className={premiumTertiaryButton('sm', 'standard')}
                    >
                      Product groups
                    </Link>
                  )}
                  <Link
                    href="/products/new"
                    className={premiumPrimaryButton('businessCore', 'md', 'standard')}
                  >
                    <Plus className="w-4 h-4 shrink-0" aria-hidden />
                    New Product
                  </Link>
                </div>
              }
            />
            <div
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-[margin-inline-end] duration-[250ms] [transition-timing-function:ease]"
              style={{
                marginInlineEnd: filtersDrawerOpen ? FILTER_DRAWER_DEFAULT_WIDTH_PX : 0,
              }}
            >
              <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
                <ProductList
                  columnOrder={columnOrder}
                  columnHidden={columnHidden}
                  listColumnDefinitions={columnDefinitions}
                  onColumnStateChange={(order, hidden) => {
                    setColumnOrder(order);
                    setColumnHidden(hidden);
                  }}
                  listViewsUi={{
                    views: listTableViewApi.views.map((v) => ({
                      id: v.id,
                      name: v.name,
                      is_personal_default: v.is_personal_default,
                    })),
                    selection: listViewSelection,
                    onSelectionChange: handleListViewSelectionChange,
                    onSaveView: openSaveListViewDialog,
                    onSetPersonalDefault: () => void handleSetListViewPersonalDefault(),
                    onClearPersonalDefault: () => void handleClearListViewPersonalDefault(),
                    onSaveWorkspaceDefault: canWorkspaceDefault
                      ? () => void handleSaveWorkspaceListDefault()
                      : undefined,
                    canWorkspaceDefault,
                    loading: listTableViewApi.loading,
                    onDeleteSelectedView: () => void handleDeleteSelectedListView(),
                  }}
                  products={products}
                  currencyCode={products[0]?.currency?.trim() || 'GBP'}
                  sortUiValue={sortUiValue}
                  onSortUiChange={handleSortUiChange}
                  productTypeFilter={productTypeFilter}
                  tagFilter={tagFilter}
                  selectedCategoryNodeIdsByTier={selectedCategoryNodeIdsByTier}
                  recordVisibility={recordVisibility}
                  onRecordVisibilityChange={setRecordVisibility}
                  selectedProductId={null}
                  isLoading={isLoading}
                  error={error}
                  search={search}
                  onSearchChange={setSearch}
                  onSelect={(p) => router.push(`/products/${p.id}`)}
                  statusFilter={statusFilter}
                  filterActive={filterActive}
                  onClearFilters={clearFilters}
                  showGroupColumn={supportsGroups}
                  archiveProducts={deleteProduct}
                  onBulkArchiveComplete={() => void refreshProductsAndCounts()}
                  filtersDrawerOpen={filtersDrawerOpen}
                  onOpenFilters={() => setFiltersDrawerOpen(true)}
                />
              </div>
            </div>
          </div>
        </PageContainer>

        <FilterDrawer
          isOpen={filtersDrawerOpen}
          onClose={() => setFiltersDrawerOpen(false)}
          onApply={() => setFiltersDrawerOpen(false)}
          onClear={clearFilters}
          title="Filters"
          width={FILTER_DRAWER_DEFAULT_WIDTH_PX}
        >
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label
                className={`mb-1 block ${premiumTypography.helper} font-medium text-gray-700 dark:text-gray-300`}
              >
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | StatusType)}
                className={`${drawerFilterControlClass} w-full`}
                aria-label="Filter by lifecycle status"
              >
                {DRAWER_STATUS_FILTERS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className={`mb-1 block ${premiumTypography.helper} font-medium text-gray-700 dark:text-gray-300`}
              >
                Product type
              </label>
              <select
                value={productTypeFilter}
                onChange={(e) => setProductTypeFilter(e.target.value as 'all' | ProductType)}
                className={`${drawerFilterControlClass} w-full`}
                aria-label="Filter by product type"
              >
                <option value="all">All types</option>
                <option value="raw_material">Raw material</option>
                <option value="semi_finished">Semi finished</option>
                <option value="finished_good">Finished good</option>
                <option value="service">Service</option>
                <option value="assembly">Assembly</option>
                <option value="packaging">Packaging</option>
              </select>
            </div>
            <div>
              <label
                className={`mb-1 block ${premiumTypography.helper} font-medium text-gray-700 dark:text-gray-300`}
              >
                Attributes (tags)
              </label>
              <select
                key={tagsSelectKey}
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className={`${drawerFilterControlClass} w-full`}
                aria-label="Filter by tag"
              >
                <option value="all">All tags</option>
                {tagOptions
                  .filter((t) => t !== 'all')
                  .map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setAddCategoryOpen(true)}
              className={`flex w-full items-center justify-center gap-1.5 ${premiumSecondaryButton('businessCore', 'sm', 'auto')}`}
              aria-label="Add new category"
              title="Add new category"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add category
            </button>
          </div>

          <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
            <p
              className={`mb-2 ${premiumTypography.helper} font-semibold text-gray-800 dark:text-gray-200`}
            >
              Category & subcategory
            </p>
            <div className="space-y-2">
              {categoryTiers.map((tier) => {
                const selectedForTier = selectedCategoryNodeIdsByTier[tier.tier_number] ?? [];
                const parentTierSelections =
                  tier.tier_number > 1
                    ? (selectedCategoryNodeIdsByTier[tier.tier_number - 1] ?? [])
                    : [];
                const tierNodes = categoryNodesByTier[tier.tier_number] ?? [];
                const visibleNodes =
                  tier.tier_number > 1 && parentTierSelections.length > 0
                    ? tierNodes.filter(
                        (node) => node.parent_id && parentTierSelections.includes(node.parent_id)
                      )
                    : tierNodes;
                const isTierBlocked = tier.tier_number > 1 && parentTierSelections.length === 0;

                return (
                  <div
                    key={tier.id}
                    className="rounded-lg border border-gray-200 bg-gray-50/90 px-2 py-1.5 dark:border-gray-600 dark:bg-gray-900/55"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className={`font-semibold text-gray-800 dark:text-gray-100 ${premiumTypography.tableCell}`}
                      >
                        {tier.name}
                      </span>
                      <span
                        className={`text-gray-500 dark:text-gray-400 ${premiumTypography.helper}`}
                      >
                        {tier.is_multi_select ? 'Multi-select' : 'Single-select'}
                      </span>
                    </div>
                    {isTierBlocked ? (
                      <p className={`text-gray-500 dark:text-gray-400 ${premiumTypography.helper}`}>
                        Select a parent tier value first.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {visibleNodes.map((node) => {
                          const selected = selectedForTier.includes(node.id);
                          return (
                            <button
                              key={node.id}
                              type="button"
                              onClick={() =>
                                handleToggleCategoryNode(
                                  tier.tier_number,
                                  node.id,
                                  tier.is_multi_select
                                )
                              }
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                                selected
                                  ? 'border-green-500 bg-green-100 text-green-800 dark:border-green-600 dark:bg-green-900/40 dark:text-green-200'
                                  : 'border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
                              }`}
                              aria-pressed={selected}
                            >
                              {node.name}
                            </button>
                          );
                        })}
                        {visibleNodes.length === 0 && (
                          <p
                            className={`text-gray-500 dark:text-gray-400 ${premiumTypography.helper}`}
                          >
                            No options available.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {categoriesError && (
              <p
                className={`mt-2 ${premiumTypography.helper} text-amber-700 dark:text-amber-400`}
                role="status"
              >
                Categories could not be loaded ({categoriesError}). The filter may be incomplete.
              </p>
            )}
          </div>
        </FilterDrawer>
      </div>
    </ProtectedRoute>
  );
}
