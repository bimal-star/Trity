'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useSupplierInvoices } from '@/hooks/useSupplierInvoices';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useProducts } from '@/hooks/useProducts';
import {
  pillarAccent,
  premiumFocusRing,
  premiumInputComfortableBase,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumDangerButton,
  premiumSurfaces,
  premiumTypography,
} from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import { FileText } from 'lucide-react';

const bc = pillarAccent('businessCore');
const inputComfortable = `${premiumInputComfortableBase} ${premiumFocusRing('businessCore')}`;

export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  const { createInvoice } = useSupplierInvoices({ loadInvoices: false });
  const { purchaseOrders } = usePurchaseOrders();
  const { suppliers } = useSuppliers();
  const { products } = useProducts(undefined, 'name', 'asc');

  const [supplierId, setSupplierId] = useState('');
  const [poId, setPoId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState('GBP');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<
    { product_id: string; quantity_invoiced: number; unit_price: number }[]
  >([{ product_id: '', quantity_invoiced: 1, unit_price: 0 }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { toast } = useToast();

  const posForSupplier = useMemo(() => {
    if (!supplierId) return purchaseOrders;
    return purchaseOrders.filter((p) => p.supplier_id === supplierId);
  }, [purchaseOrders, supplierId]);

  const submit = async () => {
    setErr(null);
    if (!supplierId || !invoiceNumber.trim()) {
      setErr('Supplier and invoice number are required.');
      return;
    }
    const clean = rows.filter((r) => r.product_id && r.quantity_invoiced > 0);
    if (!clean.length) {
      setErr('Add at least one line.');
      return;
    }
    setSaving(true);
    const r = await createInvoice({
      supplier_id: supplierId,
      purchase_order_id: poId || null,
      invoice_number: invoiceNumber.trim(),
      invoice_date: invoiceDate,
      currency,
      notes: notes.trim() || null,
      lines: clean.map((l, i) => ({
        line_no: i + 1,
        product_id: l.product_id,
        quantity_invoiced: l.quantity_invoiced,
        unit_price: l.unit_price,
      })),
    });
    setSaving(false);
    if (r.success) {
      toast.success('Invoice created.');
      router.push('/purchase-invoices');
    } else {
      toast.error(r.error ?? 'Failed');
    }
  };

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          backHref="/purchase-invoices"
          backLabel="Back to invoices"
          icon={FileText}
          title="New supplier invoice"
          subtitle="Enter header details and line quantities for matching"
        />

        <div className={`mx-auto max-w-3xl space-y-4 ${premiumSurfaces.card}`}>
          {err && <p className="text-sm text-red-600">{err}</p>}

          <label className="block text-sm">
            <span className="text-gray-600 dark:text-gray-400">Supplier</span>
            <select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setPoId('');
              }}
              className={`mt-1 w-full ${inputComfortable}`}
            >
              <option value="">Select…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.supplier_code} — {s.legal_name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-gray-600 dark:text-gray-400">Purchase order (optional)</span>
            <select
              value={poId}
              onChange={(e) => setPoId(e.target.value)}
              className={`mt-1 w-full ${inputComfortable}`}
            >
              <option value="">None</option>
              {posForSupplier.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.po_number} ({p.status})
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-gray-400">Invoice number</span>
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className={`mt-1 w-full ${inputComfortable}`}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-gray-400">Invoice date</span>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={`mt-1 w-full ${inputComfortable}`}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-gray-600 dark:text-gray-400">Currency</span>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className={`mt-1 w-32 ${inputComfortable}`}
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-600 dark:text-gray-400">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`mt-1 w-full ${inputComfortable}`}
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium">Lines</p>
            <p className="mb-2 text-xs text-gray-500">
              After save, open the invoice to link PO lines and run match.
            </p>
            <div className="space-y-2">
              {rows.map((row, idx) => (
                <div key={idx} className="flex flex-wrap items-end gap-2">
                  <select
                    value={row.product_id}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...next[idx], product_id: e.target.value };
                      setRows(next);
                    }}
                    className={`min-w-[220px] flex-1 ${inputComfortable}`}
                  >
                    <option value="">Product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
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
                    className={`w-24 ${inputComfortable}`}
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={row.unit_price}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = {
                        ...next[idx],
                        unit_price: parseFloat(e.target.value) || 0,
                      };
                      setRows(next);
                    }}
                    className={`w-28 ${inputComfortable}`}
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
            </div>
            <button
              type="button"
              onClick={() =>
                setRows([...rows, { product_id: '', quantity_invoiced: 1, unit_price: 0 }])
              }
              className={`mt-2 ${premiumSecondaryButton('businessCore', 'sm', 'standard')}`}
            >
              + Add Line
            </button>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className={premiumPrimaryButton('businessCore', 'md', 'wide')}
          >
            {saving ? 'Saving…' : 'Create Invoice'}
          </button>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
