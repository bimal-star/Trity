'use client';

import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import PageContainer from '@/components/PageContainer';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useCatalogueMode } from '@/hooks/useCatalogueMode';
import { useProductGroups, type ProductGroupRow } from '@/hooks/useProductGroups';
import { buildProductInsertPayload } from '@/hooks/useProducts';
import { supabase } from '@/lib/supabaseClient';
import {
  cartesianCombinations,
  parseAttributeDimensions,
  skuFromPrefix,
  variantAttributesKey,
} from '@/lib/productCatalogue';
import { pillarAccent, premiumPrimaryButton, premiumSecondaryButton, premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import type { Json } from '@/types/database';
import { Loader2, Package2 } from 'lucide-react';

const bc = pillarAccent('businessCore');

function asAttrRecord(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const o = v as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(o)) {
    if (typeof val === 'string' && val.trim()) out[k] = val.trim();
  }
  return out;
}

export default function ProductGroupDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : null;
  const { effectiveTenantId: tenantId, user } = useTenant();
  const { supportsGroups, isMatrix } = useCatalogueMode();
  const {
    fetchGroupProducts,
    updateGroup,
    archiveGroup,
    addProductToGroup,
    removeFromGroup,
  } = useProductGroups();

  const [group, setGroup] = useState<ProductGroupRow | null>(null);
  const [members, setMembers] = useState<Record<string, unknown>[]>([]);
  const [ungrouped, setUngrouped] = useState<{ id: string; sku: string; name: string }[]>([]);
  const [pickProduct, setPickProduct] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [attrDimensionsJson, setAttrDimensionsJson] = useState('{}');
  const [saving, setSaving] = useState(false);

  const [genOpen, setGenOpen] = useState(false);
  const [skuPrefix, setSkuPrefix] = useState('');
  const [previewRows, setPreviewRows] = useState<{ sku: string; name: string; attrs: Record<string, string> }[]>(
    []
  );
  const [genStep, setGenStep] = useState<'edit' | 'preview'>('edit');
  const [genBusy, setGenBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!id || !tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: g, error: gErr } = await supabase
        .from('product_groups')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .maybeSingle();
      if (gErr) throw gErr;
      if (!g) {
        setGroup(null);
        return;
      }
      const gr = g as ProductGroupRow;
      setGroup(gr);
      setName(gr.name);
      setDescription(gr.description ?? '');
      setAttrDimensionsJson(
        gr.attribute_dimensions != null ? JSON.stringify(gr.attribute_dimensions, null, 2) : '{}'
      );

      const prows = await fetchGroupProducts(id);
      setMembers(prows);

      const { data: loose, error: uErr } = await supabase
        .from('vw_products_full')
        .select('id, sku, name')
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .is('product_group_id', null)
        .order('name')
        .limit(500);
      if (uErr) throw uErr;
      setUngrouped((loose as { id: string; sku: string; name: string }[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [id, tenantId, fetchGroupProducts]);

  useEffect(() => {
    if (!supportsGroups) return;
    void reload();
  }, [supportsGroups, reload]);

  const handleSaveGroup = async () => {
    if (!id || !tenantId) return;
    setSaving(true);
    try {
      let parsed: Json | null = null;
      const trimmed = attrDimensionsJson.trim();
      if (trimmed) {
        const p = JSON.parse(trimmed) as unknown;
        parsed = p as Json;
      }
      await updateGroup(id, {
        name: name.trim() || undefined,
        description: description.trim() || null,
        attribute_dimensions: parsed,
      });
      await reload();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    if (!confirm('Archive this group? Products stay in the catalogue but are unlinked from the group.')) return;
    const memberIds = members.map((m) => String((m as { id: string }).id));
    try {
      for (const pid of memberIds) {
        await removeFromGroup(pid);
      }
      await archiveGroup(id);
      window.location.href = '/products/groups';
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Archive failed');
    }
  };

  const buildPreview = () => {
    if (!group) return;
    const prefix = skuPrefix.trim();
    if (!prefix) {
      alert('Enter a SKU prefix for generated variants.');
      return;
    }
    let dimSource: unknown = group.attribute_dimensions;
    try {
      const t = attrDimensionsJson.trim();
      if (t) dimSource = JSON.parse(t) as unknown;
    } catch {
      alert('Attribute dimensions must be valid JSON before previewing.');
      return;
    }
    const dims = parseAttributeDimensions(dimSource);
    if (dims.length === 0) {
      alert('Define attribute dimensions on the group (JSON) with dimension lists first.');
      return;
    }
    const combos = cartesianCombinations(dims);
    const order = dims.map((d) => d.key);
    const existing = new Set(
      members.map((m) => variantAttributesKey(asAttrRecord((m as { variant_attributes?: unknown }).variant_attributes)))
    );
    const rows: { sku: string; name: string; attrs: Record<string, string> }[] = [];
    for (const combo of combos) {
      if (existing.has(variantAttributesKey(combo))) continue;
      rows.push({
        sku: skuFromPrefix(prefix, combo, order),
        name: `${group.name} ${order.map((k) => combo[k]).join(' / ')}`,
        attrs: combo,
      });
    }
    setPreviewRows(rows);
    setGenStep('preview');
  };

  const confirmGenerate = async () => {
    if (!tenantId || !user || !id || !group || previewRows.length === 0) return;
    setGenBusy(true);
    try {
      const categoryId = group.category_id ?? null;
      for (const row of previewRows) {
        const payload = buildProductInsertPayload(
          {
            sku: row.sku,
            name: row.name,
            industry_type: 'manufacturing',
            product_type: 'finished_good',
            status: 'active',
            product_group_id: id,
            variant_attributes: row.attrs,
          },
          tenantId,
          user.id,
          categoryId
        );
        const { error: insErr } = await supabase.from('products').insert(payload);
        if (insErr) throw insErr;
      }
      setGenOpen(false);
      setGenStep('edit');
      setPreviewRows([]);
      setSkuPrefix('');
      await reload();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setGenBusy(false);
    }
  };

  if (!supportsGroups) {
    notFound();
  }

  if (!id) {
    notFound();
  }

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          backHref="/products/groups"
          backLabel="Back to groups"
          icon={Package2}
          title={group?.name ?? 'Product group'}
          subtitle="Edit group metadata, members, and matrix variants"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
          right={
            isMatrix ? (
              <button
                type="button"
                onClick={() => {
                  setGenOpen(true);
                  setGenStep('edit');
                  setPreviewRows([]);
                }}
                className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
              >
                Generate variants
              </button>
            ) : null
          }
        />
        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        {loading && (
          <div className="flex items-center gap-2 text-gray-500 py-8">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading…
          </div>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!loading && !group && !error && <p className="text-gray-500">Group not found.</p>}

        {group && !loading && (
          <div className="space-y-6 max-w-3xl">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <h2 className={`font-semibold text-gray-900 dark:text-white ${premiumTypography.body}`}>
                Details
              </h2>
              <div>
                <label className={`block text-sm text-gray-600 dark:text-gray-400 mb-1`}>Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                />
              </div>
              <div>
                <label className={`block text-sm text-gray-600 dark:text-gray-400 mb-1`}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                />
              </div>
              {supportsGroups && (
                <div>
                  <label className={`block text-sm text-gray-600 dark:text-gray-400 mb-1`}>
                    Attribute dimensions (JSON){' '}
                    {isMatrix ? <span className="text-amber-600 dark:text-amber-400">(matrix)</span> : null}
                  </label>
                  <p className={`text-xs text-gray-500 mb-1 ${premiumTypography.helper}`}>
                    Optional for grouped mode; required for matrix variant generation. Example:{' '}
                    {'{"dimensions":["size","colour"],"size":["S","M"],"colour":["Red","Blue"]}'}
                  </p>
                  <textarea
                    value={attrDimensionsJson}
                    onChange={(e) => setAttrDimensionsJson(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 text-sm font-mono border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveGroup()}
                  className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleArchive()}
                  className={premiumSecondaryButton('businessCore', 'sm', 'standard')}
                >
                  Archive group
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <h2 className={`font-semibold text-gray-900 dark:text-white ${premiumTypography.body}`}>
                Members
              </h2>
              <div className="flex flex-wrap gap-2 items-end">
                <select
                  value={pickProduct}
                  onChange={(e) => setPickProduct(e.target.value)}
                  className="flex-1 min-w-[12rem] px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                >
                  <option value="">Add existing product…</option>
                  {ungrouped.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!pickProduct}
                  onClick={async () => {
                    if (!pickProduct) return;
                    try {
                      await addProductToGroup(pickProduct, id);
                      setPickProduct('');
                      await reload();
                    } catch (e: unknown) {
                      alert(e instanceof Error ? e.message : 'Failed');
                    }
                  }}
                  className={premiumSecondaryButton('businessCore', 'sm', 'standard')}
                >
                  Add to group
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-2">SKU</th>
                      <th className="text-left py-2 px-2">Name</th>
                      <th className="text-right py-2 px-2">Stock</th>
                      <th className="text-left py-2 px-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const row = m as { id: string; sku: string; name: string; total_stock?: number };
                      return (
                        <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 px-2">
                            <Link
                              href="/products"
                              className="text-green-700 dark:text-green-400 hover:underline"
                            >
                              {row.sku}
                            </Link>
                          </td>
                          <td className="py-2 px-2">{row.name}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{row.total_stock ?? 0}</td>
                          <td className="py-2 px-2 text-right">
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:underline"
                              onClick={async () => {
                                if (!confirm('Remove this product from the group?')) return;
                                try {
                                  await removeFromGroup(row.id);
                                  await reload();
                                } catch (e: unknown) {
                                  alert(e instanceof Error ? e.message : 'Failed');
                                }
                              }}
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
            </div>
          </div>
        )}

        {genOpen && group && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gen-variants-title"
          >
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white dark:bg-gray-800 p-4 shadow-xl border border-gray-200 dark:border-gray-700">
              <h2 id="gen-variants-title" className="font-semibold text-gray-900 dark:text-white mb-3">
                Generate variant products
              </h2>
              {genStep === 'edit' && (
                <>
                  <p className={`text-sm text-gray-600 dark:text-gray-400 mb-3 ${premiumTypography.helper}`}>
                    Enter a SKU prefix. SKUs will be built as PREFIX-DIMENSION-VALUE segments for each
                    combination that does not already exist in this group.
                  </p>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">SKU prefix</label>
                  <input
                    value={skuPrefix}
                    onChange={(e) => setSkuPrefix(e.target.value)}
                    placeholder="e.g. TSH"
                    className="w-full px-3 py-2 text-sm border rounded-lg mb-4 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setGenOpen(false)}
                      className={premiumSecondaryButton('businessCore', 'sm', 'standard')}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={buildPreview}
                      className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
                    >
                      Preview
                    </button>
                  </div>
                </>
              )}
              {genStep === 'preview' && (
                <>
                  <p className={`text-sm text-gray-600 dark:text-gray-400 mb-2 ${premiumTypography.helper}`}>
                    {previewRows.length} new product(s) will be created:
                  </p>
                  <ul className="max-h-48 overflow-y-auto text-sm border border-gray-200 dark:border-gray-600 rounded-md divide-y divide-gray-100 dark:divide-gray-700 mb-4">
                    {previewRows.map((r) => (
                      <li key={r.sku} className="px-2 py-1.5">
                        <span className="font-mono text-xs text-gray-800 dark:text-gray-200">{r.sku}</span>
                        <span className="text-gray-500"> — {r.name}</span>
                      </li>
                    ))}
                  </ul>
                  {previewRows.length === 0 && (
                    <p className="text-amber-700 dark:text-amber-400 text-sm mb-4">
                      No new combinations to create (all already exist or dimensions are empty).
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setGenStep('edit')}
                      className={premiumSecondaryButton('businessCore', 'sm', 'standard')}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={previewRows.length === 0 || genBusy}
                      onClick={() => void confirmGenerate()}
                      className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
                    >
                      {genBusy ? 'Creating…' : 'Confirm create'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
