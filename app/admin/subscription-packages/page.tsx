'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { useSubscriptionPackages } from '@/hooks/useSubscriptionPackages';
import { isSuperAdminRole } from '@/lib/permissions';
import {
  pillarAccent,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumSurfaces,
  premiumTypography,
} from '@/lib/premiumUi';
import type { SubscriptionPackageRow } from '@/types/subscriptionPackage';
import { Loader2, Package, Plus, Pencil, Trash2 } from 'lucide-react';

export default function SubscriptionPackagesPage() {
  const router = useRouter();
  const { user, ready, isLoading: tenantBootLoading } = useTenant();
  const { profile } = useProfile(user?.id);
  const { listAll, removePackage, isLoading, error } = useSubscriptionPackages();
  const [rows, setRows] = useState<SubscriptionPackageRow[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isSuperAdmin = isSuperAdminRole(profile?.role);
  const pa = pillarAccent('platform');

  useEffect(() => {
    if (!ready || tenantBootLoading || !user) return;
    if (profile && !isSuperAdmin) {
      router.replace('/');
    }
  }, [ready, tenantBootLoading, user, profile, isSuperAdmin, router]);

  const refresh = async () => {
    const data = await listAll();
    setRows(data);
  };

  useEffect(() => {
    if (isSuperAdmin) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listAll stable enough; refresh on mount
  }, [isSuperAdmin]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this package? Tenants using it will have subscription_package_id cleared.')) return;
    setDeletingId(id);
    const { success } = await removePackage(id);
    setDeletingId(null);
    if (success) await refresh();
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
          title="Subscription packages"
          subtitle="Define named SKUs mapped to Basic / Professional / Enterprise for feature and navigation defaults"
          subtitleClassName={`mt-0.5 ${premiumTypography.pageSubtitle} ${pa.subtitleTint}`}
          backHref="/admin/tenants"
          backLabel="Back to tenants"
        />
        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/subscription-packages/new" className={premiumPrimaryButton('platform', 'md', 'wide')}>
            <Plus className="h-4 w-4" aria-hidden />
            New package
          </Link>
        </div>

        {error && (
          <div className={`mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300`}>
            {error}
          </div>
        )}

        <div className={`overflow-hidden rounded-2xl ${premiumSurfaces.cardElevated}`}>
          {isLoading && rows.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className={`h-8 w-8 animate-spin ${pa.iconColor}`} />
            </div>
          ) : rows.length === 0 ? (
            <p className={`p-6 ${premiumTypography.helper}`}>No packages yet. Create one or run DB migrations to seed defaults.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={`border-b border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/40`}>
                  <tr>
                    <th className={`px-4 py-3 ${premiumTypography.tableHeader}`}>Name</th>
                    <th className={`px-4 py-3 ${premiumTypography.tableHeader}`}>Mapped tier</th>
                    <th className={`px-4 py-3 ${premiumTypography.tableHeader}`}>Active</th>
                    <th className={`px-4 py-3 ${premiumTypography.tableHeader}`}>Sort</th>
                    <th className={`px-4 py-3 text-right ${premiumTypography.tableHeader}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                      <td className={`px-4 py-3 ${premiumTypography.tableCell}`}>
                        <div className="font-medium text-gray-900 dark:text-white">{r.name}</div>
                        {r.description ? (
                          <div className={`mt-0.5 max-w-md truncate ${premiumTypography.helper}`}>{r.description}</div>
                        ) : null}
                      </td>
                      <td className={`px-4 py-3 capitalize ${premiumTypography.tableCell}`}>{r.mapped_tier}</td>
                      <td className={`px-4 py-3 ${premiumTypography.tableCell}`}>{r.is_active ? 'Yes' : 'No'}</td>
                      <td className={`px-4 py-3 ${premiumTypography.tableCell}`}>{r.sort_order}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          <Link
                            href={`/admin/subscription-packages/${r.id}`}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium ${premiumSecondaryButton('platform', 'sm', 'auto')}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Edit
                          </Link>
                          <button
                            type="button"
                            disabled={deletingId === r.id}
                            onClick={() => void handleDelete(r.id)}
                            className={`inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40`}
                          >
                            {deletingId === r.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            )}
                            Delete
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
      </PageContainer>
    </ProtectedRoute>
  );
}
