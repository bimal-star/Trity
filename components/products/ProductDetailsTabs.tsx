'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
} from '@/types/product';
import PackingConfigurationsEditor from '@/components/PackingConfigurationsEditor';
import PremiumRecordPanel from '@/components/layout/premium/PremiumRecordPanel';
import PremiumRecordTabs from '@/components/layout/premium/PremiumRecordTabs';
import PremiumSectionTitle from '@/components/layout/premium/PremiumSectionTitle';
import {
  AlertTriangle,
  Check,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  ScanLine,
  Trash2,
  X,
} from 'lucide-react';
import {
  premiumFocusRing,
  premiumInputCompact,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumSurfaces,
  premiumTypography,
  recordDetail,
} from '@/lib/premiumUi';
import { logProductUpdated } from '@/lib/auditLog';
import {
  PRICE_LIST_ITEM_SELECT,
  dateInputValue,
  formatPriceItemEffectiveLabel,
  normalizeDateOnly,
  priceItemEffectiveStatus,
  validateEffectiveDateRange,
} from '@/lib/priceListItemDates';
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
import {
  formatBarcodePackLabel,
  isValidPackingLevel,
  resolveBarcodePackingLevel,
} from '@/lib/productBarcodePacking';
import { findUnknownPackingLevels, packingConfigurationInserts } from '@/lib/productPacking';
import { mergeSellablePackOptions, slugifySellablePackCode } from '@/lib/sellablePackLevel';
import { useSellablePackLevels } from '@/hooks/useSellablePackLevels';
import type { Database } from '@/types/database';
import { parseAttributeDimensions } from '@/lib/productCatalogue';
import { useToast } from '@/lib/toast';

const DETAIL_FORM_GRID = recordDetail.formGrid;
const DETAIL_FIELD_LABEL_COMPACT = recordDetail.fieldLabelCompact;
const RECORD_INPUT = `${premiumInputCompact} ${premiumFocusRing('businessCore')}`;
const PRODUCT_DETAIL_TAB_KEY = 'trity:product-detail-tab';
const BARCODE_FIELD_LABEL =
  'text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500';
const BARCODE_COMPOSER_GRID_COLUMNS =
  'minmax(0,1.35fr) 2px minmax(0,0.7fr) 2px minmax(0,0.85fr) 2px auto';
const PRICING_NUM_INPUT = `box-border rounded-md border border-gray-200 px-2 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-900 ${premiumFocusRing('businessCore')}`;

type ProductDetailTabId = 'variants' | 'barcodes' | 'categories' | 'pricing';

const PRODUCT_DETAIL_TAB_IDS: ProductDetailTabId[] = [
  'variants',
  'categories',
  'barcodes',
  'pricing',
];

const LEGACY_PRODUCT_DETAIL_TAB_MAP: Record<string, ProductDetailTabId> = {
  packing: 'barcodes',
  costing: 'categories',
  metrics: 'categories',
  operations: 'categories',
};

function isProductDetailTabId(id: string): id is ProductDetailTabId {
  return (PRODUCT_DETAIL_TAB_IDS as string[]).includes(id);
}

function resolveStoredProductDetailTab(
  stored: string,
  supportsGroups: boolean
): ProductDetailTabId | null {
  if (isProductDetailTabId(stored)) {
    if (stored === 'variants' && !supportsGroups) return 'categories';
    return stored;
  }
  const mapped = LEGACY_PRODUCT_DETAIL_TAB_MAP[stored];
  if (!mapped) return null;
  if (mapped === 'variants' && !supportsGroups) return 'categories';
  return mapped;
}

