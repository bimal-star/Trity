'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import PageContainer from '@/components/PageContainer';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { loadCategoryStructure, type CategoryTier, type CategoryNode } from '@/lib/categories';
import { supabase } from '@/lib/supabaseClient';
import {
  pillarAccent,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumSurfaces,
  premiumTypography,
} from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import { Check, Loader2, MoreVertical, Package2, Pencil, Trash2, X } from 'lucide-react';

const bc = pillarAccent('businessCore');

type DeleteModalState =
  | { kind: 'safe'; node: CategoryNode }
  | { kind: 'blocked'; node: CategoryNode; productCount: number; childCount: number };

type UsageResponse = {
  canDelete?: boolean;
  usage?: { productCount: number; childCount: number };
  error?: string;
  success?: boolean;
};

export default function CategoryManagementPage() {
  const { effectiveTenantId: tenant_id } = useTenant();
  const { toast } = useToast();

  const [tiers, setTiers] = useState<CategoryTier[]>([]);
  const [nodesByTier, setNodesByTier] = useState<Record<number, CategoryNode[]>>({});
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<{ id: string; name: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [checkingDelete, setCheckingDelete] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null);
  const [confirming, setConfirming] = useState(false);

  const editInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!tenant_id) return;
    setLoading(true);
    setPageError(null);
    try {
      const structure = await loadCategoryStructure(tenant_id);
      setTiers(structure.tiers);
      setNodesByTier(structure.nodesByTier);
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [tenant_id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openMenu]);

  // Focus edit input when an edit session opens or changes node
  useEffect(() => {
    if (editingNode) editInputRef.current?.focus();
  }, [editingNode]);

  const getBearerToken = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const authHeaders = async (): Promise<HeadersInit> => {
    const token = await getBearerToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ── Delete flow ────────────────────────────────────────────────────────────

  const handleDeleteClick = async (node: CategoryNode) => {
    setOpenMenu(null);
    setCheckingDelete(node.id);
    try {
      const res = await fetch(`/api/categories/${node.id}?check=1`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      const json = (await res.json()) as UsageResponse;

      if (json.canDelete === false && json.usage) {
        setDeleteModal({
          kind: 'blocked',
          node,
          productCount: json.usage.productCount,
          childCount: json.usage.childCount,
        });
      } else if (res.ok || json.canDelete === true) {
        setDeleteModal({ kind: 'safe', node });
      } else {
        toast.error(json.error ?? 'Failed to check category usage');
      }
    } catch {
      toast.error('Failed to check category usage');
    } finally {
      setCheckingDelete(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal || deleteModal.kind !== 'safe') return;
    const { node } = deleteModal;
    setConfirming(true);
    try {
      const res = await fetch(`/api/categories/${node.id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      const json = (await res.json()) as UsageResponse;
      if (json.success) {
        toast.success(`"${node.name}" deleted.`);
        setDeleteModal(null);
        await load();
      } else if (json.canDelete === false && json.usage) {
        // Usage appeared between check and confirm — show blocked
        setDeleteModal({
          kind: 'blocked',
          node,
          productCount: json.usage.productCount,
          childCount: json.usage.childCount,
        });
      } else {
        toast.error(json.error ?? 'Failed to delete category');
        setDeleteModal(null);
      }
    } catch {
      toast.error('Failed to delete category');
      setDeleteModal(null);
    } finally {
      setConfirming(false);
    }
  };

  // ── Edit flow ──────────────────────────────────────────────────────────────

  const handleEditSave = async () => {
    if (!editingNode || !editingNode.name.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/categories/${editingNode.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeaders()),
        },
        body: JSON.stringify({ name: editingNode.name.trim() }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.success) {
        toast.success('Category renamed.');
        setEditingNode(null);
        await load();
      } else {
        toast.error(json.error ?? 'Failed to rename category');
      }
    } catch {
      toast.error('Failed to rename category');
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Modals ─────────────────────────────────────────────────────────────────

  const deleteModalEl = deleteModal ? (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !confirming) setDeleteModal(null);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cat-del-title"
        aria-describedby="cat-del-desc"
        className={`${premiumSurfaces.cardElevated} max-w-md w-full`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {deleteModal.kind === 'safe' ? (
          <>
            <h2
              id="cat-del-title"
              className="text-base font-semibold text-gray-900 dark:text-white"
            >
              Delete Category
            </h2>
            <p id="cat-del-desc" className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">&ldquo;{deleteModal.node.name}&rdquo;</span> is not used
              by any products. You can safely delete it.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className={premiumSecondaryButton('businessCore', 'sm', 'auto')}
                onClick={() => setDeleteModal(null)}
                disabled={confirming}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-60 transition-colors"
                onClick={() => void handleConfirmDelete()}
                disabled={confirming}
              >
                {confirming ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                )}
                Delete
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              id="cat-del-title"
              className="text-base font-semibold text-gray-900 dark:text-white"
            >
              Cannot Delete Category
            </h2>
            <p id="cat-del-desc" className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">&ldquo;{deleteModal.node.name}&rdquo;</span> cannot be
              deleted because it is currently in use.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              {deleteModal.productCount > 0 && (
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" aria-hidden />
                  {deleteModal.productCount}{' '}
                  {deleteModal.productCount === 1 ? 'product' : 'products'}
                </li>
              )}
              {deleteModal.childCount > 0 && (
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" aria-hidden />
                  {deleteModal.childCount} child{' '}
                  {deleteModal.childCount === 1 ? 'category' : 'categories'}
                </li>
              )}
            </ul>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className={premiumPrimaryButton('businessCore', 'sm', 'standard')}
                onClick={() => setDeleteModal(null)}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      {deleteModalEl}
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          backHref="/products"
          backLabel="Back to products"
          icon={Package2}
          title="Category Management"
          subtitle="View and manage category tiers and nodes for this workspace"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
        />
        {pageError && (
          <div
            className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-400"
            role="alert"
          >
            <span>{pageError}</span>
            <button
              type="button"
              onClick={() => setPageError(null)}
              className="shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-gray-500 py-8 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading categories…
          </div>
        )}

        {!loading && !pageError && tiers.length === 0 && (
          <p className={`${premiumTypography.helper} py-6`}>
            No category tiers configured for this workspace.
          </p>
        )}

        {!loading && tiers.length > 0 && (
          <div className="space-y-5">
            {tiers.map((tier) => {
              const nodes = nodesByTier[tier.tier_number] ?? [];
              return (
                <div key={tier.id} className={premiumSurfaces.card}>
                  {/* Tier header */}
                  <div className="mb-3">
                    <h2 className={premiumTypography.sectionTitle}>
                      Tier {tier.tier_number} &mdash; {tier.name}
                    </h2>
                    <p className={`mt-0.5 ${premiumTypography.helper}`}>
                      {tier.is_multi_select ? 'Multi-select' : 'Single-select'}
                      {tier.is_required ? ' · Required' : ''}
                    </p>
                  </div>

                  {nodes.length === 0 ? (
                    <p className={`${premiumTypography.helper} italic`}>No nodes in this tier.</p>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/60 -mx-1">
                      {nodes.map((node) => {
                        const isEditing = editingNode?.id === node.id;
                        const isChecking = checkingDelete === node.id;

                        return (
                          <div key={node.id} className="flex items-center gap-2 px-1 py-2">
                            {isEditing ? (
                              /* ── Inline edit ── */
                              <div className="flex flex-1 min-w-0 items-center gap-1.5">
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  value={editingNode.name}
                                  maxLength={200}
                                  disabled={savingEdit}
                                  onChange={(e) =>
                                    setEditingNode({ ...editingNode, name: e.target.value })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') void handleEditSave();
                                    if (e.key === 'Escape') setEditingNode(null);
                                  }}
                                  className="flex-1 min-w-0 rounded-md border border-green-400 px-2 py-1 text-sm dark:border-green-600 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                />
                                <button
                                  type="button"
                                  onClick={() => void handleEditSave()}
                                  disabled={savingEdit}
                                  aria-label="Save rename"
                                  className="p-1 rounded text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                                >
                                  {savingEdit ? (
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                  ) : (
                                    <Check className="h-4 w-4" aria-hidden />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingNode(null)}
                                  disabled={savingEdit}
                                  aria-label="Cancel rename"
                                  className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                  <X className="h-4 w-4" aria-hidden />
                                </button>
                              </div>
                            ) : (
                              /* ── Node row ── */
                              <>
                                <span className="flex-1 min-w-0 truncate text-sm text-gray-800 dark:text-gray-200">
                                  {node.name}
                                  {!node.is_active && (
                                    <span className="ml-2 text-xs text-gray-400">(inactive)</span>
                                  )}
                                </span>

                                {/* ⋮ actions menu */}
                                <div
                                  className="relative shrink-0"
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    aria-label="Node actions"
                                    aria-haspopup="menu"
                                    aria-expanded={openMenu === node.id}
                                    disabled={isChecking}
                                    onClick={() =>
                                      setOpenMenu(openMenu === node.id ? null : node.id)
                                    }
                                    className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700/60 disabled:opacity-50 transition-colors"
                                  >
                                    {isChecking ? (
                                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                    ) : (
                                      <MoreVertical className="h-4 w-4" aria-hidden />
                                    )}
                                  </button>

                                  {openMenu === node.id && (
                                    <div
                                      role="menu"
                                      className="absolute right-0 top-full mt-1 z-30 min-w-[130px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                                    >
                                      <button
                                        role="menuitem"
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        onClick={() => {
                                          setOpenMenu(null);
                                          setEditingNode({ id: node.id, name: node.name });
                                        }}
                                      >
                                        <Pencil className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                                        Edit
                                      </button>
                                      <button
                                        role="menuitem"
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors"
                                        onClick={() => void handleDeleteClick(node)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
