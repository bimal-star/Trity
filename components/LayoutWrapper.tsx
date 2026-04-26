'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { TopNav } from '@/components/navigation/TopNav';
import { LayoutSkeleton } from '@/components/LayoutSkeleton';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/lib/supabaseClient';
import { mainTopNavSpacerClass } from '@/lib/appChrome';

/**
 * Main content area. Stable across route changes – we avoid key={pathname} so the
 * layout does not unmount/remount on navigation, preventing blank flash.
 * Page-level hooks (useCalendar, useProducts, etc.) refetch when pathname changes.
 */
function Main({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-0 w-full flex-1 flex-col transition-all duration-500">
      <div aria-hidden className={`pointer-events-none ${mainTopNavSpacerClass}`} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
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
 *   - !ready: show LayoutSkeleton (waiting for session + tenant resolution)
 *   - ready && !user: confirm with supabase.auth.getSession() before sending to /login — avoids
 *     bouncing right after sign-in when React context has not applied SIGNED_IN yet.
 *   - ready && user: render TopNav + Main + children (primary nav in TopNav)
 *
 * Stability guarantees:
 * - Uses pathname ONLY for determining which layout to show
 * - Does NOT trigger re-fetching of session/profile/tenant/features
 * - Does NOT cause TenantContext to re-validate
 * - All data comes from cached TenantContext values
 * - Navigation is instant because no async operations run
 *
 * Guest redirect uses getSession() so we do not treat "context not updated yet" as logged out.
 */
export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, user } = useTenant();
  const publicPaths = ['/login', '/reset-password'];
  const isPublicPage = publicPaths.includes(pathname);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  /** `absent` = getSession() returned null → safe to send to /login */
  const [guestSession, setGuestSession] = useState<'unset' | 'checking' | 'present' | 'absent'>(
    'unset'
  );

  // Close mobile navigation panel on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!ready || isPublicPage || user) {
      setGuestSession('unset');
      return;
    }
    let cancelled = false;
    setGuestSession('checking');
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const has = Boolean(data.session);
      setGuestSession(has ? 'present' : 'absent');
    });
    return () => {
      cancelled = true;
    };
  }, [ready, isPublicPage, user, pathname]);

  useEffect(() => {
    if (!ready || isPublicPage || user) return;
    if (guestSession !== 'absent') return;
    router.replace('/login');
  }, [ready, user, isPublicPage, router, pathname, guestSession]);

  if (isPublicPage) {
    return <div key="public">{children}</div>;
  }

  if (!ready) {
    return <LayoutSkeleton />;
  }

  if (!user) {
    return <LayoutSkeleton />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <TopNav
        mobileSidebarOpen={mobileSidebarOpen}
        onMobileSidebarToggle={() => setMobileSidebarOpen((v) => !v)}
      />
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <Main>{children}</Main>
      </div>
    </div>
  );
}
