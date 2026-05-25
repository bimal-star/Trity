'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Hash, Loader2, AlertCircle } from 'lucide-react';
import DocumentCodeFormatCard from '@/components/settings/DocumentCodeFormatCard';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { useTenantDocumentCodeFormats } from '@/hooks/useTenantDocumentCodeFormats';
import { pillarAccent, premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';

const ex = pillarAccent('execution');

export default function DocumentCodeFormatsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, effectiveTenantId: tenant_id } = useTenant();
  const { profile, isLoading: profileLoading } = useProfile(user?.id);
  const { formats, isLoading, error, refresh, updateFormat } = useTenantDocumentCodeFormats();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  useEffect(() => {
    if (profileLoading || !user || !tenant_id) return;
    if (profile != null && !isAdmin) {
      router.replace('/');
    }
  }, [profileLoading, user, tenant_id, profile, isAdmin, router]);

  const handleSave = async (
    documentType: Parameters<typeof updateFormat>[0],
    patch: Parameters<typeof updateFormat>[1]
  ) => {
    const result = await updateFormat(documentType, patch);
    if (result.success) toast.success('Code format saved.');
    else toast.error(result.error ?? 'Failed to save');
    return result;
  };

  if (profileLoading || profile == null || !isAdmin) {
    return (
      <ProtectedRoute>
        <PageContainer module="execution" innerClassName={premiumSurfaces.pageInnerWide}>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageContainer module="execution" innerClassName={premiumSurfaces.pageInnerWide}>
        <PremiumStickyHeader
          module="execution"
          icon={Hash}
          title="Document codes"
          subtitle="Tenant-scoped formats for products, customers, suppliers, BOMs, and transactions"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${ex.subtitleTint}`}
          backHref="/tenant-settings"
          backLabel="Tenant settings"
        />

        <div className="flex min-h-0 w-full flex-1 flex-col">
          <p className={`mb-4 w-full ${premiumTypography.helper}`}>
            Uncheck <strong>Auto Create</strong> to edit the <strong>custom format</strong> (or use{' '}
            <strong>Quick adjust</strong>). Check <strong>Auto Create</strong> to generate codes on
            new records using the saved pattern. Saving does not change existing codes.
          </p>

          {isLoading ? (
            <div className="flex w-full items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
            </div>
          ) : error ? (
            <div className="flex w-full items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Cannot load formats</p>
                <p className="mt-1 text-sm text-red-600 dark:text-red-300">{error}</p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="mt-2 text-sm font-medium text-red-700 hover:underline dark:text-red-400"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-2">
              {formats.map((fmt) => (
                <DocumentCodeFormatCard key={fmt.document_type} format={fmt} onSave={handleSave} />
              ))}
            </div>
          )}

          <div className="mt-4 w-full">
            <Link
              href="/tenant-settings"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-700 hover:underline dark:text-purple-400"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to tenant settings
            </Link>
          </div>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
