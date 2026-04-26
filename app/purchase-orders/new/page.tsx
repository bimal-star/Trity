'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useProducts } from '@/hooks/useProducts';
import { useSupplierProductCatalog } from '@/hooks/useSupplierProductCatalog';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useWarehouses } from '@/hooks/useWarehouses';
import { poLineNetExtended, poLineNetUnitPrice, poLineTaxAmount } from '@/lib/purchaseLinePricing';
import {
  pillarAccent,
  premiumDangerButton,
  premiumInputCompact,
  premiumInputComfortableBase,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumSurfaces,
  premiumTypography,
} from '@/lib/premiumUi';
import { isBelowMoq, resolvePoListUnitPrice } from '@/lib/supplierProductPricing';
import { useToast } from '@/lib/toast';
import type { Product } from '@/types/product';
import type { PurchaseOrderStatus } from '@/types/purchase';
import type { Supplier } from '@/types/supplier';
import type { Warehouse } from '@/types/warehouse';
import { Building2, FileSpreadsheet, MapPin, Plus, Trash2, Truck } from 'lucide-react';

type LineRow = {
  product_id: string;
  product_query: string;
  uom: string;
  quantity_ordered: number;
  unit_price: number;
  discount_pct: number;
  discount_amount: number;
  tax_rate_pct: number;
};

const poAccent = pillarAccent('businessCore');

function productDisplayText(p: Product): string {
  return `${p.sku} — ${p.name}`;
}

function resolveProductIdFromQuery(products: Product[], query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const exact = products.find((p) => {
    const sku = p.sku.toLowerCase();
    const name = p.name.toLowerCase();
    const full = productDisplayText(p).toLowerCase();
    return q === sku || q === name || q === full;
  });
  if (exact) return exact.id;

  const contains = products.find((p) => {
    const sku = p.sku.toLowerCase();
    const name = p.name.toLowerCase();
    const full = productDisplayText(p).toLowerCase();
    return sku.includes(q) || name.includes(q) || full.includes(q);
  });
  return contains ? contains.id : null;
}

function emptyLine(): LineRow {
  return {
    product_id: '',
    product_query: '',
    uom: '',
    quantity_ordered: 1,
    unit_price: 0,
    discount_pct: 0,
    discount_amount: 0,
    tax_rate_pct: 0,
  };
}

