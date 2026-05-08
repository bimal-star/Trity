'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useTenant } from '@/contexts/TenantContext';
import { useCatalogueMode } from '@/hooks/useCatalogueMode';
import {
  PackingConfiguration,
  Product,
  ProductBarcode,
  PriceList,
  PriceListItem,
  ProductCostHistory,
  ProductMetric,
  DemandForecast,
  StockLevel,
  StockTransaction,
  ProductionPlan,
  ProductActivityLog,
} from '@/types/product';
import PackingConfigurationsEditor from '@/components/PackingConfigurationsEditor';
import {
  AlertTriangle,
  Check,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  ScanLine,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { productTracksInventory } from '@/lib/productInventoryPolicy';
import {
  premiumInputComfortableBase,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumSurfaces,
  premiumTypography,
} from '@/lib/premiumUi';
import { logProductUpdated } from '@/lib/auditLog';
import {
  type CategoryTier,
  type CategoryNode,
  loadCategoryStructure,
  getProductCategoryAssignments,
  saveProductCategories,
} from '@/lib/categories';
import {
  BARCODE_TYPE_OPTIONS,
  formatBarcodeTypeLabel,
  type BarcodeType,
} from '@/lib/barcodeLabels';
import { packingConfigurationInserts } from '@/lib/productPacking';
import type { Database } from '@/types/database';
import { parseAttributeDimensions } from '@/lib/productCatalogue';
import { useToast } from '@/lib/toast';

function TabBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold leading-none text-gray-800 dark:bg-gray-700 dark:text-gray-100">
      {n > 99 ? '99+' : n}
    </span>
  );
}

/** Responsive 12-column grid: compact fields on row 1, wide text on following rows. */
const DETAIL_FORM_GRID =
  'grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-x-3 sm:gap-y-3 sm:items-end';

const DETAIL_FIELD_LABEL = `block ${premiumTypography.label} mb-1`;
const DETAIL_FIELD_LABEL_COMPACT =
  'block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1';

interface ProductDetailsTabsProps {
  product: Product;
  /** Refresh parent list / re-resolve selection after updating core product fields (e.g. base prices). */
  onProductUpdated?: () => void | Promise<void>;
  /** Select another product in the master-detail layout (e.g. sibling variant). */
  onSelectProduct?: (productId: string) => void;
}

function asVariantAttrRecord(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const o = v as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(o)) {
    if (typeof val === 'string' && val.trim()) out[k] = val.trim();
  }
  return out;
}

