/**
 * Protected Route Component
 *
 * Wraps pages that require authentication and tenant context.
 * Uses TenantContext (single source) for session; no duplicate fetches.
 *
 * @module components/ProtectedRoute
 *
 * @example
 * import { ProtectedRoute } from '@/components/ProtectedRoute';
 * export default function SecurePage() {
 *   return <ProtectedRoute><YourPageContent /></ProtectedRoute>;
 * }
 */

'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { isSuperAdminSession } from '@/lib/permissions';
import { useTenant } from '@/contexts/TenantContext';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requiredRole?: string;
  loadingComponent?: ReactNode;
}

/**
 * ProtectedRoute Component
 * Wraps pages that require authentication and tenant context
 *
 * @param {ReactNode} children - The protected content
 * @param {string} redirectTo - Where to redirect unauthenticated users (default: '/login')
 * @param {string} requiredRole - Optional role requirement
 * @param {ReactNode} loadingComponent - Optional custom loading component
 */
export function ProtectedRoute({
  children,
  redirectTo = '/login',
  requiredRole,
  loadingComponent,
}: ProtectedRouteProps) {
  const router = useRouter();
  const {
    tenant_id,
    effectiveTenantId,
    user,
    profile,
    ready,
    error: tenantError,
    refreshTenant,
  } = useTenant();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const jwtAppRoleHint = typeof user?.app_metadata?.role === 'string' ? user.app_metadata.role : '';
  const jwtUserRoleHint =
    typeof user?.user_metadata?.role === 'string' ? user.user_metadata.role : '';
  const isAuthedSuperShell = useMemo(() => {
    if (!user) return false;
    // JWT can assert super_admin before profile loads; isSuperAdminSession handles null profile.
    return isSuperAdminSession(user, profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid churn from new object identity each render
  }, [user?.id, jwtAppRoleHint, jwtUserRoleHint, profile?.user_id, profile?.role]);

  useEffect(() => {
    if (!ready) return;

    if (!user?.id) {
      setIsRedirecting(true);
      router.push(redirectTo);
      return;
    }

    // Clear stale "redirect to login" spinner once we have a session (same instance / fast refresh).
    setIsRedirecting(false);

    if (!effectiveTenantId) {
      return;
    }

    if (requiredRole) {
      const userRole = jwtUserRoleHint || jwtAppRoleHint;
      if (userRole !== requiredRole) {
        setIsRedirecting(true);
        router.push('/unauthorized');
        return;
      }
    }

    setIsRedirecting(false);
  }, [
    ready,
    user?.id,
    effectiveTenantId,
    requiredRole,
    redirectTo,
    router,
    jwtAppRoleHint,
    jwtUserRoleHint,
  ]);

  if (!ready || isRedirecting) {
    if (loadingComponent) return <>{loadingComponent}</>;
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div
          role="status"
          aria-label={isRedirecting ? 'Redirecting' : 'Loading'}
          className="flex flex-col items-center gap-3"
        >
          <div
            className="h-10 w-10 border-2 border-gray-300 dark:border-gray-600 border-t-green-500 rounded-full animate-spin"
            aria-hidden
          />
          <p className="text-sm text-gray-600 dark:text-gray-400" aria-hidden>
            {isRedirecting ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  /** Super admin with no tenant (platform shell) must not hit the tenant-config error UI when `error` is stale or from another code path. */
  const isPlatformSuperShell = Boolean(user && !tenant_id && isAuthedSuperShell);

  // Show error if tenant is required but missing or context reported a config error
  if (
    !isPlatformSuperShell &&
    (tenantError || (!effectiveTenantId && user && !isAuthedSuperShell))
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center max-w-md p-6">
          <div
            role="alert"
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
              Account Configuration Error
            </h2>
            <p className="text-red-600 dark:text-red-300 mb-4">
              {tenantError ||
                'Your account is not associated with a tenant. Please contact support.'}
            </p>
            <button
              type="button"
              onClick={() => {
                supabase.auth.signOut();
                router.push('/login');
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user && (effectiveTenantId || isAuthedSuperShell)) {
    return <>{children}</>;
  }

  // Authenticated but no workspace/tenant resolved yet and error card did not apply — avoid an
  // endless generic spinner (session/tenant race or stale context).
  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
      <div className="text-center max-w-md p-6">
        <div
          aria-live="polite"
          className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-700/50 dark:bg-amber-950/30"
        >
          <h2 className="text-xl font-semibold text-amber-900 dark:text-amber-100 mb-2">
            Finishing sign-in
          </h2>
          <p className="text-sm text-amber-800 dark:text-amber-200/90 mb-4">
            Your session is active, but workspace access is not ready yet. Try refreshing account
            data, or sign out and sign in again. If this keeps happening, contact support.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                void refreshTenant();
              }}
              className="px-4 py-2 rounded-lg bg-amber-700 text-white hover:bg-amber-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => {
                void supabase.auth.signOut();
                router.push('/login');
              }}
              className="px-4 py-2 rounded-lg border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:border-amber-600 dark:text-amber-100 dark:hover:bg-amber-900/40"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
