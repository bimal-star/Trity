import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { LayoutSkeleton } from '@/components/LayoutSkeleton';
import { AppProviders } from '@/providers/AppProviders';
import { LayoutWrapper } from '@/components/LayoutWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Trity',
  description: 'Enterprise application with dynamic navigation',
};

/**
 * Root Layout - Highest level component in Next.js App Router
 * 
 * STABILITY GUARANTEE: This layout NEVER unmounts on navigation.
 * - Only the {children} prop changes when navigating between routes
 * - AppProviders wraps everything and persists across all route changes
 * - All session/profile/tenant/features data is cached in AppProviders
 * - Navigation is instant because no re-fetching occurs
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProviders>
          <LayoutWrapper>
            <Suspense fallback={<LayoutSkeleton />}>{children}</Suspense>
          </LayoutWrapper>
        </AppProviders>
      </body>
    </html>
  );
}