interface ProductDetailsTabsProps {
  product: Product;
  /** Draft create flow — tabs show placeholders until the product is saved. */
  createMode?: boolean;
  onCreateProduct?: () => void | Promise<void>;
  creating?: boolean;
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
        <PremiumSectionTitle as="h3" className="!normal-case tracking-wide">
          Variants
        </PremiumSectionTitle>
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <PremiumSectionTitle as="h3" className="!normal-case tracking-wide">
          Variants
        </PremiumSectionTitle>
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
                <th className={`px-2 py-1 text-left ${premiumTypography.tableHeaderDense}`}>
                  Name
                </th>
                <th className={`px-2 py-1 text-left ${premiumTypography.tableHeaderDense}`}>SKU</th>
                <th className={`px-2 py-1 text-left ${premiumTypography.tableHeaderDense}`}>
                  Stock
                </th>
                <th className={`px-2 py-1 text-left ${premiumTypography.tableHeaderDense}`}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {groupProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-center text-sm text-gray-400">
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
                    <td className="px-2 py-1 text-gray-900 dark:text-white">{p.name}</td>
                    <td className="px-2 py-1">{p.sku}</td>
                    <td className="px-2 py-1">{stock}</td>
                    <td className="px-2 py-1">{p.status}</td>
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

function ProductDetailsTabsCreatePanel({
  creating = false,
  onCreateProduct,
}: {
  creating?: boolean;
  onCreateProduct?: () => void | Promise<void>;
}) {
  const { supportsGroups } = useCatalogueMode();
  const createTabs = [
    ...(supportsGroups ? [{ id: 'variants', label: 'Variants' }] : []),
    { id: 'categories', label: 'Categories' },
    { id: 'barcodes', label: 'Barcodes & packing' },
    { id: 'pricing', label: 'Pricing' },
  ];
  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
      <PremiumRecordTabs
        module="businessCore"
        tabs={createTabs}
        activeId="categories"
        onChange={() => {}}
        className="mb-2 shrink-0"
      />
      <PremiumRecordPanel className="flex min-h-0 flex-1 flex-col justify-between gap-4">
        <p className={premiumTypography.helper}>
          Use <span className="font-medium">Details</span> on the summary card to enter SKU and
          name, then choose <span className="font-medium">Create product</span>. Categories,
          barcodes, packing, and pricing are available after the product is saved.
        </p>
        {onCreateProduct ? (
          <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700">
            <button
              type="button"
              disabled={creating}
              onClick={() => void onCreateProduct()}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              Create product
            </button>
          </div>
        ) : null}
      </PremiumRecordPanel>
    </div>
  );
}

export default function ProductDetailsTabs({
  product,
  createMode = false,
  onCreateProduct,
  creating = false,
  onProductUpdated,
  onSelectProduct,
}: ProductDetailsTabsProps) {
  if (createMode) {
    return <ProductDetailsTabsCreatePanel creating={creating} onCreateProduct={onCreateProduct} />;
  }

  const { effectiveTenantId: tenant_id, user } = useTenant();
  const {
    levels: tenantSellablePackLevels,
    createLevel: createSellablePackLevel,
    refresh: refreshSellablePackLevels,
  } = useSellablePackLevels();
  const { supportsGroups, isMatrix } = useCatalogueMode();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ProductDetailTabId>('categories');
  const tabRestoredRef = useRef(false);

  const [groupProducts, setGroupProducts] = useState<Product[]>([]);
  const [groupLabel, setGroupLabel] = useState<string | null>(null);
  const [groupDimensions, setGroupDimensions] = useState<unknown | null>(null);
  const [barcodes, setBarcodes] = useState<ProductBarcode[]>([]);
  const [catTiers, setCatTiers] = useState<CategoryTier[]>([]);
  const [catNodesByTier, setCatNodesByTier] = useState<Record<number, CategoryNode[]>>({});
  const [catSelectedByTier, setCatSelectedByTier] = useState<Record<number, string[]>>({});
  const [catInitialByTier, setCatInitialByTier] = useState<Record<number, string[]>>({});
  const [catLoading, setCatLoading] = useState(false);
  const [inlineAddOpen, setInlineAddOpen] = useState<number | null>(null);
  const [inlineAddName, setInlineAddName] = useState('');
  const [savingInlineAdd, setSavingInlineAdd] = useState(false);
  const [priceListItems, setPriceListItems] = useState<PriceListItemWithList[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [packingConfigs, setPackingConfigs] = useState<PackingConfiguration[]>([]);
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
  const [priceEffectiveFrom, setPriceEffectiveFrom] = useState('');
  const [priceEffectiveTo, setPriceEffectiveTo] = useState('');
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
    effectiveFrom: string;
    effectiveTo: string;
  } | null>(null);
  const [savingTierDialog, setSavingTierDialog] = useState(false);

  // Packing save state
  const [savingPacking, setSavingPacking] = useState(false);
  const [packingError, setPackingError] = useState<string | null>(null);
  type CustomPackAnchor = 'pack' | 'barcode';
  const [customPackAnchor, setCustomPackAnchor] = useState<CustomPackAnchor | null>(null);
  const [customPackLabel, setCustomPackLabel] = useState('');
  const [customPackCode, setCustomPackCode] = useState('');
  const [savingCustomPack, setSavingCustomPack] = useState(false);
  const [customPackPopoverPos, setCustomPackPopoverPos] = useState({ top: 0, left: 0 });
  const packAddBtnRef = useRef<HTMLButtonElement>(null);
  const barcodeAddBtnRef = useRef<HTMLButtonElement>(null);

  const closeCustomPackModal = useCallback(() => {
    setCustomPackAnchor(null);
    setCustomPackLabel('');
    setCustomPackCode('');
  }, []);

  const openCustomPackModal = useCallback((anchor: CustomPackAnchor) => {
    setCustomPackAnchor(anchor);
  }, []);

  useLayoutEffect(() => {
    if (!customPackAnchor) return;
    const el = customPackAnchor === 'pack' ? packAddBtnRef.current : barcodeAddBtnRef.current;
    if (!el) return;

    const updatePosition = () => {
      const rect = el.getBoundingClientRect();
      const panelWidth = 288;
      let left = rect.left;
      const top = rect.bottom + 6;
      if (left + panelWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - panelWidth - 12);
      }
      setCustomPackPopoverPos({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [customPackAnchor]);

  useEffect(() => {
    if (activeTab !== 'barcodes') closeCustomPackModal();
  }, [activeTab, closeCustomPackModal]);

  const sellablePackOptions = useMemo(() => {
    const fromConfigs = packingConfigs.map((c) => c.level);
    const fromBarcodes = barcodes.map((b) => b.packing_level);
    return mergeSellablePackOptions(tenantSellablePackLevels, [...fromConfigs, ...fromBarcodes]);
  }, [tenantSellablePackLevels, packingConfigs, barcodes]);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

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
      barcodes: barcodes.length + packingConfigs.length,
      categories: categoryAssignmentCount,
      pricing: priceListItems.length,
    }),
    [
      supportsGroups,
      groupProducts.length,
      barcodes.length,
      packingConfigs.length,
      categoryAssignmentCount,
      priceListItems.length,
    ]
  );

  const recordTabs = useMemo(() => {
    const tabs: { id: string; label: string; badge?: number }[] = [];
    if (supportsGroups) {
      tabs.push({ id: 'variants', label: 'Variants', badge: tabBadges.variants });
    }
    tabs.push(
      { id: 'categories', label: 'Categories', badge: tabBadges.categories },
      {
        id: 'barcodes',
        label: 'Barcodes & packing',
        badge: tabBadges.barcodes || undefined,
      },
      { id: 'pricing', label: 'Pricing', badge: tabBadges.pricing }
    );
    return tabs;
  }, [supportsGroups, tabBadges]);

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

      const [barcodesRes, priceListsRes, priceListItemsRes, packingConfigsRes] = await Promise.all([
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
          .select(PRICE_LIST_ITEM_SELECT)
          .eq('product_id', product.id),
        supabase
          .from('packing_configurations')
          .select('*')
          .eq('product_id', product.id)
          .order('level'),
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
          effective_from: row.effective_from ?? null,
          effective_to: row.effective_to ?? null,
          created_at: row.created_at,
          price_list: row.price_lists as PriceList,
        }))
      );

      setPackingConfigs((packingConfigsRes.data || []) as PackingConfiguration[]);

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
    if (tabRestoredRef.current) return;
    tabRestoredRef.current = true;
    try {
      const stored = sessionStorage.getItem(PRODUCT_DETAIL_TAB_KEY);
      if (stored) {
        const resolved = resolveStoredProductDetailTab(stored, supportsGroups);
        if (resolved) setActiveTab(resolved);
      }
    } catch {
      /* ignore */
    }
  }, [supportsGroups]);

  useEffect(() => {
    if (!supportsGroups && activeTab === 'variants') {
      setActiveTab('categories');
    }
  }, [supportsGroups, activeTab]);

  const handleTabChange = useCallback((id: string) => {
    if (!isProductDetailTabId(id)) return;
    setActiveTab(id);
    try {
      sessionStorage.setItem(PRODUCT_DETAIL_TAB_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

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
      const effFrom = normalizeDateOnly(tierDialog.effectiveFrom);
      const effTo = normalizeDateOnly(tierDialog.effectiveTo);
      const rangeErr = validateEffectiveDateRange(effFrom, effTo);
      if (rangeErr) throw new Error(rangeErr);

      if (tierDialog.existing) {
        const { data, error } = await supabase
          .from('price_list_items')
          .update({
            unit_price: Number(u),
            min_quantity: minQ,
            max_quantity: maxQ,
            effective_from: effFrom,
            effective_to: effTo,
            updated_by: user.id,
          })
          .eq('id', tierDialog.existing.id)
          .select(PRICE_LIST_ITEM_SELECT)
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
          effective_from: string | null;
          effective_to: string | null;
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
                  effective_from: row.effective_from,
                  effective_to: row.effective_to,
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
            effective_from: effFrom,
            effective_to: effTo,
            tenant_id,
            created_by: user.id,
            updated_by: user.id,
          })
          .select(PRICE_LIST_ITEM_SELECT)
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
          effective_from: string | null;
          effective_to: string | null;
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
            effective_from: row.effective_from,
            effective_to: row.effective_to,
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

  const defaultPackingForBarcode = useMemo(() => {
    const preferred = packingConfigs.find((c) => c.is_default);
    return preferred ?? packingConfigs[0] ?? null;
  }, [packingConfigs]);

  const applyDefaultPackingToComposer = () => {
    if (!defaultPackingForBarcode) {
      toast.error('Add a pack level above before using this shortcut.');
      return;
    }
    setBarcodePackingLevel(
      resolveBarcodePackingLevel(defaultPackingForBarcode.level, sellablePackOptions)
    );
    setBarcodeQty(String(defaultPackingForBarcode.quantity ?? 1));
  };

  const clearOtherPrimaryBarcodes = async (keepId?: string) => {
    if (!tenant_id) return;
    let query = supabase
      .from('product_barcodes')
      .update({ is_primary: false })
      .eq('product_id', product.id)
      .eq('tenant_id', tenant_id)
      .eq('is_primary', true);
    if (keepId) query = query.neq('id', keepId);
    const { error } = await query;
    if (error) throw error;
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
      const resolvedPacking = resolveBarcodePackingLevel(barcodePackingLevel, sellablePackOptions);
      const qty = barcodeQty.trim() === '' ? 1 : Number(barcodeQty);

      if (barcodePrimary) {
        await clearOtherPrimaryBarcodes();
      }

      const { data, error } = await supabase
        .from('product_barcodes')
        .insert({
          product_id: product.id,
          barcode: barcodeValue.trim(),
          barcode_type: barcodeType,
          packing_level: resolvedPacking,
          quantity: qty,
          description: barcodeDescription.trim() === '' ? null : barcodeDescription.trim(),
          is_primary: barcodePrimary,
          is_active: barcodeActive,
          tenant_id: tenant_id,
        })
        .select('*')
        .single();

      if (error) throw error;
      const added = data as ProductBarcode;
      setBarcodes((prev) => [
        ...prev.map((b) => ({ ...b, is_primary: barcodePrimary ? false : b.is_primary })),
        added,
      ]);
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
    setEditBarcodePackingLevel(resolveBarcodePackingLevel(String(pl), sellablePackOptions));
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
      const resolvedPacking = resolveBarcodePackingLevel(
        editBarcodePackingLevel,
        sellablePackOptions
      );
      const qty = editBarcodeQty.trim() === '' ? 1 : Number(editBarcodeQty);

      if (editBarcodePrimary) {
        await clearOtherPrimaryBarcodes(editingBarcodeId);
      }

      const { error: upErr } = await supabase
        .from('product_barcodes')
        .update({
          barcode: editBarcodeBarcode.trim(),
          barcode_type: editBarcodeType,
          packing_level: resolvedPacking,
          quantity: qty,
          description: editBarcodeDescription.trim() === '' ? null : editBarcodeDescription.trim(),
          is_primary: editBarcodePrimary,
          is_active: editBarcodeActive,
        })
        .eq('id', editingBarcodeId)
        .eq('product_id', product.id)
        .eq('tenant_id', tenant_id);

      if (upErr) throw upErr;

      setBarcodes((prev) =>
        prev.map((row) => {
          if (row.id === editingBarcodeId) {
            return {
              ...row,
              barcode: editBarcodeBarcode.trim(),
              barcode_type: editBarcodeType,
              packing_level: resolvedPacking,
              quantity: qty,
              description:
                editBarcodeDescription.trim() === '' ? null : editBarcodeDescription.trim(),
              is_primary: editBarcodePrimary,
              is_active: editBarcodeActive,
            } as ProductBarcode;
          }
          return editBarcodePrimary ? { ...row, is_primary: false } : row;
        })
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
      const effFrom = normalizeDateOnly(priceEffectiveFrom);
      const effTo = normalizeDateOnly(priceEffectiveTo);
      const rangeErr = validateEffectiveDateRange(effFrom, effTo);
      if (rangeErr) {
        setPriceError(rangeErr);
        return;
      }

      const { data, error } = await supabase
        .from('price_list_items')
        .insert({
          price_list_id: priceListId,
          product_id: product.id,
          unit_price: Number(priceUnit),
          min_quantity: minQtyVal,
          max_quantity: maxQtyVal,
          effective_from: effFrom,
          effective_to: effTo,
          tenant_id,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select(PRICE_LIST_ITEM_SELECT)
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
        effective_from: row.effective_from ?? null,
        effective_to: row.effective_to ?? null,
        created_at: row.created_at,
        price_list: row.price_lists as PriceList,
      };
      setPriceListItems((prev) => [...prev, withList]);
      setPriceUnit('');
      setPriceMinQty('1');
      setPriceMaxQty('');
      setPriceEffectiveFrom('');
      setPriceEffectiveTo('');
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

  const handleAddCustomSellablePack = async () => {
    const label = customPackLabel.trim();
    if (!label) {
      toast.error('Enter a name for the custom pack level.');
      return;
    }
    setSavingCustomPack(true);
    const code = customPackCode.trim() || slugifySellablePackCode(label);
    const result = await createSellablePackLevel({ label, code });
    setSavingCustomPack(false);
    if (!result.success) {
      toast.error(result.error || 'Failed to add pack level');
      return;
    }
    await refreshSellablePackLevels();
    closeCustomPackModal();
    toast.success(`Pack level "${result.data?.label ?? label}" added.`);
  };

  const handleSavePacking = async () => {
    try {
      setPackingError(null);
      setSavingPacking(true);
      if (!tenant_id) {
        setPackingError('Tenant ID not available.');
        return;
      }

      const unknown = findUnknownPackingLevels(packingConfigs, sellablePackOptions);
      if (unknown.length > 0) {
        setPackingError(
          `Unknown pack level(s): ${unknown.join(', ')}. Add them under "Custom pack level" first.`
        );
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
          packingConfigs,
          sellablePackOptions
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

  const customPackModalEl = customPackAnchor ? (
    <>
      <div
        className="fixed inset-0 z-[83]"
        role="presentation"
        aria-hidden
        onMouseDown={closeCustomPackModal}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-pack-dialog-title"
        className="fixed z-[84] w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800"
        style={{ top: customPackPopoverPos.top, left: customPackPopoverPos.left }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h4
          id="custom-pack-dialog-title"
          className="text-sm font-semibold text-gray-900 dark:text-white"
        >
          New sellable pack level
        </h4>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          Added to your workspace catalog for pack levels and barcodes.
        </p>
        <div className="mt-3 space-y-3">
          <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300">
            Display name
            <input
              type="text"
              autoFocus
              value={customPackLabel}
              onChange={(e) => {
                setCustomPackLabel(e.target.value);
                if (!customPackCode.trim()) {
                  setCustomPackCode(slugifySellablePackCode(e.target.value));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddCustomSellablePack();
                if (e.key === 'Escape') closeCustomPackModal();
              }}
              className={`${RECORD_INPUT} mt-1 w-full`}
              placeholder="e.g. Half pallet"
            />
          </label>
          <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300">
            Code
            <input
              type="text"
              value={customPackCode}
              onChange={(e) => setCustomPackCode(e.target.value.toLowerCase())}
              className={`${RECORD_INPUT} mt-1 w-full font-mono`}
              placeholder="half_pallet"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeCustomPackModal}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={savingCustomPack}
            onClick={() => void handleAddCustomSellablePack()}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {savingCustomPack ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </>
  ) : null;

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
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 mb-1">Valid from</label>
              <input
                type="date"
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                value={tierDialog.effectiveFrom}
                onChange={(e) => setTierDialog({ ...tierDialog, effectiveFrom: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 mb-1">Valid to</label>
              <input
                type="date"
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                value={tierDialog.effectiveTo}
                onChange={(e) => setTierDialog({ ...tierDialog, effectiveTo: e.target.value })}
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">
            Leave dates empty for no end date. Applies to this product on this tier only.
          </p>
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
        <div className="mt-2 flex min-h-0 flex-1 items-center justify-center py-8 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" aria-hidden />
          Loading product details...
        </div>
      </>
    );
  }

  return (
    <>
      {tierDialogEl}
      {customPackModalEl}
      {confirmFooter}
      {chipDeleteModalEl}
      <div className="mt-2 min-h-0 flex-1 flex flex-col overflow-hidden">
        <PremiumRecordTabs
          module="businessCore"
          tabs={recordTabs}
          activeId={activeTab}
          onChange={handleTabChange}
          className="mb-2 shrink-0"
        />

        <PremiumRecordPanel
          className={
            activeTab === 'pricing'
              ? 'flex min-h-0 flex-1 flex-col overflow-y-auto !space-y-0'
              : undefined
          }
        >
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
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] xl:gap-8">
              <section className="min-w-0 space-y-3" aria-label="Pack levels">
                <div className="flex items-center gap-2">
                  <PremiumSectionTitle as="h3" className="!normal-case tracking-wide">
                    Pack levels
                  </PremiumSectionTitle>
                  <button
                    ref={packAddBtnRef}
                    type="button"
                    title="Add custom sellable pack"
                    aria-label="Add custom sellable pack"
                    aria-expanded={customPackAnchor === 'pack'}
                    onClick={() => openCustomPackModal('pack')}
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:border-green-500 dark:hover:bg-green-950/30 dark:hover:text-green-500 ${
                      customPackAnchor === 'pack'
                        ? 'border-green-500 bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-500'
                        : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Define pack quantities and dimensions per level. Levels come from your workspace
                  catalog and appear in the barcodes panel.
                </p>
                {packingError && <p className="text-[11px] text-red-500 mb-1">{packingError}</p>}
                <div className="overflow-x-auto rounded-lg">
                  <PackingConfigurationsEditor
                    value={packingConfigs}
                    onChange={handlePackingChange}
                    levelOptions={sellablePackOptions}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSavePacking()}
                    disabled={savingPacking}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingPacking ? 'Saving…' : 'Save pack levels'}
                  </button>
                  <p className="text-[10px] text-gray-500">
                    Saves packing levels and dimensions for this product.
                  </p>
                </div>
              </section>

              <section
                className="min-w-0 space-y-3 border-t border-gray-200 pt-6 dark:border-gray-700 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0"
                aria-label="Barcodes"
              >
                <PremiumSectionTitle as="h3" className="!normal-case tracking-wide">
                  Barcodes
                </PremiumSectionTitle>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Link barcodes for receiving, POS, and inventory. The{' '}
                  <span className="font-medium text-gray-600 dark:text-gray-300">primary</span>{' '}
                  barcode should be on your sellable pack (unit, inner/breakpack, case, pallet,
                  etc.). Only one primary per product. Inactive barcodes are ignored in scans.
                </p>

                {barcodeError && (
                  <p className="text-[11px] font-medium text-red-500">{barcodeError}</p>
                )}

                <div className="overflow-x-auto">
                  <div
                    className="grid w-full min-w-0 max-w-full items-stretch xl:min-w-[22rem]"
                    style={{ gridTemplateColumns: BARCODE_COMPOSER_GRID_COLUMNS }}
                  >
                    <div className="flex flex-col gap-2 px-3">
                      <label className={BARCODE_FIELD_LABEL}>Barcode</label>
                      <input
                        className={RECORD_INPUT}
                        value={barcodeValue}
                        onChange={(e) => setBarcodeValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleAddBarcode();
                        }}
                        placeholder="Scan or enter barcode"
                      />
                      <label className={`${BARCODE_FIELD_LABEL} normal-case`}>
                        Description{' '}
                        <span className="font-normal lowercase text-gray-400 dark:text-gray-500">
                          (optional)
                        </span>
                      </label>
                      <input
                        className={RECORD_INPUT}
                        value={barcodeDescription}
                        onChange={(e) => setBarcodeDescription(e.target.value)}
                        placeholder="Note for operators"
                      />
                    </div>
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      className="h-full min-h-full bg-gray-300 dark:bg-gray-600"
                    />
                    <div className="flex flex-col gap-2 px-3">
                      <label className={BARCODE_FIELD_LABEL}>Type</label>
                      <select
                        className={RECORD_INPUT}
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
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      className="h-full min-h-full bg-gray-300 dark:bg-gray-600"
                    />
                    <div className="flex flex-col gap-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <label className={BARCODE_FIELD_LABEL}>Sellable pack</label>
                        <button
                          ref={barcodeAddBtnRef}
                          type="button"
                          title="Add custom sellable pack"
                          aria-label="Add custom sellable pack"
                          aria-expanded={customPackAnchor === 'barcode'}
                          onClick={() => openCustomPackModal('barcode')}
                          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:border-green-500 dark:hover:bg-green-950/30 dark:hover:text-green-500 ${
                            customPackAnchor === 'barcode'
                              ? 'border-green-500 bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-500'
                              : 'border-gray-200 text-gray-400 dark:border-gray-600'
                          }`}
                        >
                          <Plus className="h-3 w-3" aria-hidden />
                        </button>
                      </div>
                      <select
                        className={RECORD_INPUT}
                        value={barcodePackingLevel || 'unit'}
                        onChange={(e) => setBarcodePackingLevel(e.target.value)}
                      >
                        {sellablePackOptions.map((o) => (
                          <option key={o.code} value={o.code}>
                            {o.label}
                          </option>
                        ))}
                        {barcodePackingLevel &&
                          !isValidPackingLevel(barcodePackingLevel, sellablePackOptions) && (
                            <option value={barcodePackingLevel}>{barcodePackingLevel}</option>
                          )}
                      </select>
                      {defaultPackingForBarcode && (
                        <button
                          type="button"
                          onClick={applyDefaultPackingToComposer}
                          className="text-left text-[10px] font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                        >
                          Use default pack level (
                          {formatBarcodePackLabel(
                            defaultPackingForBarcode.level,
                            defaultPackingForBarcode.quantity,
                            sellablePackOptions
                          )}
                          )
                        </button>
                      )}
                    </div>
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      className="h-full min-h-full bg-gray-300 dark:bg-gray-600"
                    />
                    <div className="flex min-w-[9.5rem] flex-col justify-between gap-2 px-2 py-1">
                      <div>
                        <label className={BARCODE_FIELD_LABEL}>Qty</label>
                        <input
                          type="number"
                          min={1}
                          className={`${RECORD_INPUT} mt-1 w-16 max-w-full`}
                          value={barcodeQty}
                          onChange={(e) => setBarcodeQty(e.target.value)}
                          aria-label="Units per scan"
                        />
                      </div>
                      <div
                        className="flex flex-wrap items-center gap-x-3 gap-y-1"
                        role="group"
                        aria-label="Barcode flags"
                      >
                        <label
                          title="Primary sellable barcode"
                          className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap ${premiumTypography.tableCell} text-gray-700 dark:text-gray-300`}
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            checked={barcodePrimary}
                            onChange={(e) => setBarcodePrimary(e.target.checked)}
                          />
                          Primary
                        </label>
                        <label
                          className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap ${premiumTypography.tableCell} text-gray-700 dark:text-gray-300`}
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            checked={barcodeActive}
                            onChange={(e) => setBarcodeActive(e.target.checked)}
                          />
                          Active
                        </label>
                      </div>
                      <button
                        type="button"
                        title="Add barcode"
                        aria-label="Add barcode"
                        onClick={() => void handleAddBarcode()}
                        disabled={savingBarcode}
                        className={`${premiumPrimaryButton('businessCore', 'sm', 'auto')} w-full whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {savingBarcode ? (
                          <>
                            <Loader2
                              className="mr-1.5 inline h-3.5 w-3.5 animate-spin"
                              aria-hidden
                            />
                            Saving…
                          </>
                        ) : (
                          <>
                            <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                            Add
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {barcodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/70 px-4 py-6 text-center dark:border-gray-700 dark:bg-gray-900/40">
                    <ScanLine
                      className="mb-2 h-9 w-9 text-green-600 dark:text-green-400"
                      aria-hidden
                    />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      No barcodes defined
                    </p>
                    <p
                      className={`mt-1 max-w-sm ${premiumTypography.helper} text-gray-500 dark:text-gray-400`}
                    >
                      Add a barcode above to link scans to this SKU for receiving, POS, and
                      inventory.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          <th
                            className={`px-2 py-2 text-left ${premiumTypography.tableCell} font-semibold text-gray-600 dark:text-gray-300`}
                          >
                            Barcode
                          </th>
                          <th
                            className={`px-2 py-2 text-left ${premiumTypography.tableCell} font-semibold text-gray-600 dark:text-gray-300`}
                          >
                            Type
                          </th>
                          <th
                            className={`px-2 py-2 text-left ${premiumTypography.tableCell} font-semibold text-gray-600 dark:text-gray-300`}
                          >
                            Sellable pack
                          </th>
                          <th
                            className={`px-2 py-2 text-left ${premiumTypography.tableCell} font-semibold text-gray-600 dark:text-gray-300`}
                          >
                            Primary
                          </th>
                          <th
                            className={`px-2 py-2 text-left ${premiumTypography.tableCell} font-semibold text-gray-600 dark:text-gray-300`}
                          >
                            Active
                          </th>
                          <th
                            className={`px-2 py-2 text-right ${premiumTypography.tableCell} font-semibold text-gray-600 dark:text-gray-300`}
                          >
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
                              <td
                                className={`px-2 py-2 align-top ${premiumTypography.tableCell} text-gray-900 dark:text-white`}
                              >
                                {isEditing ? (
                                  <input
                                    className={`${RECORD_INPUT} w-full`}
                                    value={editBarcodeBarcode}
                                    onChange={(e) => setEditBarcodeBarcode(e.target.value)}
                                  />
                                ) : (
                                  <span className="font-medium">{b.barcode}</span>
                                )}
                              </td>
                              <td
                                className={`px-2 py-2 align-top ${premiumTypography.tableCell} text-gray-800 dark:text-gray-200`}
                              >
                                {isEditing ? (
                                  <select
                                    className={`${RECORD_INPUT} w-full`}
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
                              <td
                                className={`px-2 py-2 align-top ${premiumTypography.tableCell} text-gray-800 dark:text-gray-200`}
                              >
                                {isEditing ? (
                                  <div className="flex flex-col gap-1">
                                    <select
                                      className={`${RECORD_INPUT} w-full max-w-[10rem]`}
                                      value={editBarcodePackingLevel}
                                      onChange={(e) => setEditBarcodePackingLevel(e.target.value)}
                                    >
                                      {sellablePackOptions.map((o) => (
                                        <option key={o.code} value={o.code}>
                                          {o.label}
                                        </option>
                                      ))}
                                      {editBarcodePackingLevel &&
                                        !isValidPackingLevel(
                                          editBarcodePackingLevel,
                                          sellablePackOptions
                                        ) && (
                                          <option value={editBarcodePackingLevel}>
                                            {editBarcodePackingLevel}
                                          </option>
                                        )}
                                    </select>
                                    <input
                                      type="number"
                                      min={1}
                                      className={`${RECORD_INPUT} w-20`}
                                      value={editBarcodeQty}
                                      onChange={(e) => setEditBarcodeQty(e.target.value)}
                                      placeholder="Qty"
                                    />
                                  </div>
                                ) : (
                                  formatBarcodePackLabel(
                                    b.packing_level,
                                    b.quantity,
                                    sellablePackOptions
                                  )
                                )}
                              </td>
                              <td className={`px-2 py-2 align-top ${premiumTypography.tableCell}`}>
                                {isEditing ? (
                                  <input
                                    type="checkbox"
                                    className="rounded text-green-600"
                                    checked={editBarcodePrimary}
                                    onChange={(e) => setEditBarcodePrimary(e.target.checked)}
                                  />
                                ) : b.is_primary ? (
                                  <span
                                    className={`inline-flex rounded-full bg-green-600 px-2 py-0.5 font-medium text-white ${premiumTypography.tableCell}`}
                                  >
                                    Primary
                                  </span>
                                ) : (
                                  <span
                                    className={`${premiumTypography.tableCell} text-gray-400 dark:text-gray-500`}
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                              <td className={`px-2 py-2 align-top ${premiumTypography.tableCell}`}>
                                {isEditing ? (
                                  <input
                                    type="checkbox"
                                    className="rounded text-green-600"
                                    checked={editBarcodeActive}
                                    onChange={(e) => setEditBarcodeActive(e.target.checked)}
                                  />
                                ) : b.is_active !== false ? (
                                  <span
                                    className={`inline-flex rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 dark:bg-green-950/50 dark:text-green-300 ${premiumTypography.tableCell}`}
                                  >
                                    Active
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400 ${premiumTypography.tableCell}`}
                                  >
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td
                                className={`whitespace-nowrap px-2 py-2 align-top text-right ${premiumTypography.tableCell}`}
                              >
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
              </section>
            </div>
          )}

          {activeTab === 'categories' &&
            (() => {
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
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Select one or more values in each tier. All tiers support multiple selections.
                  </p>

                  {categoriesError && <p className="text-[11px] text-red-500">{categoriesError}</p>}

                  {catLoading && <p className="text-xs text-gray-400">Loading categories…</p>}

                  {!catLoading && catTiers.length === 0 && (
                    <p className="text-sm text-gray-400">
                      No category tiers configured for this workspace.
                    </p>
                  )}

                  <div className="overflow-x-auto">
                    <div
                      className="grid w-full min-w-[44rem] items-stretch"
                      style={{
                        gridTemplateColumns: catTiers
                          .flatMap((tier, tierIndex) => {
                            const tierCol =
                              tier.tier_number === 1 ? 'minmax(0,1.925fr)' : 'minmax(0,0.825fr)';
                            return tierIndex < catTiers.length - 1 ? [tierCol, '2px'] : [tierCol];
                          })
                          .join(' '),
                      }}
                    >
                      {catTiers.flatMap((tier, tierIndex) => {
                        const nodes = catNodesByTier[tier.tier_number] ?? [];
                        const selected = catSelectedByTier[tier.tier_number] ?? [];
                        const isPrimaryTier = tier.tier_number === 1;
                        const isLastTier = tierIndex === catTiers.length - 1;

                        const tierColumn = (
                          <div
                            key={`tier-${tier.tier_number}`}
                            className="flex min-w-0 flex-col px-3"
                          >
                            <div className="mb-2 inline-flex max-w-full items-center gap-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                {tier.name}
                              </p>
                              {inlineAddOpen !== tier.tier_number && (
                                <button
                                  type="button"
                                  title={`Add ${tier.name}`}
                                  aria-label={`Add ${tier.name}`}
                                  onClick={() => {
                                    setInlineAddOpen(tier.tier_number);
                                    setInlineAddName('');
                                  }}
                                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:border-gray-600 dark:hover:border-green-500 dark:hover:bg-green-950/30 dark:hover:text-green-500"
                                >
                                  <Plus className="h-3 w-3" aria-hidden />
                                </button>
                              )}
                            </div>
                            {inlineAddOpen === tier.tier_number && (
                              <div className="mb-2 flex items-center gap-1">
                                <input
                                  autoFocus
                                  type="text"
                                  value={inlineAddName}
                                  onChange={(e) => setInlineAddName(e.target.value)}
                                  placeholder="Name…"
                                  className={`${RECORD_INPUT} w-full min-w-0 flex-1`}
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
                                  className="shrink-0 rounded-full bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                  {savingInlineAdd ? '…' : 'Add'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlineAddOpen(null);
                                    setInlineAddName('');
                                  }}
                                  aria-label="Cancel"
                                  className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              </div>
                            )}
                            <div
                              className={
                                isPrimaryTier
                                  ? 'flex max-h-64 flex-wrap gap-2 overflow-y-auto pr-1'
                                  : 'flex flex-nowrap gap-2 overflow-x-auto'
                              }
                            >
                              {nodes.map((node) => {
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
                                          handleTierMultiToggle(tier.tier_number, node.id)
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
                                          setOpenChipMenu(
                                            openChipMenu === node.id ? null : node.id
                                          );
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
                            </div>
                          </div>
                        );

                        if (isLastTier) return [tierColumn];

                        return [
                          tierColumn,
                          <div
                            key={`sep-${tier.tier_number}`}
                            role="separator"
                            aria-orientation="vertical"
                            className="h-full min-h-full bg-gray-300 dark:bg-gray-600"
                          />,
                        ];
                      })}
                    </div>
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

          {activeTab === 'pricing' &&
            (() => {
              const baseSell = parseFloat(baseSellInput);
              const baseCost = parseFloat(baseCostInput);
              const marginPct =
                Number.isFinite(baseSell) && baseSell > 0 && Number.isFinite(baseCost)
                  ? ((baseSell - baseCost) / baseSell) * 100
                  : null;
              const showLoss =
                Number.isFinite(baseSell) && Number.isFinite(baseCost) && baseCost > baseSell;
              const activePriceLists = priceLists.filter((pl) => !pl.is_deleted);
              const tiersWithoutItem = activePriceLists.filter(
                (pl) => !priceListItems.some((i) => i.price_list_id === pl.id)
              );
              const tierComposerOptions =
                tiersWithoutItem.length > 0 ? tiersWithoutItem : activePriceLists;
              const tierComposerIsUpdate =
                tiersWithoutItem.length === 0 && activePriceLists.length > 0;

              return (
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  <p className="shrink-0 text-[11px] text-gray-500 dark:text-gray-400">
                    Base sell price applies when a customer has no tier. Set tier-specific prices
                    with optional valid-from/to dates; quantity bands are shown on each tier line.
                  </p>
                  {priceError && (
                    <p className="shrink-0 text-[11px] font-medium text-red-500">{priceError}</p>
                  )}

                  {basePricingMsg && (
                    <p className="shrink-0 text-[11px] text-red-500" role="alert">
                      {basePricingMsg}
                    </p>
                  )}

                  <div className="flex shrink-0 flex-wrap items-end gap-x-5 gap-y-3">
                    <div className="flex flex-col gap-1.5">
                      <label className={BARCODE_FIELD_LABEL}>Cost price</label>
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        className={`h-7 w-[6.5rem] ${PRICING_NUM_INPUT}`}
                        value={baseCostInput}
                        onChange={(e) => setBaseCostInput(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={BARCODE_FIELD_LABEL}>Sell price (base)</label>
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        className={`h-7 w-[6.5rem] ${PRICING_NUM_INPUT}`}
                        value={baseSellInput}
                        onChange={(e) => setBaseSellInput(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={BARCODE_FIELD_LABEL}>Margin</label>
                      <div
                        className={`flex h-7 min-w-[3.5rem] items-center text-sm font-medium tabular-nums ${
                          marginPct == null
                            ? 'text-gray-500 dark:text-gray-400'
                            : marginPct < 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {marginPct == null ? '—' : `${marginPct.toFixed(1)}%`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSaveBasePricing()}
                      disabled={savingBasePricing}
                      className="h-7 shrink-0 whitespace-nowrap rounded-lg bg-green-600 px-3 text-xs font-medium text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingBasePricing ? 'Saving…' : 'Save'}
                    </button>

                    <div
                      className="mx-1 hidden h-7 w-px shrink-0 self-end bg-gray-200 dark:bg-gray-600 sm:block"
                      aria-hidden
                    />

                    <div className="flex min-w-[9rem] flex-col gap-1.5">
                      <label className={BARCODE_FIELD_LABEL}>Price tier</label>
                      <select
                        className={`h-7 min-w-[9rem] max-w-[14rem] ${PRICING_NUM_INPUT}`}
                        value={priceListId}
                        onChange={(e) => setPriceListId(e.target.value)}
                      >
                        <option value="">Select tier</option>
                        {tierComposerOptions.map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            {pl.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={BARCODE_FIELD_LABEL}>Unit price</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        className={`h-7 w-[6.5rem] ${PRICING_NUM_INPUT}`}
                        value={priceUnit}
                        onChange={(e) => setPriceUnit(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={BARCODE_FIELD_LABEL}>Min qty</label>
                      <input
                        type="number"
                        className={`h-7 w-[4.5rem] ${PRICING_NUM_INPUT}`}
                        value={priceMinQty}
                        onChange={(e) => setPriceMinQty(e.target.value)}
                        min={1}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={BARCODE_FIELD_LABEL}>Valid from</label>
                      <input
                        type="date"
                        className={`h-7 w-[9rem] ${PRICING_NUM_INPUT}`}
                        value={priceEffectiveFrom}
                        onChange={(e) => setPriceEffectiveFrom(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={BARCODE_FIELD_LABEL}>Valid to</label>
                      <input
                        type="date"
                        className={`h-7 w-[9rem] ${PRICING_NUM_INPUT}`}
                        value={priceEffectiveTo}
                        onChange={(e) => setPriceEffectiveTo(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={BARCODE_FIELD_LABEL}>Max qty</label>
                      <input
                        type="number"
                        className={`h-7 w-[4.5rem] ${PRICING_NUM_INPUT}`}
                        value={priceMaxQty}
                        onChange={(e) => setPriceMaxQty(e.target.value)}
                        min={1}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!priceListId) {
                          setPriceError('Select a price tier');
                          return;
                        }
                        if (tierComposerIsUpdate) {
                          const pl = activePriceLists.find((x) => x.id === priceListId);
                          const item = priceListItems.find((i) => i.price_list_id === priceListId);
                          if (!pl) return;
                          setTierDialog({
                            list: pl,
                            existing: item ?? null,
                            unitPrice: item ? String(item.unit_price) : priceUnit,
                            minQty:
                              item?.min_quantity != null
                                ? String(item.min_quantity)
                                : priceMinQty || '1',
                            maxQty:
                              item?.max_quantity != null ? String(item.max_quantity) : priceMaxQty,
                            effectiveFrom: item
                              ? dateInputValue(item.effective_from)
                              : priceEffectiveFrom,
                            effectiveTo: item
                              ? dateInputValue(item.effective_to)
                              : priceEffectiveTo,
                          });
                          return;
                        }
                        void handleAddPriceItem();
                      }}
                      disabled={savingPrice}
                      className="h-7 shrink-0 whitespace-nowrap rounded-lg bg-green-600 px-3 text-xs font-medium text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingPrice
                        ? 'Saving…'
                        : tierComposerIsUpdate
                          ? 'Update tier'
                          : 'Add to tier'}
                    </button>
                  </div>
                  {tierComposerIsUpdate && (
                    <p className="shrink-0 text-[10px] text-gray-500 dark:text-gray-400">
                      All tiers have a price for this product. Select a tier and choose Update, or
                      use Edit in the list below.
                    </p>
                  )}
                  {showLoss && (
                    <div
                      className="flex shrink-0 items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                      role="alert"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>
                        Selling below cost — you are losing {formatMoney(baseCost - baseSell)} per
                        unit at the base price.
                      </span>
                    </div>
                  )}

                  <div className="flex shrink-0 flex-col gap-2">
                    <p className={BARCODE_FIELD_LABEL}>Customer price tiers</p>
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600">
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {activePriceLists.map((pl) => {
                          const item = priceListItems.find((i) => i.price_list_id === pl.id);
                          const displayPrice =
                            item?.unit_price ??
                            (product.sell_price != null ? product.sell_price : null);
                          const hasQtyBand =
                            item != null &&
                            (item.min_quantity != null || item.max_quantity != null);
                          const effectiveLabel = item
                            ? formatPriceItemEffectiveLabel(item.effective_from, item.effective_to)
                            : null;
                          const effectiveStatus = item
                            ? priceItemEffectiveStatus(item.effective_from, item.effective_to)
                            : null;

                          return (
                            <li
                              key={pl.id}
                              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-white px-3 py-2 dark:bg-gray-900/40"
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-medium text-gray-900 dark:text-white">
                                  {pl.name}
                                </span>
                                {hasQtyBand && (
                                  <p className="text-[10px] text-gray-400">
                                    Qty {item.min_quantity ?? '—'}–{item.max_quantity ?? '∞'}
                                  </p>
                                )}
                                {effectiveLabel && (
                                  <p className="text-[10px] text-gray-400">{effectiveLabel}</p>
                                )}
                                {effectiveStatus === 'upcoming' && (
                                  <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                    Upcoming
                                  </p>
                                )}
                                {effectiveStatus === 'expired' && (
                                  <p className="text-[10px] text-gray-400">Expired</p>
                                )}
                              </div>
                              <span className="text-xs text-gray-700 dark:text-gray-200">
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
                                        item?.min_quantity != null
                                          ? String(item.min_quantity)
                                          : '1',
                                      maxQty:
                                        item?.max_quantity != null ? String(item.max_quantity) : '',
                                      effectiveFrom: dateInputValue(item?.effective_from),
                                      effectiveTo: dateInputValue(item?.effective_to),
                                    })
                                  }
                                  className="rounded px-2 py-1 text-[11px] font-medium text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                >
                                  {item ? 'Edit' : 'Set price'}
                                </button>
                                {item ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePriceItem(item.id)}
                                    className="rounded px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                  >
                                    Remove
                                  </button>
                                ) : null}
                              </span>
                            </li>
                          );
                        })}
                        {activePriceLists.length === 0 && (
                          <li className="px-3 py-4 text-center text-sm text-gray-400">
                            No price tiers yet. Create tiers under Customer pricing.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}
        </PremiumRecordPanel>
      </div>
    </>
  );
}
