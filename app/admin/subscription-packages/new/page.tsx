'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

export default function NewSubscriptionPackagePage() {
  const router = useRouter();
  const { user, ready, isLoading: tenantBootLoading } = useTenant();
  const { profile } = useProfile(user?.id);
  const { createPackage } = useSubscriptionPackages();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mappedTier, setMappedTier] = useState<SubscriptionTier>('basic');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  const isSuperAdmin = isSuperAdminRole(profile?.role);
  const pa = pillarAccent('platform');
  const fieldClass = `${premiumInputComfortableBase} ${premiumFocusRing('platform')}`;

  useEffect(() => {
    if (!ready || tenantBootLoading || !user) return;
    if (profile && !isSuperAdmin) router.replace('/');
  }, [ready, tenantBootLoading, user, profile, isSuperAdmin, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setIsSaving(true);
    const { data, error } = await createPackage({
      name: name.trim(),
      description: description.trim() || null,
      mapped_tier: mappedTier,
      is_active: isActive,
      sort_order: parseInt(sortOrder, 10) || 0,
    });
    setIsSaving(false);
    if (error || !data) {
      toast.error(error ?? 'Failed to create');
      return;
    }
    toast.success('Subscription package created.');
    router.push('/admin/subscription-packages');
  };

  if (!ready || tenantBootLoading || !isSuperAdmin) {
    return (
      <ProtectedRoute>
        <PageContainer module={null} rootClassName={premiumSurfaces.platformPageRoot} innerClassName={premiumSurfaces.platformPageInner}>
          <div className="flex justify-center py-16">
            <Loader2 className={`h-8 w-8 animate-spin ${pa.iconColor}`} />
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageContainer module={null} rootClassName={premiumSurfaces.platformPageRoot} innerClassName={premiumSurfaces.platformPageInner}>
        <PremiumStickyHeader
          module="platform"
          className={premiumSurfaces.platformStickyHeaderOffset}
          icon={Package}
          title="New subscription package"
          subtitle="Maps to a tier template for feature flags and navigation presets"
          subtitleClassName={`mt-0.5 ${premiumTypography.pageSubtitle} ${pa.subtitleTint}`}
          backHref="/admin/subscription-packages"
          backLabel="All packages"
        />
        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        <form onSubmit={onSubmit} className={`max-w-xl space-y-4 rounded-2xl ${premiumSurfaces.cardElevated} p-6`}>
          <div>
            <label className={`mb-1.5 block ${premiumTypography.label}`}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={`w-full ${fieldClass}`} required />
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
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300" />
                Active (selectable on tenants)
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/admin/subscription-packages" className={premiumSecondaryButton('platform', 'md', 'auto')}>
              Cancel
            </Link>
            <button type="submit" disabled={isSaving} className={premiumPrimaryButton('platform', 'md', 'wide')}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create package
            </button>
          </div>
        </form>
      </PageContainer>
    </ProtectedRoute>
  );
}
