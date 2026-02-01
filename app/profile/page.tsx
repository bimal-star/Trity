'use client';

import { useState, useEffect } from 'react';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import type { UserProfileUpdate } from '@/types/profile';
import { User, Loader2, AlertCircle, Save } from 'lucide-react';

const ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
] as const;

export default function ProfilePage() {
  const { user, tenant_id } = useTenant();
  const { profile, isLoading, error, updateProfile, refresh } = useProfile(user?.id);
  const [fullName, setFullName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Hydrate form from profile when loaded
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    const updates: UserProfileUpdate = { full_name: fullName || null };
    const result = await updateProfile(updates);
    setIsSaving(false);
    if (result.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError(result.error ?? 'Failed to save');
    }
  };

  const email = user?.email ?? profile?.email ?? '';
  const isFormDirty = (profile?.full_name ?? '') !== fullName;
  const roleValue = profile?.role ?? 'member';
  const roleLabel = ROLES.find((r) => r.value === roleValue)?.label ?? roleValue;

  return (
    <ProtectedRoute>
      <PageContainer module={null}>
        {/* Two-Tier Header */}
        <div className="mb-6 -mt-1">
          {/* Primary Row - Title with Icon */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-600 dark:text-gray-400">
              Profile
            </h1>
          </div>
          {/* Secondary Row - Supporting Text */}
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
            Manage your account information and preferences
          </p>
        </div>

        {/* Subtle Divider */}
        <div className="h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent mb-4" />

        <div className="max-w-2xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Loader2 className="w-8 h-8 animate-spin text-green-600 dark:text-green-400 mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading profile…</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Cannot load profile</p>
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
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Your profile
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {tenant_id ? 'Tenant-scoped • Updates save to public.user_profiles' : 'Complete your profile'}
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-full_name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Full name
                  </label>
                  <input
                    id="profile-full_name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Jane Doe"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Read-only. Email is managed by your account.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="profile-role"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Role
                  </label>
                  <input
                    id="profile-role"
                    type="text"
                    value={roleLabel}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Managed by admins on the Users page.
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
                    <p className="text-sm text-green-700 dark:text-green-300">Profile saved.</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving || !isFormDirty}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
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
