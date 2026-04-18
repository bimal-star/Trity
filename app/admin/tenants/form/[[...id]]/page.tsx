'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import PremiumSectionTitle from '@/components/layout/premium/PremiumSectionTitle';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { buildTierFeatureSettingsSnapshot } from '@/lib/featureFlags';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { logTenantCreated, logTenantUpdated } from '@/lib/auditLog';
import { seedTenantDefaultNavigation } from '@/lib/navigationSeed';
import { supabase } from '@/lib/supabaseClient';
import {
  formatProvisionResultMessage,
  getResolvedTemplateTenantId,
  provisionTenantFromTemplate,
} from '@/lib/templateTenant';
import { isSuperAdminRole } from '@/lib/permissions';
import {
  pillarAccent,
  premiumFocusRing,
  premiumInputComfortableBase,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumSurfaces,
  premiumTypography,
} from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import type { SubscriptionPackageRow } from '@/types/subscriptionPackage';
import {
  catalogueModeChangeGuidance,
  normalizeCatalogueMode,
  type CatalogueMode,
} from '@/lib/productCatalogue';
import TenantLogoField from '@/components/tenants/TenantLogoField';
import { useIndustries } from '@/hooks/useIndustries';
import {
  Building2,
  Loader2,
  AlertCircle,
  Save,
  Plus,
  X,
  ChevronDown,
} from 'lucide-react';

interface TenantData {
  id?: string;
  name: string;
  company_name: string | null;
  slug: string | null;
  is_active: boolean;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  website: string | null;
  industry: string | null;
  subscription_tier: string | null;
  subscription_package_id?: string | null;
  max_users: number | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  notes: string | null;
  catalogue_mode?: string | null;
}

