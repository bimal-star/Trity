'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabaseClient';
import { logTenantUpdated } from '@/lib/auditLog';
import { dispatchTenantStatusChanged, syncTenantSchemaStatus } from '@/lib/tenantAccess';
import {
  getResolvedTemplateTenantId,
  provisionOrSyncTenantFromTemplate,
  formatTemplateOperationMessage,
} from '@/lib/templateTenant';
import {
  pillarAccent,
  premiumPrimaryButton,
  premiumSurfaces,
  premiumTypography,
} from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import {
  TenantHardDeleteDialog,
  type TenantHardDeleteTarget,
} from '@/components/admin/TenantHardDeleteDialog';
import {
  Building2,
  Plus,
  Loader2,
  AlertCircle,
  LogIn,
  SlidersHorizontal,
  Sparkles,
  PenSquare,
  Check,
  X,
  Trash2,
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  company_name: string | null;
  slug: string | null;
  is_active: boolean;
  is_template?: boolean;
  logo_url: string | null;
  settings?: unknown;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  website?: string | null;
  industry?: string | null;
  subscription_tier?: string | null;
  subscription_package_id?: string | null;
  max_users?: number | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  user_count?: number;
}

export default function AdminTenantsPage() {
  const router = useRouter();
  const {
    user,
    ready,
    isLoading: tenantBootLoading,
    enterWorkspaceTenant,
    exitWorkspaceTenant,
    workspaceTenantId,
  } = useTenant();
  const { profile } = useProfile(user?.id);
  const { can, isSuperAdmin } = usePermissions();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provisioningId, setProvisioningId] = useState<string | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<TenantHardDeleteTarget | null>(null);
  const canManageTenants = can('manage_features') && isSuperAdmin;

  // Redirect non-super-admins
  useEffect(() => {
    if (!ready || tenantBootLoading || !user) return;
    if (profile && !canManageTenants) {
      router.replace('/');
    }
  }, [
    ready,
    tenantBootLoading,
    user?.id,
    profile?.user_id,
    profile?.role,
    canManageTenants,
    router,
  ]);

  // Fetch all tenants
  const fetchTenants = async () => {
    if (!canManageTenants) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch tenants with user count
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      // Fetch user counts for each tenant
      const tenantsWithCounts = await Promise.all(
        (tenantsData || []).map(async (tenant) => {
          const { count } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          return { ...tenant, user_count: count || 0 };
        })
      );

      setTenants(tenantsWithCounts);
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canManageTenants) {
      fetchTenants();
    }
  }, [canManageTenants]);

  const handleProvisionFromTemplate = async (tenantId: string) => {
    setProvisioningId(tenantId);
    try {
      const { templateId, lookupError } = await getResolvedTemplateTenantId(supabase);
      if (lookupError) {
        toast.error(
          `Could not look up template tenant: ${lookupError}. Ensure migration 20260415140000 is applied and the tenants table has an is_template column, or set NEXT_PUBLIC_TEMPLATE_TENANT_ID.`
        );
        return;
      }
      if (!templateId) {
        toast.error(
          'No template tenant configured. Set NEXT_PUBLIC_TEMPLATE_TENANT_ID or mark one tenant as Template (developer workspace) in Edit.'
        );
        return;
      }
      if (templateId === tenantId) {
        toast.error('Cannot provision the template tenant from itself.');
        return;
      }
      const {
        data: provData,
        error: pErr,
        mode,
      } = await provisionOrSyncTenantFromTemplate(supabase, tenantId, templateId);
      if (pErr) {
        throw new Error(pErr);
      }
      const summary = formatTemplateOperationMessage(provData, mode);
      if (summary.variant === 'success') {
        toast.success(summary.message);
      } else {
        toast.error(summary.message);
      }
      await fetchTenants();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('navigation-updated'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Provisioning failed');
    } finally {
      setProvisioningId(null);
    }
  };

  const toggleTenantActive = async (tenantId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ is_active: !currentActive })
        .eq('id', tenantId);

      if (error) throw error;

      const nextActive = !currentActive;
      await syncTenantSchemaStatus(supabase, tenantId, nextActive);
      await logTenantUpdated(tenantId, { is_active: nextActive }, user?.id ?? null);

      await fetchTenants();
      dispatchTenantStatusChanged();
      toast.success(currentActive ? 'Tenant deactivated.' : 'Tenant activated.');
    } catch (err) {
      console.error('Error toggling tenant:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update tenant');
    }
  };

  const isBootstrapping = !ready || tenantBootLoading;
  const isSuperAdminReady = !isBootstrapping && canManageTenants;
  const isRedirecting = !isBootstrapping && profile != null && !canManageTenants;

  const platformAccent = pillarAccent('platform');

  if (!isSuperAdminReady) {
    return (
      <ProtectedRoute>
        <PageContainer
          module={null}
          rootClassName={premiumSurfaces.platformPageRoot}
          innerClassName={premiumSurfaces.platformPageInner}
        >
          <div className="flex items-center justify-center py-12 pt-4">
            <Loader2 className={`w-8 h-8 animate-spin ${platformAccent.iconColor}`} />
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageContainer
        module={null}
        rootClassName={premiumSurfaces.platformPageRoot}
        innerClassName={premiumSurfaces.platformPageInner}
      >
        <PremiumStickyHeader
          module="platform"
          className={premiumSurfaces.platformStickyHeaderOffset}
          icon={Building2}
          title="Tenant Management"
          subtitle="Super-admin: manage client organizations"
          subtitleClassName={`mt-0.5 ${premiumTypography.pageSubtitle} ${platformAccent.subtitleTint}`}
          right={
            <Link
              href="/admin/tenants/form"
              className={`inline-flex items-center justify-center gap-2 ${premiumPrimaryButton('platform', 'md', 'standard')}`}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Create Tenant
            </Link>
          }
        />
        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Error</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Tenants List */}
          {isLoading ? (
            <div
              className={`flex items-center justify-center py-14 ${premiumSurfaces.cardElevated}`}
            >
              <Loader2 className={`w-8 h-8 animate-spin ${platformAccent.iconColor}`} />
            </div>
          ) : tenants.length === 0 ? (
            <div className={`text-center py-14 ${premiumSurfaces.cardElevated}`}>
              <Building2
                className={`w-12 h-12 mx-auto mb-4 ${platformAccent.iconColor} opacity-60`}
              />
              <p className={`${premiumTypography.body} text-gray-500 dark:text-gray-400`}>
                No tenants found
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/[0.03] dark:border-gray-700 dark:bg-gray-800 dark:ring-white/[0.04]">
              <div className="max-h-[min(70vh,calc(100vh-12rem))] overflow-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th
                        className={`sticky top-0 z-10 bg-gray-50 px-4 py-2 text-left align-bottom shadow-[inset_0_-1px_0_0_rgb(229,231,235)] dark:bg-gray-900 dark:shadow-[inset_0_-1px_0_0_rgb(55,65,81)] ${premiumTypography.tableHeader}`}
                      >
                        Tenant
                      </th>
                      <th
                        className={`sticky top-0 z-10 bg-gray-50 px-4 py-2 text-left align-bottom shadow-[inset_0_-1px_0_0_rgb(229,231,235)] dark:bg-gray-900 dark:shadow-[inset_0_-1px_0_0_rgb(55,65,81)] ${premiumTypography.tableHeader}`}
                      >
                        Users
                      </th>
                      <th
                        className={`sticky top-0 z-10 bg-gray-50 px-4 py-2 text-left align-bottom shadow-[inset_0_-1px_0_0_rgb(229,231,235)] dark:bg-gray-900 dark:shadow-[inset_0_-1px_0_0_rgb(55,65,81)] ${premiumTypography.tableHeader}`}
                      >
                        Status
                      </th>
                      <th
                        className={`sticky top-0 z-10 bg-gray-50 px-4 py-2 text-left align-bottom shadow-[inset_0_-1px_0_0_rgb(229,231,235)] dark:bg-gray-900 dark:shadow-[inset_0_-1px_0_0_rgb(55,65,81)] ${premiumTypography.tableHeader}`}
                      >
                        Created
                      </th>
                      <th
                        className={`sticky top-0 z-10 bg-gray-50 px-4 py-2 text-right align-bottom shadow-[inset_0_-1px_0_0_rgb(229,231,235)] dark:bg-gray-900 dark:shadow-[inset_0_-1px_0_0_rgb(55,65,81)] ${premiumTypography.tableHeader}`}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {tenants.map((tenant) => (
                      <tr
                        key={tenant.id}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50/90 dark:border-gray-700/60 dark:hover:bg-gray-800/50"
                      >
                        <td className="max-w-[14rem] px-4 py-2 sm:max-w-xs md:max-w-sm">
                          <div className="flex items-center gap-2.5">
                            <TenantListLogo
                              logoUrl={tenant.logo_url}
                              fallbackClassName={platformAccent.iconColor}
                            />
                            <div className="min-w-0 leading-tight">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Link
                                  href={`/admin/tenants/${tenant.id}`}
                                  className={`truncate font-medium text-gray-900 dark:text-white hover:underline ${platformAccent.iconColor} hover:opacity-90 dark:hover:opacity-90`}
                                >
                                  {tenant.name}
                                </Link>
                                {tenant.is_template ? (
                                  <span className="shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                                    Template
                                  </span>
                                ) : null}
                              </div>
                              <p
                                className={`mt-0.5 truncate ${premiumTypography.tableCell} text-gray-600 dark:text-gray-300`}
                              >
                                {tenant.company_name?.trim() ? tenant.company_name : '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-2 ${premiumTypography.tableCell} text-gray-600 dark:text-gray-300`}
                        >
                          {tenant.user_count} users
                        </td>
                        <td className="whitespace-nowrap px-4 py-2">
                          <button
                            onClick={() => toggleTenantActive(tenant.id, tenant.is_active)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                              tenant.is_active
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {tenant.is_active ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            {tenant.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-2 ${premiumTypography.tableCell} text-gray-600 dark:text-gray-300`}
                        >
                          {new Date(tenant.created_at).toLocaleDateString()}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-2 text-right ${premiumTypography.tableCell} font-medium`}
                        >
                          <div
                            className="inline-flex flex-wrap items-center justify-end gap-0.5"
                            role="group"
                            aria-label="Row actions"
                          >
                            {!tenant.is_template ? (
                              <button
                                type="button"
                                disabled={provisioningId === tenant.id}
                                onClick={() => void handleProvisionFromTemplate(tenant.id)}
                                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${platformAccent.iconColor} transition-colors hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-700`}
                                aria-label="Sync navigation from template"
                                title="Sync navigation from template"
                              >
                                {provisioningId === tenant.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                ) : (
                                  <Sparkles className="h-4 w-4" aria-hidden />
                                )}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                enterWorkspaceTenant(tenant.id, tenant.name);
                                router.push('/');
                              }}
                              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${platformAccent.iconColor} transition-colors hover:bg-gray-100 dark:hover:bg-gray-700`}
                              aria-label="Open workspace"
                              title="Open workspace"
                            >
                              <LogIn className="h-4 w-4" aria-hidden />
                            </button>
                            <Link
                              href={`/admin/tenants/${tenant.id}`}
                              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${platformAccent.iconColor} transition-colors hover:bg-gray-100 dark:hover:bg-gray-700`}
                              aria-label="Modules and settings"
                              title="Modules and settings"
                            >
                              <SlidersHorizontal className="h-4 w-4" aria-hidden />
                            </Link>
                            <Link
                              href={`/admin/tenants/form/${tenant.id}`}
                              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${platformAccent.iconColor} transition-colors hover:bg-gray-100 dark:hover:bg-gray-700`}
                              aria-label="Edit tenant"
                              title="Edit tenant"
                            >
                              <PenSquare className="h-4 w-4" aria-hidden />
                            </Link>
                            {!tenant.is_template ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setHardDeleteTarget({
                                    id: tenant.id,
                                    name: tenant.name,
                                    company_name: tenant.company_name,
                                    user_count: tenant.user_count,
                                  })
                                }
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                                aria-label="Delete tenant permanently"
                                title="Delete tenant permanently"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </PageContainer>

      {hardDeleteTarget ? (
        <TenantHardDeleteDialog
          tenant={hardDeleteTarget}
          onClose={() => setHardDeleteTarget(null)}
          onDeleted={(deletedId) => {
            setHardDeleteTarget(null);
            if (workspaceTenantId === deletedId) {
              exitWorkspaceTenant();
            }
            void fetchTenants();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('tenant-status-changed'));
            }
            toast.success('Tenant and all related data were permanently deleted.');
          }}
        />
      ) : null}
    </ProtectedRoute>
  );
}

function TenantListLogo({
  logoUrl,
  fallbackClassName,
}: {
  logoUrl: string | null;
  fallbackClassName: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center self-center overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800">
      {logoUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- tenant logos from storage / URLs
        <img
          src={logoUrl}
          alt=""
          className="max-h-full max-w-full object-contain p-0.5"
          onError={() => setFailed(true)}
        />
      ) : (
        <Building2 className={`h-5 w-5 ${fallbackClassName}`} aria-hidden />
      )}
    </div>
  );
}
