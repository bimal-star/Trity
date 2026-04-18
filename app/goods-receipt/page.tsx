'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useGoodsReceipts } from '@/hooks/useGoodsReceipts';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useProducts } from '@/hooks/useProducts';
import { fetchQtyReceivedByPoLineIds } from '@/lib/purchaseReceivedQty';
import { useTenant } from '@/contexts/TenantContext';
import type { GoodsReceipt, PurchaseOrder, PurchaseOrderLine } from '@/types/purchase';
import {
  pillarAccent,
  premiumDangerButton,
  premiumPrimaryButton,
  premiumTertiaryButton,
  premiumSurfaces,
  premiumTypography,
} from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import { PackageCheck } from 'lucide-react';

const bc = pillarAccent('businessCore');

export default function GoodsReceiptPage() {
  const { effectiveTenantId: tenant_id } = useTenant();
  const [selected, setSelected] = useState<GoodsReceipt | null>(null);
  const [lines, setLines] = useState<PurchaseOrderLine[]>([]);
  const [grLines, setGrLines] = useState<{ purchase_order_line_id: string; quantity_received: number }[]>(
    []
  );
  const [qtyReceived, setQtyReceived] = useState<Map<string, number>>(new Map());
  const [poForSelected, setPoForSelected] = useState<PurchaseOrder | null>(null);
  const [newPoId, setNewPoId] = useState('');
  const { toast } = useToast();

  const { purchaseOrders, fetchLines: fetchPoLines } = usePurchaseOrders();
  const {
    goodsReceipts,
    isLoading,
    error,
    refreshGoodsReceipts,
    createDraftForPo,
    fetchLines: fetchGrLines,
    upsertLines,
    postReceipt,
    deleteDraft,
  } = useGoodsReceipts();

  const { products } = useProducts(undefined, 'name', 'asc');
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const receivablePos = useMemo(
    () => purchaseOrders.filter((po) => ['sent', 'partially_received'].includes(po.status)),
    [purchaseOrders]
  );

  const loadGrDetail = useCallback(async () => {
    if (!selected || !tenant_id) {
      setLines((prev) => (prev.length === 0 ? prev : []));
      setGrLines((prev) => (prev.length === 0 ? prev : []));
      setPoForSelected((prev) => (prev === null ? prev : null));
      setQtyReceived((prev) => (prev.size === 0 ? prev : new Map()));
      return;
    }
    const po = purchaseOrders.find((p) => p.id === selected.purchase_order_id) ?? null;
    setPoForSelected(po);

    const pol = await fetchPoLines(selected.purchase_order_id);
    setLines(pol);

    const existing = await fetchGrLines(selected.id);
    const map = new Map<string, number>();
    for (const g of existing) {
      map.set(g.purchase_order_line_id, Number(g.quantity_received));
    }
    setGrLines(
      pol.map((l) => ({
        purchase_order_line_id: l.id,
        quantity_received: map.get(l.id) ?? 0,
      }))
    );

    const ids = pol.map((l) => l.id);
    const recv = await fetchQtyReceivedByPoLineIds(tenant_id, ids);
    setQtyReceived(recv);
  }, [selected, tenant_id, purchaseOrders, fetchPoLines, fetchGrLines]);

  useEffect(() => {
    void loadGrDetail();
  }, [loadGrDetail]);

  const createFromPo = async () => {
    if (!newPoId) return;
    const r = await createDraftForPo(newPoId);
    if (r.success) {
      toast.success(`Created receipt ${r.id?.slice(0, 8)}…`);
      await refreshGoodsReceipts();
    } else {
      toast.error(r.error ?? 'Failed');
    }
  };

  const saveLines = async () => {
    if (!selected) return;
    const r = await upsertLines(
      selected.id,
      grLines.filter((g) => g.quantity_received > 0)
    );
    if (r.success) {
      toast.success('Lines saved.');
      void loadGrDetail();
    } else {
      toast.error(r.error ?? 'Failed');
    }
  };

  const post = async () => {
    if (!selected) return;
    const r = await postReceipt(selected.id);
    if (r.success) {
      toast.success('Receipt posted; stock can be updated separately if configured.');
      setSelected({ ...selected, status: 'posted' });
      await refreshGoodsReceipts();
    } else {
      toast.error(r.error ?? 'Failed');
    }
  };

  const removeDraft = async () => {
    if (!selected || selected.status !== 'draft') return;
    if (!confirm('Delete this draft receipt?')) return;
    const r = await deleteDraft(selected.id);
    if (r.success) {
      toast.success('Draft deleted.');
      setSelected(null);
      await refreshGoodsReceipts();
    } else {
      toast.error(r.error ?? 'Failed');
    }
  };

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          icon={PackageCheck}
          title="Goods receipt"
          subtitle="Record received quantities only; invoice lines carry unit prices for matching"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
        />

        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <label className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">New draft from PO</span>
            <select
              value={newPoId}
              onChange={(e) => setNewPoId(e.target.value)}
              className="mt-1 block min-w-[240px] rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
            >
              <option value="">Select sent / receiving PO…</option>
              {receivablePos.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.po_number} — {po.status}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void createFromPo()}
            className={premiumPrimaryButton('businessCore', 'md', 'wide')}
          >
            Create Draft
          </button>
        </div>

        <div className="grid min-h-[420px] grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-1">
            <div className="border-b border-gray-200 px-3 py-2 text-sm font-medium dark:border-gray-700">
              Receipts
            </div>
            <div className="max-h-[480px] overflow-y-auto p-2">
              {isLoading && <p className="p-3 text-sm text-gray-500">Loading…</p>}
              {error && <p className="p-3 text-sm text-red-600">{error}</p>}
              {!isLoading &&
                goodsReceipts.map((gr) => (
                  <button
                    key={gr.id}
                    type="button"
                    onClick={() => setSelected(gr)}
                    className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${
                      selected?.id === gr.id
                        ? 'bg-green-100 font-medium dark:bg-green-900/40'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="truncate">{gr.gr_number}</div>
                    <div className="text-xs text-gray-500">
                      {gr.status} · PO {gr.purchase_order_id.slice(0, 8)}…
                    </div>
                  </button>
                ))}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            {!selected && (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-600">
                Select a receipt or create a draft from a purchase order.
              </div>
            )}
            {selected && poForSelected && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="text-lg font-semibold">{selected.gr_number}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  PO {poForSelected.po_number} · {selected.status}
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-xs uppercase dark:bg-gray-900">
                      <tr>
                        <th className="px-2 py-2">Product</th>
                        <th className="px-2 py-2">Ordered</th>
                        <th className="px-2 py-2">Posted recv</th>
                        <th className="px-2 py-2">This receipt qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((ln) => {
                        const p = productMap.get(ln.product_id);
                        const row = grLines.find((g) => g.purchase_order_line_id === ln.id);
                        const postedRecv = qtyReceived.get(ln.id) ?? 0;
                        const maxThis = Math.max(0, Number(ln.quantity_ordered) - postedRecv);
                        return (
                          <tr key={ln.id} className="border-t border-gray-100 dark:border-gray-700">
                            <td className="px-2 py-2">
                              {p ? `${p.sku} — ${p.name}` : ln.product_id}
                            </td>
                            <td className="px-2 py-2">{ln.quantity_ordered}</td>
                            <td className="px-2 py-2 text-gray-600">{postedRecv}</td>
                            <td className="px-2 py-2">
                              {selected.status === 'draft' ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={maxThis > 0 ? maxThis : undefined}
                                  step="any"
                                  value={row?.quantity_received ?? 0}
                                  onChange={(e) => {
                                    const v = Math.max(0, parseFloat(e.target.value) || 0);
                                    setGrLines((prev) =>
                                      prev.map((g) =>
                                        g.purchase_order_line_id === ln.id
                                          ? { ...g, quantity_received: v }
                                          : g
                                      )
                                    );
                                  }}
                                  className="w-28 rounded border border-gray-200 px-2 py-1 dark:border-gray-600 dark:bg-gray-900"
                                />
                              ) : (
                                (row?.quantity_received ?? 0).toString()
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Posted receive total for this draft row is shown for caps; save before posting.
                </p>
                {selected.status === 'draft' && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void saveLines()}
                      className={premiumTertiaryButton('sm', 'standard')}
                    >
                      Save Quantities
                    </button>
                    <button
                      type="button"
                      onClick={() => void post()}
                      className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
                    >
                      Post Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeDraft()}
                      className={premiumDangerButton('sm', 'standard')}
                    >
                      Delete Draft
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
