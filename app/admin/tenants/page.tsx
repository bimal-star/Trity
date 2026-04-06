'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabaseClient';
import { logTenantCreated, logTenantUpdated } from '@/lib/auditLog';
import { Building2, Plus, Loader2, AlertCircle, Check, X, Eye } from 'lucide-react';
import { isDevAutoImpersonateEnabled } from '@/lib/impersonation';

interface Tenant {
  id: string;
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
  max_users: number | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  notes: string | null;
  created_at: string;
  created_by?: string;
  updated_by?: string;
  user_count?: number;
}

export default function AdminTenantsPage() {
  const router = useRouter();
  const { user, startTenantImpersonation, impersonation } = useTenant();
  const { profile, isLoading: profileLoading } = useProfile(user?.id);
  const { can, isSuperAdmin } = usePermissions();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [impersonateTenantId, setImpersonateTenantId] = useState<string | null>(null);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);

  const canManageTenants = can('manage_features') && isSuperAdmin;

  // Redirect non-super-admins
  useEffect(() => {
    if (profileLoading || !user) return;
    if (profile && !canManageTenants) {
      router.replace('/');
    }
  }, [profileLoading, user, profile, canManageTenants, router]);

  // Fetch all tenants
  const fetchTenants = useCallback(async () => {
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
  }, [canManageTenants]);

  useEffect(() => {
    if (canManageTenants) {
      void fetchTenants();
    }
  }, [canManageTenants, fetchTenants]);

  const handleSaveTenant = async (data: Partial<Tenant>) => {
    setIsSaving(true);
    setModalError(null);

    try {
      const tenantData = {
        name: data.name,
        company_name: data.company_name || null,
        slug: data.slug || null,
        is_active: data.is_active !== false,
        logo_url: data.logo_url || null,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        address: data.address || null,
        website: data.website || null,
        industry: data.industry || null,
        subscription_tier: data.subscription_tier || 'basic',
        max_users: data.max_users || 10,
        contract_start_date: data.contract_start_date || null,
        contract_end_date: data.contract_end_date || null,
        notes: data.notes || null,
      };

      if (selectedTenant) {
        const { error } = await supabase
          .from('tenants')
          .update(tenantData)
          .eq('id', selectedTenant.id);
        if (error) throw error;

        // Log the update
        await logTenantUpdated(selectedTenant.id, tenantData, user?.id ?? null);
      } else {
        const { data: newTenant, error } = await supabase
          .from('tenants')
          .insert([tenantData])
          .select()
          .single();
        if (error) throw error;

        // Log the creation
        if (newTenant) {
          await logTenantCreated(newTenant.id, newTenant.name, user?.id ?? null);
          if (isDevAutoImpersonateEnabled()) {
            try {
              await startTenantImpersonation(newTenant.id, { readOnly: false });
            } catch (e) {
              console.warn('Dev auto-impersonate failed:', e);
            }
          }
        }
      }

      await fetchTenants();
      setShowTenantModal(false);
      setSelectedTenant(null);
    } catch (err) {
      console.error('Error saving tenant:', err);
      setModalError(err instanceof Error ? err.message : 'Failed to save tenant');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTenantActive = async (tenantId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ is_active: !currentActive })
        .eq('id', tenantId);

      if (error) throw error;

      // Log the status change
      await logTenantUpdated(tenantId, { is_active: !currentActive }, user?.id ?? null);

      await fetchTenants();
    } catch (err) {
      console.error('Error toggling tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to update tenant');
    }
  };

  const handleViewAsTenant = async (id: string) => {
    setImpersonateTenantId(id);
    setImpersonateError(null);
    try {
      await startTenantImpersonation(id, { readOnly: !isDevAutoImpersonateEnabled() });
    } catch (e) {
      setImpersonateError(e instanceof Error ? e.message : 'Impersonation failed');
    } finally {
      setImpersonateTenantId(null);
    }
  };

  const isSuperAdminReady = profileLoading === false && canManageTenants;

  if (!isSuperAdminReady) {
    return (
      <ProtectedRoute>
        <PageContainer title="Admin: Tenants" description="Loading...">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageContainer
        title="Tenant Management"
        description="Super Admin: Manage all tenants (clients)"
      >
        <div className="space-y-6">
          {/* Header with Create Button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Tenants</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage client organizations
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedTenant(null);
                setShowTenantModal(true);
                setModalError(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Tenant
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Error loading tenants</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          {impersonateError && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
              {impersonateError}
            </div>
          )}

          {isDevAutoImpersonateEnabled() && (
            <p className="text-xs text-amber-700 dark:text-amber-300/90">
              Dev: new tenants auto-open in read/write impersonation (
              <code className="rounded bg-amber-100/20 px-1">
                NEXT_PUBLIC_DEV_AUTO_IMPERSONATE=true
              </code>
              ).
            </p>
          )}

          {/* Tenants List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tenants found</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {tenant.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {tenant.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {tenant.company_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {tenant.slug || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {tenant.user_count} users
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewAsTenant(tenant.id)}
                            disabled={
                              impersonateTenantId === tenant.id ||
                              impersonation?.targetTenantId === tenant.id
                            }
                            className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 disabled:opacity-50"
                          >
                            {impersonateTenantId === tenant.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                            View as tenant
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setShowTenantModal(true);
                              setModalError(null);
                            }}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                          >
                            Edit Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tenant Form Modal */}
        {showTenantModal && (
          <TenantFormModal
            tenant={selectedTenant}
            onClose={() => {
              setShowTenantModal(false);
              setSelectedTenant(null);
              setModalError(null);
            }}
            onSave={handleSaveTenant}
            isSaving={isSaving}
            error={modalError}
          />
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}

function TenantFormModal({
  tenant,
  onClose,
  onSave,
  isSaving,
  error,
}: {
  tenant: Tenant | null;
  onClose: () => void;
  onSave: (data: Partial<Tenant>) => Promise<void>;
  isSaving: boolean;
  error: string | null;
}) {
  const [name, setName] = useState(tenant?.name || '');
  const [companyName, setCompanyName] = useState(tenant?.company_name || '');
  const [slug, setSlug] = useState(tenant?.slug || '');
  const [logoUrl, setLogoUrl] = useState(tenant?.logo_url || '');
  const [contactEmail, setContactEmail] = useState(tenant?.contact_email || '');
  const [contactPhone, setContactPhone] = useState(tenant?.contact_phone || '');
  const [address, setAddress] = useState(tenant?.address || '');
  const [website, setWebsite] = useState(tenant?.website || '');
  const [industry, setIndustry] = useState(tenant?.industry || '');
  const [subscriptionTier, setSubscriptionTier] = useState(tenant?.subscription_tier || 'basic');
  const [maxUsers, setMaxUsers] = useState(tenant?.max_users?.toString() || '10');
  const [contractStartDate, setContractStartDate] = useState(tenant?.contract_start_date || '');
  const [contractEndDate, setContractEndDate] = useState(tenant?.contract_end_date || '');
  const [notes, setNotes] = useState(tenant?.notes || '');
  const [isActive, setIsActive] = useState(tenant?.is_active !== false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({
        name: name.trim(),
        company_name: companyName.trim(),
        slug: slug.trim(),
        logo_url: logoUrl.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        address: address.trim(),
        website: website.trim(),
        industry: industry.trim(),
        subscription_tier: subscriptionTier,
        max_users: parseInt(maxUsers) || 10,
        contract_start_date: contractStartDate || null,
        contract_end_date: contractEndDate || null,
        notes: notes.trim(),
        is_active: isActive,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {tenant ? 'Edit Tenant' : 'Create New Tenant'}
            </h3>
            {tenant && (
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                ID: {tenant.id}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-x-6 gap-y-5">
            {/* Column 1: Basic Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700">
                Basic Information
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Tenant Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Client Name"
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Inc"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="client-name"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Industry
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Technology, Healthcare..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active
                  </span>
                </label>
              </div>
            </div>

            {/* Column 2: Contact Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700">
                Contact Information
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://company.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Address
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, City, State, ZIP"
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Column 3: Subscription & Notes */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700">
                Subscription & Contract
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Subscription Tier
                </label>
                <select
                  value={subscriptionTier}
                  onChange={(e) => setSubscriptionTier(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="basic">Basic</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Max Users
                </label>
                <input
                  type="number"
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(e.target.value)}
                  min="1"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Contract Start Date
                </label>
                <input
                  type="date"
                  value={contractStartDate}
                  onChange={(e) => setContractStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Contract End Date
                </label>
                <input
                  type="date"
                  value={contractEndDate}
                  onChange={(e) => setContractEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Internal Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes about this tenant..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="flex-1 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? 'Saving...' : tenant ? 'Update Tenant' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
