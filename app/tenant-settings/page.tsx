'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { useTenantDetails } from '@/hooks/useTenantDetails';
import type { TenantDetailsUpdate } from '@/types/profile';
import { Building2, Loader2, AlertCircle, Save, Settings } from 'lucide-react';

export default function TenantSettingsPage() {
  const router = useRouter();
  const { user, tenant_id } = useTenant();
  const { profile, isLoading: profileLoading } = useProfile(user?.id);
  const { tenant, isLoading: tenantLoading, error, updateTenant, refresh } = useTenantDetails(tenant_id);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [settingsJson, setSettingsJson] = useState('{}');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    let settings: Record<string, unknown> | null = null;
    const trimmed = settingsJson.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        settings = typeof parsed === 'object' && parsed !== null ? parsed : null;
      } catch {
        setSaveError('Settings must be valid JSON.');
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
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError(result.error ?? 'Failed to save');
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
        <PageContainer title="Tenant Setup">
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
        {/* Two-Tier Header */}
        <div className="mb-6 -mt-1">
          {/* Primary Row - Title with Icon */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2">
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-600 dark:text-gray-400">
              Tenant Settings
            </h1>
          </div>
          {/* Secondary Row - Supporting Text */}
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
            Configure workspace name, branding, and organization settings
          </p>
        </div>

        {/* Subtle Divider */}
        <div className="h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent mb-4" />

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
                  <label
                    htmlFor="tenant-logo_url"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Logo URL
                  </label>
                  <input
                    id="tenant-logo_url"
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="https://…"
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

                {saveError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{saveError}</p>
                  </div>
                )}
                {saveSuccess && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-300">Tenant saved.</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving || !isFormDirty}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
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
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
