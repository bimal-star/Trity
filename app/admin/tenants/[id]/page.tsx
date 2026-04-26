'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import PremiumSectionTitle from '@/components/layout/premium/PremiumSectionTitle';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { comparePositions, type HierarchicalItem } from '@/lib/navigation-hierarchy';
import {
  allIdsInNodeSubtree,
  allIdsInSubtreeByLabel,
  directChildrenOfPillarRoot,
  navRowHasDescendants,
  nonPillarForestTopLevel,
  PILLAR_ROOT_LABEL_ORDER,
  pillarTriStateForSubtreeByLabel,
  premiumModuleForPillarLabel,
  type NavPillarRow,
  type PillarRootLabel,
} from '@/lib/navigationPillars';
import { getIconAndPillarForNavLabel } from '@/lib/navigationItemIcons';
import { navRowsAfterTierPreset } from '@/lib/tierNavigationPreset';
import { supabase } from '@/lib/supabaseClient';
import type { Json } from '@/types/database';
import { isSuperAdminRole } from '@/lib/permissions';
import { RoleBadge } from '@/components/access/RoleBadge';
import {
  pillarAccent,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumSurfaces,
  premiumTypography,
  type PillarAccent,
} from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import { Building2, Loader2, AlertCircle, Save, LogIn, UserCog } from 'lucide-react';

interface TenantDetails {
  id: string;
  name: string;
  company_name: string | null;
  slug: string | null;
  is_active: boolean;
  logo_url: string | null;
  subscription_tier?: string | null;
  subscription_package_id?: string | null;
  settings: unknown;
  created_at: string;
  updated_at: string;
}

interface TenantUser {
  email: string;
  role: string;
  full_name: string | null;
}

function PillarMasterCheckbox({
  triState,
  disabled,
  onToggle,
  checkboxClassName,
  masterWrapClassName,
}: {
  triState: 'all' | 'some' | 'none';
  disabled?: boolean;
  onToggle: () => void;
  checkboxClassName: string;
  /** Optional gradient pad (see `pillarAccent(mod).formCheckboxMasterWrap`). */
  masterWrapClassName?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = triState === 'some';
  }, [triState]);

  const input = (
    <input
      ref={ref}
      type="checkbox"
      disabled={disabled}
      checked={triState === 'all'}
      onChange={onToggle}
      className={`${checkboxClassName} scale-[0.75] origin-center`}
      aria-label="Toggle all modules in this pillar"
    />
  );

  if (masterWrapClassName) {
    return <span className={masterWrapClassName}>{input}</span>;
  }
  return input;
}

const outsidePillarIndent = ['', 'pl-2', 'pl-4', 'pl-6', 'pl-8', 'pl-10', 'pl-12'] as const;

