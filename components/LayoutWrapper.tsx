'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/navigation/Sidebar';
import { LayoutSkeleton } from '@/components/LayoutSkeleton';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/lib/supabaseClient';

/**
 * Main content area. Stable across route changes – we avoid key={pathname} so the
 * layout does not unmount/remount on navigation, preventing blank flash.
 * Page-level hooks (useCalendar, useProducts, etc.) refetch when pathname changes.
 */
function Main({ children }: { children: React.ReactNode }) {
  // Start with margin applied (desktop default). Effect corrects to no-margin on mobile
  // without a visible flash on desktop initial render.
  const [showMargin, setShowMargin] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    setShowMargin(mq.matches);
    const handler = (e: MediaQueryListEvent) => setShowMargin(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <main
      className="flex-1 transition-all duration-500"
      style={showMargin ? { marginLeft: 'var(--sidebar-width, 246px)' } : {}}
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
 *   - !ready: show LayoutSkeleton (waiting for session + tenant resolution)
 *   - ready && !user: confirm with supabase.auth.getSession() before sending to /login — avoids
 *     bouncing right after sign-in when React context has not applied SIGNED_IN yet.
 *   - ready && user: render Sidebar + Main + children (Sidebar may still load menu items)
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
  const [guestSession, setGuestSession] = useState<
    'unset' | 'checking' | 'present' | 'absent'
  >('unset');

  // Close mobile sidebar on route change
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
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <div className="flex min-h-0 flex-1">
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        {/* Hamburger button — visible only below sm: breakpoint when sidebar is closed */}
        {!mobileSidebarOpen && (
          <button
            className="fixed left-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-white shadow-lg sm:hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Open navigation"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu size={18} aria-hidden />
          </button>
        )}
        <Main>{children}</Main>
      </div>
    </div>
  );
}
