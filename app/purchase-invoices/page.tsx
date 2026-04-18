'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useSupplierInvoices } from '@/hooks/useSupplierInvoices';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useProducts } from '@/hooks/useProducts';
import type { PurchaseOrderLine, SupplierInvoice, SupplierInvoiceLine } from '@/types/purchase';
import {
  pillarAccent,
  premiumDangerButton,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumSurfaces,
  premiumTypography,
} from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import { FileText, Plus } from 'lucide-react';

const bc = pillarAccent('businessCore');

const matchBadge = (s: string) => {
  const base = 'rounded px-2 py-0.5 text-xs font-medium ';
  switch (s) {
    case 'ok':
      return base + 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
    case 'price_variance':
      return base + 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100';
    case 'qty_variance':
      return base + 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100';
    case 'unlinked':
      return base + 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
    default:
      return base + 'bg-gray-50 text-gray-600 dark:bg-gray-800';
  }
};

export default function PurchaseInvoicesPage() {
  const [selected, setSelected] = useState<SupplierInvoice | null>(null);
  const [lines, setLines] = useState<SupplierInvoiceLine[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const { toast } = useToast();

  const {
    invoices,
    isLoading,
    error,
    fetchLines,
    runMatch,
    replaceLines,
  } = useSupplierInvoices();

  const { fetchLines: fetchPoLines } = usePurchaseOrders(undefined, {
    loadPurchaseOrders: false,
  });
  const { suppliers } = useSuppliers();
  const { products } = useProducts(undefined, 'name', 'asc');
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const [poLines, setPoLines] = useState<PurchaseOrderLine[]>([]);

  const loadLines = useCallback(async () => {
    if (!selected) {
      setLines((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    setLoadingLines(true);
    try {
      const data = await fetchLines(selected.id);
      setLines(data);
    } finally {
      setLoadingLines(false);
    }
  }, [selected, fetchLines]);

  useEffect(() => {
    void loadLines();
  }, [loadLines]);

  const linkedPoId = selected?.purchase_order_id ?? null;

  useEffect(() => {
    if (!linkedPoId) {
      setPoLines((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    void (async () => {
      const pl = await fetchPoLines(linkedPoId);
      setPoLines(pl);
    })();
  }, [linkedPoId, fetchPoLines]);

  const supplierName = useMemo(() => {
    if (!selected) return '';
    return suppliers.find((s) => s.id === selected.supplier_id)?.legal_name ?? selected.supplier_id;
  }, [selected, suppliers]);

  const doMatch = async () => {
    if (!selected) return;
    const r = await runMatch(selected.id);
    if (r.success) {
      toast.success('Match complete.');
      void loadLines();
      if (r.invoiceStatus) {
        setSelected((prev) => (prev ? { ...prev, status: r.invoiceStatus! } : prev));
      }
    } else {
      toast.error(r.error ?? 'Failed');
    }
  };

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          icon={FileText}
          title="Purchase invoices"
          subtitle="Enter billed quantities and unit prices, then run match vs PO and posted receipts"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
          right={
            <Link
              href="/purchase-invoices/new"
              className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New Invoice
            </Link>
          }
        />

        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        <div className="grid min-h-[480px] grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:col-span-1">
            <div className="border-b border-gray-200 px-3 py-2 text-sm font-medium dark:border-gray-700">
              Invoices
            </div>
            <div className="max-h-[520px] overflow-y-auto p-2">
              {isLoading && <p className="p-3 text-sm text-gray-500">Loading…</p>}
              {error && <p className="p-3 text-sm text-red-600">{error}</p>}
              {!isLoading &&
                invoices.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => setSelected(inv)}
                    className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${
                      selected?.id === inv.id
                        ? 'bg-green-100 font-medium dark:bg-green-900/40'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="truncate">{inv.invoice_number}</div>
                    <div className="text-xs text-gray-500">
                      {inv.invoice_date} · {inv.status}
                    </div>
                  </button>
                ))}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            {!selected && (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-600">
                Select an invoice or create a new one.
              </div>
            )}
            {selected && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-green-50/70 via-white to-white p-4 dark:border-gray-700 dark:from-green-950/25 dark:via-gray-800 dark:to-gray-800">
                  <h2 className="text-lg font-semibold">{selected.invoice_number}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{supplierName}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {selected.invoice_date} · {selected.currency} · status: {selected.status}
                  </p>
                  <button
                    type="button"
                    onClick={() => void doMatch()}
                    className={`mt-3 ${premiumPrimaryButton('businessCore', 'sm', 'standard')}`}
                  >
                    Calculate Match
                  </button>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <div className="border-b border-gray-200 px-4 py-2 text-sm font-medium dark:border-gray-700">
                    Lines {loadingLines && '…'}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-100 text-xs uppercase dark:bg-gray-900">
                        <tr>
                          <th className="px-2 py-2">#</th>
                          <th className="px-2 py-2">Product</th>
                          <th className="px-2 py-2">Qty billed</th>
                          <th className="px-2 py-2">Unit price</th>
                          <th className="px-2 py-2">Match</th>
                          <th className="px-2 py-2">PO / GR snapshot</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((ln) => {
                          const p = productMap.get(ln.product_id);
                          return (
                            <tr key={ln.id} className="border-t border-gray-100 dark:border-gray-700">
                              <td className="px-2 py-2">{ln.line_no}</td>
                              <td className="px-2 py-2">
                                {p ? `${p.sku} — ${p.name}` : ln.product_id}
                              </td>
                              <td className="px-2 py-2">{ln.quantity_invoiced}</td>
                              <td className="px-2 py-2">{Number(ln.unit_price).toFixed(2)}</td>
                              <td className="px-2 py-2">
                                <span className={matchBadge(ln.match_status)}>{ln.match_status}</span>
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-600 dark:text-gray-400">
                                {ln.qty_ordered_snapshot != null && (
                                  <>
                                    ord {ln.qty_ordered_snapshot} · recv{' '}
                                    {ln.qty_received_snapshot ?? '—'} · PO @{' '}
                                    {ln.po_unit_price_snapshot != null
                                      ? Number(ln.po_unit_price_snapshot).toFixed(2)
                                      : '—'}
                                  </>
                                )}
                                {ln.qty_ordered_snapshot == null && '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <InvoiceLineEditor
                    invoice={selected}
                    lines={lines}
                    poLines={poLines}
                    products={products}
                    onSave={async (next) => {
                      const r = await replaceLines(
                        selected.id,
                        next.map((l, i) => ({
                          line_no: i + 1,
                          purchase_order_line_id: l.purchase_order_line_id,
                          product_id: l.product_id,
                          quantity_invoiced: l.quantity_invoiced,
                          unit_price: l.unit_price,
                          tax_amount: l.tax_amount,
                        }))
                      );
                      if (r.success) {
                        toast.success('Lines updated (re-run match).');
                        void loadLines();
                      } else {
                        toast.error(r.error ?? 'Failed');
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}

function InvoiceLineEditor({
  invoice,
  lines,
  poLines,
  products,
  onSave,
}: {
  invoice: SupplierInvoice;
  lines: SupplierInvoiceLine[];
  poLines: PurchaseOrderLine[];
  products: { id: string; sku: string; name: string }[];
  onSave: (
    rows: {
      product_id: string;
      purchase_order_line_id: string | null;
      quantity_invoiced: number;
      unit_price: number;
      tax_amount: number;
    }[]
  ) => Promise<void>;
}) {
  const [rows, setRows] = useState<
    {
      product_id: string;
      purchase_order_line_id: string;
      quantity_invoiced: number;
      unit_price: number;
      tax_amount: number;
    }[]
  >([]);

  useEffect(() => {
    setRows(
      lines.map((l) => ({
        product_id: l.product_id,
        purchase_order_line_id: l.purchase_order_line_id ?? '',
        quantity_invoiced: Number(l.quantity_invoiced),
        unit_price: Number(l.unit_price),
        tax_amount: Number(l.tax_amount ?? 0),
      }))
    );
  }, [lines]);

  if (invoice.status !== 'draft' && invoice.status !== 'exception') {
    return (
      <p className="p-4 text-xs text-gray-500">
        Edit lines only while invoice is draft or exception (re-open from DB if needed).
      </p>
    );
  }

  return (
    <div className="border-t border-gray-200 p-4 dark:border-gray-700">
      <p className="mb-2 text-xs text-gray-500">
        Link optional PO line for matching. Product should match the PO line product.
      </p>
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="flex flex-wrap items-end gap-2 border-b border-gray-100 pb-2 dark:border-gray-700">
            <select
              value={row.product_id}
              onChange={(e) => {
                const next = [...rows];
                next[idx] = { ...next[idx], product_id: e.target.value };
                setRows(next);
              }}
              className="min-w-[180px] rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
            >
              <option value="">Product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
            <select
              value={row.purchase_order_line_id}
              onChange={(e) => {
                const next = [...rows];
                const polId = e.target.value;
                next[idx] = { ...next[idx], purchase_order_line_id: polId };
                const pol = poLines.find((p) => p.id === polId);
                if (pol) {
                  next[idx].product_id = pol.product_id;
                  next[idx].unit_price = Number(pol.unit_price);
                }
                setRows(next);
              }}
              className="min-w-[160px] rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
            >
              <option value="">PO line (optional)</option>
              {poLines.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  Line {pl.line_no} · qty {pl.quantity_ordered} @ {pl.unit_price}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0.0001}
              step="any"
              value={row.quantity_invoiced}
              onChange={(e) => {
                const next = [...rows];
                next[idx] = {
                  ...next[idx],
                  quantity_invoiced: parseFloat(e.target.value) || 0,
                };
                setRows(next);
              }}
              className="w-24 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
            />
            <input
              type="number"
              min={0}
              step="any"
              value={row.unit_price}
              onChange={(e) => {
                const next = [...rows];
                next[idx] = { ...next[idx], unit_price: parseFloat(e.target.value) || 0 };
                setRows(next);
              }}
              className="w-24 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
            />
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, i) => i !== idx))}
              className={premiumDangerButton('sm', 'standard')}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setRows([
              ...rows,
              {
                product_id: '',
                purchase_order_line_id: '',
                quantity_invoiced: 1,
                unit_price: 0,
                tax_amount: 0,
              },
            ])
          }
          className={premiumSecondaryButton('businessCore', 'sm', 'standard')}
        >
          + Line
        </button>
      </div>
      <button
        type="button"
        onClick={() =>
          void onSave(
            rows
              .filter((r) => r.product_id && r.quantity_invoiced > 0)
              .map((r) => ({
                ...r,
                purchase_order_line_id: r.purchase_order_line_id || null,
              }))
          )
        }
        className={`mt-3 ${premiumPrimaryButton('businessCore', 'sm', 'standard')}`}
      >
        Save Lines
      </button>
    </div>
  );
}
