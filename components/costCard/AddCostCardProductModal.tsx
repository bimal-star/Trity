'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import { formInputClass as inputClass, formLabelClass as labelClass } from '@/lib/formTokens';
import { premiumPrimaryButton, premiumSecondaryButton, pillarAccent } from '@/lib/premiumUi';
import CostCardModalShell from '@/components/costCard/CostCardModalShell';
import type { CostCardProductEntryFormData } from '@/types/costCard';

const MODULE = 'businessCore' as const;
const bc = pillarAccent(MODULE);

interface ProductOption {
  id: string;
  sku: string | null;
  name: string | null;
}

interface CustomerOption {
  id: string;
  legal_name: string | null;
  trading_name: string | null;
}

interface AddCostCardProductModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CostCardProductEntryFormData) => Promise<{ success: boolean; error?: string }>;
}

export default function AddCostCardProductModal({
  open,
  onClose,
  onSave,
}: AddCostCardProductModalProps) {
  const { effectiveTenantId } = useTenant();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [draft, setDraft] = useState<CostCardProductEntryFormData>({
    product_id: '',
    customer_id: '',
    base_currency: 'GBP',
    target_margin_pct: '',
    selling_price_resolved: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !effectiveTenantId) return;
    setDraft({
      product_id: '',
      customer_id: '',
      base_currency: 'GBP',
      target_margin_pct: '',
      selling_price_resolved: '',
    });
    setError(null);
    void (async () => {
      setLoadingOptions(true);
      try {
        const [pRes, cRes] = await Promise.all([
          tenantedSupabase
            .from('products')
            .select('id, sku, name')
            .eq('tenant_id', effectiveTenantId)
            .eq('is_deleted', false)
            .order('name')
            .limit(500),
          tenantedSupabase
            .from('customers')
            .select('id, legal_name, trading_name')
            .eq('tenant_id', effectiveTenantId)
            .is('deleted_at', null)
            .order('legal_name')
            .limit(500),
        ]);
        if (pRes.error) throw pRes.error;
        if (cRes.error) throw cRes.error;
        setProducts((pRes.data ?? []) as ProductOption[]);
        setCustomers((cRes.data ?? []) as CustomerOption[]);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load options');
      } finally {
        setLoadingOptions(false);
      }
    })();
  }, [open, effectiveTenantId]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.product_id) {
      setError('Select a product.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onSave(draft);
    setSaving(false);
    if (result.success) onClose();
    else setError(result.error ?? 'Failed to add product');
  };

  return (
    <CostCardModalShell title="Add product" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}
        {loadingOptions ? (
          <div className="flex justify-center py-6">
            <Loader2 className={`h-6 w-6 animate-spin ${bc.iconColor}`} />
          </div>
        ) : (
          <>
            <div>
              <label className={labelClass}>Product</label>
              <select
                className={inputClass}
                value={draft.product_id}
                onChange={(e) => setDraft((d) => ({ ...d, product_id: e.target.value }))}
                required
              >
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {[p.sku, p.name].filter(Boolean).join(' — ') || p.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Customer (optional)</label>
              <select
                className={inputClass}
                value={draft.customer_id}
                onChange={(e) => setDraft((d) => ({ ...d, customer_id: e.target.value }))}
              >
                <option value="">All customers / none</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.trading_name || c.legal_name || c.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Base currency</label>
                <input
                  className={inputClass}
                  maxLength={3}
                  value={draft.base_currency}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, base_currency: e.target.value.toUpperCase() }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Target margin %</label>
                <input
                  type="number"
                  step="0.1"
                  className={inputClass}
                  value={draft.target_margin_pct}
                  onChange={(e) => setDraft((d) => ({ ...d, target_margin_pct: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Selling price (resolved)</label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={draft.selling_price_resolved}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, selling_price_resolved: e.target.value }))
                }
              />
            </div>
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={premiumSecondaryButton(MODULE, 'sm')} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={premiumPrimaryButton(MODULE, 'sm')}
            disabled={saving || loadingOptions}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
          </button>
        </div>
      </form>
    </CostCardModalShell>
  );
}
