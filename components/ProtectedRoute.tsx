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

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
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
  const { tenant_id, user, profile, ready, error: tenantError } = useTenant();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      setIsRedirecting(true);
      router.push(redirectTo);
      return;
    }

    if (!tenant_id) return;

    if (requiredRole) {
      const userRole = user.user_metadata?.role || user.app_metadata?.role;
      if (userRole !== requiredRole) {
        setIsRedirecting(true);
        router.push('/unauthorized');
        return;
      }
    }

    setIsRedirecting(false);
  }, [ready, user, tenant_id, router, redirectTo, requiredRole]);

  if (!ready || isRedirecting) {
    if (loadingComponent) return <>{loadingComponent}</>;
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-gray-300 dark:border-gray-600 border-t-green-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isRedirecting ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Super admins may have no home tenant until they impersonate; admin UI still loads.
  if (tenantError || (!tenant_id && user && profile?.role !== 'super_admin')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center max-w-md p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
              Account Configuration Error
            </h2>
            <p className="text-red-600 dark:text-red-300 mb-4">
              {tenantError ||
                'Your account is not associated with a tenant. Please contact support.'}
            </p>
            <button
              onClick={() => {
                supabase.auth.signOut();
                router.push('/login');
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user && tenant_id) {
    return <>{children}</>;
  }

  // Fallback: show loading (shouldn't reach here, but prevents blank page)
  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 dark:border-green-400"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
