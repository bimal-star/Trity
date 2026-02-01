'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/navigation/Sidebar';
import { LayoutSkeleton } from '@/components/LayoutSkeleton';
import { useTenant } from '@/contexts/TenantContext';

/**
 * Main content area. Stable across route changes – we avoid key={pathname} so the
 * layout does not unmount/remount on navigation, preventing blank flash.
 * Page-level hooks (useCalendar, useProducts, etc.) refetch when pathname changes.
 */
function Main({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex-1 transition-all duration-500"
      style={{ marginLeft: 'var(--sidebar-width, 246px)' }}
    >
      {children}
    </main>
  );
}

/**
 * LayoutWrapper – authenticated layout gate.
 *
 * IMPORTANT: This component uses pathname ONLY for conditional rendering.
 * It does NOT trigger any data fetching or re-validation.
 *
 * Behavior:
 * - Login page: render children only (no sidebar)
 * - Non-login pages:
 *   - !ready: show LayoutSkeleton (waiting for TenantContext to load)
 *   - ready && !user: redirect to /login (read-only check, no fetching)
 *   - ready && user: render Sidebar + Main + children
 *
 * Stability guarantees:
 * - Uses pathname ONLY for determining which layout to show
 * - Does NOT trigger re-fetching of session/profile/tenant/features
 * - Does NOT cause TenantContext to re-validate
 * - All data comes from cached TenantContext values
 * - Navigation is instant because no async operations run
 *
 * The redirect logic is purely client-side routing - it doesn't fetch anything.
 */
export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, user } = useTenant(); // Read-only access to cached values
  const publicPaths = ['/login', '/reset-password'];
  const isPublicPage = publicPaths.includes(pathname);

  /**
   * Redirect effect - ONLY handles routing, never fetches data
   * 
   * This effect:
   * - Checks if user is authenticated (using cached value from TenantContext)
   * - Redirects to login if not authenticated
   * - Does NOT trigger any data fetching
   * - Does NOT cause TenantContext to re-validate
   * 
   * The user value comes from TenantContext's cached state, which was loaded
   * once on app mount. This is just a read operation.
   */
  useEffect(() => {
    if (!ready || isPublicPage) return;
    if (!user) {
      console.log('⚠️ No user found, redirecting to login after delay');
      // Add a small delay to prevent redirect loops
      const timeout = setTimeout(() => {
        router.replace('/login');
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [ready, user, isPublicPage, router]);

  if (isPublicPage) {
    return <div key="public">{children}</div>;
  }

  if (!ready) {
    return <LayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <Main>{children}</Main>
    </div>
  );
}