function formatMoney(amount: number, currency: string) {
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

function joinAddress(parts: (string | null | undefined)[]): string[] {
  return parts.map((p) => (p == null ? '' : String(p).trim())).filter(Boolean);
}

function supplierLines(s: Supplier): string[] {
  const lines: string[] = [];
  const title = [s.supplier_code, s.legal_name].filter(Boolean).join(' · ');
  if (title) lines.push(title);
  if (s.trading_name?.trim()) lines.push(`Trading as: ${s.trading_name.trim()}`);
  const street = joinAddress([s.address_line1, s.address_line2]);
  if (street.length) lines.push(street.join(', '));
  const cityLine = joinAddress([s.city, s.state, s.postcode, s.country]);
  if (cityLine.length) lines.push(cityLine.join(', '));
  const contact: string[] = [];
  if (s.email?.trim()) contact.push(`Email: ${s.email.trim()}`);
  if (s.phone?.trim()) contact.push(`Phone: ${s.phone.trim()}`);
  if (contact.length) lines.push(contact.join(' · '));
  if (s.payment_terms?.trim()) lines.push(`Payment terms: ${s.payment_terms.trim()}`);
  if (s.tax_id?.trim()) lines.push(`Tax ID: ${s.tax_id.trim()}`);
  return lines;
}

function warehouseLines(w: Warehouse): string[] {
  const lines: string[] = [];
  const title = [w.warehouse_code, w.name].filter(Boolean).join(' · ');
  if (title) lines.push(title);
  const street = joinAddress([w.address_line1, w.address_line2]);
  if (street.length) lines.push(street.join(', '));
  const cityLine = joinAddress([w.city, w.state, w.postcode, w.country]);
  if (cityLine.length) lines.push(cityLine.join(', '));
  if (w.contact_name?.trim()) lines.push(`Contact: ${w.contact_name.trim()}`);
  if (w.contact_email?.trim()) lines.push(`Email: ${w.contact_email.trim()}`);
  if (w.contact_phone?.trim()) lines.push(`Phone: ${w.contact_phone.trim()}`);
  return lines;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { createPurchaseOrder } = usePurchaseOrders(undefined, { loadPurchaseOrders: false });
  const { suppliers } = useSuppliers();
  const { warehouses } = useWarehouses();
  const { products } = useProducts(undefined, 'name', 'asc');

  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [status, setStatus] = useState<PurchaseOrderStatus>('draft');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<LineRow[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { toast } = useToast();

  const { catalog: supplierCatalog } = useSupplierProductCatalog(supplierId || null);

  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.status === 'active'),
    [suppliers]
  );
  const activeWarehouses = useMemo(
    () => warehouses.filter((w) => w.status === 'active'),
    [warehouses]
  );
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const catalogByProduct = useMemo(
    () => new Map(supplierCatalog.map((c) => [c.product_id, c])),
    [supplierCatalog]
  );
  const productMapRef = useRef(productMap);
  productMapRef.current = productMap;

  useEffect(() => {
    const byProduct = new Map(supplierCatalog.map((c) => [c.product_id, c]));
    setRows((prev) =>
      prev.map((r) => {
        if (!r.product_id) return r;
        const p = productMapRef.current.get(r.product_id);
        const cat = supplierId ? byProduct.get(r.product_id) : undefined;
        return {
          ...r,
          unit_price: resolvePoListUnitPrice(p, cat),
        };
      })
    );
  }, [supplierId, supplierCatalog]);

  const selectedSupplier = useMemo(
    () => activeSuppliers.find((s) => s.id === supplierId),
    [activeSuppliers, supplierId]
  );
  const selectedWarehouse = useMemo(
    () => activeWarehouses.find((w) => w.id === warehouseId),
    [activeWarehouses, warehouseId]
  );
  const supplierDetailLines = useMemo(
    () => (selectedSupplier ? supplierLines(selectedSupplier) : []),
    [selectedSupplier]
  );
  const warehouseDetailLines = useMemo(
    () => (selectedWarehouse ? warehouseLines(selectedWarehouse) : []),
    [selectedWarehouse]
  );

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const r of rows) {
      if (!r.product_id || r.quantity_ordered <= 0) continue;
      subtotal += poLineNetExtended(
        r.quantity_ordered,
        r.unit_price,
        r.discount_pct,
        r.discount_amount
      );
      tax += poLineTaxAmount(
        r.quantity_ordered,
        r.unit_price,
        r.discount_pct,
        r.discount_amount,
        r.tax_rate_pct
      );
    }
    return { subtotal, tax, grand: subtotal + tax };
  }, [rows]);
  const nonEmptyLineCount = useMemo(
    () => rows.filter((r) => r.product_id && r.quantity_ordered > 0).length,
    [rows]
  );

  const updateRow = (idx: number, patch: Partial<LineRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const onProductQueryChange = (idx: number, query: string) => {
    const resolvedId = resolveProductIdFromQuery(products, query);
    const p = resolvedId ? productMap.get(resolvedId) : undefined;
    const cat = resolvedId && supplierId ? catalogByProduct.get(resolvedId) : undefined;
    setRows((prev) => {
      const next = [...prev];
      const cur = next[idx];
      const productChanged = Boolean(resolvedId && cur.product_id !== resolvedId);
      next[idx] = {
        ...cur,
        product_query: query,
        product_id: resolvedId ?? '',
        unit_price: productChanged ? resolvePoListUnitPrice(p, cat) : cur.unit_price,
        uom: productChanged && cat?.uom?.trim() ? cat.uom.trim() : cur.uom,
      };
      return next;
    });
  };

  const submit = async () => {
    setErr(null);
    if (!supplierId || !warehouseId) {
      setErr('Supplier and warehouse are required.');
      return;
    }
    const clean = rows.filter((r) => r.product_id && r.quantity_ordered > 0);
    if (!clean.length) {
      setErr('Add at least one line with a product and quantity.');
      return;
    }
    setSaving(true);
    const r = await createPurchaseOrder({
      supplier_id: supplierId,
      warehouse_id: warehouseId,
      status,
      currency,
      order_date: orderDate,
      expected_date: expectedDate.trim() ? expectedDate : null,
      notes: notes.trim() || null,
      lines: clean.map((l, i) => ({
        line_no: i + 1,
        product_id: l.product_id,
        uom: l.uom.trim() || null,
        quantity_ordered: l.quantity_ordered,
        unit_price: l.unit_price,
        discount_pct: l.discount_pct,
        discount_amount: l.discount_amount,
        tax_rate_pct: l.tax_rate_pct,
      })),
    });
    setSaving(false);
    if (r.success && r.id) {
      toast.success('Purchase order created.');
      router.push('/purchase-orders');
    } else {
      toast.error(r.error ?? 'Failed to create');
    }
  };

  const statusPills: { label: string; value: PurchaseOrderStatus }[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Approved', value: 'sent' },
    { label: 'Received', value: 'received' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <ProtectedRoute>
      <PageContainer
        module="businessCore"
        rootClassName={premiumSurfaces.pageRoot}
        innerClassName={premiumSurfaces.pageInnerWide}
      >
        <PremiumStickyHeader
          module="businessCore"
          backHref="/purchase-orders"
          backLabel="Back to purchase orders"
          icon={FileSpreadsheet}
          title="New Purchase Order"
          subtitle="Structured purchasing with clear commercial controls"
          right={
            <>
              {statusPills.map((pill) => (
                <button
                  type="button"
                  key={pill.label}
                  onClick={() => {
                    if (pill.value !== 'draft' && nonEmptyLineCount === 0) {
                      setErr('Add at least one line before choosing a status beyond Draft.');
                      return;
                    }
                    setErr(null);
                    setStatus(pill.value);
                  }}
                  disabled={pill.value !== 'draft' && nonEmptyLineCount === 0}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    status === pill.value ? poAccent.pillSelected : poAccent.pillIdle
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {pill.label}
                </button>
              ))}
            </>
          }
        />

        <div className="space-y-5">
          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {err}
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.62fr)_minmax(240px,0.72fr)_minmax(280px,0.85fr)] xl:items-stretch">
            <div className={`flex h-full flex-col ${premiumSurfaces.card}`}>
              <h2 className={`mb-4 ${premiumTypography.sectionTitle}`}>Supplier & Ship-to</h2>
              <div className="flex flex-1 flex-col justify-between gap-3">
                <div className="grid gap-3 md:grid-cols-2 md:items-start">
                  <div>
                    <label className={`block ${premiumTypography.label}`}>Supplier</label>
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className={`mt-1 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                    >
                      <option value="">Select supplier…</option>
                      {activeSuppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.supplier_code} — {s.legal_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={premiumSurfaces.insetInfo}>
                    <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <Building2 className="h-3.5 w-3.5" aria-hidden />
                      Supplier address
                    </p>
                    <ul className="space-y-1 text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                      {supplierDetailLines.length > 0 ? (
                        supplierDetailLines.map((line, i) => <li key={i}>{line}</li>)
                      ) : (
                        <li className="text-gray-500 dark:text-gray-500">
                          Choose a supplier to show registered address and contact.
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 md:items-start">
                  <div>
                    <label className={`block ${premiumTypography.label}`}>
                      Warehouse (ship-to)
                    </label>
                    <select
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                      className={`mt-1 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                    >
                      <option value="">Select warehouse…</option>
                      {activeWarehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.warehouse_code} — {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={premiumSurfaces.insetInfo}>
                    <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      Ship-to address
                    </p>
                    <ul className="space-y-1 text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                      {warehouseDetailLines.length > 0 ? (
                        warehouseDetailLines.map((line, i) => <li key={i}>{line}</li>)
                      ) : (
                        <li className="text-gray-500 dark:text-gray-500">
                          Choose a warehouse to show delivery location and contact.
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className={`flex h-full flex-col ${premiumSurfaces.card}`}>
              <h2 className={`mb-4 ${premiumTypography.sectionTitle}`}>Order details</h2>
              <div className="flex max-w-sm flex-1 flex-col justify-between gap-4">
                <div>
                  <label className={`block ${premiumTypography.label}`}>Order date</label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className={`mt-1 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                  />
                </div>
                <div>
                  <label className={`block ${premiumTypography.label}`}>Expected date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className={`mt-1 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                  />
                </div>
                <div>
                  <label className={`block ${premiumTypography.label}`}>Currency</label>
                  <input
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                    maxLength={3}
                    className={`mt-1 !max-w-[8rem] uppercase ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                  />
                </div>
              </div>
            </div>

            <div className={`flex h-full flex-col ${premiumSurfaces.card}`}>
              <h2 className={premiumTypography.sectionTitle}>Notes</h2>
              <p className={`mt-1 ${premiumTypography.helper}`}>
                Commercial terms, delivery instructions, or internal remarks.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Optional — visible on the purchase order record."
                className={`mt-3 min-h-[7.5rem] flex-1 resize-y ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
              />
            </div>

            <div className={`flex h-full flex-col ${premiumSurfaces.cardElevated}`}>
              <h3 className={premiumTypography.sectionTitle}>Summary</h3>
              <p className={`mt-1 ${premiumTypography.helper}`}>
                Operational totals and commit action.
              </p>
              <div className={`mt-3 space-y-2 ${premiumTypography.body}`}>
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                  <span>Lines</span>
                  <span className="font-medium tabular-nums">
                    {rows.filter((r) => r.product_id).length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                  <span>Subtotal (net)</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(totals.subtotal, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                  <span>Estimated tax</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(totals.tax, currency)}
                  </span>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-green-50 p-3 dark:bg-green-900/20">
                <div className="flex items-center justify-between gap-2">
                  <span className={`${premiumTypography.button} text-gray-700 dark:text-gray-300`}>
                    Total
                  </span>
                  <span className="text-lg font-semibold tabular-nums text-green-700 dark:text-green-300">
                    {formatMoney(totals.grand, currency)}
                  </span>
                </div>
              </div>
              <p
                className={`mt-3 inline-flex items-start gap-1.5 leading-snug ${premiumTypography.helper}`}
              >
                <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Supplier and ship-to must be selected before saving.
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submit()}
                className={`mt-3 w-full ${premiumPrimaryButton('businessCore', 'lg', 'wide')}`}
              >
                {saving ? 'Saving…' : 'Create Draft PO'}
              </button>
            </div>
          </div>

          <div className={premiumSurfaces.card}>
            <div className="mb-2">
              <h2 className={premiumTypography.sectionTitle}>Line Items</h2>
            </div>

            <div className="overflow-x-auto">
              <table
                className={`w-full min-w-[920px] table-fixed border-collapse text-left ${premiumTypography.tableCell}`}
              >
                <colgroup>
                  <col style={{ width: '2.5rem' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '4.25rem' }} />
                  <col style={{ width: '3.25rem' }} />
                  <col style={{ width: '4.75rem' }} />
                  <col style={{ width: '3.5rem' }} />
                  <col style={{ width: '4.75rem' }} />
                  <col style={{ width: '3.5rem' }} />
                  <col style={{ width: '6.5rem' }} />
                  <col style={{ width: '6.75rem' }} />
                  <col style={{ width: '5.5rem' }} />
                  <col style={{ width: '5.5rem' }} />
                  <col style={{ width: '5.25rem' }} />
                </colgroup>
                <thead>
                  <tr
                    className={`border-b border-gray-200 dark:border-gray-700 ${premiumTypography.tableHeaderDense}`}
                  >
                    <th className="pb-1.5 pr-1 text-left align-bottom">Line</th>
                    <th className="pb-1.5 px-1 text-left align-bottom">Product</th>
                    <th className="pb-1.5 px-0.5 text-left align-bottom">Qty</th>
                    <th className="pb-1.5 px-0.5 text-left align-bottom">UoM</th>
                    <th className="pb-1.5 px-0.5 text-left align-bottom">List</th>
                    <th className="pb-1.5 px-0.5 text-left align-bottom">Disc%</th>
                    <th className="pb-1.5 px-0.5 text-left align-bottom">Disc amt</th>
                    <th className="pb-1.5 px-0.5 text-left align-bottom">Tax%</th>
                    <th className="pb-1.5 px-0.5 text-right align-bottom">Net unit</th>
                    <th className="pb-1.5 px-0.5 text-right align-bottom">Line total</th>
                    <th className="pb-1.5 px-0.5 text-right align-bottom">Std</th>
                    <th className="pb-1.5 px-0.5 text-right align-bottom">Avg</th>
                    <th className="pb-1.5 pl-1 text-right align-bottom" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const p = row.product_id ? productMap.get(row.product_id) : undefined;
                    const netExt = poLineNetExtended(
                      row.quantity_ordered,
                      row.unit_price,
                      row.discount_pct,
                      row.discount_amount
                    );
                    const netUnit = poLineNetUnitPrice(
                      row.quantity_ordered,
                      row.unit_price,
                      row.discount_pct,
                      row.discount_amount
                    );
                    const std = p?.cost_price != null ? Number(p.cost_price) : null;
                    const wac =
                      p?.weighted_avg_unit_cost != null ? Number(p.weighted_avg_unit_cost) : null;
                    const lineCat =
                      row.product_id && supplierId
                        ? catalogByProduct.get(row.product_id)
                        : undefined;
                    const moqWarn =
                      lineCat && isBelowMoq(row.quantity_ordered, lineCat.min_order_qty);
                    return (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-1 pr-1 align-middle">
                          <div className="rounded-md bg-gray-100 py-0.5 text-center text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                            {idx + 1}
                          </div>
                        </td>
                        <td className="min-w-0 px-1 py-1 align-middle">
                          <input
                            list="po-products-list"
                            value={row.product_query}
                            onChange={(e) => onProductQueryChange(idx, e.target.value)}
                            className={premiumInputCompact}
                            placeholder="Type SKU or product name..."
                          />
                        </td>
                        <td className="px-0.5 py-1 align-middle">
                          <input
                            type="number"
                            min={0.0001}
                            step="any"
                            value={row.quantity_ordered}
                            onChange={(e) =>
                              updateRow(idx, { quantity_ordered: parseFloat(e.target.value) || 0 })
                            }
                            className={premiumInputCompact}
                            title={
                              moqWarn && lineCat
                                ? `Below supplier MOQ (${lineCat.min_order_qty})`
                                : undefined
                            }
                          />
                          {moqWarn && lineCat ? (
                            <p className="mt-0.5 text-[10px] leading-tight text-amber-600 dark:text-amber-400">
                              MOQ {lineCat.min_order_qty}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-0.5 py-1 align-middle">
                          <input
                            value={row.uom}
                            onChange={(e) => updateRow(idx, { uom: e.target.value })}
                            className={premiumInputCompact}
                            placeholder="ea"
                          />
                        </td>
                        <td className="px-0.5 py-1 align-middle">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={row.unit_price}
                            onChange={(e) =>
                              updateRow(idx, { unit_price: parseFloat(e.target.value) || 0 })
                            }
                            className={premiumInputCompact}
                          />
                        </td>
                        <td className="px-0.5 py-1 align-middle">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="any"
                            value={row.discount_pct}
                            onChange={(e) =>
                              updateRow(idx, { discount_pct: parseFloat(e.target.value) || 0 })
                            }
                            className={premiumInputCompact}
                          />
                        </td>
                        <td className="px-0.5 py-1 align-middle">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={row.discount_amount}
                            onChange={(e) =>
                              updateRow(idx, { discount_amount: parseFloat(e.target.value) || 0 })
                            }
                            className={premiumInputCompact}
                          />
                        </td>
                        <td className="px-0.5 py-1 align-middle">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="any"
                            value={row.tax_rate_pct}
                            onChange={(e) =>
                              updateRow(idx, { tax_rate_pct: parseFloat(e.target.value) || 0 })
                            }
                            className={premiumInputCompact}
                          />
                        </td>
                        <td className="px-0.5 py-1 align-middle">
                          <div className="rounded-md bg-gray-50 px-1.5 py-0.5 text-right tabular-nums dark:bg-gray-900/50">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {row.product_id ? formatMoney(netUnit, currency) : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-0.5 py-1 align-middle">
                          <div className="rounded-md bg-green-50 px-1.5 py-0.5 text-right tabular-nums dark:bg-green-900/20">
                            <span className="font-semibold text-green-700 dark:text-green-300">
                              {row.product_id ? formatMoney(netExt, currency) : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-0.5 py-1 align-middle">
                          <div className="rounded-md bg-gray-50 px-1.5 py-0.5 text-right tabular-nums dark:bg-gray-900/50">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {std != null && Number.isFinite(std)
                                ? formatMoney(std, currency)
                                : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-0.5 py-1 align-middle">
                          <div className="rounded-md bg-gray-50 px-1.5 py-0.5 text-right tabular-nums dark:bg-gray-900/50">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {wac != null && Number.isFinite(wac)
                                ? formatMoney(wac, currency)
                                : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="py-1 pl-1 text-right align-middle">
                          <button
                            type="button"
                            onClick={() => setRows((r) => r.filter((_, i) => i !== idx))}
                            className={premiumDangerButton('sm', 'standard')}
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setRows((r) => [...r, emptyLine()])}
                className={premiumSecondaryButton('businessCore', 'sm', 'standard')}
              >
                <Plus size={15} />
                Add Line
              </button>
            </div>
          </div>
          <datalist id="po-products-list">
            {products.map((pr) => (
              <option key={pr.id} value={productDisplayText(pr)} />
            ))}
          </datalist>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
