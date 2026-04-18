'use client';

import Link from 'next/link';
import { useState } from 'react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import PriceListEditorModal from '@/components/priceLists/PriceListEditorModal';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { usePriceLists, type PriceListUpsertInput } from '@/hooks/usePriceLists';
import {
  pillarAccent,
  premiumDangerButton,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumSurfaces,
  premiumTypography,
} from '@/lib/premiumUi';
import type { PriceList } from '@/types/product';
import { ListOrdered, Loader2 } from 'lucide-react';

const bc = pillarAccent('businessCore');

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return d.slice(0, 10);
}

export default function ProductPriceListsPage() {
  const { lists, isLoading, error, createList, updateList, archiveList } = usePriceLists();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PriceList | null>(null);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (row: PriceList) => {
    setEditing(row);
    setEditorOpen(true);
  };

  const handleSubmit = async (input: PriceListUpsertInput) => {
    if (editing) {
      return updateList(editing.id, input);
    }
    return createList(input).then((r) =>
      r.success ? { success: true } : { success: false, error: r.error }
    );
  };

  const onArchive = async (row: PriceList) => {
    if (
      !window.confirm(
        `Archive price tier “${row.name}”? Product and customer links may still reference its id until updated.`
      )
    ) {
      return;
    }
    const r = await archiveList(row.id);
    if (!r.success) {
      window.alert(r.error ?? 'Archive failed');
    }
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
          backHref="/products"
          backLabel="Back to products"
          icon={ListOrdered}
          title="Customer pricing"
          subtitle="Price tiers for different customers — set per-product prices on each product’s Pricing tab"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
          right={
            <button type="button" onClick={openNew} className={premiumPrimaryButton('businessCore', 'md', 'wide')}>
              New price tier
            </button>
          }
        />

        <div className="mt-5 space-y-5">
          <div className={`${premiumSurfaces.card}`}>
            <p className={`${premiumTypography.body} text-gray-600 dark:text-gray-400`}>
              Price tiers let you set different prices for different customers. Assign a tier to a customer and
              they will automatically get those prices. Set each product&apos;s tier prices from{' '}
              <Link href="/products" className="text-green-700 underline dark:text-green-400">
                Products
              </Link>{' '}
              (Pricing tab).
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          <div className={`${premiumSurfaces.card}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className={premiumTypography.sectionTitle}>Your price tiers</h2>
              {isLoading && (
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span className={premiumTypography.helper}>Loading</span>
                </span>
              )}
            </div>
            {!isLoading && lists.length === 0 ? (
              <p className={`${premiumTypography.helper}`}>
                No price tiers yet. Create one to assign to customers and to attach product prices.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table
                  className={`w-full min-w-[760px] border-collapse text-left ${premiumTypography.tableCell}`}
                >
                  <thead>
                    <tr className={`border-b border-gray-200 dark:border-gray-700 ${premiumTypography.tableHeaderDense}`}>
                      <th className="pb-2 pr-2">Name</th>
                      <th className="pb-2 px-1">Currency</th>
                      <th className="pb-2 px-1">From</th>
                      <th className="pb-2 px-1">To</th>
                      <th className="pb-2 px-1">Flags</th>
                      <th className="pb-2 pl-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lists.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2.5 pr-2 align-middle">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{row.name}</div>
                          {row.description ? (
                            <div className={`mt-0.5 ${premiumTypography.helper}`}>{row.description}</div>
                          ) : null}
                        </td>
                        <td className="px-1 py-2.5 align-middle">{row.currency || '—'}</td>
                        <td className="px-1 py-2.5 align-middle">{fmtDate(row.effective_from)}</td>
                        <td className="px-1 py-2.5 align-middle">{fmtDate(row.effective_to)}</td>
                        <td className="px-1 py-2.5 align-middle">
                          <div className="flex flex-wrap gap-1">
                            {row.is_active === false && (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                Inactive
                              </span>
                            )}
                            {row.is_default && (
                              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] uppercase text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                Default
                              </span>
                            )}
                            {row.tax_inclusive && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                                Inc. tax
                              </span>
                            )}
                            {row.rounding_mode ? (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                {row.rounding_mode}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-2.5 pl-2 text-right align-middle">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className={premiumSecondaryButton('businessCore', 'sm', 'auto')}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void onArchive(row)}
                            className={`${premiumDangerButton('sm', 'auto')} ml-2`}
                          >
                            Archive
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <PriceListEditorModal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          module="businessCore"
          initial={editing}
          onSubmit={handleSubmit}
        />
      </PageContainer>
    </ProtectedRoute>
  );
}
