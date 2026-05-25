'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, Loader2, MoreVertical, Plus, Trash2, Users } from 'lucide-react';
import CustomerKeyDetailsModal, {
  customerToKeyDraft,
  type CustomerKeyDetailsDraft,
} from '@/components/customers/CustomerKeyDetailsModal';
import { emptyCustomerFormData, formDataToCustomerPreview } from '@/lib/customerPreview';
import PageContainer from '@/components/PageContainer';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import { ArchiveRestoreActions } from '@/components/common/ArchiveRestoreActions';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import CustomerDetailsTabs from '@/components/customers/CustomerDetailsTabs';
import CustomerLogoPanel from '@/components/customers/CustomerLogoPanel';
import CustomerRecordSummaryCard from '@/components/customers/CustomerRecordSummaryCard';
import { useTenant } from '@/contexts/TenantContext';
import { useCustomer } from '@/hooks/useCustomer';
import { useCustomerRecordNav } from '@/hooks/useCustomerRecordNav';
import { useCustomers } from '@/hooks/useCustomers';
import { logCustomerArchived, logCustomerCreated, logCustomerRestored } from '@/lib/auditLog';
import { downloadTableCsv } from '@/lib/csvDownload';
import { customerToFormData, resolveCustomerFormData } from '@/lib/customerForm';
import { pillarAccent, premiumTypography } from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import type { Customer, CustomerFormData, CustomerStatus } from '@/types/customer';

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

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const rawId = params?.id;
  const customerId =
    typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
  const isCreateMode = customerId === 'new';

  const { effectiveTenantId: tenant_id, user } = useTenant();
  const { customer, isLoading, error, refreshCustomer } = useCustomer(
    isCreateMode ? undefined : customerId
  );
  const { createCustomer, updateCustomer, archiveCustomer, restoreCustomer } = useCustomers(
    undefined,
    {
      loadCustomers: false,
    }
  );
  const recordNav = useCustomerRecordNav(
    tenant_id ?? undefined,
    isCreateMode ? undefined : customerId
  );

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [liveForm, setLiveForm] = useState<CustomerFormData | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCreateMode) {
      setLiveForm(emptyCustomerFormData);
    } else {
      setLiveForm(null);
    }
  }, [customerId, isCreateMode]);

  useEffect(() => {
    if (!customer || isCreateMode) return;
    setLiveForm(customerToFormData(customer));
  }, [customerId, customer?.updated_at, customer, isCreateMode]);

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
        ? (liveForm ?? emptyCustomerFormData)
        : resolveCustomerFormData(customer ?? undefined, liveForm),
    [isCreateMode, customer, liveForm]
  );

  const previewCustomer = useMemo(
    () => formDataToCustomerPreview(formData, tenant_id ?? ''),
    [formData, tenant_id]
  );

  const handleCustomerUpdated = useCallback(async () => {
    await refreshCustomer();
  }, [refreshCustomer]);

  const exportCustomerCsv = useCallback(() => {
    if (!customer) return;
    setOverflowOpen(false);
    downloadTableCsv(
      `customer_${customer.customer_code || customer.id}`,
      [
        'legal_name',
        'trading_name',
        'email',
        'phone',
        'customer_type',
        'status',
        'address_line1',
        'city',
        'country',
        'payment_terms',
        'currency',
      ],
      [
        [
          customer.legal_name ?? '',
          customer.trading_name ?? '',
          customer.email ?? '',
          customer.phone ?? '',
          customer.customer_type ?? '',
          customer.status,
          customer.address_line1 ?? '',
          customer.city ?? '',
          customer.country ?? '',
          customer.payment_terms ?? '',
          customer.currency ?? '',
        ],
      ]
    );
  }, [customer]);

  const handleStatusChange = useCallback(
    async (status: CustomerStatus) => {
      if (isCreateMode) {
        setLiveForm((prev) => ({ ...(prev ?? emptyCustomerFormData), status }));
        return;
      }
      if (!customer) return;
      setStatusUpdating(true);
      const r = await updateCustomer(customer.id, { status });
      if (r.success) {
        setLiveForm((prev) => ({ ...(prev ?? customerToFormData(customer)), status }));
        await refreshCustomer();
      } else {
        toast.error(r.error ?? 'Status update failed');
      }
      setStatusUpdating(false);
    },
    [isCreateMode, customer, updateCustomer, refreshCustomer, toast]
  );

  const handleLogoChange = useCallback(
    async (url: string | null) => {
      if (isCreateMode) {
        setLiveForm((prev) => ({ ...(prev ?? emptyCustomerFormData), logo_url: url }));
        return;
      }
      if (!customer) return;
      setLogoUploading(true);
      const r = await updateCustomer(customer.id, { logo_url: url });
      if (r.success) {
        setLiveForm((prev) => ({ ...(prev ?? customerToFormData(customer)), logo_url: url }));
        await refreshCustomer();
      } else {
        toast.error(r.error ?? 'Logo update failed');
      }
      setLogoUploading(false);
    },
    [isCreateMode, customer, updateCustomer, refreshCustomer, toast]
  );

  const handleKeyDetailsSave = useCallback(
    async (draft: CustomerKeyDetailsDraft) => {
      if (isCreateMode) {
        setLiveForm((prev) => ({
          ...(prev ?? emptyCustomerFormData),
          ...draft,
        }));
        return;
      }
      if (!customer) return;
      const r = await updateCustomer(customer.id, draft);
      if (!r.success) {
        throw new Error(r.error ?? 'Failed to update customer');
      }
      setLiveForm((prev) => ({ ...(prev ?? customerToFormData(customer)), ...draft }));
      await refreshCustomer();
      toast.success('Customer details updated.');
    },
    [isCreateMode, customer, updateCustomer, refreshCustomer, toast]
  );

  const handleCreateCustomer = useCallback(async () => {
    if (!formData.legal_name?.trim()) {
      toast.error('Open Edit and enter a legal name before creating.');
      setDetailsModalOpen(true);
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Open Edit and enter an email before creating.');
      setDetailsModalOpen(true);
      return;
    }
    setCreating(true);
    try {
      const result = await createCustomer(formData);
      if (!result.success || !result.id) {
        toast.error(result.error ?? 'Failed to create customer');
        return;
      }
      if (tenant_id) {
        await logCustomerCreated(
          tenant_id,
          result.id,
          formData.email,
          formData.legal_name ?? null,
          user?.id ?? null
        );
      }
      toast.success('Customer created.');
      router.replace(`/customers/${result.id}`);
    } finally {
      setCreating(false);
    }
  }, [formData, createCustomer, tenant_id, user?.id, router, toast]);

  const handleArchive = (c: Customer) => {
    setOverflowOpen(false);
    const name = c.legal_name || c.email || 'Customer';
    setConfirmDialog({
      title: `Archive “${name}”?`,
      description: 'The customer will be hidden from default lists but data is preserved.',
      confirmLabel: 'Archive',
      confirmClassName:
        'px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white',
      onConfirm: async () => {
        setConfirmDialog(null);
        const r = await archiveCustomer(c.id);
        if (r.success && tenant_id) {
          await logCustomerArchived(tenant_id, c.id, user?.id ?? null);
          router.replace('/customers');
        } else if (!r.success) {
          setPageError(r.error ?? 'Archive failed');
        }
      },
    });
  };

  const handleRestore = (c: Customer) => {
    const name = c.legal_name || c.email || 'Customer';
    setConfirmDialog({
      title: `Restore “${name}”?`,
      description: 'The customer will return to active lists.',
      confirmLabel: 'Restore',
      confirmClassName:
        'px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white',
      onConfirm: async () => {
        setConfirmDialog(null);
        const r = await restoreCustomer(c.id);
        if (r.success && tenant_id) {
          await logCustomerRestored(tenant_id, c.id, user?.id ?? null);
          await refreshCustomer();
          toast.success('Customer restored.');
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
        aria-labelledby="customer-detail-confirm-title"
        aria-describedby="customer-detail-confirm-desc"
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2
          id="customer-detail-confirm-title"
          className="text-base font-semibold text-gray-900 dark:text-white"
        >
          {confirmDialog.title}
        </h2>
        <p
          id="customer-detail-confirm-desc"
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
    const isArchived = !isCreateMode && Boolean(previewCustomer.deleted_at);
    return (
      <CustomerRecordSummaryCard
        customer={previewCustomer}
        formData={formData}
        isDraft={isCreateMode}
        isArchived={isArchived}
        updatedAt={isCreateMode ? undefined : formatShortDate(previewCustomer.updated_at)}
        statusUpdating={statusUpdating}
        onStatusChange={(status) => void handleStatusChange(status)}
        onEditDetails={() => setDetailsModalOpen(true)}
        editDetailsLabel={isCreateMode ? 'Details' : 'Edit'}
        logoPanel={
          <CustomerLogoPanel
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
                onNavigate: (id) => router.push(`/customers/${id}`),
              }
            : undefined
        }
        actions={
          isCreateMode ? (
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleCreateCustomer()}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-green-600 px-3 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              Create customer
            </button>
          ) : (
            <>
              <ArchiveRestoreActions
                entity={previewCustomer}
                isArchived={isArchived}
                onArchive={handleArchive}
                onRestore={handleRestore}
                archiveTitle="Soft-delete: hidden from lists, data retained."
                restoreTitle="Restore customer to active lists."
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
                      onClick={exportCustomerCsv}
                    >
                      <FileDown className="h-4 w-4 shrink-0" aria-hidden />
                      Export CSV
                    </button>
                    {!isArchived && (
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        onClick={() => handleArchive(previewCustomer)}
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
              Archived — hidden from default customer lists.
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
          backHref="/customers"
          backLabel="Customers"
          className="!mb-0 !border-b-0 !py-0 [&_a]:!mb-2.5"
          {...(!isCreateMode && error && !isLoading
            ? {
                icon: Users,
                title: 'Customer',
                subtitle: typeof error === 'string' ? error : 'Unable to load this customer',
                subtitleClassName: `${premiumTypography.pageSubtitle} ${bc.subtitleTint}`,
              }
            : !isCreateMode && isLoading
              ? {
                  icon: Users,
                  title: 'Customer',
                  subtitle: 'Loading…',
                  subtitleClassName: `${premiumTypography.pageSubtitle} ${bc.subtitleTint}`,
                }
              : !isCreateMode && !customer
                ? {
                    icon: Users,
                    title: 'Customer',
                    subtitle: 'Select a customer from the list',
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
              <span className={premiumTypography.body}>Loading customer…</span>
            </div>
          )}

          {!isCreateMode && !isLoading && error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-sm text-amber-900 dark:text-amber-200">{error}</p>
              <Link
                href="/customers"
                className="mt-4 inline-block text-sm font-medium text-green-700 underline dark:text-green-400"
              >
                Back to customers
              </Link>
            </div>
          )}

          {(isCreateMode || (!isLoading && customer)) && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {renderSummaryCard()}
              {isCreateMode ? (
                <CustomerDetailsTabs
                  mode="create"
                  onCreate={createCustomer}
                  onCancel={() => router.push('/customers')}
                  onFormChange={setLiveForm}
                  onSuccess={(id) => router.replace(id ? `/customers/${id}` : '/customers')}
                  syncFormData={{ logo_url: formData.logo_url, status: formData.status }}
                />
              ) : (
                <CustomerDetailsTabs
                  mode="edit"
                  customer={customer!}
                  updateCustomer={updateCustomer}
                  onCustomerUpdated={handleCustomerUpdated}
                  onFormChange={setLiveForm}
                  syncFormData={{ logo_url: formData.logo_url, status: formData.status }}
                />
              )}
            </div>
          )}
        </div>
      </PageContainer>
      <CustomerKeyDetailsModal
        open={detailsModalOpen}
        isCreateMode={isCreateMode}
        customerCode={isCreateMode ? null : previewCustomer.customer_code}
        initial={
          isCreateMode
            ? customerToKeyDraft(previewCustomer)
            : customer
              ? customerToKeyDraft(customer)
              : customerToKeyDraft(previewCustomer)
        }
        onClose={() => setDetailsModalOpen(false)}
        onSave={handleKeyDetailsSave}
      />
    </ProtectedRoute>
  );
}
