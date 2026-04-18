'use client';

import { ReactNode } from 'react';
import { TenantProvider } from '@/contexts/TenantContext';
import { ToastProvider } from '@/lib/toast';

/**
 * AppProviders - Root-level provider wrapper
 * 
 * CRITICAL: This component is mounted ONCE at the root layout level and NEVER re-mounts.
 * 
 * Why this matters:
 * - Next.js App Router's root layout.tsx is the highest level for client components
 * - The root layout does NOT unmount on navigation (only re-renders)
 * - This provider wraps the entire app and persists across all route changes
 * - All session/profile/tenant/features data is cached in memory here
 * 
 * Stability guarantees:
 * - Mounted once on initial app load
 * - Never unmounts during navigation
 * - Never re-fetches data on route changes
 * - Only re-fetches when session actually changes (sign in/out)
 * 
 * DO NOT:
 * - Add route-dependent logic here
 * - Add useEffect hooks that depend on pathname/router
 * - Add any logic that triggers on navigation
 * 
 * The TenantProvider inside handles all data fetching and caching.
 * This wrapper exists to make the stability contract explicit.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <TenantProvider>{children}</TenantProvider>
    </ToastProvider>
  );
}
