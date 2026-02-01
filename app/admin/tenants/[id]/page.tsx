'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabaseClient';
import { Building2, Loader2, AlertCircle, Save, ArrowLeft, Users, Calendar } from 'lucide-react';

interface TenantDetails {
  id: string;
  name: string;
  company_name: string | null;
  slug: string | null;
  is_active: boolean;
  logo_url: string | null;
  settings: any;
  created_at: string;
  updated_at: string;
}

interface TenantUser {
  email: string;
  role: string;
  full_name: string | null;
}

export default function TenantDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id as string;
  const { user } = useTenant();
  const { profile, isLoading: profileLoading } = useProfile(user?.id);
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [settingsJson, setSettingsJson] = useState('{}');

  const isSuperAdmin = profile?.role === 'super_admin';

  // Redirect non-super-admins
  useEffect(() => {
    if (profileLoading || !user) return;
    if (profile && !isSuperAdmin) {
      router.replace('/');
    }
  }, [profileLoading, user, profile, isSuperAdmin, router]);

  // Fetch tenant details
  const fetchTenant = async () => {
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
      setName(tenantData.name);
      setCompanyName(tenantData.company_name || '');
      setSlug(tenantData.slug || '');
      setLogoUrl(tenantData.logo_url || '');
      setIsActive(tenantData.is_active);
      setSettingsJson(
        tenantData.settings && Object.keys(tenantData.settings).length > 0
          ? JSON.stringify(tenantData.settings, null, 2)
          : '{}'
      );

      // Fetch users for this tenant
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('email, role, full_name')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);
    } catch (err) {
      console.error('Error fetching tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && tenantId) {
      fetchTenant();
    }
  }, [isSuperAdmin, tenantId]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      let parsedSettings = null;
      if (settingsJson.trim()) {
        try {
          parsedSettings = JSON.parse(settingsJson);
        } catch {
          throw new Error('Invalid JSON in settings field');
        }
      }

      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          name,
          company_name: companyName || null,
          slug: slug || null,
          logo_url: logoUrl || null,
          is_active: isActive,
          settings: parsedSettings,
        })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      setSaveSuccess(true);
      await fetchTenant();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving tenant:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save tenant');
    } finally {
      setIsSaving(false);
    }
  };

  if (profileLoading || !isSuperAdmin) {
    return (
      <ProtectedRoute>
        <PageContainer title="Tenant Details" description="Loading...">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageContainer title="Tenant Details" description="Edit tenant configuration">
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => router.push('/admin/tenants')}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all tenants
          </button>

          {/* Error Display */}
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
            <div className="flex items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : tenant ? (
            <div className="grid gap-6">
              {/* Tenant Form */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tenant Configuration</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">ID: {tenant.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                {saveError && (
                  <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                    <p className="text-sm text-red-700 dark:text-red-300">{saveError}</p>
                  </div>
                )}

                {saveSuccess && (
                  <div className="mb-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3">
                    <p className="text-sm text-green-700 dark:text-green-300">Changes saved successfully!</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Logo URL
                    </label>
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Settings (JSON)
                    </label>
                    <textarea
                      value={settingsJson}
                      onChange={(e) => setSettingsJson(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Users List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Users ({users.length})
                  </h3>
                </div>

                {users.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No users in this tenant</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((user, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.full_name || user.email}
                          </p>
                          {user.full_name && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                          )}
                        </div>
                        <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-full">
                          {user.role}
                        </span>
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