export default function TenantFormPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id;
  const tenantId = Array.isArray(rawId) ? rawId[0] : rawId;
  const isEditMode = !!tenantId;
  
  const { user, ready, isLoading: tenantBootLoading, effectiveTenantId, refreshCatalogueMode } =
    useTenant();
  const { profile } = useProfile(user?.id);
  
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [addIndustryOpen, setAddIndustryOpen] = useState(false);
  const [newIndustryName, setNewIndustryName] = useState('');
  const [newIndustryError, setNewIndustryError] = useState<string | null>(null);
  const [addingIndustry, setAddingIndustry] = useState(false);
  const { industries, reload: reloadIndustries } = useIndustries();
  const [subscriptionTier, setSubscriptionTier] = useState('basic');
  const [subscriptionPackageId, setSubscriptionPackageId] = useState<string | null>(null);
  const [subscriptionPackages, setSubscriptionPackages] = useState<SubscriptionPackageRow[]>([]);
  const [maxUsers, setMaxUsers] = useState('10');
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isTemplate, setIsTemplate] = useState(false);
  const [catalogueMode, setCatalogueMode] = useState<CatalogueMode>('simple');
  const [catalogueChangeDialogOpen, setCatalogueChangeDialogOpen] = useState(false);
  /** Catalogue mode last loaded from DB (edit mode); used to detect changes before save. */
  const savedCatalogueBaselineRef = useRef<CatalogueMode | null>(null);
  const bypassCatalogueChangeConfirmRef = useRef(false);

  const isSuperAdmin = isSuperAdminRole(profile?.role);
  const pa = pillarAccent('platform');
  const fieldClass = `${premiumInputComfortableBase} ${premiumFocusRing('platform')}`;

  // Redirect non-super-admins
  useEffect(() => {
    if (!ready || tenantBootLoading || !user) return;
    if (profile && !isSuperAdmin) {
      router.replace('/');
    }
  }, [ready, tenantBootLoading, user, profile, isSuperAdmin, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void (async () => {
      const { data, error: pkgErr } = await supabase
        .from('subscription_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!pkgErr && data) setSubscriptionPackages(data as SubscriptionPackageRow[]);
    })();
  }, [isSuperAdmin]);

  // Fetch tenant data if editing
  useEffect(() => {
    if (!isEditMode || !isSuperAdmin) return;

    const fetchTenant = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single();

        if (fetchError) throw fetchError;

        const row = data as unknown as TenantData;
        setName(row.name);
        setCompanyName(row.company_name || '');
        setSlug(row.slug || '');
        setLogoUrl(row.logo_url || '');
        setContactEmail(row.contact_email || '');
        setContactPhone(row.contact_phone || '');
        setAddress(row.address || '');
        setWebsite(row.website || '');
        setIndustry(row.industry || '');
        setSubscriptionTier(row.subscription_tier || 'basic');
        setSubscriptionPackageId(row.subscription_package_id ?? null);
        setMaxUsers(row.max_users?.toString() || '10');
        setContractStartDate(row.contract_start_date || '');
        setContractEndDate(row.contract_end_date || '');
        setNotes(row.notes || '');
        setIsActive(row.is_active);
        setIsTemplate((row as { is_template?: boolean }).is_template === true);
        const normalized = normalizeCatalogueMode(row.catalogue_mode);
        setCatalogueMode(normalized);
        savedCatalogueBaselineRef.current = normalized;
      } catch (err) {
        console.error('Error fetching tenant:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tenant');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenant();
  }, [isEditMode, tenantId, isSuperAdmin]);

  const performSave = async () => {
    setIsSaving(true);

    const catalogueBaselineBeforeSave = savedCatalogueBaselineRef.current;

    try {
      const tenantData = {
        name: name.trim(),
        company_name: companyName.trim() || null,
        slug: slug.trim() || null,
        logo_url: logoUrl.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        address: address.trim() || null,
        website: website.trim() || null,
        industry: industry.trim() || null,
        subscription_tier: subscriptionTier,
        subscription_package_id: subscriptionPackageId,
        max_users: parseInt(maxUsers) || 10,
        contract_start_date: contractStartDate || null,
        contract_end_date: contractEndDate || null,
        notes: notes.trim() || null,
        is_active: isActive,
        is_template: isTemplate,
        catalogue_mode: catalogueMode,
      };

      if (isEditMode) {
        const { error: updateError } = await supabase
          .from('tenants')
          .update(tenantData)
          .eq('id', tenantId);

        if (updateError) throw updateError;
        await logTenantUpdated(tenantId, tenantData, user?.id ?? null);

        const catalogueChanged =
          catalogueBaselineBeforeSave !== null && catalogueMode !== catalogueBaselineBeforeSave;
        if (catalogueChanged) {
          savedCatalogueBaselineRef.current = catalogueMode;
          if (tenantId === effectiveTenantId) {
            await refreshCatalogueMode();
          }
          toast.success(
            'Tenant saved. Product catalogue mode updated — open another page and return, or refresh, so Products picks up the new mode.'
          );
        } else {
          toast.success('Tenant saved successfully.');
        }
      } else {
        const { data: newTenant, error: insertError } = await supabase
          .from('tenants')
          .insert([
            {
              ...tenantData,
              settings: buildTierFeatureSettingsSnapshot(subscriptionTier),
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;

        if (newTenant) {
          await logTenantCreated(newTenant.id, newTenant.name, user?.id ?? null);
          const { templateId, lookupError } = await getResolvedTemplateTenantId(supabase);
          if (lookupError) {
            console.warn(
              '[admin/tenants/form] Template lookup failed; falling back to default seed if no env template:',
              lookupError
            );
          }
          if (templateId && templateId !== newTenant.id) {
            const { data: provData, error: provErr } = await provisionTenantFromTemplate(
              supabase,
              newTenant.id,
              templateId
            );
            if (provErr) {
              toast.error(
                `Tenant was created, but provisioning from template failed: ${provErr}. You can retry with Provision from template on the tenant row, or use Navigation Manager to seed defaults.`
              );
              router.push('/admin/tenants');
              return;
            }
            const summary = formatProvisionResultMessage(provData);
            if (summary.variant === 'warning') {
              toast.error(`Tenant was created. ${summary.message}`);
              router.push('/admin/tenants');
              return;
            }
          } else {
            const { error: seedError } = await seedTenantDefaultNavigation(newTenant.id);
            if (seedError) {
              toast.error(
                `Tenant was created, but default navigation could not be seeded: ${seedError}. Open Navigation Manager for that tenant and use Seed default navigation.`
              );
              router.push('/admin/tenants');
              return;
            }
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('navigation-updated'));
          }
        }

        toast.success('Tenant created successfully.');
        router.push('/admin/tenants');
      }
    } catch (err) {
      console.error('Error saving tenant:', err);
      toast.error(getErrorMessage(err, 'Failed to save tenant'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      isEditMode &&
      savedCatalogueBaselineRef.current !== null &&
      catalogueMode !== savedCatalogueBaselineRef.current &&
      !bypassCatalogueChangeConfirmRef.current
    ) {
      setCatalogueChangeDialogOpen(true);
      return;
    }
    bypassCatalogueChangeConfirmRef.current = false;
    await performSave();
  };

  const confirmCatalogueChangeSave = async () => {
    setCatalogueChangeDialogOpen(false);
    bypassCatalogueChangeConfirmRef.current = true;
    try {
      await performSave();
    } finally {
      bypassCatalogueChangeConfirmRef.current = false;
    }
  };

  const handleAddIndustry = async () => {
    const trimmed = newIndustryName.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      setNewIndustryError('Enter an industry name.');
      return;
    }
    const slug = trimmed
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!slug || !/^[a-z][a-z0-9_]*$/.test(slug)) {
      setNewIndustryError('Use letters, numbers and underscores; must start with a letter.');
      return;
    }
    const normLabel = trimmed.toLowerCase();
    const existing = industries.find(
      (opt) => opt.slug === slug || opt.label.trim().toLowerCase() === normLabel,
    );
    if (existing) {
      setIndustry(existing.slug);
      setNewIndustryError(
        `"${existing.label}" already exists — it's now selected. Close this dialog or enter a different name.`,
      );
      return;
    }
    const label = trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
    setAddingIndustry(true);
    setNewIndustryError(null);
    const { error: insErr } = await supabase
      .from('industries')
      .upsert(
        { slug, label, created_by: user?.id ?? null },
        { onConflict: 'slug', ignoreDuplicates: true },
      );
    setAddingIndustry(false);
    if (insErr) {
      setNewIndustryError(insErr.message || 'Could not add industry.');
      return;
    }
    await reloadIndustries();
    setIndustry(slug);
    setAddIndustryOpen(false);
  };

  if (!ready || tenantBootLoading || !isSuperAdmin || (isEditMode && isLoading)) {
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

  const stickyHeaderRight = (
    <button
      type="submit"
      form="tenant-form"
      disabled={isSaving || !name.trim()}
      className={`inline-flex items-center justify-center gap-2 ${premiumPrimaryButton('platform', 'md', 'wide')}`}
    >
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          {isEditMode ? 'Save changes' : 'Create tenant'}
        </>
      )}
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
          title={isEditMode ? 'Edit tenant' : 'New tenant'}
          subtitle="Super-admin tenant record — subscription, contact, and organization fields"
          subtitleClassName={`mt-0.5 ${premiumTypography.pageSubtitle} ${pa.subtitleTint}`}
          backHref="/admin/tenants"
          backLabel="Back to tenants"
          right={stickyHeaderRight}
        />
        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        <div className="w-full min-w-0">
          {isEditMode && tenantId ? (
            <p className={`mb-3 font-mono text-[11px] ${premiumTypography.helper}`}>Tenant ID: {tenantId}</p>
          ) : null}

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20 sm:p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Error</p>
                <p className={`mt-1 ${premiumTypography.body} text-red-700 dark:text-red-300`}>{error}</p>
              </div>
            </div>
          )}

          <form id="tenant-form" onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-4 lg:gap-5">
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
              <PremiumCard elevated className="p-4 sm:p-5">
                <PremiumSectionTitle className="mb-3">Identity and status</PremiumSectionTitle>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={`mb-1 block ${premiumTypography.label}`}>
                      Tenant name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Client Name"
                      required
                      className={`w-full ${fieldClass}`}
                    />
                  </div>

                  <div>
                    <label className={`mb-1 block ${premiumTypography.label}`}>Company name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Inc"
                      className={`w-full ${fieldClass}`}
                    />
                  </div>

                  <div>
                    <label className={`mb-1 block ${premiumTypography.label}`}>Slug</label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="client-name"
                      className={`w-full ${fieldClass}`}
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className={`block ${premiumTypography.label}`}>Industry</label>
                      <button
                        type="button"
                        onClick={() => {
                          setNewIndustryName('');
                          setNewIndustryError(null);
                          setAddIndustryOpen(true);
                        }}
                        className={`inline-flex items-center gap-1 text-xs font-medium ${pa.iconColor} hover:underline`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add industry
                      </button>
                    </div>
                    <div className="relative">
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className={`w-full appearance-none pr-10 ${fieldClass}`}
                      >
                        <option value="">— Select industry —</option>
                        {industries.map((opt) => (
                          <option key={opt.id} value={opt.slug}>
                            {opt.label}
                          </option>
                        ))}
                        {industry &&
                        !industries.some((opt) => opt.slug === industry) ? (
                          <option value={industry}>{industry}</option>
                        ) : null}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <TenantLogoField
                      logoUrl={logoUrl.trim() ? logoUrl : null}
                      onLogoUrlChange={(url) => setLogoUrl(url ?? '')}
                      disabled={isSaving}
                      storageTenantId={isEditMode && tenantId ? tenantId : null}
                      label="Logo"
                      labelClassName={`mb-1 block ${premiumTypography.label}`}
                    />
                  </div>

                  <div className="flex flex-col gap-2.5 border-t border-gray-100 pt-3 dark:border-gray-700/80 sm:col-span-2">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className={premiumSurfaces.platformFormCheckbox}
                      />
                      <span className={`${premiumTypography.label}`}>Active</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isTemplate}
                        onChange={(e) => setIsTemplate(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600"
                      />
                      <span>
                        <span className={`${premiumTypography.label} block`}>Template (developer workspace)</span>
                        <span className={`${premiumTypography.helper} mt-0.5 block`}>
                          Golden tenant for provisioning navigation to new tenants. Alternatively set{' '}
                          <code className="rounded bg-gray-100 px-1 text-[11px] dark:bg-gray-900">
                            NEXT_PUBLIC_TEMPLATE_TENANT_ID
                          </code>
                          .
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard elevated className="p-4 sm:p-5">
                <PremiumSectionTitle className="mb-3">Contact</PremiumSectionTitle>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={`mb-1 block ${premiumTypography.label}`}>Contact email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="contact@company.com"
                      className={`w-full ${fieldClass}`}
                    />
                  </div>

                  <div>
                    <label className={`mb-1 block ${premiumTypography.label}`}>Contact phone</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+1 234 567 8900"
                      className={`w-full ${fieldClass}`}
                    />
                  </div>

                  <div>
                    <label className={`mb-1 block ${premiumTypography.label}`}>Website</label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://company.com"
                      className={`w-full ${fieldClass}`}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={`mb-1 block ${premiumTypography.label}`}>Address</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address, City, State, ZIP"
                      rows={2}
                      className={`w-full resize-none ${fieldClass}`}
                    />
                  </div>
                </div>
              </PremiumCard>
            </div>

            <PremiumCard elevated className="p-4 sm:p-5">
              <PremiumSectionTitle className="mb-3">Product catalogue</PremiumSectionTitle>
              <p className={`mb-3 ${premiumTypography.helper}`}>
                How this workspace structures products and variants (simple list, grouped, or matrix).
                Changing mode affects the products UI; existing rows are not deleted.
              </p>
              <div className="space-y-3">
                <label className="flex cursor-pointer gap-3 rounded-lg border border-gray-200 p-3 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50/50 dark:border-gray-600 dark:has-[:checked]:border-amber-600 dark:has-[:checked]:bg-amber-950/30">
                  <input
                    type="radio"
                    name="catalogue_mode"
                    className="mt-1"
                    checked={catalogueMode === 'simple'}
                    onChange={() => setCatalogueMode('simple')}
                    disabled={isSaving}
                  />
                  <span>
                    <span className={`font-medium ${premiumTypography.body} text-gray-900 dark:text-white`}>
                      Simple
                    </span>
                    <span className={`mt-0.5 block text-sm ${premiumTypography.helper}`}>
                      Flat product list — best for straightforward catalogues.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer gap-3 rounded-lg border border-gray-200 p-3 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50/50 dark:border-gray-600 dark:has-[:checked]:border-amber-600 dark:has-[:checked]:bg-amber-950/30">
                  <input
                    type="radio"
                    name="catalogue_mode"
                    className="mt-1"
                    checked={catalogueMode === 'grouped'}
                    onChange={() => setCatalogueMode('grouped')}
                    disabled={isSaving}
                  />
                  <span>
                    <span className={`font-medium ${premiumTypography.body} text-gray-900 dark:text-white`}>
                      Grouped
                    </span>
                    <span className={`mt-0.5 block text-sm ${premiumTypography.helper}`}>
                      Products in groups (e.g. sizes as separate SKUs in one group).
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer gap-3 rounded-lg border border-gray-200 p-3 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50/50 dark:border-gray-600 dark:has-[:checked]:border-amber-600 dark:has-[:checked]:bg-amber-950/30">
                  <input
                    type="radio"
                    name="catalogue_mode"
                    className="mt-1"
                    checked={catalogueMode === 'matrix'}
                    onChange={() => setCatalogueMode('matrix')}
                    disabled={isSaving}
                  />
                  <span>
                    <span className={`font-medium ${premiumTypography.body} text-gray-900 dark:text-white`}>
                      Matrix
                    </span>
                    <span className={`mt-0.5 block text-sm ${premiumTypography.helper}`}>
                      Groups with attribute dimensions (e.g. size × colour) and combination tooling.
                    </span>
                  </span>
                </label>
              </div>
            </PremiumCard>

            <PremiumCard
              elevated
              className="border-amber-200/70 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/25 sm:p-5"
            >
              <PremiumSectionTitle className="mb-3">Subscription and contract</PremiumSectionTitle>
              <p className={`mb-3 ${premiumTypography.helper}`}>
                <Link href="/admin/subscription-packages" className={`${pa.iconColor} font-medium hover:underline`}>
                  Manage subscription packages
                </Link>
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="md:col-span-2 lg:col-span-3">
                  <label className={`mb-1 block ${premiumTypography.label}`}>Subscription package</label>
                  <select
                    value={subscriptionPackageId ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) {
                        setSubscriptionPackageId(null);
                        return;
                      }
                      const pkg = subscriptionPackages.find((p) => p.id === v);
                      setSubscriptionPackageId(v);
                      if (pkg) setSubscriptionTier(pkg.mapped_tier);
                    }}
                    className={`w-full ${fieldClass}`}
                  >
                    <option value="">None — set tier only</option>
                    {subscriptionPackages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.mapped_tier})
                      </option>
                    ))}
                  </select>
                </div>
                  <div>
                    <label className={`mb-1 block ${premiumTypography.label}`}>Subscription tier</label>
                    <select
                      value={subscriptionTier}
                      onChange={(e) => {
                        setSubscriptionTier(e.target.value);
                        setSubscriptionPackageId(null);
                      }}
                      className={`w-full ${fieldClass}`}
                    >
                      <option value="basic">Basic</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                    <p className={`mt-1 ${premiumTypography.helper}`}>
                      Changing tier clears the package link unless you re-select a package.
                    </p>
                  </div>

                  <div>
                    <label className={`mb-1 block ${premiumTypography.label}`}>Max users</label>
                    <input
                      type="number"
                      value={maxUsers}
                      onChange={(e) => setMaxUsers(e.target.value)}
                      min="1"
                      className={`w-full ${fieldClass}`}
                    />
                  </div>

                  <div>
                    <label className={`mb-1 block ${premiumTypography.label}`}>Contract start date</label>
                    <input
                      type="date"
                      value={contractStartDate}
                      onChange={(e) => setContractStartDate(e.target.value)}
                      className={`w-full ${fieldClass}`}
                    />
                  </div>

                  <div>
                    <label className={`mb-1 block ${premiumTypography.label}`}>Contract end date</label>
                    <input
                      type="date"
                      value={contractEndDate}
                      onChange={(e) => setContractEndDate(e.target.value)}
                      className={`w-full ${fieldClass}`}
                    />
                  </div>
                </div>
            </PremiumCard>

            <PremiumCard elevated className="p-4 sm:p-5">
              <PremiumSectionTitle className="mb-3">Additional notes</PremiumSectionTitle>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes about this tenant..."
                rows={3}
                className={`w-full resize-y min-h-[5rem] ${fieldClass}`}
              />
            </PremiumCard>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-200/80 pt-4 dark:border-gray-700/80">
              <button
                type="button"
                onClick={() => router.push('/admin/tenants')}
                disabled={isSaving}
                className={premiumSecondaryButton('platform', 'md', 'auto')}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className={`ms-auto inline-flex items-center gap-2 sm:hidden ${premiumPrimaryButton('platform', 'md', 'auto')}`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEditMode ? 'Save' : 'Create'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {addIndustryOpen ? (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Add industry"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setAddIndustryOpen(false);
            }}
          >
            <PremiumCard elevated className="w-full max-w-md p-5 sm:p-6">
              <div className="mb-3 flex items-start justify-between gap-3">
                <PremiumSectionTitle className="mb-0">Add industry</PremiumSectionTitle>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setAddIndustryOpen(false)}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className={`${premiumTypography.helper} mb-3`}>
                Adds a new industry to the shared list. Available to all tenants going forward.
              </p>
              <label className={`mb-1 block ${premiumTypography.label}`}>Industry name</label>
              <input
                type="text"
                value={newIndustryName}
                onChange={(e) => setNewIndustryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!addingIndustry) void handleAddIndustry();
                  } else if (e.key === 'Escape') {
                    setAddIndustryOpen(false);
                  }
                }}
                placeholder="e.g. Healthcare"
                autoFocus
                disabled={addingIndustry}
                className={`w-full ${fieldClass}`}
                maxLength={80}
              />
              {newIndustryError ? (
                <p className={`mt-2 ${premiumTypography.helper} text-red-600 dark:text-red-400`} role="alert">
                  {newIndustryError}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddIndustryOpen(false)}
                  disabled={addingIndustry}
                  className={premiumSecondaryButton('platform', 'md', 'auto')}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleAddIndustry()}
                  disabled={addingIndustry}
                  className={`inline-flex items-center gap-2 ${premiumPrimaryButton('platform', 'md', 'auto')}`}
                >
                  {addingIndustry ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add
                    </>
                  )}
                </button>
              </div>
            </PremiumCard>
          </div>
        ) : null}

        {catalogueChangeDialogOpen && savedCatalogueBaselineRef.current !== null ? (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm product catalogue mode change"
          >
            <PremiumCard elevated className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 sm:p-6">
              <PremiumSectionTitle className="mb-2">
                Confirm product catalogue mode change
              </PremiumSectionTitle>
              <p className={`${premiumTypography.helper} mb-3`}>
                This only updates the tenant setting. It does not run a database migration or delete product data.
              </p>
              <p className={`${premiumTypography.body} text-gray-800 dark:text-gray-200`}>
                {catalogueModeChangeGuidance(savedCatalogueBaselineRef.current, catalogueMode)}
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setCatalogueChangeDialogOpen(false)}
                  className={premiumSecondaryButton('platform', 'md', 'auto')}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void confirmCatalogueChangeSave()}
                  className={`inline-flex items-center gap-2 ${premiumPrimaryButton('platform', 'md', 'auto')}`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save with new mode
                    </>
                  )}
                </button>
              </div>
            </PremiumCard>
          </div>
        ) : null}
      </PageContainer>
    </ProtectedRoute>
  );
}
