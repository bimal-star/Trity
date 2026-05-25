'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, Loader2, MoreVertical, Plus, Trash2, Truck } from 'lucide-react';
import SupplierKeyDetailsModal, {
  supplierToKeyDraft,
  type SupplierKeyDetailsDraft,
} from '@/components/suppliers/SupplierKeyDetailsModal';
import { logSupplierCreated } from '@/lib/auditLog';
import { emptySupplierFormData, formDataToSupplierPreview } from '@/lib/supplierPreview';
import PageContainer from '@/components/PageContainer';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import { ArchiveRestoreActions } from '@/components/common/ArchiveRestoreActions';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import SupplierDetailsTabs from '@/components/suppliers/SupplierDetailsTabs';
import SupplierLogoPanel from '@/components/suppliers/SupplierLogoPanel';
import SupplierRecordSummaryCard from '@/components/suppliers/SupplierRecordSummaryCard';
import { useTenant } from '@/contexts/TenantContext';
import { useSupplier } from '@/hooks/useSupplier';
import { useSupplierRecordNav } from '@/hooks/useSupplierRecordNav';
import { useSuppliers } from '@/hooks/useSuppliers';
import { logSupplierArchived, logSupplierRestored } from '@/lib/auditLog';
import { downloadTableCsv } from '@/lib/csvDownload';
import { resolveSupplierFormData, supplierToFormData } from '@/lib/supplierForm';
import { pillarAccent, premiumTypography } from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import type { Supplier, SupplierFormData, SupplierStatus } from '@/types/supplier';

const bc = pillarAccent('businessCore');

type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName: string;
  onConfirm: () => void | Promise<void>;
};

function formatShortDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const rawId = params?.id;
  const supplierId =
    typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
  const isCreateMode = supplierId === 'new';

  const { effectiveTenantId: tenant_id, user } = useTenant();
  const { supplier, isLoading, error, refreshSupplier } = useSupplier(
    isCreateMode ? undefined : supplierId
  );
  const { createSupplier, updateSupplier, archiveSupplier, restoreSupplier } = useSuppliers(
    undefined,
    {
      loadSuppliers: false,
    }
  );
  const recordNav = useSupplierRecordNav(
    tenant_id ?? undefined,
    isCreateMode ? undefined : supplierId
  );

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [liveForm, setLiveForm] = useState<SupplierFormData | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCreateMode) {
      setLiveForm(emptySupplierFormData);
    } else {
      setLiveForm(null);
    }
  }, [supplierId, isCreateMode]);

  useEffect(() => {
    if (!supplier || isCreateMode) return;
    setLiveForm(supplierToFormData(supplier));
  }, [supplierId, supplier?.updated_at, supplier, isCreateMode]);

  useEffect(() => {
    if (!overflowOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [overflowOpen]);

  const formData = useMemo(
    () =>
      isCreateMode
        ? (liveForm ?? emptySupplierFormData)
        : resolveSupplierFormData(supplier, liveForm),
    [isCreateMode, supplier, liveForm]
  );

  const previewSupplier = useMemo(
    () => formDataToSupplierPreview(formData, tenant_id ?? ''),
    [formData, tenant_id]
  );

  const handleSupplierUpdated = useCallback(async () => {
    await refreshSupplier();
  }, [refreshSupplier]);

  const exportSupplierCsv = useCallback(() => {
    if (!supplier) return;
    setOverflowOpen(false);
    downloadTableCsv(
      `supplier_${supplier.supplier_code || supplier.id}`,
      [
        'legal_name',
        'trading_name',
        'email',
        'phone',
        'supplier_type',
        'status',
        'address_line1',
        'city',
        'country',
        'payment_terms',
        'currency',
      ],
      [
        [
          supplier.legal_name,
          supplier.trading_name ?? '',
          supplier.email ?? '',
          supplier.phone ?? '',
          supplier.supplier_type ?? '',
          supplier.status,
          supplier.address_line1 ?? '',
          supplier.city ?? '',
          supplier.country ?? '',
          supplier.payment_terms ?? '',
          supplier.currency ?? '',
        ],
      ]
    );
  }, [supplier]);

  const handleStatusChange = useCallback(
    async (status: SupplierStatus) => {
      if (isCreateMode) {
        setLiveForm((prev) => ({ ...(prev ?? emptySupplierFormData), status }));
        return;
      }
      if (!supplier) return;
      setStatusUpdating(true);
      const r = await updateSupplier(supplier.id, { status });
      if (r.success) {
        setLiveForm((prev) => ({ ...(prev ?? supplierToFormData(supplier)), status }));
        await refreshSupplier();
      } else {
        toast.error(r.error ?? 'Status update failed');
      }
      setStatusUpdating(false);
    },
    [isCreateMode, supplier, updateSupplier, refreshSupplier, toast]
  );

  const handleLogoChange = useCallback(
    async (url: string | null) => {
      if (isCreateMode) {
        setLiveForm((prev) => ({ ...(prev ?? emptySupplierFormData), logo_url: url }));
        return;
      }
      if (!supplier) return;
      setLogoUploading(true);
      const r = await updateSupplier(supplier.id, { logo_url: url });
      if (r.success) {
        setLiveForm((prev) => ({ ...(prev ?? supplierToFormData(supplier)), logo_url: url }));
        await refreshSupplier();
      } else {
        toast.error(r.error ?? 'Logo update failed');
      }
      setLogoUploading(false);
    },
    [isCreateMode, supplier, updateSupplier, refreshSupplier, toast]
  );

  const handleKeyDetailsSave = useCallback(
    async (draft: SupplierKeyDetailsDraft) => {
      if (isCreateMode) {
        setLiveForm((prev) => ({
          ...(prev ?? emptySupplierFormData),
          ...draft,
        }));
        return;
      }
      if (!supplier) return;
      const r = await updateSupplier(supplier.id, draft);
      if (!r.success) {
        throw new Error(r.error ?? 'Failed to update supplier');
      }
      setLiveForm((prev) => ({ ...(prev ?? supplierToFormData(supplier)), ...draft }));
      await refreshSupplier();
      toast.success('Supplier details updated.');
    },
    [isCreateMode, supplier, updateSupplier, refreshSupplier, toast]
  );

  const handleCreateSupplier = useCallback(async () => {
    if (!formData.legal_name.trim()) {
      toast.error('Open Edit and enter a legal name before creating.');
      setDetailsModalOpen(true);
      return;
    }
    setCreating(true);
    try {
      const result = await createSupplier(formData);
      if (!result.success || !result.id) {
        toast.error(result.error ?? 'Failed to create supplier');
        return;
      }
      if (tenant_id) {
        await logSupplierCreated(tenant_id, result.id, formData.legal_name, user?.id ?? null);
      }
      toast.success('Supplier created.');
      router.replace(`/suppliers/${result.id}`);
    } finally {
      setCreating(false);
    }
  }, [formData, createSupplier, tenant_id, user?.id, router, toast]);

  const handleArchive = (s: Supplier) => {
    setOverflowOpen(false);
    setConfirmDialog({
      title: `Archive “${s.legal_name}”?`,
      description: 'The supplier will be hidden from default lists but data is preserved.',
      confirmLabel: 'Archive',
      confirmClassName:
        'px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white',
      onConfirm: async () => {
        setConfirmDialog(null);
        const r = await archiveSupplier(s.id);
        if (r.success && tenant_id) {
          await logSupplierArchived(tenant_id, s.id, s.legal_name, user?.id ?? null);
          router.replace('/suppliers');
        } else if (!r.success) {
          setPageError(r.error ?? 'Archive failed');
        }
      },
    });
  };

  const handleRestore = (s: Supplier) => {
    setConfirmDialog({
      title: `Restore “${s.legal_name}”?`,
      description: 'The supplier will return to active lists.',
      confirmLabel: 'Restore',
      confirmClassName:
        'px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white',
      onConfirm: async () => {
        setConfirmDialog(null);
        const r = await restoreSupplier(s.id);
        if (r.success && tenant_id) {
          await logSupplierRestored(tenant_id, s.id, s.legal_name, user?.id ?? null);
          await refreshSupplier();
          toast.success('Supplier restored.');
        } else if (!r.success) {
          setPageError(r.error ?? 'Restore failed');
        }
      },
    });
  };

  const confirmDialogEl = confirmDialog ? (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setConfirmDialog(null);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="supplier-detail-confirm-title"
        aria-describedby="supplier-detail-confirm-desc"
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2
          id="supplier-detail-confirm-title"
          className="text-base font-semibold text-gray-900 dark:text-white"
        >
          {confirmDialog.title}
        </h2>
        <p
          id="supplier-detail-confirm-desc"
          className="mt-2 text-sm text-gray-600 dark:text-gray-300"
        >
          {confirmDialog.description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            onClick={() => setConfirmDialog(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={confirmDialog.confirmClassName}
            onClick={() => void confirmDialog.onConfirm()}
          >
            {confirmDialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const renderSummaryCard = () => {
    const isArchived = !isCreateMode && Boolean(previewSupplier.deleted_at);
    return (
      <SupplierRecordSummaryCard
        supplier={previewSupplier}
        formData={formData}
        isDraft={isCreateMode}
        isArchived={isArchived}
        updatedAt={isCreateMode ? undefined : formatShortDate(previewSupplier.updated_at)}
        statusUpdating={statusUpdating}
        onStatusChange={(status) => void handleStatusChange(status)}
        onEditDetails={() => setDetailsModalOpen(true)}
        editDetailsLabel={isCreateMode ? 'Details' : 'Edit'}
        logoPanel={
          <SupplierLogoPanel
            logoUrl={formData.logo_url ?? null}
            onLogoUrlChange={handleLogoChange}
            uploading={logoUploading}
            disabled={isArchived}
          />
        }
        recordNav={
          !isCreateMode && recordNav.total > 0
            ? {
                index: recordNav.index,
                total: recordNav.total,
                prevId: recordNav.prevId,
                nextId: recordNav.nextId,
                isLoading: recordNav.isLoading,
                onNavigate: (id) => router.push(`/suppliers/${id}`),
              }
            : undefined
        }
        actions={
          isCreateMode ? (
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleCreateSupplier()}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-green-600 px-3 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              Create supplier
            </button>
          ) : (
            <>
              <ArchiveRestoreActions
                entity={previewSupplier}
                isArchived={isArchived}
                onArchive={handleArchive}
                onRestore={handleRestore}
                archiveTitle="Soft-delete: hidden from lists, data retained."
                restoreTitle="Restore supplier to active lists."
              />
              <div className="relative" ref={overflowRef}>
                <button
                  type="button"
                  aria-expanded={overflowOpen}
                  aria-haspopup="menu"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOverflowOpen((o) => !o);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  title="More actions"
                >
                  <MoreVertical className="h-4 w-4" aria-hidden />
                </button>
                {overflowOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 z-40 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-900"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                      onClick={exportSupplierCsv}
                    >
                      <FileDown className="h-4 w-4 shrink-0" aria-hidden />
                      Export CSV
                    </button>
                    {!isArchived && (
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        onClick={() => handleArchive(previewSupplier)}
                      >
                        <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )
        }
        footer={
          isCreateMode ? (
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Draft — not saved yet
            </p>
          ) : isArchived ? (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Archived — hidden from default supplier lists.
            </p>
          ) : undefined
        }
        className="mb-0 shrink-0"
      />
    );
  };

  return (
    <ProtectedRoute>
      {confirmDialogEl}
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          backHref="/suppliers"
          backLabel="Suppliers"
          className="!mb-0 !border-b-0 !py-0 [&_a]:!mb-2.5"
          {...(!isCreateMode && error && !isLoading
            ? {
                icon: Truck,
                title: 'Supplier',
                subtitle: typeof error === 'string' ? error : 'Unable to load this supplier',
                subtitleClassName: `${premiumTypography.pageSubtitle} ${bc.subtitleTint}`,
              }
            : !isCreateMode && isLoading
              ? {
                  icon: Truck,
                  title: 'Supplier',
                  subtitle: 'Loading…',
                  subtitleClassName: `${premiumTypography.pageSubtitle} ${bc.subtitleTint}`,
                }
              : !isCreateMode && !supplier
                ? {
                    icon: Truck,
                    title: 'Supplier',
                    subtitle: 'Select a supplier from the list',
                    subtitleClassName: `${premiumTypography.pageSubtitle} ${bc.subtitleTint}`,
                  }
                : {})}
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

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
          {!isCreateMode && isLoading && (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-gray-500"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-8 w-8 animate-spin text-green-600 dark:text-green-500" />
              <span className={premiumTypography.body}>Loading supplier…</span>
            </div>
          )}

          {!isCreateMode && !isLoading && error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-sm text-amber-900 dark:text-amber-200">{error}</p>
              <Link
                href="/suppliers"
                className="mt-4 inline-block text-sm font-medium text-green-700 underline dark:text-green-400"
              >
                Back to suppliers
              </Link>
            </div>
          )}

          {(isCreateMode || (!isLoading && supplier)) && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {renderSummaryCard()}
              <SupplierDetailsTabs
                mode={isCreateMode ? 'create' : 'edit'}
                {...(isCreateMode
                  ? {
                      onCreate: createSupplier,
                      onCancel: () => router.push('/suppliers'),
                      onFormChange: setLiveForm,
                      onSuccess: (id) => router.replace(id ? `/suppliers/${id}` : '/suppliers'),
                    }
                  : {
                      supplier: supplier!,
                      updateSupplier,
                      onSupplierUpdated: handleSupplierUpdated,
                      onFormChange: setLiveForm,
                    })}
                syncFormData={{ logo_url: formData.logo_url, status: formData.status }}
              />
            </div>
          )}
        </div>
      </PageContainer>
      <SupplierKeyDetailsModal
        open={detailsModalOpen}
        isCreateMode={isCreateMode}
        supplierCode={isCreateMode ? null : previewSupplier.supplier_code}
        initial={
          isCreateMode
            ? supplierToKeyDraft(previewSupplier)
            : supplier
              ? supplierToKeyDraft(supplier)
              : supplierToKeyDraft(previewSupplier)
        }
        onClose={() => setDetailsModalOpen(false)}
        onSave={handleKeyDetailsSave}
      />
    </ProtectedRoute>
  );
}