function VariantsInGroupPanel({
  product,
  groupLabel,
  groupDimensions,
  groupProducts,
  isMatrix,
  onSelectProduct,
  onOpenGroups,
}: {
  product: Product;
  groupLabel: string | null;
  groupDimensions: unknown | null;
  groupProducts: Product[];
  isMatrix: boolean;
  onSelectProduct?: (productId: string) => void;
  onOpenGroups: () => void;
}) {
  const dims = parseAttributeDimensions(groupDimensions);
  const rowDim = dims[0];
  const colDim = dims[1];
  const productByAttrPair = new Map<string, Product>();
  for (const p of groupProducts) {
    const a = asVariantAttrRecord(p.variant_attributes);
    if (rowDim && colDim) {
      const rk = `${rowDim.key}=${a[rowDim.key] ?? ''}`;
      const ck = `${colDim.key}=${a[colDim.key] ?? ''}`;
      productByAttrPair.set(`${rk}|${ck}`, p);
    }
  }

  const groupTotalStock = groupProducts.reduce((s, p) => s + (Number(p.total_stock) || 0), 0);

  if (!product.product_group_id) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">Variants</h3>
        <p className="text-gray-600 dark:text-gray-400">
          This product is not part of a group. Add it to a group to see related variants.
        </p>
        <button
          type="button"
          onClick={onOpenGroups}
          className={`${premiumSecondaryButton('businessCore', 'sm', 'auto')}`}
        >
          Product groups
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">Variants</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Group:{' '}
          <span className="font-medium text-gray-800 dark:text-gray-200">{groupLabel ?? '—'}</span>
        </p>
      </div>

      {isMatrix && rowDim && colDim ? (
        <div className="overflow-x-auto">
          <table className="min-w-[280px] border border-gray-200 dark:border-gray-600 text-xs">
            <thead>
              <tr>
                <th
                  className={`border border-gray-200 bg-gray-50 px-2 py-1.5 text-left dark:border-gray-600 dark:bg-gray-900/50 ${premiumTypography.tableHeader}`}
                >
                  {rowDim.key} × {colDim.key}
                </th>
                {colDim.values.map((c) => (
                  <th
                    key={c}
                    className={`border border-gray-200 bg-gray-50 px-2 py-1.5 text-center dark:border-gray-600 dark:bg-gray-900/50 ${premiumTypography.tableHeader}`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowDim.values.map((r) => (
                <tr key={r}>
                  <td
                    className={`border border-gray-200 bg-gray-50/80 px-2 py-1.5 font-medium dark:border-gray-600 ${premiumTypography.tableCell}`}
                  >
                    {r}
                  </td>
                  {colDim.values.map((c) => {
                    const rk = `${rowDim.key}=${r}`;
                    const ck = `${colDim.key}=${c}`;
                    const cell = productByAttrPair.get(`${rk}|${ck}`);
                    const stock = cell ? Number(cell.total_stock) || 0 : null;
                    const isHere = cell?.id === product.id;
                    const empty = !cell;
                    return (
                      <td
                        key={`${r}-${c}`}
                        className={`border border-gray-200 px-1 py-1 text-center dark:border-gray-600 ${
                          empty
                            ? 'bg-gray-100/50 text-gray-400 dark:bg-gray-900/30'
                            : stock === 0
                              ? 'bg-red-50 text-red-800 dark:bg-red-900/25 dark:text-red-200'
                              : isHere
                                ? 'bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500/40'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
                        }`}
                      >
                        {cell ? (
                          <button
                            type="button"
                            className="w-full min-h-[2rem] rounded px-1 py-0.5 text-center disabled:cursor-default"
                            onClick={() => onSelectProduct?.(cell.id)}
                          >
                            {stock ?? '—'}
                          </button>
                        ) : (
                          <span className="inline-block min-h-[2rem] min-w-[2rem] pt-1">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className={`mt-2 text-gray-500 dark:text-gray-400 ${premiumTypography.helper}`}>
            Stock per cell. Click a cell to open that product. Highlighted column shows the current
            product.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>Name</th>
                <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>SKU</th>
                <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>Stock</th>
                <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {groupProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-400">
                    No other products in this group yet.
                  </td>
                </tr>
              )}
              {groupProducts.map((p) => {
                const stock = Number(p.total_stock) || 0;
                const isHere = p.id === product.id;
                return (
                  <tr
                    key={p.id}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40 ${
                      isHere ? 'bg-green-50/80 dark:bg-green-900/15' : ''
                    }`}
                    onClick={() => onSelectProduct?.(p.id)}
                  >
                    <td className="px-3 py-2 text-gray-900 dark:text-white">{p.name}</td>
                    <td className="px-3 py-2">{p.sku}</td>
                    <td className="px-3 py-2">{stock}</td>
                    <td className="px-3 py-2">{p.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className={`text-gray-600 dark:text-gray-400 ${premiumTypography.helper}`}>
        Group total:{' '}
        <span className="font-semibold text-gray-900 dark:text-white">{groupTotalStock}</span> units
      </p>
    </div>
  );
}

interface PriceListItemWithList extends PriceListItem {
  price_list?: PriceList;
}

export default function ProductDetailsTabs({
  product,
  onProductUpdated,
  onSelectProduct,
}: ProductDetailsTabsProps) {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const { supportsGroups, isMatrix } = useCatalogueMode();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    | 'variants'
    | 'barcodes'
    | 'categories'
    | 'pricing'
    | 'costing'
    | 'metrics'
    | 'packing'
    | 'operations'
  >('barcodes');

  const [groupProducts, setGroupProducts] = useState<Product[]>([]);
  const [groupLabel, setGroupLabel] = useState<string | null>(null);
  const [groupDimensions, setGroupDimensions] = useState<unknown | null>(null);
  const [barcodes, setBarcodes] = useState<ProductBarcode[]>([]);
  const [catTiers, setCatTiers] = useState<CategoryTier[]>([]);
  const [catNodesByTier, setCatNodesByTier] = useState<Record<number, CategoryNode[]>>({});
  const [catSelectedByTier, setCatSelectedByTier] = useState<Record<number, string[]>>({});
  const [catInitialByTier, setCatInitialByTier] = useState<Record<number, string[]>>({});
  const [catLoading, setCatLoading] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [inlineAddOpen, setInlineAddOpen] = useState<number | null>(null);
  const [inlineAddName, setInlineAddName] = useState('');
  const [savingInlineAdd, setSavingInlineAdd] = useState(false);
  const [priceListItems, setPriceListItems] = useState<PriceListItemWithList[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [costHistory, setCostHistory] = useState<ProductCostHistory[]>([]);
  const [metrics, setMetrics] = useState<ProductMetric[]>([]);
  const [packingConfigs, setPackingConfigs] = useState<PackingConfiguration[]>([]);
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([]);
  const [activityLog, setActivityLog] = useState<ProductActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Barcode form state
  const [barcodeValue, setBarcodeValue] = useState('');
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('ean13');
  const [barcodePackingLevel, setBarcodePackingLevel] = useState<string | null>('unit');
  const [barcodeQty, setBarcodeQty] = useState<string>('1');
  const [barcodeDescription, setBarcodeDescription] = useState('');
  const [barcodePrimary, setBarcodePrimary] = useState(false);
  const [barcodeActive, setBarcodeActive] = useState(true);
  const [savingBarcode, setSavingBarcode] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [editingBarcodeId, setEditingBarcodeId] = useState<string | null>(null);
  const [editBarcodeBarcode, setEditBarcodeBarcode] = useState('');
  const [editBarcodeType, setEditBarcodeType] = useState<BarcodeType>('ean13');
  const [editBarcodePackingLevel, setEditBarcodePackingLevel] = useState<string>('unit');
  const [editBarcodeQty, setEditBarcodeQty] = useState('1');
  const [editBarcodeDescription, setEditBarcodeDescription] = useState('');
  const [editBarcodePrimary, setEditBarcodePrimary] = useState(false);
  const [editBarcodeActive, setEditBarcodeActive] = useState(true);
  const [savingBarcodeEdit, setSavingBarcodeEdit] = useState(false);

  const [savingCategories, setSavingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Chip ⋮ menu / delete / edit state
  const [openChipMenu, setOpenChipMenu] = useState<string | null>(null);
  const [checkingChipDelete, setCheckingChipDelete] = useState<string | null>(null);
  type ChipDeleteModal =
    | { kind: 'safe'; node: CategoryNode }
    | { kind: 'blocked'; node: CategoryNode; productCount: number; childCount: number };
  const [chipDeleteModal, setChipDeleteModal] = useState<ChipDeleteModal | null>(null);
  const [confirmingChipDelete, setConfirmingChipDelete] = useState(false);
  const [editingChip, setEditingChip] = useState<{ id: string; name: string } | null>(null);
  const [savingChipEdit, setSavingChipEdit] = useState(false);

  // Pricing form state
  const [priceListId, setPriceListId] = useState('');
  const [priceUnit, setPriceUnit] = useState<string>('');
  const [priceMinQty, setPriceMinQty] = useState<string>('1');
  const [priceMaxQty, setPriceMaxQty] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [baseCostInput, setBaseCostInput] = useState('');
  const [baseSellInput, setBaseSellInput] = useState('');
  const [savingBasePricing, setSavingBasePricing] = useState(false);
  const [basePricingMsg, setBasePricingMsg] = useState<string | null>(null);

  const [tierDialog, setTierDialog] = useState<{
    list: PriceList;
    existing: PriceListItemWithList | null;
    unitPrice: string;
    minQty: string;
    maxQty: string;
  } | null>(null);
  const [savingTierDialog, setSavingTierDialog] = useState(false);

  // Packing save state
  const [savingPacking, setSavingPacking] = useState(false);
  const [packingError, setPackingError] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const [opsSubTab, setOpsSubTab] = useState<
    'forecasts' | 'stock' | 'transactions' | 'production' | 'activity'
  >('forecasts');

  const [newCostEffective, setNewCostEffective] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newCostMethod, setNewCostMethod] = useState('');
  const [newCostNotes, setNewCostNotes] = useState('');
  const [costSaving, setCostSaving] = useState(false);
  const [costMsg, setCostMsg] = useState<string | null>(null);

  const [newMetricDate, setNewMetricDate] = useState('');
  const [newMetricPeriod, setNewMetricPeriod] = useState('month');
  const [metricSaving, setMetricSaving] = useState(false);
  const [metricMsg, setMetricMsg] = useState<string | null>(null);

  const [fcStart, setFcStart] = useState('');
  const [fcEnd, setFcEnd] = useState('');
  const [fcQty, setFcQty] = useState('');
  const [fcSaving, setFcSaving] = useState(false);
  const [fcMsg, setFcMsg] = useState<string | null>(null);

  const [ppQty, setPpQty] = useState('');
  const [ppStart, setPpStart] = useState('');
  const [ppEnd, setPpEnd] = useState('');
  const [ppSaving, setPpSaving] = useState(false);
  const [ppMsg, setPpMsg] = useState<string | null>(null);

  const currencyCode = product.currency?.trim() || 'GBP';

  const categoryAssignmentCount = useMemo(
    () =>
      catTiers.length === 0
        ? 0
        : catTiers.reduce((sum, t) => sum + (catSelectedByTier[t.tier_number]?.length ?? 0), 0),
    [catTiers, catSelectedByTier]
  );

  const tabBadges = useMemo(
    () => ({
      variants: supportsGroups && groupProducts.length > 0 ? groupProducts.length : 0,
      barcodes: barcodes.length,
      categories: categoryAssignmentCount,
      pricing: priceListItems.length,
      costing: costHistory.length,
      metrics: metrics.length,
      packing: packingConfigs.length,
      operations: stockLevels.length + stockTransactions.length + productionPlans.length,
    }),
    [
      supportsGroups,
      groupProducts.length,
      barcodes.length,
      categoryAssignmentCount,
      priceListItems.length,
      costHistory.length,
      metrics.length,
      packingConfigs.length,
      stockLevels.length,
      stockTransactions.length,
      productionPlans.length,
    ]
  );

  function formatMoney(amount: number | null | undefined): string {
    if (amount == null || Number.isNaN(Number(amount))) return '—';
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
      }).format(Number(amount));
    } catch {
      return `${currencyCode} ${amount}`;
    }
  }

  useEffect(() => {
    setEditingBarcodeId(null);
  }, [product.id]);

  useEffect(() => {
    setBaseCostInput(product.cost_price != null ? String(product.cost_price) : '');
    setBaseSellInput(product.sell_price != null ? String(product.sell_price) : '');
    setBasePricingMsg(null);
  }, [product.id, product.cost_price, product.sell_price]);

  // Close chip ⋮ menu on outside click
  useEffect(() => {
    if (!openChipMenu) return;
    const close = () => setOpenChipMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openChipMenu]);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);

      const [
        barcodesRes,
        priceListsRes,
        priceListItemsRes,
        costHistoryRes,
        metricsRes,
        packingConfigsRes,
        forecastsRes,
        stockLevelsRes,
        stockTransactionsRes,
        productionPlansRes,
        activityLogRes,
      ] = await Promise.all([
        supabase.from('product_barcodes').select('*').eq('product_id', product.id),
        tenant_id
          ? supabase
              .from('price_lists')
              .select('*')
              .eq('tenant_id', tenant_id)
              .eq('is_deleted', false)
              .order('name')
          : Promise.resolve({ data: [] as PriceList[] | null, error: null }),
        supabase
          .from('price_list_items')
          .select(
            'id, price_list_id, product_id, unit_price, min_quantity, max_quantity, created_at, price_lists(id, name, description, currency, effective_from, effective_to, is_active, is_default)'
          )
          .eq('product_id', product.id),
        supabase
          .from('product_cost_history')
          .select('*')
          .eq('product_id', product.id)
          .order('effective_from', { ascending: false }),
        supabase
          .from('product_metrics')
          .select('*')
          .eq('product_id', product.id)
          .order('metric_date', { ascending: false }),
        supabase
          .from('packing_configurations')
          .select('*')
          .eq('product_id', product.id)
          .order('level'),
        supabase
          .from('demand_forecasts')
          .select('*')
          .eq('product_id', product.id)
          .order('period_start', { ascending: false }),
        supabase.from('stock_levels').select('*').eq('product_id', product.id),
        supabase
          .from('stock_transactions')
          .select('*')
          .eq('product_id', product.id)
          .order('transaction_date', { ascending: false }),
        supabase
          .from('production_plans')
          .select('*')
          .eq('product_id', product.id)
          .order('planned_start_date', { ascending: false }),
        supabase
          .from('product_activity_log')
          .select('*')
          .eq('product_id', product.id)
          .order('created_at', { ascending: false }),
      ]);

      setBarcodes((barcodesRes.data || []) as ProductBarcode[]);

      const plists = (priceListsRes.data || []) as PriceList[];
      setPriceLists(plists);
      const pli = (priceListItemsRes.data || []) as any[];
      setPriceListItems(
        pli.map((row) => ({
          id: row.id,
          price_list_id: row.price_list_id,
          product_id: row.product_id,
          unit_price: row.unit_price,
          min_quantity: row.min_quantity,
          max_quantity: row.max_quantity,
          created_at: row.created_at,
          price_list: row.price_lists as PriceList,
        }))
      );

      setCostHistory((costHistoryRes.data || []) as ProductCostHistory[]);
      setMetrics((metricsRes.data || []) as ProductMetric[]);
      setPackingConfigs((packingConfigsRes.data || []) as PackingConfiguration[]);
      setForecasts((forecastsRes.data || []) as DemandForecast[]);
      setStockLevels((stockLevelsRes.data || []) as StockLevel[]);
      setStockTransactions((stockTransactionsRes.data || []) as StockTransaction[]);
      setProductionPlans((productionPlansRes.data || []) as ProductionPlan[]);
      setActivityLog((activityLogRes.data || []) as ProductActivityLog[]);

      setLoading(false);
    }

    if (product?.id) {
      void loadAll();
      if (tenant_id) {
        setCatLoading(true);
        Promise.all([loadCategoryStructure(tenant_id), getProductCategoryAssignments(product.id)])
          .then(([structure, assignments]) => {
            setCatTiers(structure.tiers);
            setCatNodesByTier(structure.nodesByTier);
            const byTier: Record<number, string[]> = {};
            for (const t of structure.tiers) byTier[t.tier_number] = [];
            for (const a of assignments) {
              if (!byTier[a.tier_number]) byTier[a.tier_number] = [];
              byTier[a.tier_number].push(a.category_node_id);
            }
            setCatSelectedByTier(byTier);
            setCatInitialByTier(JSON.parse(JSON.stringify(byTier)));
          })
          .catch((err) => {
            console.error('Failed to load category structure:', err);
          })
          .finally(() => setCatLoading(false));
      }
    }
  }, [product?.id, tenant_id]);

  useEffect(() => {
    if (!supportsGroups && activeTab === 'variants') {
      setActiveTab('barcodes');
    }
  }, [supportsGroups, activeTab]);

  useEffect(() => {
    async function loadGroup() {
      if (!supportsGroups || !tenant_id || !product.product_group_id) {
        setGroupProducts([]);
        setGroupLabel(null);
        setGroupDimensions(null);
        return;
      }
      const gid = product.product_group_id;
      const [{ data: rows, error }, { data: gRow }] = await Promise.all([
        supabase
          .from('vw_products_full')
          .select('*')
          .eq('tenant_id', tenant_id)
          .eq('product_group_id', gid)
          .eq('is_deleted', false)
          .order('name'),
        supabase
          .from('product_groups')
          .select('name, attribute_dimensions')
          .eq('id', gid)
          .maybeSingle(),
      ]);
      if (error) {
        console.error(error);
        setGroupProducts([]);
        setGroupLabel(null);
        setGroupDimensions(null);
        return;
      }
      const mapped = (rows || []).map(
        (row) =>
          ({
            ...(row as unknown as Product),
            id: row.id ?? '',
            sku: row.sku ?? '',
            name: row.name ?? '',
          }) as Product
      );
      setGroupProducts(mapped);
      const g = gRow as { name?: string; attribute_dimensions?: unknown } | null;
      setGroupLabel(g?.name ?? product.product_group_name ?? null);
      setGroupDimensions(
        g?.attribute_dimensions ?? product.product_group_attribute_dimensions ?? null
      );
    }
    void loadGroup();
  }, [
    supportsGroups,
    tenant_id,
    product.product_group_id,
    product.id,
    product.product_group_name,
    product.product_group_attribute_dimensions,
  ]);

  const reloadCategoryStructure = useCallback(async () => {
    if (!tenant_id) return;
    try {
      const structure = await loadCategoryStructure(tenant_id);
      setCatTiers(structure.tiers);
      setCatNodesByTier(structure.nodesByTier);
    } catch (err) {
      console.error('Failed to reload category structure:', err);
    }
  }, [tenant_id]);

  useEffect(() => {
    setOpsSubTab('forecasts');
  }, [product?.id]);

  const handlePackingChange = (configs: PackingConfiguration[]) => {
    setPackingConfigs(configs);
  };

  const handleSaveBasePricing = async () => {
    setBasePricingMsg(null);
    if (!tenant_id) {
      setBasePricingMsg('Tenant ID not available.');
      return;
    }
    setSavingBasePricing(true);
    try {
      const cost = baseCostInput.trim() === '' ? null : Number(baseCostInput);
      const sell = baseSellInput.trim() === '' ? null : Number(baseSellInput);
      const { error } = await supabase
        .from('products')
        .update({
          cost_price: cost,
          sell_price: sell,
          updated_by: user?.id ?? null,
        })
        .eq('id', product.id);
      if (error) throw error;
      await logProductUpdated(
        tenant_id,
        product.id,
        { action: 'base_pricing_updated' },
        user?.id ?? null
      );
      await onProductUpdated?.();
      toast.success('Base pricing saved.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save base pricing');
    } finally {
      setSavingBasePricing(false);
    }
  };

  const handleTierDialogSave = async () => {
    if (!tierDialog || !tenant_id || !user) return;
    setSavingTierDialog(true);
    try {
      const u = tierDialog.unitPrice.trim();
      if (!u) throw new Error('Unit price is required');
      const minQ = tierDialog.minQty.trim() === '' ? null : Number(tierDialog.minQty);
      const maxQ = tierDialog.maxQty.trim() === '' ? null : Number(tierDialog.maxQty);

      if (tierDialog.existing) {
        const { data, error } = await supabase
          .from('price_list_items')
          .update({
            unit_price: Number(u),
            min_quantity: minQ,
            max_quantity: maxQ,
            updated_by: user.id,
          })
          .eq('id', tierDialog.existing.id)
          .select(
            'id, price_list_id, product_id, unit_price, min_quantity, max_quantity, created_at, price_lists(id, name, description, currency, effective_from, effective_to, is_active, is_default)'
          )
          .single();
        if (error) throw error;
        if (!data) throw new Error('No row returned');
        const row = data as {
          id: string;
          price_list_id: string;
          product_id: string;
          unit_price: number;
          min_quantity: number | null;
          max_quantity: number | null;
          created_at: string | null;
          price_lists: PriceList;
        };
        setPriceListItems((prev) =>
          prev.map((p) =>
            p.id === tierDialog.existing!.id
              ? {
                  ...p,
                  unit_price: row.unit_price,
                  min_quantity: row.min_quantity,
                  max_quantity: row.max_quantity,
                  price_list: row.price_lists,
                }
              : p
          )
        );
      } else {
        const { data, error } = await supabase
          .from('price_list_items')
          .insert({
            price_list_id: tierDialog.list.id,
            product_id: product.id,
            unit_price: Number(u),
            min_quantity: minQ,
            max_quantity: maxQ,
            tenant_id,
            created_by: user.id,
            updated_by: user.id,
          })
          .select(
            'id, price_list_id, product_id, unit_price, min_quantity, max_quantity, created_at, price_lists(id, name, description, currency, effective_from, effective_to, is_active, is_default)'
          )
          .single();
        if (error) throw error;
        if (!data) throw new Error('No row returned');
        const row = data as {
          id: string;
          price_list_id: string;
          product_id: string;
          unit_price: number;
          min_quantity: number | null;
          max_quantity: number | null;
          created_at: string | null;
          price_lists: PriceList;
        };
        setPriceListItems((prev) => [
          ...prev,
          {
            id: row.id,
            price_list_id: row.price_list_id,
            product_id: row.product_id,
            unit_price: row.unit_price,
            min_quantity: row.min_quantity,
            max_quantity: row.max_quantity,
            created_at: row.created_at,
            price_list: row.price_lists,
          },
        ]);
      }
      const listId = tierDialog.list.id;
      setTierDialog(null);
      await logProductUpdated(
        tenant_id,
        product.id,
        { action: 'price_tier_saved', price_list_id: listId },
        user.id
      );
      toast.success('Tier price saved.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save tier price');
    } finally {
      setSavingTierDialog(false);
    }
  };

  const handleAddBarcode = async () => {
    try {
      setBarcodeError(null);
      if (!barcodeValue.trim()) {
        setBarcodeError('Barcode value is required');
        return;
      }
      if (!tenant_id) {
        setBarcodeError('Tenant ID not available. Please ensure you are logged in.');
        return;
      }
      setSavingBarcode(true);
      const packingLevelValid = ['unit', 'inner', 'case', 'pallet', 'container'] as const;
      const resolvedPacking: Database['public']['Enums']['packing_level'] =
        barcodePackingLevel &&
        (packingLevelValid as readonly string[]).includes(barcodePackingLevel)
          ? (barcodePackingLevel as Database['public']['Enums']['packing_level'])
          : 'unit';

      const { data, error } = await supabase
        .from('product_barcodes')
        .insert({
          product_id: product.id,
          barcode: barcodeValue.trim(),
          barcode_type: barcodeType,
          packing_level: resolvedPacking,
          quantity: barcodeQty.trim() === '' ? 1 : Number(barcodeQty),
          description: barcodeDescription.trim() === '' ? null : barcodeDescription.trim(),
          is_primary: barcodePrimary,
          is_active: barcodeActive,
          tenant_id: tenant_id,
        })
        .select('*')
        .single();

      if (error) throw error;
      setBarcodes((prev) => [...prev, data as ProductBarcode]);
      if (tenant_id) {
        await logProductUpdated(
          tenant_id,
          product.id,
          { action: 'barcode_added', barcode: barcodeValue.trim() },
          user?.id ?? null
        );
      }
      setBarcodeValue('');
      setBarcodeQty('1');
      setBarcodeDescription('');
      setBarcodePrimary(false);
      setBarcodeActive(true);
      toast.success('Barcode added.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add barcode');
    } finally {
      setSavingBarcode(false);
    }
  };

  const handleDeleteBarcode = (id: string) => {
    setEditingBarcodeId(null);
    setConfirmDialog({
      title: 'Delete barcode?',
      description: 'This barcode will no longer be linked to the product.',
      onConfirm: async () => {
        try {
          await supabase.from('product_barcodes').delete().eq('id', id);
          setBarcodes((prev) => prev.filter((b) => b.id !== id));
          if (tenant_id) {
            await logProductUpdated(
              tenant_id,
              product.id,
              { action: 'barcode_removed', id },
              user?.id ?? null
            );
          }
        } catch (err) {
          console.error('Error deleting barcode', err);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const startEditBarcode = (b: ProductBarcode) => {
    setEditingBarcodeId(b.id);
    setEditBarcodeBarcode(b.barcode);
    setEditBarcodeType((b.barcode_type as BarcodeType) || 'ean13');
    const pl = b.packing_level ?? 'unit';
    setEditBarcodePackingLevel(
      ['unit', 'inner', 'case', 'pallet', 'container'].includes(String(pl)) ? String(pl) : 'unit'
    );
    setEditBarcodeQty(b.quantity != null ? String(b.quantity) : '1');
    setEditBarcodeDescription(b.description ?? '');
    setEditBarcodePrimary(Boolean(b.is_primary));
    setEditBarcodeActive(b.is_active !== false);
  };

  const cancelEditBarcode = () => {
    setEditingBarcodeId(null);
  };

  const handleSaveBarcodeEdit = async () => {
    if (!editingBarcodeId || !tenant_id) return;
    if (!editBarcodeBarcode.trim()) {
      toast.error('Barcode value is required');
      return;
    }
    try {
      setSavingBarcodeEdit(true);
      const packingLevelValid = ['unit', 'inner', 'case', 'pallet', 'container'] as const;
      const resolvedPacking: Database['public']['Enums']['packing_level'] =
        editBarcodePackingLevel &&
        (packingLevelValid as readonly string[]).includes(editBarcodePackingLevel)
          ? (editBarcodePackingLevel as Database['public']['Enums']['packing_level'])
          : 'unit';

      const { error: upErr } = await supabase
        .from('product_barcodes')
        .update({
          barcode: editBarcodeBarcode.trim(),
          barcode_type: editBarcodeType,
          packing_level: resolvedPacking,
          quantity: editBarcodeQty.trim() === '' ? 1 : Number(editBarcodeQty),
          description: editBarcodeDescription.trim() === '' ? null : editBarcodeDescription.trim(),
          is_primary: editBarcodePrimary,
          is_active: editBarcodeActive,
        })
        .eq('id', editingBarcodeId)
        .eq('product_id', product.id)
        .eq('tenant_id', tenant_id);

      if (upErr) throw upErr;

      setBarcodes((prev) =>
        prev.map((row) =>
          row.id === editingBarcodeId
            ? ({
                ...row,
                barcode: editBarcodeBarcode.trim(),
                barcode_type: editBarcodeType,
                packing_level: resolvedPacking,
                quantity: editBarcodeQty.trim() === '' ? 1 : Number(editBarcodeQty),
                description:
                  editBarcodeDescription.trim() === '' ? null : editBarcodeDescription.trim(),
                is_primary: editBarcodePrimary,
                is_active: editBarcodeActive,
              } as ProductBarcode)
            : row
        )
      );

      await logProductUpdated(
        tenant_id,
        product.id,
        { action: 'barcode_updated', id: editingBarcodeId },
        user?.id ?? null
      );
      setEditingBarcodeId(null);
      toast.success('Barcode updated.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update barcode');
    } finally {
      setSavingBarcodeEdit(false);
    }
  };

  const handleTierSelect = (tierNum: number, nodeId: string) => {
    setCatSelectedByTier((prev) => {
      const isSelected = (prev[tierNum] ?? []).includes(nodeId);
      const next = { ...prev };
      next[tierNum] = isSelected ? [] : [nodeId];
      for (const t of catTiers) {
        if (t.tier_number > tierNum) next[t.tier_number] = [];
      }
      return next;
    });
  };

  const handleTierMultiToggle = (tierNum: number, nodeId: string) => {
    setCatSelectedByTier((prev) => {
      const cur = prev[tierNum] ?? [];
      return {
        ...prev,
        [tierNum]: cur.includes(nodeId) ? cur.filter((id) => id !== nodeId) : [...cur, nodeId],
      };
    });
  };

  const handleCancelCategories = () => {
    setCatSelectedByTier(JSON.parse(JSON.stringify(catInitialByTier)));
  };

  const handleInlineAddNode = async (tierNum: number) => {
    const name = inlineAddName.trim();
    if (!name || !tenant_id || !user?.id) return;
    setSavingInlineAdd(true);
    try {
      const { error } = await supabase
        .from('category_nodes')
        .insert({ tenant_id, tier_number: tierNum, name, sort_order: 0, is_active: true });
      if (error) throw error;
      setInlineAddOpen(null);
      setInlineAddName('');
      await reloadCategoryStructure();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add category');
    } finally {
      setSavingInlineAdd(false);
    }
  };

  const handleSaveCategories = async () => {
    if (!tenant_id) {
      setCategoriesError('Tenant ID not available.');
      return;
    }
    setSavingCategories(true);
    setCategoriesError(null);
    try {
      const assignments = Object.entries(catSelectedByTier).flatMap(([tierNum, ids]) =>
        ids.map((id) => ({ tier_number: Number(tierNum), category_node_id: id }))
      );
      const result = await saveProductCategories(product.id, tenant_id, assignments);
      if (!result.ok) {
        const msg = result.errors?.map((e) => e.message).join('; ') ?? 'Validation failed';
        setCategoriesError(msg);
        return;
      }
      setCatInitialByTier(JSON.parse(JSON.stringify(catSelectedByTier)));
      await logProductUpdated(
        tenant_id,
        product.id,
        { action: 'categories_saved', tier_assignments: catSelectedByTier },
        user?.id ?? null
      );
      toast.success('Categories saved.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save categories');
    } finally {
      setSavingCategories(false);
    }
  };

  const handleChipDeleteClick = async (node: CategoryNode) => {
    setOpenChipMenu(null);
    setCheckingChipDelete(node.id);
    try {
      const { count, error } = await (
        supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }
      )
        .from('product_category_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('category_node_id', node.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      if ((count ?? 0) > 0) {
        setChipDeleteModal({ kind: 'blocked', node, productCount: count ?? 0, childCount: 0 });
      } else {
        setChipDeleteModal({ kind: 'safe', node });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to check usage');
    } finally {
      setCheckingChipDelete(null);
    }
  };

  const handleChipConfirmDelete = async () => {
    if (!chipDeleteModal || chipDeleteModal.kind !== 'safe' || !tenant_id) return;
    const { node } = chipDeleteModal;
    setConfirmingChipDelete(true);
    try {
      const { error } = await (
        supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }
      )
        .from('category_nodes')
        .delete()
        .eq('id', node.id)
        .eq('tenant_id', tenant_id);
      if (error) {
        toast.error(error.message);
        setChipDeleteModal(null);
        return;
      }
      toast.success(`"${node.name}" deleted.`);
      setChipDeleteModal(null);
      await reloadCategoryStructure();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
      setChipDeleteModal(null);
    } finally {
      setConfirmingChipDelete(false);
    }
  };

  const handleChipEditSave = async () => {
    if (!editingChip || !editingChip.name.trim() || !tenant_id) return;
    setSavingChipEdit(true);
    try {
      const { error } = await supabase
        .from('category_nodes')
        .update({ name: editingChip.name.trim() })
        .eq('id', editingChip.id)
        .eq('tenant_id', tenant_id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Category renamed.');
      setEditingChip(null);
      await reloadCategoryStructure();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename');
    } finally {
      setSavingChipEdit(false);
    }
  };

  const handleAddPriceItem = async () => {
    try {
      setPriceError(null);
      if (!priceListId) {
        setPriceError('Select a price tier');
        return;
      }
      if (!priceUnit.trim()) {
        setPriceError('Unit price is required');
        return;
      }
      setSavingPrice(true);
      if (!tenant_id) {
        setPriceError('Tenant ID not available.');
        return;
      }
      const minQtyVal = priceMinQty.trim() === '' ? null : Number(priceMinQty.trim());
      const maxQtyVal = priceMaxQty.trim() === '' ? null : Number(priceMaxQty.trim());

      const { data, error } = await supabase
        .from('price_list_items')
        .insert({
          price_list_id: priceListId,
          product_id: product.id,
          unit_price: Number(priceUnit),
          min_quantity: minQtyVal,
          max_quantity: maxQtyVal,
          tenant_id,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select(
          'id, price_list_id, product_id, unit_price, min_quantity, max_quantity, created_at, price_lists(id, name, description, currency, effective_from, effective_to, is_active, is_default)'
        )
        .single();

      if (error) throw error;
      const row: any = data;
      const withList: PriceListItemWithList = {
        id: row.id,
        price_list_id: row.price_list_id,
        product_id: row.product_id,
        unit_price: row.unit_price,
        min_quantity: row.min_quantity,
        max_quantity: row.max_quantity,
        created_at: row.created_at,
        price_list: row.price_lists as PriceList,
      };
      setPriceListItems((prev) => [...prev, withList]);
      setPriceUnit('');
      setPriceMinQty('1');
      setPriceMaxQty('');
      await logProductUpdated(
        tenant_id,
        product.id,
        { action: 'price_list_item_added', price_list_id: priceListId },
        user?.id ?? null
      );
      toast.success('Price item added.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add price item');
    } finally {
      setSavingPrice(false);
    }
  };

  const handleDeletePriceItem = (id: string) => {
    setConfirmDialog({
      title: 'Remove tier price?',
      description: 'This product will no longer have that price on the selected tier.',
      onConfirm: async () => {
        try {
          await supabase.from('price_list_items').delete().eq('id', id);
          setPriceListItems((prev) => prev.filter((i) => i.id !== id));
          if (tenant_id) {
            await logProductUpdated(
              tenant_id,
              product.id,
              { action: 'price_list_item_removed', id },
              user?.id ?? null
            );
          }
        } catch (err) {
          console.error('Error deleting price list item', err);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const refetchCostHistory = async () => {
    const { data } = await supabase
      .from('product_cost_history')
      .select('*')
      .eq('product_id', product.id)
      .order('effective_from', { ascending: false });
    setCostHistory((data || []) as ProductCostHistory[]);
  };

  const refetchMetrics = async () => {
    const { data } = await supabase
      .from('product_metrics')
      .select('*')
      .eq('product_id', product.id)
      .order('metric_date', { ascending: false });
    setMetrics((data || []) as ProductMetric[]);
  };

  const refetchForecasts = async () => {
    const { data } = await supabase
      .from('demand_forecasts')
      .select('*')
      .eq('product_id', product.id)
      .order('period_start', { ascending: false });
    setForecasts((data || []) as DemandForecast[]);
  };

  const refetchProduction = async () => {
    const { data } = await supabase
      .from('production_plans')
      .select('*')
      .eq('product_id', product.id)
      .order('planned_start_date', { ascending: false });
    setProductionPlans((data || []) as ProductionPlan[]);
  };

  const handleAddCostRow = async () => {
    setCostMsg(null);
    if (!tenant_id || !newCostEffective.trim() || newCostPrice.trim() === '') {
      setCostMsg('Effective date and cost price are required.');
      return;
    }
    setCostSaving(true);
    try {
      const { error } = await supabase.from('product_cost_history').insert({
        product_id: product.id,
        tenant_id,
        effective_from: newCostEffective.trim(),
        cost_price: Number(newCostPrice),
        cost_method: newCostMethod.trim() || null,
        notes: newCostNotes.trim() || null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      });
      if (error) throw error;
      setNewCostEffective('');
      setNewCostPrice('');
      setNewCostMethod('');
      setNewCostNotes('');
      await refetchCostHistory();
      await logProductUpdated(
        tenant_id,
        product.id,
        { action: 'cost_history_added' },
        user?.id ?? null
      );
      toast.success('Cost history row added.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add cost row');
    } finally {
      setCostSaving(false);
    }
  };

  const handleDeleteCostRow = (id: string) => {
    setConfirmDialog({
      title: 'Delete cost history row?',
      description: 'This removes the cost record.',
      onConfirm: async () => {
        try {
          await supabase.from('product_cost_history').delete().eq('id', id);
          await refetchCostHistory();
          if (tenant_id) {
            await logProductUpdated(
              tenant_id,
              product.id,
              { action: 'cost_history_deleted', id },
              user?.id ?? null
            );
          }
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleAddMetricRow = async () => {
    setMetricMsg(null);
    if (!tenant_id || !newMetricDate.trim()) {
      setMetricMsg('Metric date is required.');
      return;
    }
    setMetricSaving(true);
    try {
      const { error } = await supabase.from('product_metrics').insert({
        product_id: product.id,
        tenant_id,
        metric_date: newMetricDate.trim(),
        period_type: newMetricPeriod.trim() || 'month',
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      });
      if (error) throw error;
      setNewMetricDate('');
      await refetchMetrics();
      await logProductUpdated(
        tenant_id,
        product.id,
        { action: 'product_metric_added' },
        user?.id ?? null
      );
      toast.success('Metric added.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add metric');
    } finally {
      setMetricSaving(false);
    }
  };

  const handleDeleteMetricRow = (id: string) => {
    setConfirmDialog({
      title: 'Delete metric row?',
      description: 'Remove this metrics snapshot.',
      onConfirm: async () => {
        try {
          await supabase.from('product_metrics').delete().eq('id', id);
          await refetchMetrics();
          if (tenant_id) {
            await logProductUpdated(
              tenant_id,
              product.id,
              { action: 'product_metric_deleted', id },
              user?.id ?? null
            );
          }
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleAddForecast = async () => {
    setFcMsg(null);
    if (!tenant_id || !fcStart.trim() || !fcEnd.trim() || fcQty.trim() === '') {
      setFcMsg('Period start, end, and forecast quantity are required.');
      return;
    }
    setFcSaving(true);
    try {
      const { error } = await supabase.from('demand_forecasts').insert({
        product_id: product.id,
        tenant_id,
        period_start: fcStart.trim(),
        period_end: fcEnd.trim(),
        forecast_quantity: Number(fcQty),
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      });
      if (error) throw error;
      setFcStart('');
      setFcEnd('');
      setFcQty('');
      await refetchForecasts();
      await logProductUpdated(
        tenant_id,
        product.id,
        { action: 'demand_forecast_added' },
        user?.id ?? null
      );
      toast.success('Forecast added.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add forecast');
    } finally {
      setFcSaving(false);
    }
  };

  const handleDeleteForecast = (id: string) => {
    setConfirmDialog({
      title: 'Delete forecast?',
      description: 'Remove this forecast row.',
      onConfirm: async () => {
        try {
          await supabase.from('demand_forecasts').delete().eq('id', id);
          await refetchForecasts();
          if (tenant_id) {
            await logProductUpdated(
              tenant_id,
              product.id,
              { action: 'demand_forecast_deleted', id },
              user?.id ?? null
            );
          }
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleAddProductionPlan = async () => {
    setPpMsg(null);
    if (!tenant_id || !ppStart.trim() || !ppEnd.trim() || ppQty.trim() === '') {
      setPpMsg('Start date, end date, and planned quantity are required.');
      return;
    }
    setPpSaving(true);
    try {
      const { error } = await supabase.from('production_plans').insert({
        product_id: product.id,
        tenant_id,
        planned_start_date: ppStart.trim(),
        planned_end_date: ppEnd.trim(),
        planned_quantity: Number(ppQty),
        bom_header_id: null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      });
      if (error) throw error;
      setPpStart('');
      setPpEnd('');
      setPpQty('');
      await refetchProduction();
      await logProductUpdated(
        tenant_id,
        product.id,
        { action: 'production_plan_added' },
        user?.id ?? null
      );
      toast.success('Production plan added.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add production plan');
    } finally {
      setPpSaving(false);
    }
  };

  const handleDeleteProductionPlan = (id: string) => {
    setConfirmDialog({
      title: 'Delete production plan?',
      description: 'Remove this plan row.',
      onConfirm: async () => {
        try {
          await supabase.from('production_plans').delete().eq('id', id);
          await refetchProduction();
          if (tenant_id) {
            await logProductUpdated(
              tenant_id,
              product.id,
              { action: 'production_plan_deleted', id },
              user?.id ?? null
            );
          }
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleSavePacking = async () => {
    try {
      setPackingError(null);
      setSavingPacking(true);
      if (!tenant_id) {
        setPackingError('Tenant ID not available.');
        return;
      }

      await supabase
        .from('packing_configurations')
        .delete()
        .eq('product_id', product.id)
        .eq('tenant_id', tenant_id);

      if (packingConfigs.length > 0) {
        const rows = packingConfigurationInserts(
          product.id,
          tenant_id,
          user?.id ?? null,
          packingConfigs
        );
        const { error } = await supabase.from('packing_configurations').insert(rows);
        if (error) throw error;
      }

      await logProductUpdated(
        tenant_id,
        product.id,
        { action: 'packing_saved', levels: packingConfigs.length },
        user?.id ?? null
      );
      toast.success('Packing configurations saved.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save packing configurations');
    } finally {
      setSavingPacking(false);
    }
  };

  const tierDialogEl = tierDialog ? (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/50"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setTierDialog(null);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tier-dialog-title"
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2
          id="tier-dialog-title"
          className="text-base font-semibold text-gray-900 dark:text-white"
        >
          {tierDialog.existing ? 'Edit' : 'Set'} price — {tierDialog.list.name}
        </h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Unit price</label>
            <input
              type="number"
              step="any"
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
              value={tierDialog.unitPrice}
              onChange={(e) => setTierDialog({ ...tierDialog, unitPrice: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 mb-1">Min qty</label>
              <input
                type="number"
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                value={tierDialog.minQty}
                onChange={(e) => setTierDialog({ ...tierDialog, minQty: e.target.value })}
                min={1}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 mb-1">Max qty</label>
              <input
                type="number"
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                value={tierDialog.maxQty}
                onChange={(e) => setTierDialog({ ...tierDialog, maxQty: e.target.value })}
                min={1}
              />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => setTierDialog(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={premiumPrimaryButton('businessCore', 'md', 'auto')}
            onClick={() => void handleTierDialogSave()}
            disabled={savingTierDialog}
          >
            {savingTierDialog ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const chipDeleteModalEl = chipDeleteModal ? (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !confirmingChipDelete) setChipDeleteModal(null);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="chip-del-title"
        aria-describedby="chip-del-desc"
        className={`${premiumSurfaces.cardElevated} max-w-md w-full`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {chipDeleteModal.kind === 'safe' ? (
          <>
            <h2
              id="chip-del-title"
              className="text-base font-semibold text-gray-900 dark:text-white"
            >
              Delete Category
            </h2>
            <p id="chip-del-desc" className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">&ldquo;{chipDeleteModal.node.name}&rdquo;</span> is not
              used by any products. You can safely delete it.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className={premiumSecondaryButton('businessCore', 'sm', 'auto')}
                onClick={() => setChipDeleteModal(null)}
                disabled={confirmingChipDelete}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-60 transition-colors"
                onClick={() => void handleChipConfirmDelete()}
                disabled={confirmingChipDelete}
              >
                {confirmingChipDelete ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                )}
                Delete
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              id="chip-del-title"
              className="text-base font-semibold text-gray-900 dark:text-white"
            >
              Cannot Delete Category
            </h2>
            <p id="chip-del-desc" className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">&ldquo;{chipDeleteModal.node.name}&rdquo;</span> cannot
              be deleted because it is currently in use.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              {chipDeleteModal.productCount > 0 && (
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" aria-hidden />
                  {chipDeleteModal.productCount}{' '}
                  {chipDeleteModal.productCount === 1 ? 'product' : 'products'}
                </li>
              )}
              {chipDeleteModal.childCount > 0 && (
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" aria-hidden />
                  {chipDeleteModal.childCount} child{' '}
                  {chipDeleteModal.childCount === 1 ? 'category' : 'categories'}
                </li>
              )}
            </ul>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
                onClick={() => setChipDeleteModal(null)}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  const confirmFooter = confirmDialog ? (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setConfirmDialog(null);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="product-confirm-title"
        aria-describedby="product-confirm-desc"
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2
          id="product-confirm-title"
          className="text-base font-semibold text-gray-900 dark:text-white"
        >
          {confirmDialog.title}
        </h2>
        <p id="product-confirm-desc" className="mt-2 text-sm text-gray-600 dark:text-gray-300">
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
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white"
            onClick={() => void confirmDialog.onConfirm()}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (loading) {
    return (
      <>
        {tierDialogEl}
        {confirmFooter}
        {chipDeleteModalEl}
        <div className="mt-4 flex min-h-0 flex-1 items-center justify-center py-10 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" aria-hidden />
          Loading product details...
        </div>
      </>
    );
  }

  return (
    <>
      {tierDialogEl}
      {confirmFooter}
      {chipDeleteModalEl}
      <div className="mt-4 min-h-0 flex-1 flex flex-col overflow-hidden">
        <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto border-b border-gray-200 px-1 pb-0 dark:border-gray-700">
          {(
            [
              ...(supportsGroups ? [['variants', 'Variants', tabBadges.variants] as const] : []),
              ['barcodes', 'Barcodes', tabBadges.barcodes],
              ['categories', 'Categories', tabBadges.categories],
              ['pricing', 'Pricing', tabBadges.pricing],
              ['costing', 'Cost History', tabBadges.costing],
              ['metrics', 'Metrics', tabBadges.metrics],
              ['packing', 'Packing', tabBadges.packing],
              ['operations', 'Ops & Stock', tabBadges.operations],
            ] as const
          ).map(([key, label, badgeN]) => (
            <button
              key={key}
              type="button"
              className={`shrink-0 whitespace-nowrap border-b-[3px] px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === key
                  ? '-mb-[1px] border-green-600 text-green-800 dark:border-green-500 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-100'
              }`}
              onClick={() => setActiveTab(key as typeof activeTab)}
            >
              {label}
              <TabBadge n={badgeN} />
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3.5 text-sm dark:border-gray-700 dark:bg-gray-800 sm:p-4">
          {activeTab === 'variants' && supportsGroups && (
            <VariantsInGroupPanel
              product={product}
              groupLabel={groupLabel}
              groupDimensions={groupDimensions}
              groupProducts={groupProducts}
              isMatrix={isMatrix}
              onSelectProduct={onSelectProduct}
              onOpenGroups={() => router.push('/products/groups')}
            />
          )}

          {activeTab === 'barcodes' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Product barcodes</h3>
              <div
                className={`${premiumSurfaces.insetInfo} space-y-4 border border-gray-200/80 bg-gray-50/90 p-3 dark:border-gray-700/80 dark:bg-gray-950/30 sm:p-4`}
              >
                {barcodeError && (
                  <p className="text-[11px] font-medium text-red-500">{barcodeError}</p>
                )}
                <div className={`${DETAIL_FORM_GRID} gap-2 sm:gap-2`}>
                  <div className="sm:col-span-12 md:col-span-5 lg:col-span-5">
                    <label className={DETAIL_FIELD_LABEL_COMPACT}>Barcode</label>
                    <input
                      className={`${premiumInputComfortableBase} py-2 text-xs`}
                      value={barcodeValue}
                      onChange={(e) => setBarcodeValue(e.target.value)}
                      placeholder="Scan or enter barcode"
                    />
                  </div>
                  <div className="sm:col-span-4 md:col-span-3 lg:col-span-2">
                    <label className={DETAIL_FIELD_LABEL_COMPACT}>Type</label>
                    <select
                      className={`${premiumInputComfortableBase} py-2 text-xs`}
                      value={barcodeType}
                      onChange={(e) => setBarcodeType(e.target.value as BarcodeType)}
                    >
                      {BARCODE_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      {barcodeType &&
                        !BARCODE_TYPE_OPTIONS.some((o) => o.value === barcodeType) && (
                          <option value={barcodeType}>Other ({barcodeType})</option>
                        )}
                    </select>
                  </div>
                  <div className="sm:col-span-4 md:col-span-2 lg:col-span-2">
                    <label className={DETAIL_FIELD_LABEL_COMPACT}>Packing level</label>
                    <input
                      className={`${premiumInputComfortableBase} max-w-full py-2 text-xs`}
                      value={barcodePackingLevel || ''}
                      onChange={(e) => setBarcodePackingLevel(e.target.value || null)}
                      placeholder="unit / case"
                    />
                  </div>
                  <div className="sm:col-span-4 md:col-span-2 lg:col-span-1">
                    <label className={DETAIL_FIELD_LABEL_COMPACT}>Qty</label>
                    <input
                      type="number"
                      min={1}
                      className={`${premiumInputComfortableBase} py-2 text-xs`}
                      value={barcodeQty}
                      onChange={(e) => setBarcodeQty(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2 sm:col-span-12 lg:col-span-2">
                    <label
                      className={`flex cursor-pointer items-center gap-2 ${premiumTypography.helper}`}
                    >
                      <input
                        type="checkbox"
                        className="rounded text-green-600 focus:ring-green-500"
                        checked={barcodePrimary}
                        onChange={(e) => setBarcodePrimary(e.target.checked)}
                      />
                      Primary
                    </label>
                    <label
                      className={`flex cursor-pointer items-center gap-2 ${premiumTypography.helper}`}
                    >
                      <input
                        type="checkbox"
                        className="rounded text-green-600 focus:ring-green-500"
                        checked={barcodeActive}
                        onChange={(e) => setBarcodeActive(e.target.checked)}
                      />
                      Active
                    </label>
                  </div>
                  <div className="flex items-end justify-end sm:col-span-12">
                    <button
                      type="button"
                      onClick={handleAddBarcode}
                      disabled={savingBarcode}
                      className={`${premiumPrimaryButton('businessCore', 'sm', 'standard')} px-5 disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {savingBarcode ? (
                        <>
                          <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" aria-hidden />
                          Saving…
                        </>
                      ) : (
                        'Add barcode'
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={DETAIL_FIELD_LABEL_COMPACT}>Description (optional)</label>
                  <input
                    className={`${premiumInputComfortableBase} max-w-xl py-2 text-xs`}
                    value={barcodeDescription}
                    onChange={(e) => setBarcodeDescription(e.target.value)}
                    placeholder="Note for operators"
                  />
                </div>
              </div>

              {barcodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/70 px-4 py-10 text-center dark:border-gray-700 dark:bg-gray-900/40">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800 dark:shadow-black/40">
                    <ScanLine className="h-6 w-6 text-green-600 dark:text-green-400" aria-hidden />
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">No barcodes defined</p>
                  <p
                    className={`mt-1 max-w-sm ${premiumTypography.helper} text-gray-500 dark:text-gray-400`}
                  >
                    Add a barcode above to link scans to this SKU for receiving, POS, and inventory.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                          Barcode
                        </th>
                        <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                          Type
                        </th>
                        <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                          Packing
                        </th>
                        <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                          Qty
                        </th>
                        <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                          Primary
                        </th>
                        <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                          Active
                        </th>
                        <th className={`px-3 py-2 text-right ${premiumTypography.tableHeader}`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {barcodes.map((b) => {
                        const isEditing = editingBarcodeId === b.id;
                        return (
                          <tr
                            key={b.id}
                            className={`group hover:bg-green-500/[0.04] dark:hover:bg-green-500/[0.06] ${isEditing ? 'bg-green-500/5 dark:bg-green-950/40' : ''}`}
                          >
                            <td className="px-3 py-2 align-top">
                              {isEditing ? (
                                <input
                                  className={`${premiumInputComfortableBase} w-full py-1.5 text-xs`}
                                  value={editBarcodeBarcode}
                                  onChange={(e) => setEditBarcodeBarcode(e.target.value)}
                                />
                              ) : (
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {b.barcode}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {isEditing ? (
                                <select
                                  className={`${premiumInputComfortableBase} w-full py-1.5 text-xs`}
                                  value={editBarcodeType}
                                  onChange={(e) =>
                                    setEditBarcodeType(e.target.value as BarcodeType)
                                  }
                                >
                                  {BARCODE_TYPE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                  {editBarcodeType &&
                                    !BARCODE_TYPE_OPTIONS.some(
                                      (o) => o.value === editBarcodeType
                                    ) && (
                                      <option value={editBarcodeType}>
                                        Other ({editBarcodeType})
                                      </option>
                                    )}
                                </select>
                              ) : (
                                formatBarcodeTypeLabel(b.barcode_type)
                              )}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {isEditing ? (
                                <input
                                  className={`${premiumInputComfortableBase} w-full max-w-[7rem] py-1.5 text-xs`}
                                  value={editBarcodePackingLevel}
                                  onChange={(e) => setEditBarcodePackingLevel(e.target.value)}
                                />
                              ) : (
                                (b.packing_level ?? '—')
                              )}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min={1}
                                  className={`${premiumInputComfortableBase} w-16 py-1.5 text-xs`}
                                  value={editBarcodeQty}
                                  onChange={(e) => setEditBarcodeQty(e.target.value)}
                                />
                              ) : (
                                (b.quantity ?? 1)
                              )}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {isEditing ? (
                                <input
                                  type="checkbox"
                                  className="rounded text-green-600"
                                  checked={editBarcodePrimary}
                                  onChange={(e) => setEditBarcodePrimary(e.target.checked)}
                                />
                              ) : b.is_primary ? (
                                'Yes'
                              ) : (
                                'No'
                              )}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {isEditing ? (
                                <input
                                  type="checkbox"
                                  className="rounded text-green-600"
                                  checked={editBarcodeActive}
                                  onChange={(e) => setEditBarcodeActive(e.target.checked)}
                                />
                              ) : b.is_active !== false ? (
                                'Yes'
                              ) : (
                                'No'
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 align-top text-right">
                              {isEditing ? (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    disabled={savingBarcodeEdit}
                                    className={`${premiumSecondaryButton('businessCore', 'sm', 'auto')} px-2 py-1 text-[11px]`}
                                    onClick={cancelEditBarcode}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingBarcodeEdit}
                                    className={`${premiumPrimaryButton('businessCore', 'sm', 'auto')} px-2 py-1 text-[11px]`}
                                    onClick={() => void handleSaveBarcodeEdit()}
                                  >
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex gap-1 opacity-100 md:gap-2 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                                  <button
                                    type="button"
                                    title="Edit barcode"
                                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                                    onClick={() => startEditBarcode(b)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                                  </button>
                                  <button
                                    type="button"
                                    title="Delete barcode"
                                    className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                    onClick={() => handleDeleteBarcode(b.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                  </button>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'categories' &&
            (() => {
              const search = categorySearch.toLowerCase();
              const hasChanges = catTiers.some((t) => {
                const cur = [...(catSelectedByTier[t.tier_number] ?? [])].sort().join(',');
                const ini = [...(catInitialByTier[t.tier_number] ?? [])].sort().join(',');
                return cur !== ini;
              });
              const changedTierCount = catTiers.filter((t) => {
                const cur = [...(catSelectedByTier[t.tier_number] ?? [])].sort().join(',');
                const ini = [...(catInitialByTier[t.tier_number] ?? [])].sort().join(',');
                return cur !== ini;
              }).length;

              return (
                <div className="flex flex-col gap-3">
                  <div className="relative max-w-2xl">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                      aria-hidden
                    />
                    <input
                      type="text"
                      placeholder="Search across all tiers…"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className={`${premiumInputComfortableBase} w-full pl-8 text-xs`}
                    />
                  </div>

                  {categoriesError && <p className="text-[11px] text-red-500">{categoriesError}</p>}

                  {catLoading && <p className="text-xs text-gray-400">Loading categories…</p>}

                  {!catLoading && catTiers.length === 0 && (
                    <p className="text-sm text-gray-400">
                      No category tiers configured for this workspace.
                    </p>
                  )}

                  <div className="space-y-5">
                    {catTiers.map((tier) => {
                      const nodes = catNodesByTier[tier.tier_number] ?? [];
                      const selected = catSelectedByTier[tier.tier_number] ?? [];
                      const isMulti = tier.is_multi_select;
                      const filtered = search
                        ? nodes.filter((n) => n.name.toLowerCase().includes(search))
                        : nodes;
                      const dimmed = search && filtered.length === 0;

                      return (
                        <div key={tier.tier_number} className={dimmed ? 'opacity-30' : undefined}>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                            {tier.name}
                            {isMulti && (
                              <span className="ml-1.5 normal-case font-normal text-gray-300 dark:text-gray-600">
                                · multi-select
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {filtered.map((node) => {
                              const isSelected = selected.includes(node.id);
                              const isChecking = checkingChipDelete === node.id;
                              const isEditingThis = editingChip?.id === node.id;

                              if (isEditingThis) {
                                return (
                                  <div
                                    key={node.id}
                                    className="inline-flex items-center gap-1 rounded-full border border-green-400 bg-white px-2 py-1 dark:bg-gray-900"
                                  >
                                    <input
                                      autoFocus
                                      type="text"
                                      value={editingChip.name}
                                      maxLength={200}
                                      disabled={savingChipEdit}
                                      onChange={(e) =>
                                        setEditingChip({ ...editingChip, name: e.target.value })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') void handleChipEditSave();
                                        if (e.key === 'Escape') setEditingChip(null);
                                      }}
                                      className="w-28 bg-transparent text-xs text-gray-900 outline-none dark:text-white"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => void handleChipEditSave()}
                                      disabled={savingChipEdit}
                                      aria-label="Save"
                                      className="text-green-600 hover:text-green-700 disabled:opacity-50"
                                    >
                                      {savingChipEdit ? (
                                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                                      ) : (
                                        <Check className="h-3 w-3" aria-hidden />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingChip(null)}
                                      disabled={savingChipEdit}
                                      aria-label="Cancel"
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      <X className="h-3 w-3" aria-hidden />
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div key={node.id} className="relative inline-flex">
                                  {/* Single pill container — border + rounding live here only */}
                                  <div
                                    className={`inline-flex items-center overflow-hidden rounded-full border transition-colors ${
                                      isSelected
                                        ? 'border-green-600 bg-green-600 text-white'
                                        : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        isMulti
                                          ? handleTierMultiToggle(tier.tier_number, node.id)
                                          : handleTierSelect(tier.tier_number, node.id)
                                      }
                                      className="pl-3 pr-1.5 py-1.5 text-xs font-medium"
                                    >
                                      {node.name}
                                    </button>
                                    <span
                                      className={`w-px self-stretch mx-0.5 ${isSelected ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`}
                                      aria-hidden
                                    />
                                    <button
                                      type="button"
                                      aria-label="Category actions"
                                      aria-haspopup="menu"
                                      aria-expanded={openChipMenu === node.id}
                                      disabled={isChecking}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenChipMenu(openChipMenu === node.id ? null : node.id);
                                      }}
                                      className={`pr-2 pl-1 py-1.5 transition-colors ${
                                        isSelected
                                          ? 'text-green-100 hover:bg-green-700'
                                          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      {isChecking ? (
                                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                                      ) : (
                                        <MoreVertical className="h-3 w-3" aria-hidden />
                                      )}
                                    </button>
                                  </div>
                                  {openChipMenu === node.id && (
                                    <div
                                      role="menu"
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute left-0 top-full mt-1 z-40 min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                                    >
                                      <button
                                        role="menuitem"
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                        onClick={() => {
                                          setOpenChipMenu(null);
                                          setEditingChip({ id: node.id, name: node.name });
                                        }}
                                      >
                                        <Pencil className="h-3 w-3 text-gray-400" aria-hidden />
                                        Edit
                                      </button>
                                      <button
                                        role="menuitem"
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                                        onClick={() => void handleChipDeleteClick(node)}
                                      >
                                        <Trash2 className="h-3 w-3" aria-hidden />
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {!search &&
                              (inlineAddOpen === tier.tier_number ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    autoFocus
                                    type="text"
                                    value={inlineAddName}
                                    onChange={(e) => setInlineAddName(e.target.value)}
                                    placeholder="Name…"
                                    className={`${premiumInputComfortableBase} w-36 text-xs`}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter')
                                        void handleInlineAddNode(tier.tier_number);
                                      if (e.key === 'Escape') {
                                        setInlineAddOpen(null);
                                        setInlineAddName('');
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void handleInlineAddNode(tier.tier_number)}
                                    disabled={savingInlineAdd || !inlineAddName.trim()}
                                    className="rounded-full bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {savingInlineAdd ? '…' : 'Add'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInlineAddOpen(null);
                                      setInlineAddName('');
                                    }}
                                    className="text-[11px] text-gray-400 hover:text-gray-600"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlineAddOpen(tier.tier_number);
                                    setInlineAddName('');
                                  }}
                                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-400 hover:border-green-500 hover:text-green-600 dark:border-gray-600"
                                >
                                  <Plus className="h-3 w-3" aria-hidden />
                                  Add
                                </button>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {hasChanges && (
                    <div className="sticky bottom-0 flex items-center gap-2 border-t border-gray-100 bg-white pt-3 dark:border-gray-800 dark:bg-gray-950">
                      <button
                        type="button"
                        onClick={() => void handleSaveCategories()}
                        disabled={savingCategories}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingCategories ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelCategories}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                      <p className="text-[10px] text-gray-400">
                        {changedTierCount} tier{changedTierCount !== 1 ? 's' : ''} with unsaved
                        changes
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-900 dark:text-white">Pricing</h3>
              {priceError && <p className="text-[11px] text-red-500 mb-2">{priceError}</p>}

              <section className={`${premiumSurfaces.insetInfo} space-y-3`}>
                <p className={`${premiumTypography.sectionTitle} uppercase tracking-wide`}>
                  Base pricing
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Base sell price is the fallback when a customer has no price tier assigned.
                </p>
                {basePricingMsg && (
                  <p className="text-[11px] text-red-500" role="alert">
                    {basePricingMsg}
                  </p>
                )}
                <div className={DETAIL_FORM_GRID}>
                  <div className="sm:col-span-6 md:col-span-3">
                    <label className={DETAIL_FIELD_LABEL}>Cost price</label>
                    <input
                      type="number"
                      step="any"
                      className={`w-full max-w-[10rem] ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                      value={baseCostInput}
                      onChange={(e) => setBaseCostInput(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-6 md:col-span-3">
                    <label className={DETAIL_FIELD_LABEL}>Sell price (base)</label>
                    <input
                      type="number"
                      step="any"
                      className={`w-full max-w-[10rem] ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                      value={baseSellInput}
                      onChange={(e) => setBaseSellInput(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-6 md:col-span-3 flex flex-col justify-end pb-0.5">
                    <label className={DETAIL_FIELD_LABEL}>Margin</label>
                    <p
                      className={`text-sm font-medium ${(() => {
                        const sell = parseFloat(baseSellInput);
                        const cost = parseFloat(baseCostInput);
                        if (!Number.isFinite(sell) || sell <= 0 || !Number.isFinite(cost)) {
                          return 'text-gray-500 dark:text-gray-400';
                        }
                        const m = ((sell - cost) / sell) * 100;
                        return m < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-900 dark:text-white';
                      })()}`}
                    >
                      {(() => {
                        const sell = parseFloat(baseSellInput);
                        const cost = parseFloat(baseCostInput);
                        if (!Number.isFinite(sell) || sell <= 0 || !Number.isFinite(cost))
                          return '—';
                        return `${(((sell - cost) / sell) * 100).toFixed(1)}%`;
                      })()}
                    </p>
                  </div>
                  <div className="sm:col-span-12 md:col-span-3 flex items-end">
                    <button
                      type="button"
                      onClick={() => void handleSaveBasePricing()}
                      disabled={savingBasePricing}
                      className="w-full sm:w-auto px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium shadow-sm disabled:opacity-50"
                    >
                      {savingBasePricing ? 'Saving...' : 'Save base prices'}
                    </button>
                  </div>
                </div>
                {(() => {
                  const sell = parseFloat(baseSellInput);
                  const cost = parseFloat(baseCostInput);
                  if (!Number.isFinite(sell) || !Number.isFinite(cost) || cost <= sell) return null;
                  const loss = cost - sell;
                  return (
                    <div
                      className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                      role="alert"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                      <span>
                        Selling below cost — you are losing {formatMoney(loss)} per unit at the base
                        price.
                      </span>
                    </div>
                  );
                })()}
              </section>

              <section className="space-y-2">
                <p className={`${premiumTypography.sectionTitle} uppercase tracking-wide`}>
                  Customer price tiers
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-xl">
                  Price tiers let you set different prices for different customers. Assign a tier to
                  a customer and they will automatically get those prices.
                </p>
                <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                  {priceLists
                    .filter((pl) => !pl.is_deleted)
                    .map((pl) => {
                      const item = priceListItems.find((i) => i.price_list_id === pl.id);
                      const displayPrice =
                        item?.unit_price ??
                        (product.sell_price != null ? product.sell_price : null);
                      return (
                        <li
                          key={pl.id}
                          className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-gray-900/40 px-3 py-2"
                        >
                          <span className="font-medium text-gray-900 dark:text-white">
                            {pl.name}
                          </span>
                          <span className="text-gray-700 dark:text-gray-200">
                            {item ? formatMoney(item.unit_price) : formatMoney(displayPrice)}
                            {!item && product.sell_price != null && (
                              <span className="ml-1 text-[10px] text-gray-400">(base)</span>
                            )}
                          </span>
                          <span className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setTierDialog({
                                  list: pl,
                                  existing: item ?? null,
                                  unitPrice: item ? String(item.unit_price) : '',
                                  minQty:
                                    item?.min_quantity != null ? String(item.min_quantity) : '1',
                                  maxQty:
                                    item?.max_quantity != null ? String(item.max_quantity) : '',
                                })
                              }
                              className="px-2 py-1 text-[11px] font-medium text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 rounded"
                            >
                              {item ? 'Edit' : 'Set price'}
                            </button>
                            {item ? (
                              <button
                                type="button"
                                onClick={() => handleDeletePriceItem(item.id)}
                                className="px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded"
                              >
                                Remove
                              </button>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  {priceLists.filter((pl) => !pl.is_deleted).length === 0 && (
                    <li className="px-3 py-4 text-center text-gray-400 text-sm">
                      No price tiers yet. Create tiers under Customer pricing.
                    </li>
                  )}
                </ul>
              </section>

              <section className="space-y-2">
                <p className={`${premiumTypography.sectionTitle} uppercase tracking-wide`}>
                  Add to another tier
                </p>
                <div className={DETAIL_FORM_GRID}>
                  <div className="sm:col-span-12 md:col-span-4">
                    <label className={DETAIL_FIELD_LABEL_COMPACT}>Price tier</label>
                    <select
                      className="w-full min-w-0 max-w-md px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                      value={priceListId}
                      onChange={(e) => setPriceListId(e.target.value)}
                    >
                      <option value="">Select tier</option>
                      {priceLists
                        .filter((pl) => !pl.is_deleted)
                        .filter((pl) => !priceListItems.some((i) => i.price_list_id === pl.id))
                        .map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            {pl.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4 md:col-span-2">
                    <label className={DETAIL_FIELD_LABEL_COMPACT}>Unit price</label>
                    <input
                      type="number"
                      className="w-full max-w-[8rem] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                      value={priceUnit}
                      onChange={(e) => setPriceUnit(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="sm:col-span-4 md:col-span-2">
                    <label className={DETAIL_FIELD_LABEL_COMPACT}>Min qty</label>
                    <input
                      type="number"
                      className="w-full max-w-[6rem] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                      value={priceMinQty}
                      onChange={(e) => setPriceMinQty(e.target.value)}
                      min={1}
                    />
                  </div>
                  <div className="sm:col-span-4 md:col-span-2">
                    <label className={DETAIL_FIELD_LABEL_COMPACT}>Max qty</label>
                    <input
                      type="number"
                      className="w-full max-w-[6rem] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                      value={priceMaxQty}
                      onChange={(e) => setPriceMaxQty(e.target.value)}
                      min={1}
                    />
                  </div>
                  <div className="sm:col-span-12 md:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={() => void handleAddPriceItem()}
                      disabled={savingPrice}
                      className="w-full sm:w-auto px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingPrice ? 'Saving...' : 'Add to tier'}
                    </button>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <p className={`${premiumTypography.sectionTitle} uppercase tracking-wide`}>
                  Quantity discounts (by tier)
                </p>
                {priceListItems.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No tier-specific prices for this product yet.
                  </p>
                ) : (
                  (() => {
                    const withBands = priceListItems.filter(
                      (i) => i.min_quantity != null || i.max_quantity != null
                    );
                    if (withBands.length === 0) {
                      return (
                        <p className="text-sm text-gray-400">
                          No quantity bands configured on tier lines.
                        </p>
                      );
                    }
                    return (
                      <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                        {withBands.map((i) => (
                          <li key={i.id}>
                            <span className="font-medium">
                              {i.price_list?.name || i.price_list_id}
                            </span>
                            : min {i.min_quantity ?? '—'}, max {i.max_quantity ?? '—'} —{' '}
                            {formatMoney(i.unit_price)}
                          </li>
                        ))}
                      </ul>
                    );
                  })()
                )}
              </section>
            </div>
          )}

          {activeTab === 'costing' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Product Cost History</h3>
              <div className={`${premiumSurfaces.insetInfo} space-y-2`}>
                <p className={premiumTypography.sectionTitle}>Add cost row</p>
                {costMsg && <p className="text-xs text-red-600 dark:text-red-400">{costMsg}</p>}
                <div className={DETAIL_FORM_GRID}>
                  <div className="sm:col-span-12 md:col-span-4">
                    <label className={DETAIL_FIELD_LABEL}>Effective from</label>
                    <input
                      type="date"
                      value={newCostEffective}
                      onChange={(e) => setNewCostEffective(e.target.value)}
                      className={`mt-1 w-full max-w-[11rem] ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                    />
                  </div>
                  <div className="sm:col-span-6 md:col-span-3">
                    <label className={DETAIL_FIELD_LABEL}>Cost price</label>
                    <input
                      type="number"
                      step="any"
                      value={newCostPrice}
                      onChange={(e) => setNewCostPrice(e.target.value)}
                      className={`mt-1 w-full max-w-[10rem] ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                    />
                  </div>
                  <div className="sm:col-span-6 md:col-span-3">
                    <label className={DETAIL_FIELD_LABEL}>Method</label>
                    <input
                      value={newCostMethod}
                      onChange={(e) => setNewCostMethod(e.target.value)}
                      className={`mt-1 w-full max-w-[12rem] ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                    />
                  </div>
                </div>
                <div className="mt-3 max-w-2xl">
                  <label className={DETAIL_FIELD_LABEL}>Notes</label>
                  <input
                    value={newCostNotes}
                    onChange={(e) => setNewCostNotes(e.target.value)}
                    className={`mt-1 w-full ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                  />
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={costSaving}
                    onClick={() => void handleAddCostRow()}
                    className={premiumPrimaryButton('businessCore', 'sm', 'auto')}
                  >
                    {costSaving ? 'Saving…' : 'Add'}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                        Effective From
                      </th>
                      <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                        Cost Price
                      </th>
                      <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                        Method
                      </th>
                      <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                        Notes
                      </th>
                      <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {costHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-400">
                          No cost history records
                        </td>
                      </tr>
                    )}
                    {costHistory.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                        <td className="px-3 py-2 text-gray-900 dark:text-white">
                          {c.effective_from}
                        </td>
                        <td className="px-3 py-2">{c.cost_price}</td>
                        <td className="px-3 py-2">{c.cost_method}</td>
                        <td className="px-3 py-2 max-w-xs truncate">{c.notes}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteCostRow(c.id)}
                            className="rounded px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Product Metrics</h3>
              <div className={`${premiumSurfaces.insetInfo}`}>
                {metricMsg && (
                  <p className="mb-2 text-xs text-red-600 dark:text-red-400">{metricMsg}</p>
                )}
                <div className={DETAIL_FORM_GRID}>
                  <div className="sm:col-span-12 md:col-span-4">
                    <label className={DETAIL_FIELD_LABEL}>Metric date</label>
                    <input
                      type="date"
                      value={newMetricDate}
                      onChange={(e) => setNewMetricDate(e.target.value)}
                      className={`mt-1 w-full max-w-[11rem] ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                    />
                  </div>
                  <div className="sm:col-span-6 md:col-span-3">
                    <label className={DETAIL_FIELD_LABEL}>Period type</label>
                    <input
                      value={newMetricPeriod}
                      onChange={(e) => setNewMetricPeriod(e.target.value)}
                      className={`mt-1 w-full max-w-[10rem] ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                    />
                  </div>
                  <div className="sm:col-span-12 md:col-span-3 flex items-end">
                    <button
                      type="button"
                      disabled={metricSaving}
                      onClick={() => void handleAddMetricRow()}
                      className={`w-full sm:w-auto ${premiumPrimaryButton('businessCore', 'sm', 'auto')}`}
                    >
                      {metricSaving ? 'Saving…' : 'Add snapshot'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                        Date
                      </th>
                      <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                        Period
                      </th>
                      <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                        Sales Qty
                      </th>
                      <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                        Sales Rev.
                      </th>
                      <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                        Stock Value
                      </th>
                      <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                        Turnover
                      </th>
                      <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {metrics.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 text-center text-sm text-gray-400">
                          No metrics available
                        </td>
                      </tr>
                    )}
                    {metrics.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                        <td className="px-3 py-2 text-gray-900 dark:text-white">{m.metric_date}</td>
                        <td className="px-3 py-2">{m.period_type}</td>
                        <td className="px-3 py-2">{m.sales_quantity ?? 0}</td>
                        <td className="px-3 py-2">{m.sales_revenue ?? 0}</td>
                        <td className="px-3 py-2">{m.stock_value ?? 0}</td>
                        <td className="px-3 py-2">{m.turnover_rate ?? 0}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteMetricRow(m.id)}
                            className="rounded px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'packing' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Packing Configurations
              </h3>
              {packingError && <p className="text-[11px] text-red-500 mb-1">{packingError}</p>}
              <div className="overflow-x-auto rounded-lg">
                <PackingConfigurationsEditor
                  value={packingConfigs}
                  onChange={handlePackingChange}
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSavePacking}
                  disabled={savingPacking}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPacking ? 'Saving...' : 'Save Packing'}
                </button>
                <p className="text-[10px] text-gray-500">
                  Saves packing levels and dimensions for this product.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'operations' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5 border-b border-gray-200 dark:border-gray-700 pb-2">
                {(
                  [
                    ['forecasts', 'Forecasts'],
                    ['stock', 'Stock levels'],
                    ['transactions', 'Transactions'],
                    ['production', 'Production'],
                    ['activity', 'Activity'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOpsSubTab(key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      opsSubTab === key
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {opsSubTab === 'forecasts' && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Demand Forecasts
                  </h3>
                  <div className={`${premiumSurfaces.insetInfo} space-y-2`}>
                    <p className={premiumTypography.sectionTitle}>Add forecast</p>
                    {fcMsg && <p className="text-xs text-red-600 dark:text-red-400">{fcMsg}</p>}
                    <div className={DETAIL_FORM_GRID}>
                      <div className="sm:col-span-6 md:col-span-3">
                        <label className={DETAIL_FIELD_LABEL}>Period start</label>
                        <input
                          type="date"
                          value={fcStart}
                          onChange={(e) => setFcStart(e.target.value)}
                          className={`mt-1 w-full max-w-[11rem] ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                          aria-label="Period start"
                        />
                      </div>
                      <div className="sm:col-span-6 md:col-span-3">
                        <label className={DETAIL_FIELD_LABEL}>Period end</label>
                        <input
                          type="date"
                          value={fcEnd}
                          onChange={(e) => setFcEnd(e.target.value)}
                          className={`mt-1 w-full max-w-[11rem] ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                          aria-label="Period end"
                        />
                      </div>
                      <div className="sm:col-span-6 md:col-span-2">
                        <label className={DETAIL_FIELD_LABEL}>Forecast qty</label>
                        <input
                          type="number"
                          placeholder="Qty"
                          value={fcQty}
                          onChange={(e) => setFcQty(e.target.value)}
                          className={`mt-1 w-full max-w-[8rem] ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                        />
                      </div>
                      <div className="sm:col-span-12 md:col-span-4 flex items-end">
                        <button
                          type="button"
                          disabled={fcSaving}
                          onClick={() => void handleAddForecast()}
                          className={`w-full sm:w-auto ${premiumPrimaryButton('businessCore', 'sm', 'auto')}`}
                        >
                          {fcSaving ? 'Saving…' : 'Add'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900/40">
                        <tr>
                          <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                            Period
                          </th>
                          <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                            Forecast Qty
                          </th>
                          <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                            Actual Qty
                          </th>
                          <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                            Confidence
                          </th>
                          <th className={`px-3 py-2 text-right ${premiumTypography.tableHeader}`}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {forecasts.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-400">
                              No forecasts
                            </td>
                          </tr>
                        )}
                        {forecasts.map((f) => (
                          <tr key={f.id}>
                            <td className="px-3 py-2 text-gray-900 dark:text-white">
                              {f.period_start} - {f.period_end}
                            </td>
                            <td className="px-3 py-2">{f.forecast_quantity}</td>
                            <td className="px-3 py-2">{f.actual_quantity ?? '-'}</td>
                            <td className="px-3 py-2">
                              {f.confidence_level ? `${f.confidence_level}%` : '-'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteForecast(f.id)}
                                className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {opsSubTab === 'stock' && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Stock Levels</h3>
                  {!productTracksInventory(product) ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      This product is not set up as a stocked item. Stock levels do not apply.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/40">
                          <tr>
                            <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                              Location
                            </th>
                            <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                              Quantity
                            </th>
                            <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                              Available
                            </th>
                            <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                              Reserved
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {stockLevels.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-4 text-center text-sm text-gray-400"
                              >
                                No stock level records
                              </td>
                            </tr>
                          )}
                          {stockLevels.map((s) => (
                            <tr key={s.id}>
                              <td className="px-3 py-2 text-gray-900 dark:text-white">
                                {s.location_id || '(default)'}
                              </td>
                              <td className="px-3 py-2">{s.quantity}</td>
                              <td className="px-3 py-2">{s.available_quantity ?? s.quantity}</td>
                              <td className="px-3 py-2">{s.reserved_quantity ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {opsSubTab === 'transactions' && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Stock Transactions
                  </h3>
                  {!productTracksInventory(product) ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      This product is not set up as a stocked item. Stock transactions do not apply.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/40">
                          <tr>
                            <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                              Date
                            </th>
                            <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                              Type
                            </th>
                            <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                              Qty
                            </th>
                            <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                              From
                            </th>
                            <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                              To
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {stockTransactions.length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-3 py-4 text-center text-sm text-gray-400"
                              >
                                No transactions
                              </td>
                            </tr>
                          )}
                          {stockTransactions.map((t) => (
                            <tr key={t.id}>
                              <td className="px-3 py-2 text-gray-900 dark:text-white">
                                {t.transaction_date || ''}
                              </td>
                              <td className="px-3 py-2">{t.transaction_type}</td>
                              <td className="px-3 py-2">{t.quantity}</td>
                              <td className="px-3 py-2">{t.from_location_id || '-'}</td>
                              <td className="px-3 py-2">{t.to_location_id || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {opsSubTab === 'production' && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Production Plans
                  </h3>
                  <div className={`${premiumSurfaces.insetInfo} space-y-2`}>
                    <p className={premiumTypography.sectionTitle}>Add production plan</p>
                    {ppMsg && <p className="text-xs text-red-600 dark:text-red-400">{ppMsg}</p>}
                    <div className={DETAIL_FORM_GRID}>
                      <div className="sm:col-span-6 md:col-span-3">
                        <label className={DETAIL_FIELD_LABEL}>Planned start</label>
                        <input
                          type="date"
                          value={ppStart}
                          onChange={(e) => setPpStart(e.target.value)}
                          className={`mt-1 w-full max-w-[11rem] ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                          aria-label="Planned start"
                        />
                      </div>
                      <div className="sm:col-span-6 md:col-span-3">
                        <label className={DETAIL_FIELD_LABEL}>Planned end</label>
                        <input
                          type="date"
                          value={ppEnd}
                          onChange={(e) => setPpEnd(e.target.value)}
                          className={`mt-1 w-full max-w-[11rem] ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                          aria-label="Planned end"
                        />
                      </div>
                      <div className="sm:col-span-6 md:col-span-2">
                        <label className={DETAIL_FIELD_LABEL}>Planned qty</label>
                        <input
                          type="number"
                          placeholder="Qty"
                          value={ppQty}
                          onChange={(e) => setPpQty(e.target.value)}
                          className={`mt-1 w-full max-w-[8rem] ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                        />
                      </div>
                      <div className="sm:col-span-12 md:col-span-4 flex items-end">
                        <button
                          type="button"
                          disabled={ppSaving}
                          onClick={() => void handleAddProductionPlan()}
                          className={`w-full sm:w-auto ${premiumPrimaryButton('businessCore', 'sm', 'auto')}`}
                        >
                          {ppSaving ? 'Saving…' : 'Add'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900/40">
                        <tr>
                          <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                            Planned Start
                          </th>
                          <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                            Planned End
                          </th>
                          <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                            Planned Qty
                          </th>
                          <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                            Status
                          </th>
                          <th className={`px-3 py-2 text-right ${premiumTypography.tableHeader}`}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {productionPlans.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-400">
                              No production plans
                            </td>
                          </tr>
                        )}
                        {productionPlans.map((p) => (
                          <tr key={p.id}>
                            <td className="px-3 py-2 text-gray-900 dark:text-white">
                              {p.planned_start_date}
                            </td>
                            <td className="px-3 py-2">{p.planned_end_date}</td>
                            <td className="px-3 py-2">{p.planned_quantity}</td>
                            <td className="px-3 py-2">{p.status || 'planned'}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteProductionPlan(p.id)}
                                className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {opsSubTab === 'activity' && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Activity Log</h3>
                  <div className="overflow-x-auto max-h-60">
                    <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900/40">
                        <tr>
                          <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                            Timestamp
                          </th>
                          <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                            Action
                          </th>
                          <th className={`px-3 py-2 text-left ${premiumTypography.tableHeader}`}>
                            User
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {activityLog.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-center text-sm text-gray-400">
                              No activity recorded
                            </td>
                          </tr>
                        )}
                        {activityLog.map((a) => (
                          <tr key={a.id}>
                            <td className="px-3 py-2 text-gray-900 dark:text-white">
                              {a.created_at}
                            </td>
                            <td className="px-3 py-2">{a.action}</td>
                            <td className="px-3 py-2">{a.user_id || 'system'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
