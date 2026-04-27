'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { useSubscriptionPackages } from '@/hooks/useSubscriptionPackages';
import { isSuperAdminRole } from '@/lib/permissions';
import type { SubscriptionTier } from '@/lib/featureFlags';
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
import { Loader2, Package } from 'lucide-react';

export default function EditSubscriptionPackagePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, ready, isLoading: tenantBootLoading } = useTenant();
  const { profile } = useProfile(user?.id);
  const { getById, updatePackage } = useSubscriptionPackages();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mappedTier, setMappedTier] = useState<SubscriptionTier>('basic');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isSuperAdmin = isSuperAdminRole(profile?.role);
  const pa = pillarAccent('platform');
  const fieldClass = `${premiumInputComfortableBase} ${premiumFocusRing('platform')}`;

  useEffect(() => {
    if (!ready || tenantBootLoading || !user) return;
    if (profile && !isSuperAdmin) router.replace('/');
  }, [ready, tenantBootLoading, user, profile, isSuperAdmin, router]);

  useEffect(() => {
    if (!isSuperAdmin || !id) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      const row = await getById(id);
      if (cancelled) return;
      if (!row) {
        setLoadError('Package not found');
        setIsLoading(false);
        return;
      }
      setName(row.name);
      setDescription(row.description ?? '');
      setMappedTier(row.mapped_tier);
      setIsActive(row.is_active);
      setSortOrder(String(row.sort_order));
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, id, getById]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setIsSaving(true);
    const { success, error } = await updatePackage(id, {
      name: name.trim(),
      description: description.trim() || null,
      mapped_tier: mappedTier,
      is_active: isActive,
      sort_order: parseInt(sortOrder, 10) || 0,
    });
    setIsSaving(false);
    if (!success) {
      toast.error(error ?? 'Failed to save');
      return;
    }
    toast.success('Subscription package updated.');
    router.push('/admin/subscription-packages');
  };

  if (!ready || tenantBootLoading || !isSuperAdmin) {
    return (
      <ProtectedRoute>
        <PageContainer
          module={null}
          rootClassName={premiumSurfaces.platformPageRoot}
          innerClassName={premiumSurfaces.platformPageInner}
        >
          <div className="flex justify-center py-16">
            <Loader2 className={`h-8 w-8 animate-spin ${pa.iconColor}`} />
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <PageContainer
          module={null}
          rootClassName={premiumSurfaces.platformPageRoot}
          innerClassName={premiumSurfaces.platformPageInner}
        >
          <div className="flex justify-center py-16">
            <Loader2 className={`h-8 w-8 animate-spin ${pa.iconColor}`} />
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  if (loadError) {
    return (
      <ProtectedRoute>
        <PageContainer
          module={null}
          rootClassName={premiumSurfaces.platformPageRoot}
          innerClassName={premiumSurfaces.platformPageInner}
        >
          <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          <Link
            href="/admin/subscription-packages"
            className={`mt-4 inline-block ${premiumSecondaryButton('platform', 'md', 'auto')}`}
          >
            Back to packages
          </Link>
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
          icon={Package}
          title="Edit subscription package"
          subtitle="Changes apply to new tenant assignments; existing tenants keep stored tier until edited"
          subtitleClassName={`mt-0.5 ${premiumTypography.pageSubtitle} ${pa.subtitleTint}`}
          backHref="/admin/subscription-packages"
          backLabel="All packages"
        />
        <form
          onSubmit={onSubmit}
          className={`max-w-xl space-y-4 rounded-2xl ${premiumSurfaces.cardElevated} p-6`}
        >
          <div>
            <label className={`mb-1.5 block ${premiumTypography.label}`}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full ${fieldClass}`}
              required
            />
          </div>
          <div>
            <label className={`mb-1.5 block ${premiumTypography.label}`}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`w-full resize-none ${fieldClass}`}
            />
          </div>
          <div>
            <label className={`mb-1.5 block ${premiumTypography.label}`}>Mapped tier</label>
            <select
              value={mappedTier}
              onChange={(e) => setMappedTier(e.target.value as SubscriptionTier)}
              className={`w-full ${fieldClass}`}
            >
              <option value="basic">Basic</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`mb-1.5 block ${premiumTypography.label}`}>Sort order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className={`w-full ${fieldClass}`}
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Active
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/admin/subscription-packages"
              className={premiumSecondaryButton('platform', 'md', 'auto')}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className={premiumPrimaryButton('platform', 'md', 'wide')}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </button>
          </div>
        </form>
      </PageContainer>
    </ProtectedRoute>
  );
}
