'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import PurchaseOrderList from '@/components/purchase/PurchaseOrderList';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useGoodsReceipts } from '@/hooks/useGoodsReceipts';
import { useProducts } from '@/hooks/useProducts';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useSupplierProductCatalog } from '@/hooks/useSupplierProductCatalog';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useWarehouses } from '@/hooks/useWarehouses';
import type { Product } from '@/types/product';
import type { PurchaseOrder, PurchaseOrderLine } from '@/types/purchase';
import type { SupplierProductPrice } from '@/types/supplierProductPrice';
import {
  poLineNetExtended,
  getPoLineDiscountPct,
  getPoLineDiscountAmount,
} from '@/lib/purchaseLinePricing';
import { isBelowMoq, resolvePoListUnitPrice } from '@/lib/supplierProductPricing';
import { pillarAccent, premiumPrimaryButton, premiumSurfaces, premiumTertiaryButton, premiumTypography } from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import { FileSpreadsheet, Plus } from 'lucide-react';

const poListAccent = pillarAccent('businessCore');

function formatPoMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency?.length === 3 ? currency : 'GBP',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function PurchaseOrdersPage() {
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<PurchaseOrderLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const { toast } = useToast();

  const filters = useMemo(() => (search.trim() ? { searchQuery: search.trim() } : undefined), [search]);
  const {
    purchaseOrders,
    isLoading,
    error,
    fetchLines,
    updatePurchaseOrder,
    replaceLines,
  } = usePurchaseOrders(filters);

  const { suppliers } = useSuppliers();
  const { warehouses } = useWarehouses();
  const { products } = useProducts(undefined, 'name', 'asc');
  const { goodsReceipts } = useGoodsReceipts(selected?.id ?? null);
  const { catalog: draftPoCatalog } = useSupplierProductCatalog(selected?.supplier_id ?? null);
  const draftCatalogByProduct = useMemo(
    () => new Map(draftPoCatalog.map((c) => [c.product_id, c])),
    [draftPoCatalog]
  );
  const hasAnyGoodsReceipt = goodsReceipts.length > 0;
  const hasAtLeastOneLine = lines.length > 0;

  const supplierName = useMemo(() => {
    if (!selected) return '';
    return suppliers.find((s) => s.id === selected.supplier_id)?.legal_name ?? selected.supplier_id;
  }, [selected, suppliers]);

  const warehouseName = useMemo(() => {
    if (!selected) return '';
    return warehouses.find((w) => w.id === selected.warehouse_id)?.name ?? selected.warehouse_id;
  }, [selected, warehouses]);

  const loadLines = useCallback(async () => {
    if (!selected) {
      setLines((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    setLinesLoading(true);
    try {
      const data = await fetchLines(selected.id);
      setLines(data);
    } finally {
      setLinesLoading(false);
    }
  }, [selected, fetchLines]);

  useEffect(() => {
    void loadLines();
  }, [loadLines]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const sendPo = async () => {
    if (!selected) return;
    if (!hasAtLeastOneLine) {
      toast.error('Status cannot move past draft until at least one line is added.');
      return;
    }
    if (hasAnyGoodsReceipt) {
      toast.error('Status is locked because a goods receipt already exists for this PO.');
      return;
    }
    const r = await updatePurchaseOrder(selected.id, { status: 'sent' });
    if (r.success) {
      toast.success('Purchase order sent.');
      setSelected({ ...selected, status: 'sent' });
    } else {
      toast.error(r.error ?? 'Failed');
    }
  };

  const cancelPo = async () => {
    if (!selected) return;
    if (hasAnyGoodsReceipt) {
      toast.error('Status is locked because a goods receipt already exists for this PO.');
      return;
    }
    if (!confirm('Cancel this purchase order?')) return;
    const r = await updatePurchaseOrder(selected.id, { status: 'cancelled' });
    if (r.success) {
      toast.success('Purchase order cancelled.');
      setSelected({ ...selected, status: 'cancelled' });
    } else {
      toast.error(r.error ?? 'Failed');
    }
  };

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          icon={FileSpreadsheet}
          title="Purchase orders"
          subtitle="Supplier + warehouse + product lines; send before goods receipt"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${poListAccent.subtitleTint}`}
          right={
            <Link
              href="/purchase-orders/new"
              className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New PO
            </Link>
          }
        />

        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        <div className="flex h-[calc(100vh-132px)] min-h-[min(560px,calc(100vh-132px))] w-full flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-3 lg:items-stretch">
            <div className="flex h-full min-h-0 flex-col lg:col-span-1">
              <PurchaseOrderList
                orders={purchaseOrders}
                selectedId={selected?.id ?? null}
                isLoading={isLoading}
                error={error}
                search={search}
                onSearchChange={setSearch}
                onSelect={setSelected}
              />
            </div>

            <div className="flex h-full min-h-0 flex-col space-y-4 overflow-hidden lg:col-span-2">
              {!selected && (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-600">
                  Select a purchase order or create a new one.
                </div>
              )}
              {selected && (
                <>
                  <div className="shrink-0 rounded-xl border border-gray-200 bg-gradient-to-r from-green-50/70 via-white to-white p-4 shadow-md ring-1 ring-black/5 dark:border-gray-700 dark:from-green-950/25 dark:via-gray-800 dark:to-gray-800 dark:ring-white/5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selected.po_number}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {supplierName} · {warehouseName}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Status: <span className="font-medium">{selected.status}</span> ·{' '}
                          {selected.order_date} · {selected.currency}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selected.status === 'draft' && (
                          <button
                            type="button"
                            disabled={hasAnyGoodsReceipt || !hasAtLeastOneLine}
                            onClick={() => void sendPo()}
                            className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
                          >
                            Send to supplier
                          </button>
                        )}
                        {selected.status !== 'cancelled' && selected.status !== 'closed' && (
                          <button
                            type="button"
                            disabled={hasAnyGoodsReceipt}
                            onClick={() => void cancelPo()}
                            className={premiumTertiaryButton('sm', 'standard')}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                    {hasAnyGoodsReceipt && (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        Status updates are locked after goods receipt creation.
                      </p>
                    )}
                  </div>

                  <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="border-b border-gray-200 px-4 py-2 text-sm font-medium dark:border-gray-700">
                      Lines {linesLoading && '(loading…)'}
                    </div>
                    <div className="max-h-[min(420px,50vh)] overflow-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-gray-100 text-xs uppercase text-gray-600 dark:bg-gray-900 dark:text-gray-400">
                          <tr>
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Product</th>
                            <th className="px-3 py-2">Qty</th>
                            <th className="px-3 py-2">List</th>
                            <th className="px-3 py-2">Disc%</th>
                            <th className="px-3 py-2">Disc amt</th>
                            <th className="px-3 py-2 text-right">Line net</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((ln) => {
                            const p = productMap.get(ln.product_id);
                            const rawExt = ln.line_net_extended;
                            const netExt =
                              rawExt != null && Number.isFinite(Number(rawExt))
                                ? Number(rawExt)
                                : poLineNetExtended(
                                    Number(ln.quantity_ordered),
                                    Number(ln.unit_price),
                                    getPoLineDiscountPct(ln),
                                    getPoLineDiscountAmount(ln)
                                  );
                            return (
                              <tr
                                key={ln.id}
                                className="border-t border-gray-100 dark:border-gray-700"
                              >
                                <td className="px-3 py-2">{ln.line_no}</td>
                                <td className="px-3 py-2">
                                  {p ? `${p.sku} — ${p.name}` : ln.product_id}
                                </td>
                                <td className="px-3 py-2">{ln.quantity_ordered}</td>
                                <td className="px-3 py-2">{Number(ln.unit_price).toFixed(2)}</td>
                                <td className="px-3 py-2">{getPoLineDiscountPct(ln)}</td>
                                <td className="px-3 py-2">{getPoLineDiscountAmount(ln)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {formatPoMoney(netExt, selected.currency)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {selected.status === 'draft' && (
                      <DraftLineEditor
                        lines={lines}
                        products={products}
                        currency={selected.currency}
                        supplierId={selected.supplier_id}
                        catalogByProduct={draftCatalogByProduct}
                        onSave={async (next) => {
                          const r = await replaceLines(
                            selected.id,
                            next.map((l, i) => ({
                              line_no: i + 1,
                              product_id: l.product_id,
                              quantity_ordered: l.quantity_ordered,
                              unit_price: l.unit_price,
                              description: l.description?.trim() || null,
                              uom: l.uom?.trim() || null,
                              discount_pct: l.discount_pct,
                              discount_amount: l.discount_amount,
                              tax_rate_pct: l.tax_rate_pct,
                            }))
                          );
                          if (r.success) {
                            toast.success('Lines updated.');
                            void loadLines();
                          } else {
                            toast.error(r.error ?? 'Failed');
                          }
                        }}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}

type DraftRow = {
  product_id: string;
  uom: string;
  quantity_ordered: number;
  unit_price: number;
  discount_pct: number;
  discount_amount: number;
  tax_rate_pct: number;
  description: string;
};

function emptyDraftRow(): DraftRow {
  return {
    product_id: '',
    uom: '',
    quantity_ordered: 1,
    unit_price: 0,
    discount_pct: 0,
    discount_amount: 0,
    tax_rate_pct: 0,
    description: '',
  };
}

function DraftLineEditor({
  lines,
  products,
  currency,
  supplierId,
  catalogByProduct,
  onSave,
}: {
  lines: PurchaseOrderLine[];
  products: Product[];
  currency: string;
  supplierId: string;
  catalogByProduct: Map<string, SupplierProductPrice>;
  onSave: (rows: DraftRow[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<DraftRow[]>([]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  useEffect(() => {
    setRows(
      lines.length
        ? lines.map((l) => ({
            product_id: l.product_id,
            uom: l.uom ?? '',
            quantity_ordered: Number(l.quantity_ordered),
            unit_price: Number(l.unit_price),
            discount_pct: getPoLineDiscountPct(l),
            discount_amount: getPoLineDiscountAmount(l),
            tax_rate_pct: Number(l.tax_rate_pct ?? 0),
            description: l.description ?? '',
          }))
        : [emptyDraftRow()]
    );
  }, [lines]);

  const draftSubtotal = useMemo(() => {
    let s = 0;
    for (const r of rows) {
      if (!r.product_id || r.quantity_ordered <= 0) continue;
      s += poLineNetExtended(
        r.quantity_ordered,
        r.unit_price,
        r.discount_pct,
        r.discount_amount
      );
    }
    return s;
  }, [rows]);

  const updateRow = (idx: number, patch: Partial<DraftRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  return (
    <div className="border-t border-gray-200 p-4 dark:border-gray-700">
      <p className="mb-2 text-xs text-gray-500">Edit draft lines (save replaces all lines)</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600 dark:bg-gray-900/50 dark:text-gray-400">
            <tr>
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2">UoM</th>
              <th className="px-2 py-2">Qty</th>
              <th className="px-2 py-2">List</th>
              <th className="px-2 py-2">Disc%</th>
              <th className="px-2 py-2">Disc amt</th>
              <th className="px-2 py-2">Tax%</th>
              <th className="px-2 py-2 text-right">Line net</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const netExt =
                row.product_id && row.quantity_ordered > 0
                  ? poLineNetExtended(
                      row.quantity_ordered,
                      row.unit_price,
                      row.discount_pct,
                      row.discount_amount
                    )
                  : 0;
              const draftLineCat =
                row.product_id && supplierId ? catalogByProduct.get(row.product_id) : undefined;
              const draftMoqWarn =
                draftLineCat && isBelowMoq(row.quantity_ordered, draftLineCat.min_order_qty);
              return (
                <tr key={idx} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-2 py-2 align-top">
                    <select
                      value={row.product_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        const pr = productMap.get(id);
                        const cat = id && supplierId ? catalogByProduct.get(id) : undefined;
                        const list = id ? resolvePoListUnitPrice(pr, cat) : row.unit_price;
                        updateRow(idx, {
                          product_id: id,
                          unit_price: id ? list : row.unit_price,
                          uom: id && cat?.uom?.trim() ? cat.uom.trim() : row.uom,
                        });
                      }}
                      className="min-w-[180px] max-w-[240px] rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    >
                      <option value="">Product…</option>
                      {products.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.sku} — {pr.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.uom}
                      onChange={(e) => updateRow(idx, { uom: e.target.value })}
                      className="w-14 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0.0001}
                      step="any"
                      value={row.quantity_ordered}
                      onChange={(e) =>
                        updateRow(idx, { quantity_ordered: parseFloat(e.target.value) || 0 })
                      }
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                      title={
                        draftMoqWarn && draftLineCat
                          ? `Below supplier MOQ (${draftLineCat.min_order_qty})`
                          : undefined
                      }
                    />
                    {draftMoqWarn && draftLineCat ? (
                      <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                        MOQ {draftLineCat.min_order_qty}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={row.unit_price}
                      onChange={(e) =>
                        updateRow(idx, { unit_price: parseFloat(e.target.value) || 0 })
                      }
                      className="w-24 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={row.discount_pct}
                      onChange={(e) =>
                        updateRow(idx, { discount_pct: parseFloat(e.target.value) || 0 })
                      }
                      className="w-16 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={row.discount_amount}
                      onChange={(e) =>
                        updateRow(idx, { discount_amount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-24 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={row.tax_rate_pct}
                      onChange={(e) =>
                        updateRow(idx, { tax_rate_pct: parseFloat(e.target.value) || 0 })
                      }
                      className="w-14 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-gray-800 dark:text-gray-200">
                    {row.product_id && row.quantity_ordered > 0
                      ? formatPoMoney(netExt, currency)
                      : '—'}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => setRows((r) => r.filter((_, i) => i !== idx))}
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setRows((r) => [...r, emptyDraftRow()])}
          className="text-xs text-green-700 dark:text-green-400"
        >
          + Add Line
        </button>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Draft subtotal (net):{' '}
          <span className="font-medium text-gray-900 dark:text-white">
            {formatPoMoney(draftSubtotal, currency)}
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => void onSave(rows.filter((r) => r.product_id && r.quantity_ordered > 0))}
        className="mt-3 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-gray-100 dark:text-gray-900"
      >
        Save Lines
      </button>
    </div>
  );
}
