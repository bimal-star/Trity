'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { useTenantDetails } from '@/hooks/useTenantDetails';
import type { TenantDetailsUpdate } from '@/types/profile';
import { pillarAccent, premiumPrimaryButton, premiumTypography } from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import TenantLogoField from '@/components/tenants/TenantLogoField';
import { Building2, Loader2, AlertCircle, Save, Settings } from 'lucide-react';

const ex = pillarAccent('execution');

export default function TenantSettingsPage() {
  const router = useRouter();
  const { user, effectiveTenantId: tenant_id, refreshCatalogueMode } = useTenant();
  const { profile, isLoading: profileLoading } = useProfile(user?.id);
  const {
    tenant,
    isLoading: tenantLoading,
    error,
    updateTenant,
    refresh,
  } = useTenantDetails(tenant_id);
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [settingsJson, setSettingsJson] = useState('{}');
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  useEffect(() => {
    if (!tenant) return;
    setName(tenant.name ?? '');
    setCompanyName(tenant.company_name ?? '');
    setSlug(tenant.slug ?? '');
    setLogoUrl(tenant.logo_url ?? '');
    setSettingsJson(
      tenant.settings && Object.keys(tenant.settings).length > 0
        ? JSON.stringify(tenant.settings, null, 2)
        : '{}'
    );
  }, [tenant]);

  useEffect(() => {
    if (profileLoading || !user || !tenant_id) return;
    // Only redirect when we've loaded profile and confirmed non-admin.
    // Avoid redirecting on reload/return when profile is still null.
    if (profile != null && !isAdmin) {
      router.replace('/');
    }
  }, [profileLoading, user, tenant_id, profile, isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    let settings: Record<string, unknown> | null = null;
    const trimmed = settingsJson.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        settings = typeof parsed === 'object' && parsed !== null ? parsed : null;
      } catch {
        toast.error('Settings must be valid JSON.');
        setIsSaving(false);
        return;
      }
    }
    const updates: TenantDetailsUpdate = {
      name: name || undefined,
      company_name: companyName || null,
      slug: slug || null,
      logo_url: logoUrl || null,
      settings: settings,
    };
    const result = await updateTenant(updates);
    setIsSaving(false);
    if (result.success) {
      void refreshCatalogueMode();
      toast.success('Tenant saved.');
    } else {
      toast.error(result.error ?? 'Failed to save');
    }
  };

  const tenantSettingsStr =
    tenant?.settings && Object.keys(tenant.settings).length > 0
      ? JSON.stringify(tenant.settings, null, 2)
      : '{}';
  const isFormDirty =
    (tenant?.name ?? '') !== name ||
    (tenant?.company_name ?? '') !== companyName ||
    (tenant?.slug ?? '') !== slug ||
    (tenant?.logo_url ?? '') !== logoUrl ||
    tenantSettingsStr !== settingsJson.trim();

  const isAdminReady = profile != null && isAdmin;
  const isRedirecting = profile != null && !isAdmin;
  if (!isAdminReady) {
    return (
      <ProtectedRoute>
        <PageContainer module="execution">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400 mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isRedirecting ? 'Redirecting…' : 'Loading…'}
            </p>
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageContainer module="execution">
        <PremiumStickyHeader
          module="execution"
          icon={Settings}
          title="Tenant Settings"
          subtitle="Configure workspace name, branding, and organization settings"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${ex.subtitleTint}`}
        />

        <div className="max-w-2xl">
          {tenantLoading ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400 mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading tenant…</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Cannot load tenant</p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
                <button
                  type="button"
                  onClick={() => refresh()}
                  className="mt-2 text-sm font-medium text-red-700 dark:text-red-400 hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Tenant details
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Loaded from public.tenants • Filtered by tenant_id
                      </p>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="tenant-name"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Name
                    </label>
                    <input
                      id="tenant-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Acme Inc"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tenant-company_name"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Company name
                    </label>
                    <input
                      id="tenant-company_name"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Acme Corporation"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tenant-slug"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Slug
                    </label>
                    <input
                      id="tenant-slug"
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="acme"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Optional. Unique identifier for URLs.
                    </p>
                  </div>

                  <div>
                    <TenantLogoField
                      logoUrl={logoUrl.trim() ? logoUrl : null}
                      onLogoUrlChange={(url) => setLogoUrl(url ?? '')}
                      disabled={isSaving}
                      label="Logo"
                      labelClassName="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Optional.</p>
                  </div>

                  <div>
                    <label
                      htmlFor="tenant-settings"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Settings (JSON)
                    </label>
                    <textarea
                      id="tenant-settings"
                      value={settingsJson}
                      onChange={(e) => setSettingsJson(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                      placeholder='{"theme": "dark", "locale": "en"}'
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Optional. Valid JSON object. Invalid JSON is ignored on save.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSaving || !isFormDirty}
                      className={premiumPrimaryButton('execution', 'md', 'wide')}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isSaving ? 'Saving…' : 'Save'}
                    </button>
                    {!isFormDirty && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No changes</span>
                    )}
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
