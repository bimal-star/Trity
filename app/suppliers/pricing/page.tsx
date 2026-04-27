'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useSupplierProductCatalog } from '@/hooks/useSupplierProductCatalog';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useProducts } from '@/hooks/useProducts';
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
import type { Product } from '@/types/product';
import type { SupplierProductPrice } from '@/types/supplierProductPrice';
import { Tags, Trash2, Truck } from 'lucide-react';

const bc = pillarAccent('businessCore');

function productLabel(p: Product): string {
  return `${p.sku} — ${p.name}`;
}

export default function SupplierPricingPage() {
  const { suppliers } = useSuppliers();
  const { products } = useProducts(undefined, 'name', 'asc');
  const [supplierId, setSupplierId] = useState('');
  const { catalog, isLoading, error, upsertPrice, deletePrice } = useSupplierProductCatalog(
    supplierId || null
  );

  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.status === 'active'),
    [suppliers]
  );
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const catalogProductIds = useMemo(() => new Set(catalog.map((c) => c.product_id)), [catalog]);

  const [addProductId, setAddProductId] = useState('');
  const [addUnitPrice, setAddUnitPrice] = useState(0);
  const [addMoq, setAddMoq] = useState(1);
  const [addSku, setAddSku] = useState('');
  const [addUom, setAddUom] = useState('');
  const [addMsg, setAddMsg] = useState<string | null>(null);
  const [rowMsg, setRowMsg] = useState<Record<string, string | null>>({});

  const productsAvailableToAdd = useMemo(
    () => products.filter((p) => !catalogProductIds.has(p.id)),
    [products, catalogProductIds]
  );

  const submitAdd = async () => {
    setAddMsg(null);
    if (!supplierId) {
      setAddMsg('Select a supplier first.');
      return;
    }
    if (!addProductId) {
      setAddMsg('Choose a product.');
      return;
    }
    const r = await upsertPrice({
      supplier_id: supplierId,
      product_id: addProductId,
      unit_price: addUnitPrice,
      min_order_qty: addMoq > 0 ? addMoq : 1,
      supplier_sku: addSku.trim() || null,
      uom: addUom.trim() || null,
    });
    setAddMsg(r.success ? 'Saved.' : (r.error ?? 'Failed'));
    if (r.success) {
      setAddProductId('');
      setAddUnitPrice(0);
      setAddMoq(1);
      setAddSku('');
      setAddUom('');
    }
  };

  const saveRow = async (row: SupplierProductPrice, patch: Partial<SupplierProductPrice>) => {
    setRowMsg((m) => ({ ...m, [row.id]: null }));
    const moq = patch.min_order_qty != null ? Number(patch.min_order_qty) : row.min_order_qty;
    const r = await upsertPrice({
      supplier_id: row.supplier_id,
      product_id: row.product_id,
      unit_price: patch.unit_price != null ? Number(patch.unit_price) : row.unit_price,
      min_order_qty: moq > 0 ? moq : 1,
      supplier_sku: patch.supplier_sku ?? row.supplier_sku,
      uom: patch.uom ?? row.uom,
      notes: patch.notes ?? row.notes,
    });
    setRowMsg((m) => ({
      ...m,
      [row.id]: r.success ? 'Saved' : (r.error ?? 'Failed'),
    }));
  };

  return (
    <ProtectedRoute>
      <PageContainer
        module="businessCore"
        rootClassName={premiumSurfaces.pageRoot}
        innerClassName={premiumSurfaces.pageInnerWide}
      >
        <PremiumStickyHeader
          module="businessCore"
          backHref="/suppliers"
          backLabel="Back to suppliers"
          icon={Truck}
          title="Supplier pricing"
          subtitle="List prices and MOQs per supplier — used to default purchase order lines"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
        />

        <div className="mt-5 space-y-5">
          <div className={`${premiumSurfaces.card}`}>
            <label className={`block ${premiumTypography.label}`}>Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setAddMsg(null);
                setRowMsg({});
              }}
              className={`mt-1 !max-w-md ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
            >
              <option value="">Select supplier…</option>
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.supplier_code} — {s.legal_name}
                </option>
              ))}
            </select>
            <p className={`mt-2 ${premiumTypography.helper}`}>
              PO lines use this catalog when the same supplier is selected on the order.{' '}
              <Link
                href="/purchase-orders/new"
                className="text-green-700 underline dark:text-green-400"
              >
                New purchase order
              </Link>
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          {supplierId && (
            <>
              <div className={`${premiumSurfaces.card}`}>
                <h2 className={`mb-3 ${premiumTypography.sectionTitle}`}>Add product price</h2>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[220px] flex-1">
                    <label className={`block ${premiumTypography.label}`}>Product</label>
                    <select
                      value={addProductId}
                      onChange={(e) => setAddProductId(e.target.value)}
                      className={`mt-1 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                    >
                      <option value="">Select product…</option>
                      {productsAvailableToAdd.map((p) => (
                        <option key={p.id} value={p.id}>
                          {productLabel(p)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className={`block ${premiumTypography.label}`}>Unit price</label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={addUnitPrice}
                      onChange={(e) => setAddUnitPrice(parseFloat(e.target.value) || 0)}
                      className={`mt-1 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                    />
                  </div>
                  <div className="w-24">
                    <label className={`block ${premiumTypography.label}`}>MOQ</label>
                    <input
                      type="number"
                      min={0.0001}
                      step="any"
                      value={addMoq}
                      onChange={(e) => setAddMoq(parseFloat(e.target.value) || 1)}
                      className={`mt-1 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                    />
                  </div>
                  <div className="w-32">
                    <label className={`block ${premiumTypography.label}`}>Supplier SKU</label>
                    <input
                      value={addSku}
                      onChange={(e) => setAddSku(e.target.value)}
                      className={`mt-1 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="w-20">
                    <label className={`block ${premiumTypography.label}`}>UoM</label>
                    <input
                      value={addUom}
                      onChange={(e) => setAddUom(e.target.value)}
                      className={`mt-1 ${premiumInputComfortableBase} focus:outline-none focus:ring-2 focus:ring-green-500`}
                      placeholder="ea"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void submitAdd()}
                    className={premiumPrimaryButton('businessCore', 'md', 'wide')}
                  >
                    Save Row
                  </button>
                </div>
                {addMsg && (
                  <p
                    className={`mt-2 text-sm ${addMsg === 'Saved.' ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}
                  >
                    {addMsg}
                  </p>
                )}
              </div>

              <div className={`${premiumSurfaces.card}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className={premiumTypography.sectionTitle}>Catalog for this supplier</h2>
                  {isLoading && <span className={`${premiumTypography.helper}`}>Loading…</span>}
                </div>
                {catalog.length === 0 && !isLoading ? (
                  <p className={`${premiumTypography.helper}`}>
                    No prices yet. Add a product above — purchase orders will fall back to product
                    cost/sell until a row exists.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table
                      className={`w-full min-w-[720px] border-collapse text-left ${premiumTypography.tableCell}`}
                    >
                      <thead>
                        <tr
                          className={`border-b border-gray-200 dark:border-gray-700 ${premiumTypography.tableHeaderDense}`}
                        >
                          <th className="pb-2 pr-2">Product</th>
                          <th className="pb-2 px-1">Unit price</th>
                          <th className="pb-2 px-1">MOQ</th>
                          <th className="pb-2 px-1">Supplier SKU</th>
                          <th className="pb-2 px-1">UoM</th>
                          <th className="pb-2 pl-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalog.map((row) => (
                          <CatalogRowEditor
                            key={`${row.id}-${row.updated_at}`}
                            row={row}
                            productLabel={
                              productMap.get(row.product_id)
                                ? productLabel(productMap.get(row.product_id)!)
                                : row.product_id
                            }
                            onSave={(patch) => void saveRow(row, patch)}
                            onDelete={async () => {
                              const r = await deletePrice(row.id);
                              setRowMsg((m) => ({
                                ...m,
                                [row.id]: r.success ? null : (r.error ?? 'Delete failed'),
                              }));
                            }}
                            message={rowMsg[row.id] ?? null}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {!supplierId && (
            <div
              className={`flex items-start gap-2 rounded-lg border border-dashed border-gray-300 p-6 dark:border-gray-600`}
            >
              <Tags className="mt-0.5 h-5 w-5 text-gray-400" aria-hidden />
              <p className={`${premiumTypography.body} text-gray-600 dark:text-gray-400`}>
                Choose a supplier to view and edit negotiated list prices. Each product can have one
                price row per supplier.
              </p>
            </div>
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}

function CatalogRowEditor({
  row,
  productLabel,
  onSave,
  onDelete,
  message,
}: {
  row: SupplierProductPrice;
  productLabel: string;
  onSave: (patch: Partial<SupplierProductPrice>) => void;
  onDelete: () => void;
  message: string | null;
}) {
  const [unitPrice, setUnitPrice] = useState(Number(row.unit_price));
  const [moq, setMoq] = useState(Number(row.min_order_qty));
  const [sku, setSku] = useState(row.supplier_sku ?? '');
  const [uom, setUom] = useState(row.uom ?? '');

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="py-2 pr-2 align-middle text-sm">{productLabel}</td>
      <td className="px-1 py-2 align-middle">
        <input
          type="number"
          min={0}
          step="any"
          value={unitPrice}
          onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
          className={`w-24 ${premiumInputCompact}`}
        />
      </td>
      <td className="px-1 py-2 align-middle">
        <input
          type="number"
          min={0.0001}
          step="any"
          value={moq}
          onChange={(e) => setMoq(parseFloat(e.target.value) || 1)}
          className={`w-20 ${premiumInputCompact}`}
        />
      </td>
      <td className="px-1 py-2 align-middle">
        <input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className={`w-28 ${premiumInputCompact}`}
        />
      </td>
      <td className="px-1 py-2 align-middle">
        <input
          value={uom}
          onChange={(e) => setUom(e.target.value)}
          className={`w-16 ${premiumInputCompact}`}
        />
      </td>
      <td className="py-2 pl-2 align-middle text-right">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {message && <span className="text-xs text-gray-500 dark:text-gray-400">{message}</span>}
          <button
            type="button"
            onClick={() =>
              onSave({
                unit_price: unitPrice,
                min_order_qty: moq,
                supplier_sku: sku.trim() || null,
                uom: uom.trim() || null,
              })
            }
            className={premiumSecondaryButton('businessCore', 'sm', 'standard')}
          >
            Save Row
          </button>
          <button
            type="button"
            onClick={() => void onDelete()}
            className={premiumDangerButton('sm', 'standard')}
          >
            <Trash2 className="h-3 w-3" aria-hidden />
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}