function OutsidePillarNavNode({
  node,
  navRows,
  navMutating,
  accent,
  depth,
  onToggle,
}: {
  node: HierarchicalItem<NavPillarRow>;
  navRows: NavPillarRow[];
  navMutating: boolean;
  accent: PillarAccent;
  depth: number;
  onToggle: (row: NavPillarRow) => void;
}) {
  const flat = navRows.find((r) => r.id === node.id);
  const row: NavPillarRow =
    flat ??
    ({
      id: node.id,
      label: node.label,
      position: node.position,
      path: node.path ?? null,
      is_enabled: node.is_enabled,
      is_deleted: node.is_deleted,
    } as NavPillarRow);
  const { icon: RowIcon } = getIconAndPillarForNavLabel(row.label);
  const indent = outsidePillarIndent[Math.min(depth, outsidePillarIndent.length - 1)];

  return (
    <div className={depth > 0 ? 'mt-0.5' : ''}>
      <label
        className={`flex cursor-pointer items-center gap-2 rounded-md py-1 leading-tight transition-colors hover:bg-gray-100/80 dark:hover:bg-gray-800/50 ${indent}`}
      >
        <input
          type="checkbox"
          checked={row.is_enabled}
          disabled={navMutating}
          onChange={() => onToggle(row)}
          className={`${accent.formCheckboxGradient} scale-[0.75] origin-center`}
        />
        <span
          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center ${accent.iconColor}`}
          aria-hidden
        >
          <RowIcon size={14} strokeWidth={2} />
        </span>
        <span
          className={`min-w-0 flex-1 truncate ${premiumTypography.tableCell} font-medium leading-tight ${accent.subtitleTint}`}
        >
          {row.label}
        </span>
      </label>
      {(node.children?.length ?? 0) > 0 ? (
        <div className="mt-0.5 space-y-0.5">
          {(node.children as HierarchicalItem<NavPillarRow>[]).map((child) => (
            <OutsidePillarNavNode
              key={child.id}
              node={child}
              navRows={navRows}
              navMutating={navMutating}
              accent={accent}
              depth={depth + 1}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function TenantDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id as string;
  const { user, ready, isLoading: tenantBootLoading, enterWorkspaceTenant } = useTenant();
  const { profile } = useProfile(user?.id);
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [logoFailed, setLogoFailed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState('basic');
  const [subscriptionPackageName, setSubscriptionPackageName] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<Record<string, unknown>>({});

  const [navRows, setNavRows] = useState<NavPillarRow[]>([]);
  const [navLoading, setNavLoading] = useState(true);
  const [navMutating, setNavMutating] = useState(false);

  const isSuperAdmin = isSuperAdminRole(profile?.role);
  const pa = pillarAccent('platform');

  const fetchNavigation = useCallback(async () => {
    if (!tenantId) return;
    setNavLoading(true);
    try {
      const { data, error: navErr } = await supabase
        .from('navigation')
        .select('id,label,position,path,is_enabled,is_deleted')
        .eq('tenant_id', tenantId)
        .order('position', { ascending: true });

      if (navErr) throw navErr;
      setNavRows((data ?? []) as NavPillarRow[]);
    } catch (err) {
      console.error('Navigation fetch:', err);
      toast.error(getErrorMessage(err, 'Failed to load navigation'));
      setNavRows([]);
    } finally {
      setNavLoading(false);
    }
  }, [tenantId, toast]);

  useEffect(() => {
    if (!ready || tenantBootLoading || !user) return;
    if (profile && !isSuperAdmin) {
      router.replace('/');
    }
  }, [ready, tenantBootLoading, user, profile, isSuperAdmin, router]);

  const fetchTenant = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;

      setTenant(tenantData);
      setLogoFailed(false);
      const row = tenantData as TenantDetails;
      setSubscriptionTier(row.subscription_tier || 'basic');
      const pkgId = row.subscription_package_id ?? null;
      if (pkgId) {
        const { data: pkg } = await supabase
          .from('subscription_packages')
          .select('name')
          .eq('id', pkgId)
          .maybeSingle();
        setSubscriptionPackageName((pkg as { name?: string } | null)?.name ?? null);
      } else {
        setSubscriptionPackageName(null);
      }
      const baseSettings =
        row.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
          ? { ...(row.settings as Record<string, unknown>) }
          : {};
      setLocalSettings(baseSettings);

      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('email, role, full_name')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(
        (usersData ?? []).map((u) => ({
          email: u.email ?? '',
          role: u.role,
          full_name: u.full_name,
        }))
      );
    } catch (err) {
      console.error('Error fetching tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (isSuperAdmin && tenantId) {
      void fetchTenant();
      void fetchNavigation();
    }
  }, [isSuperAdmin, tenantId, fetchTenant, fetchNavigation]);

  const applyNavUpdates = async (updates: Array<{ id: string; is_enabled: boolean }>) => {
    if (updates.length === 0) return;
    setNavMutating(true);
    const prev = navRows;
    setNavRows((rows) =>
      rows.map((r) => {
        const u = updates.find((x) => x.id === r.id);
        return u ? { ...r, is_enabled: u.is_enabled } : r;
      })
    );
    try {
      const chunkSize = 12;
      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize);
        const results = await Promise.all(
          chunk.map((u) =>
            supabase
              .from('navigation')
              .update({ is_enabled: u.is_enabled })
              .eq('id', u.id)
              .eq('tenant_id', tenantId)
          )
        );
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
      }
    } catch (err) {
      setNavRows(prev);
      toast.error(getErrorMessage(err, 'Failed to update navigation'));
    } finally {
      setNavMutating(false);
    }
  };

  const togglePillar = async (pillarLabel: PillarRootLabel) => {
    const tri = pillarTriStateForSubtreeByLabel(navRows, pillarLabel);
    const enable = tri !== 'all';
    const ids = allIdsInSubtreeByLabel(navRows, pillarLabel);
    if (ids.length === 0) return;
    await applyNavUpdates(ids.map((id) => ({ id, is_enabled: enable })));
  };

  const toggleNavItem = async (row: NavPillarRow) => {
    const enable = !row.is_enabled;
    const ids = navRowHasDescendants(navRows, row.id)
      ? allIdsInNodeSubtree(navRows, row.id)
      : [row.id];
    await applyNavUpdates(ids.map((id) => ({ id, is_enabled: enable })));
  };

  function applyTierDefaultsToNavigation() {
    const updates = navRowsAfterTierPreset(navRows, subscriptionTier);
    if (updates.length === 0) {
      window.alert('No pillar navigation rows to update for this tenant.');
      return;
    }
    if (
      !window.confirm(
        `Apply "${subscriptionTier}" tier defaults to navigation visibility? This updates all Business Core, Execution, and Analytics items for this tenant (other menu roots are unchanged).`
      )
    ) {
      return;
    }
    void applyNavUpdates(updates);
  }

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const parsedSettings = { ...localSettings };

      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          settings: parsedSettings as Json,
        })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      await fetchTenant();
      toast.success('Tenant saved successfully.');
    } catch (err) {
      console.error('Error saving tenant:', err);
      toast.error(getErrorMessage(err, 'Failed to save tenant'));
    } finally {
      setIsSaving(false);
    }
  };

  const outsideRoots = useMemo(() => {
    const roots = nonPillarForestTopLevel(navRows);
    return [...roots].sort((a, b) => comparePositions(a.position, b.position));
  }, [navRows]);

  if (!ready || tenantBootLoading || !isSuperAdmin) {
    return (
      <ProtectedRoute>
        <PageContainer
          module={null}
          rootClassName={premiumSurfaces.platformPageRoot}
          innerClassName={premiumSurfaces.platformPageInner}
        >
          <div className="flex items-center justify-center py-12 pt-4">
            <Loader2 className={`h-8 w-8 animate-spin ${pa.iconColor}`} />
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  const saveButton = (
    <button
      type="button"
      onClick={handleSave}
      disabled={isSaving || isLoading || !tenant}
      className={premiumPrimaryButton('platform', 'md', 'wide')}
    >
      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {isSaving ? 'Saving...' : 'Save changes'}
    </button>
  );

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
          title="Tenant Details"
          subtitle={
            tenant && !isLoading
              ? undefined
              : 'View and edit organization record, modules, and user access shortcuts'
          }
          subtitleClassName={`mt-0.5 ${premiumTypography.pageSubtitle} ${pa.subtitleTint}`}
          backHref="/admin/tenants"
          backLabel="Back to all tenants"
          titleSlot={
            tenant && !isLoading ? (
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800">
                  {tenant.logo_url && !logoFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote tenant logos; URLs are admin-controlled
                    <img
                      src={tenant.logo_url}
                      alt=""
                      className="max-h-full max-w-full object-contain p-0.5"
                      onError={() => setLogoFailed(true)}
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {tenant.name}
                  </p>
                  <p className={`truncate text-xs text-gray-600 dark:text-gray-400`}>
                    {tenant.company_name?.trim() ? tenant.company_name : '—'}
                  </p>
                </div>
              </div>
            ) : undefined
          }
          right={!isLoading && tenant ? saveButton : null}
        />
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Error loading tenant</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className={`flex items-center justify-center py-14 ${premiumSurfaces.card}`}>
              <Loader2 className={`h-8 w-8 animate-spin ${pa.iconColor}`} />
            </div>
          ) : tenant ? (
            <div className="grid gap-4">
              <div className={`${premiumSurfaces.card} scroll-mt-4`}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className={premiumTypography.label}>Status</span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        tenant.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {tenant.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className={`space-y-3 ${premiumSurfaces.platformModulesPanel}`}>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Modules (navigation)
                      </h3>
                      <p className={`mt-2 ${premiumTypography.helper}`}>
                        Toggles update this tenant&apos;s{' '}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          navigation
                        </span>{' '}
                        visibility (same items as Navigation Manager). Per-user access is configured
                        on{' '}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Users → Access
                        </span>
                        .
                      </p>
                      <p className={`mt-2 ${premiumTypography.helper}`}>
                        {subscriptionPackageName ? (
                          <>
                            <span className="text-gray-500 dark:text-gray-400">Package:</span>{' '}
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {subscriptionPackageName}
                            </span>
                            {' · '}
                          </>
                        ) : null}
                        <span className="text-gray-500 dark:text-gray-400">Tier:</span>{' '}
                        <span className="font-medium capitalize text-gray-800 dark:text-gray-200">
                          {subscriptionTier}
                        </span>
                        {' · '}
                        <Link
                          href={`/admin/tenants/form/${tenantId}`}
                          className={`${pa.iconColor} font-medium hover:underline`}
                        >
                          Edit tenant
                        </Link>
                        {' · '}
                        <Link
                          href="/admin/subscription-packages"
                          className={`${pa.iconColor} font-medium hover:underline`}
                        >
                          Manage packages
                        </Link>
                      </p>
                      <div className="flex flex-wrap gap-2 pt-3">
                        <button
                          type="button"
                          onClick={applyTierDefaultsToNavigation}
                          disabled={navMutating || navLoading}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/90 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-950/80"
                        >
                          Apply tier defaults to navigation
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            enterWorkspaceTenant(tenantId, tenant?.name ?? '');
                            router.push('/');
                          }}
                          className={premiumSecondaryButton('platform', 'sm', 'auto')}
                        >
                          <LogIn className="h-3.5 w-3.5" aria-hidden />
                          Open workspace
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            enterWorkspaceTenant(tenantId, tenant?.name ?? '');
                            router.push('/users/access');
                          }}
                          className={premiumSecondaryButton('platform', 'sm', 'auto')}
                        >
                          <UserCog className="h-3.5 w-3.5" aria-hidden />
                          User module access
                        </button>
                      </div>
                    </div>

                    {navLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className={`h-6 w-6 animate-spin ${pa.iconColor}`} />
                      </div>
                    ) : navRows.length === 0 ? (
                      <p className={`${premiumTypography.helper}`}>
                        No navigation rows for this tenant yet. Use template provisioning or open
                        the workspace and run <strong>Navigation Manager</strong> to seed the menu.
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-3">
                        {PILLAR_ROOT_LABEL_ORDER.map((pillarLabel) => {
                          const mod = premiumModuleForPillarLabel(pillarLabel);
                          const accent = pillarAccent(mod);
                          const { icon: PillarHeadingIcon } =
                            getIconAndPillarForNavLabel(pillarLabel);
                          const tri = pillarTriStateForSubtreeByLabel(navRows, pillarLabel);
                          const items = directChildrenOfPillarRoot(navRows, pillarLabel);
                          const subtreeCount = allIdsInSubtreeByLabel(navRows, pillarLabel).length;
                          const hasRoot = subtreeCount > 0;

                          return (
                            <div
                              key={pillarLabel}
                              className={`overflow-hidden rounded-xl border bg-white/80 dark:bg-gray-900/40 ${accent.outlineAccent}`}
                            >
                              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-3 py-3">
                                <span
                                  className={`flex shrink-0 items-center ${accent.iconColor}`}
                                  aria-hidden
                                >
                                  <PillarHeadingIcon size={20} strokeWidth={2} />
                                </span>
                                <PillarMasterCheckbox
                                  triState={tri}
                                  disabled={navMutating || subtreeCount === 0}
                                  onToggle={() => void togglePillar(pillarLabel)}
                                  checkboxClassName={accent.formCheckbox}
                                />
                                <h4
                                  className={`text-base font-semibold leading-tight sm:text-lg ${accent.titleText}`}
                                >
                                  {pillarLabel}
                                </h4>
                                {navMutating ? (
                                  <Loader2
                                    className={`h-4 w-4 shrink-0 animate-spin ${accent.iconColor}`}
                                    aria-hidden
                                  />
                                ) : null}
                              </div>
                              <div className="max-h-[min(24rem,50vh)] overflow-y-auto border-t border-gray-200/50 p-2 dark:border-gray-600/40">
                                {!hasRoot ? (
                                  <p
                                    className={`px-1 py-2 text-xs leading-snug ${accent.subtitleTint}`}
                                  >
                                    No {pillarLabel} root in navigation
                                  </p>
                                ) : items.length === 0 ? (
                                  <p
                                    className={`px-1 py-2 text-xs leading-snug ${accent.subtitleTint}`}
                                  >
                                    No nested items (only pillar root)
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                    {items.map((row) => {
                                      const { icon: RowIcon } = getIconAndPillarForNavLabel(
                                        row.label
                                      );
                                      return (
                                        <label
                                          key={row.id}
                                          className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-100/70 dark:hover:bg-gray-800/40`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={row.is_enabled}
                                            disabled={navMutating}
                                            onChange={() => void toggleNavItem(row)}
                                            className={`${accent.formCheckboxGradient} scale-[0.75] origin-center`}
                                          />
                                          <span
                                            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center ${accent.iconColor}`}
                                            aria-hidden
                                          >
                                            <RowIcon size={14} strokeWidth={2} />
                                          </span>
                                          <span
                                            className={`min-w-0 flex-1 truncate ${premiumTypography.tableCell} font-medium leading-tight ${accent.subtitleTint}`}
                                          >
                                            {row.label}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {navRows.length > 0 ? (
                    <div
                      className={
                        outsideRoots.length === 0
                          ? 'mt-3 rounded-lg border border-amber-200/60 bg-amber-50/20 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/15'
                          : 'mt-4 space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/30 p-4 dark:border-amber-900/45 dark:bg-amber-950/20 sm:p-5'
                      }
                    >
                      <div>
                        <h3 className={`text-sm font-semibold ${pa.titleText}`}>
                          Outside product pillars
                        </h3>
                        <p
                          className={`${outsideRoots.length === 0 ? 'mt-0.5 text-xs' : 'mt-1'} ${premiumTypography.helper}`}
                        >
                          Navigation roots and subtrees not under Business Core, Execution, or
                          Analytics (same structure as Navigation Manager).
                        </p>
                      </div>
                      {outsideRoots.length === 0 ? (
                        <p className={`mt-1 text-xs ${premiumTypography.helper}`}>
                          No navigation roots outside the three product pillars.
                        </p>
                      ) : (
                        <div className="columns-1 gap-x-4 sm:columns-2 lg:columns-3">
                          {outsideRoots.map((root) => {
                            const hasKids = (root.children?.length ?? 0) > 0;
                            return (
                              <div
                                key={root.id}
                                className={`mb-3 break-inside-avoid rounded-xl border bg-white/85 dark:bg-gray-900/50 ${pa.outlineAccent} ${
                                  hasKids ? 'max-h-[min(28rem,55vh)] overflow-y-auto p-3' : 'p-2'
                                }`}
                              >
                                <OutsidePillarNavNode
                                  node={root}
                                  navRows={navRows}
                                  navMutating={navMutating}
                                  accent={pa}
                                  depth={0}
                                  onToggle={(r) => void toggleNavItem(r)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className={premiumSurfaces.card}>
                <PremiumSectionTitle as="h3" className="mb-3">
                  Users ({users.length})
                </PremiumSectionTitle>

                {users.length === 0 ? (
                  <p className={premiumTypography.helper}>No users in this tenant</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((u, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-600/60 dark:bg-gray-900/40"
                      >
                        <div>
                          <p
                            className={`${premiumTypography.body} font-medium text-gray-900 dark:text-white`}
                          >
                            {u.full_name || u.email}
                          </p>
                          {u.full_name && <p className={premiumTypography.helper}>{u.email}</p>}
                        </div>
                        <RoleBadge role={u.role} size="md" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
