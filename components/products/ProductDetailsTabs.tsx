'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useTenant } from '@/contexts/TenantContext';
import {
  PackingConfiguration,
  Product,
  ProductVariant,
  ProductBarcode,
  PriceList,
  PriceListItem,
  ProductCostHistory,
  ProductMetric,
  BomHeader,
  BomLine,
  PackingConfiguration as PackingConfig,
  DemandForecast,
  StockLevel,
  StockTransaction,
  ProductionPlan,
  ProductActivityLog,
  CategorySummary,
} from '@/types/product';
import PackingConfigurationsEditor from '@/components/PackingConfigurationsEditor';
import { Loader2 } from 'lucide-react';
import { logProductUpdated } from '@/lib/auditLog';

interface ProductDetailsTabsProps {
  product: Product;
}

interface PriceListItemWithList extends PriceListItem {
  price_list?: PriceList;
}

export default function ProductDetailsTabs({ product }: ProductDetailsTabsProps) {
  const { tenant_id, user } = useTenant();
  const [activeTab, setActiveTab] = useState<
    | 'variants'
    | 'barcodes'
    | 'categories'
    | 'pricing'
    | 'costing'
    | 'metrics'
    | 'boms'
    | 'packing'
    | 'operations'
  >('variants');

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [barcodes, setBarcodes] = useState<ProductBarcode[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [priceListItems, setPriceListItems] = useState<PriceListItemWithList[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [costHistory, setCostHistory] = useState<ProductCostHistory[]>([]);
  const [metrics, setMetrics] = useState<ProductMetric[]>([]);
  const [bomHeaders, setBomHeaders] = useState<BomHeader[]>([]);
  const [bomLines, setBomLines] = useState<BomLine[]>([]);
  const [packingConfigs, setPackingConfigs] = useState<PackingConfig[]>([]);
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([]);
  const [activityLog, setActivityLog] = useState<ProductActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Variant form state
  const [variantName, setVariantName] = useState('');
  const [variantSku, setVariantSku] = useState('');
  const [variantPriceAdj, setVariantPriceAdj] = useState<string>('');
  const [variantCostAdj, setVariantCostAdj] = useState<string>('');
  const [variantActive, setVariantActive] = useState(true);
  const [savingVariant, setSavingVariant] = useState(false);
  const [variantError, setVariantError] = useState<string | null>(null);

  // Barcode form state
  const [barcodeValue, setBarcodeValue] = useState('');
  const [barcodeType, setBarcodeType] = useState('ean13');
  const [barcodePackingLevel, setBarcodePackingLevel] = useState<string | null>('unit');
  const [barcodeQty, setBarcodeQty] = useState<string>('1');
  const [barcodeDescription, setBarcodeDescription] = useState('');
  const [barcodePrimary, setBarcodePrimary] = useState(false);
  const [barcodeActive, setBarcodeActive] = useState(true);
  const [savingBarcode, setSavingBarcode] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // Categories save state
  const [savingCategories, setSavingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoriesSaved, setCategoriesSaved] = useState(false);

  // Pricing form state
  const [priceListId, setPriceListId] = useState('');
  const [priceUnit, setPriceUnit] = useState<string>('');
  const [priceMinQty, setPriceMinQty] = useState<string>('1');
  const [priceMaxQty, setPriceMaxQty] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Packing save state
  const [savingPacking, setSavingPacking] = useState(false);
  const [packingError, setPackingError] = useState<string | null>(null);
  const [packingSaved, setPackingSaved] = useState(false);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);

      const [
        variantsRes,
        barcodesRes,
        categoriesRes,
        categoryLinksRes,
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
        bomHeadersRes,
      ] = await Promise.all([
        supabase.from('product_variants').select('*').eq('parent_product_id', product.id),
        supabase.from('product_barcodes').select('*').eq('product_id', product.id),
        supabase.from('categories').select('*').order('name'),
        supabase.from('product_categories').select('category_id').eq('product_id', product.id),
        supabase.from('price_lists').select('*').order('name'),
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
        supabase
          .from('bom_headers')
          .select('*')
          .eq('product_id', product.id)
          .order('created_at', { ascending: false }),
      ]);

      setVariants((variantsRes.data || []) as ProductVariant[]);
      setBarcodes((barcodesRes.data || []) as ProductBarcode[]);
      const cats = (categoriesRes.data || []) as CategorySummary[];
      setCategories(cats);
      setSelectedCategoryIds(
        (categoryLinksRes.data || []).map((l: any) => l.category_id as string)
      );

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

      const bomHeadersData = (bomHeadersRes.data || []) as BomHeader[];
      setBomHeaders(bomHeadersData);

      if (bomHeadersData.length > 0) {
        const headerIds = bomHeadersData.map((h) => h.id);
        const bomLinesRes = await supabase
          .from('bom_lines')
          .select('*')
          .in('bom_header_id', headerIds);
        setBomLines((bomLinesRes.data || []) as BomLine[]);
      } else {
        setBomLines([]);
      }

      setCostHistory((costHistoryRes.data || []) as ProductCostHistory[]);
      setMetrics((metricsRes.data || []) as ProductMetric[]);
      setPackingConfigs((packingConfigsRes.data || []) as PackingConfig[]);
      setForecasts((forecastsRes.data || []) as DemandForecast[]);
      setStockLevels((stockLevelsRes.data || []) as StockLevel[]);
      setStockTransactions((stockTransactionsRes.data || []) as StockTransaction[]);
      setProductionPlans((productionPlansRes.data || []) as ProductionPlan[]);
      setActivityLog((activityLogRes.data || []) as ProductActivityLog[]);

      setLoading(false);
    }

    if (product?.id) {
      loadAll();
    }
  }, [product?.id]);

  const handlePackingChange = (configs: PackingConfiguration[]) => {
    setPackingConfigs(configs);
  };

  const handleAddVariant = async () => {
    try {
      setVariantError(null);
      setCategoriesSaved(false);
      if (!variantName.trim() || !variantSku.trim()) {
        setVariantError('Variant name and SKU are required');
        return;
      }
      setSavingVariant(true);
      const { data, error } = await (supabase as any)
        .from('product_variants')
        .insert({
          parent_product_id: product.id,
          variant_name: variantName.trim(),
          variant_sku: variantSku.trim(),
          price_adjustment: variantPriceAdj.trim() === '' ? null : Number(variantPriceAdj),
          cost_adjustment: variantCostAdj.trim() === '' ? null : Number(variantCostAdj),
          is_active: variantActive,
          attributes: {},
        })
        .select('*')
        .single();

      if (error) throw error;
      setVariants((prev) => [...prev, data as ProductVariant]);

      // Log product variant creation to audit trail
      if (tenant_id) {
        await logProductUpdated(
          tenant_id,
          product.id,
          {
            action: 'variant_created',
            variant_name: variantName.trim(),
            variant_sku: variantSku.trim(),
          },
          user?.id || null
        );
      }

      setVariantName('');
      setVariantSku('');
      setVariantPriceAdj('');
      setVariantCostAdj('');
      setVariantActive(true);
    } catch (err: any) {
      setVariantError(err.message || 'Failed to add variant');
    } finally {
      setSavingVariant(false);
    }
  };

  const handleDeleteVariant = async (id: string) => {
    if (!confirm('Delete this variant?')) return;
    try {
      await (supabase as any).from('product_variants').delete().eq('id', id);
      setVariants((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error('Error deleting variant', err);
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
      const { data, error } = await (supabase as any)
        .from('product_barcodes')
        .insert({
          product_id: product.id,
          barcode: barcodeValue.trim(),
          barcode_type: barcodeType,
          packing_level: barcodePackingLevel,
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
      setBarcodeValue('');
      setBarcodeQty('1');
      setBarcodeDescription('');
      setBarcodePrimary(false);
      setBarcodeActive(true);
    } catch (err: any) {
      setBarcodeError(err.message || 'Failed to add barcode');
    } finally {
      setSavingBarcode(false);
    }
  };

  const handleDeleteBarcode = async (id: string) => {
    if (!confirm('Delete this barcode?')) return;
    try {
      await (supabase as any).from('product_barcodes').delete().eq('id', id);
      setBarcodes((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Error deleting barcode', err);
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    setCategoriesSaved(false);
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  const handleSaveCategories = async () => {
    try {
      setSavingCategories(true);
      setCategoriesError(null);
      setCategoriesSaved(false);

      await supabase.from('product_categories').delete().eq('product_id', product.id);

      if (selectedCategoryIds.length > 0) {
        const rows = selectedCategoryIds.map((category_id) => ({
          product_id: product.id,
          category_id,
        }));
        const { error } = await supabase.from('product_categories').insert(rows as any);
        if (error) throw error;
      }

      setCategoriesSaved(true);
    } catch (err: any) {
      setCategoriesError(err.message || 'Failed to save categories');
    } finally {
      setSavingCategories(false);
    }
  };

  const handleAddPriceItem = async () => {
    try {
      setPriceError(null);
      if (!priceListId) {
        setPriceError('Select a price list');
        return;
      }
      if (!priceUnit.trim()) {
        setPriceError('Unit price is required');
        return;
      }
      setSavingPrice(true);
      const minQtyVal = priceMinQty.trim() === '' ? null : Number(priceMinQty.trim());
      const maxQtyVal = priceMaxQty.trim() === '' ? null : Number(priceMaxQty.trim());

      const { data, error } = await (supabase as any)
        .from('price_list_items')
        .insert({
          price_list_id: priceListId,
          product_id: product.id,
          unit_price: Number(priceUnit),
          min_quantity: minQtyVal,
          max_quantity: maxQtyVal,
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
    } catch (err: any) {
      setPriceError(err.message || 'Failed to add price item');
    } finally {
      setSavingPrice(false);
    }
  };

  const handleDeletePriceItem = async (id: string) => {
    if (!confirm('Delete this price list item?')) return;
    try {
      await supabase.from('price_list_items').delete().eq('id', id);
      setPriceListItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error('Error deleting price list item', err);
    }
  };

  const handleSavePacking = async () => {
    try {
      setPackingError(null);
      setPackingSaved(false);
      setSavingPacking(true);

      await supabase.from('packing_configurations').delete().eq('product_id', product.id);

      if (packingConfigs.length > 0) {
        const rows = packingConfigs.map((cfg) => ({
          product_id: product.id,
          level: cfg.level,
          quantity: cfg.quantity ?? 1,
          length: cfg.length ?? null,
          width: cfg.width ?? null,
          height: cfg.height ?? null,
          weight: cfg.weight ?? null,
          weight_unit_id: cfg.weight_unit_id ?? null,
          dimension_unit_id: cfg.dimension_unit_id ?? null,
          is_default: cfg.is_default ?? false,
          description: cfg.description ?? null,
          barcode: cfg.barcode ?? null,
          gtin: cfg.gtin ?? null,
          previous_level: cfg.previous_level ?? null,
        }));
        const { error } = await supabase.from('packing_configurations').insert(rows as any);
        if (error) throw error;
      }

      setPackingSaved(true);
    } catch (err: any) {
      setPackingError(err.message || 'Failed to save packing configurations');
    } finally {
      setSavingPacking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading product details...
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 mb-4 text-xs">
        {[
          ['variants', 'Variants'],
          ['barcodes', 'Barcodes'],
          ['categories', 'Categories'],
          ['pricing', 'Pricing'],
          ['costing', 'Cost History'],
          ['metrics', 'Metrics'],
          ['boms', 'BOMs'],
          ['packing', 'Packing'],
          ['operations', 'Ops & Stock'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`px-3 py-2 rounded-t-md border-b-2 transition-colors font-medium ${
              activeTab === key
                ? 'border-green-600 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/10'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            onClick={() => setActiveTab(key as any)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm space-y-4">
        {activeTab === 'variants' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">Product Variants</h3>
            </div>
            {variantError && <p className="text-[11px] text-red-500 mb-2">{variantError}</p>}
            <div className="flex flex-wrap items-end gap-2 mb-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Name</label>
                <input
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  placeholder="Variant name"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">SKU</label>
                <input
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                  value={variantSku}
                  onChange={(e) => setVariantSku(e.target.value)}
                  placeholder="Variant SKU"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Price Adj.</label>
                <input
                  type="number"
                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                  value={variantPriceAdj}
                  onChange={(e) => setVariantPriceAdj(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Cost Adj.</label>
                <input
                  type="number"
                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                  value={variantCostAdj}
                  onChange={(e) => setVariantCostAdj(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <label className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="rounded text-green-600 focus:ring-green-500"
                  checked={variantActive}
                  onChange={(e) => setVariantActive(e.target.checked)}
                />
                Active
              </label>
              <button
                type="button"
                onClick={handleAddVariant}
                disabled={savingVariant}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingVariant ? 'Saving...' : 'Add Variant'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-left">Price Adj.</th>
                    <th className="px-3 py-2 text-left">Cost Adj.</th>
                    <th className="px-3 py-2 text-left">Active</th>
                    <th className="px-3 py-2 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {variants.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-3 text-center text-gray-400">
                        No variants defined
                      </td>
                    </tr>
                  )}
                  {variants.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{v.variant_name}</td>
                      <td className="px-3 py-2">{v.variant_sku}</td>
                      <td className="px-3 py-2">{v.price_adjustment ?? 0}</td>
                      <td className="px-3 py-2">{v.cost_adjustment ?? 0}</td>
                      <td className="px-3 py-2">{v.is_active ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(v.id)}
                          className="px-2 py-0.5 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
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

        {activeTab === 'barcodes' && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Product Barcodes</h3>
            {barcodeError && <p className="text-[11px] text-red-500 mb-2">{barcodeError}</p>}
            <div className="flex flex-wrap items-end gap-2 mb-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Barcode</label>
                <input
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  placeholder="Scan or enter barcode"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Type</label>
                <input
                  className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                  value={barcodeType}
                  onChange={(e) => setBarcodeType(e.target.value)}
                  placeholder="ean13"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Packing Level</label>
                <input
                  className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                  value={barcodePackingLevel || ''}
                  onChange={(e) => setBarcodePackingLevel(e.target.value || null)}
                  placeholder="unit / case"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Qty</label>
                <input
                  type="number"
                  className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                  value={barcodeQty}
                  onChange={(e) => setBarcodeQty(e.target.value)}
                  min={1}
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] text-gray-500 mb-1">Description</label>
                <input
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                  value={barcodeDescription}
                  onChange={(e) => setBarcodeDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <label className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="rounded text-green-600 focus:ring-green-500"
                  checked={barcodePrimary}
                  onChange={(e) => setBarcodePrimary(e.target.checked)}
                />
                Primary
              </label>
              <label className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="rounded text-green-600 focus:ring-green-500"
                  checked={barcodeActive}
                  onChange={(e) => setBarcodeActive(e.target.checked)}
                />
                Active
              </label>
              <button
                type="button"
                onClick={handleAddBarcode}
                disabled={savingBarcode}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingBarcode ? 'Saving...' : 'Add Barcode'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Barcode</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Packing Level</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Primary</th>
                    <th className="px-3 py-2 text-left">Active</th>
                    <th className="px-3 py-2 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {barcodes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-3 text-center text-gray-400">
                        No barcodes defined
                      </td>
                    </tr>
                  )}
                  {barcodes.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{b.barcode}</td>
                      <td className="px-3 py-2">{b.barcode_type}</td>
                      <td className="px-3 py-2">{b.packing_level}</td>
                      <td className="px-3 py-2">{b.quantity ?? 1}</td>
                      <td className="px-3 py-2">{b.is_primary ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-2">{b.is_active ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteBarcode(b.id)}
                          className="px-2 py-0.5 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
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

        {activeTab === 'categories' && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Categories</h3>
            {categoriesError && <p className="text-[11px] text-red-500 mb-1">{categoriesError}</p>}
            {categoriesSaved && !categoriesError && (
              <p className="text-[11px] text-green-600 mb-1">Categories saved</p>
            )}
            <div className="flex flex-wrap gap-3">
              {categories.map((cat) => {
                const selected = selectedCategoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                      selected
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => handleToggleCategory(cat.id)}
                  >
                    {cat.name}
                  </button>
                );
              })}
              {categories.length === 0 && (
                <p className="text-gray-400 text-sm">No categories found.</p>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveCategories}
                disabled={savingCategories}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingCategories ? 'Saving...' : 'Save Category Links'}
              </button>
              <p className="text-[10px] text-gray-500">
                Updates product_categories many-to-many links for this product.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Pricing (Price Lists)</h3>
            {priceError && <p className="text-[11px] text-red-500 mb-2">{priceError}</p>}
            <div className="flex flex-wrap items-end gap-2 mb-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Price List</label>
                <select
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm min-w-[140px]"
                  value={priceListId}
                  onChange={(e) => setPriceListId(e.target.value)}
                >
                  <option value="">Select list</option>
                  {priceLists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Unit Price</label>
                <input
                  type="number"
                  className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                  value={priceUnit}
                  onChange={(e) => setPriceUnit(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Min Qty</label>
                <input
                  type="number"
                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                  value={priceMinQty}
                  onChange={(e) => setPriceMinQty(e.target.value)}
                  min={1}
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Max Qty</label>
                <input
                  type="number"
                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                  value={priceMaxQty}
                  onChange={(e) => setPriceMaxQty(e.target.value)}
                  min={1}
                />
              </div>
              <button
                type="button"
                onClick={handleAddPriceItem}
                disabled={savingPrice}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPrice ? 'Saving...' : 'Add Price'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Price List</th>
                    <th className="px-3 py-2 text-left">Currency</th>
                    <th className="px-3 py-2 text-left">Unit Price</th>
                    <th className="px-3 py-2 text-left">Min Qty</th>
                    <th className="px-3 py-2 text-left">Max Qty</th>
                    <th className="px-3 py-2 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {priceListItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-3 text-center text-gray-400">
                        No price list items for this product
                      </td>
                    </tr>
                  )}
                  {priceListItems.map((i) => (
                    <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <td className="px-3 py-2 text-gray-900 dark:text-white">
                        {i.price_list?.name || i.price_list_id}
                      </td>
                      <td className="px-3 py-2">{i.price_list?.currency}</td>
                      <td className="px-3 py-2">{i.unit_price}</td>
                      <td className="px-3 py-2">{i.min_quantity ?? '-'}</td>
                      <td className="px-3 py-2">{i.max_quantity ?? '-'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeletePriceItem(i.id)}
                          className="px-2 py-0.5 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
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

        {activeTab === 'costing' && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Product Cost History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Effective From</th>
                    <th className="px-3 py-2 text-left">Cost Price</th>
                    <th className="px-3 py-2 text-left">Method</th>
                    <th className="px-3 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {costHistory.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-center text-gray-400">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Product Metrics</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Period</th>
                    <th className="px-3 py-2 text-left">Sales Qty</th>
                    <th className="px-3 py-2 text-left">Sales Rev.</th>
                    <th className="px-3 py-2 text-left">Stock Value</th>
                    <th className="px-3 py-2 text-left">Turnover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {metrics.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-3 text-center text-gray-400">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'boms' && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Bills of Materials</h3>
            {bomHeaders.length === 0 && <p className="text-gray-400 text-sm">No BOMs defined.</p>}
            {bomHeaders.map((h) => (
              <div
                key={h.id}
                className="border border-gray-200 dark:border-gray-700 rounded-md p-3 mb-2"
              >
                <div className="flex justify-between mb-2">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {h.name || 'Untitled BOM'} (v{h.version})
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Output: {h.output_quantity} unit(s)
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-500 text-right">
                    {h.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div className="overflow-x-auto mt-2">
                  <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/40">
                      <tr>
                        <th className="px-2 py-1 text-left text-[11px]">Seq</th>
                        <th className="px-2 py-1 text-left text-[11px]">Component Product ID</th>
                        <th className="px-2 py-1 text-left text-[11px]">Qty</th>
                        <th className="px-2 py-1 text-left text-[11px]">Unit</th>
                        <th className="px-2 py-1 text-left text-[11px]">Optional</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {bomLines
                        .filter((l) => l.bom_header_id === h.id)
                        .map((l) => (
                          <tr key={l.id}>
                            <td className="px-2 py-1 text-[11px]">{l.sequence}</td>
                            <td className="px-2 py-1 text-[11px]">{l.component_product_id}</td>
                            <td className="px-2 py-1 text-[11px]">{l.quantity}</td>
                            <td className="px-2 py-1 text-[11px]">{l.unit_id || '-'}</td>
                            <td className="px-2 py-1 text-[11px]">
                              {l.is_optional ? 'Yes' : 'No'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'packing' && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Packing Configurations</h3>
            {packingError && <p className="text-[11px] text-red-500 mb-1">{packingError}</p>}
            {packingSaved && !packingError && (
              <p className="text-[11px] text-green-600 mb-1">Packing configurations saved</p>
            )}
            <PackingConfigurationsEditor value={packingConfigs} onChange={handlePackingChange} />
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
                Persists packing_configurations rows for this product.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Demand Forecasts</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      <th className="px-3 py-2 text-left">Period</th>
                      <th className="px-3 py-2 text-left">Forecast Qty</th>
                      <th className="px-3 py-2 text-left">Actual Qty</th>
                      <th className="px-3 py-2 text-left">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {forecasts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-center text-gray-400">
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Stock Levels</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      <th className="px-3 py-2 text-left">Location</th>
                      <th className="px-3 py-2 text-left">Quantity</th>
                      <th className="px-3 py-2 text-left">Available</th>
                      <th className="px-3 py-2 text-left">Reserved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {stockLevels.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-center text-gray-400">
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
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Stock Transactions
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Qty</th>
                      <th className="px-3 py-2 text-left">From</th>
                      <th className="px-3 py-2 text-left">To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {stockTransactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-3 text-center text-gray-400">
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
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Production Plans</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      <th className="px-3 py-2 text-left">Planned Start</th>
                      <th className="px-3 py-2 text-left">Planned End</th>
                      <th className="px-3 py-2 text-left">Planned Qty</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {productionPlans.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-center text-gray-400">
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Activity Log</h3>
              <div className="overflow-x-auto max-h-60">
                <table className="min-w-full border divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      <th className="px-3 py-2 text-left">Timestamp</th>
                      <th className="px-3 py-2 text-left">Action</th>
                      <th className="px-3 py-2 text-left">User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {activityLog.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-3 text-center text-gray-400">
                          No activity recorded
                        </td>
                      </tr>
                    )}
                    {activityLog.map((a) => (
                      <tr key={a.id}>
                        <td className="px-3 py-2 text-gray-900 dark:text-white">{a.created_at}</td>
                        <td className="px-3 py-2">{a.action}</td>
                        <td className="px-3 py-2">{a.user_id || 'system'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
