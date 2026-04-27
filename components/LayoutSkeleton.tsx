'use client';

import { mainTopNavSpacerClass } from '@/lib/appChrome';

/**
 * Loading skeleton — matches the fixed 2-row TopNav (row1 64px + row2 48px on sm+).
 * No sidebar: primary nav lives in TopNav.
 */
export function LayoutSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      {/* TopNav skeleton — mirrors the 2-row structure */}
      <header
        className="fixed left-0 right-0 top-0 z-50 flex flex-col border-b border-gray-800 bg-gray-900"
        aria-hidden="true"
      >
        {/* Row 1 */}
        <div className="flex h-16 items-center gap-3 px-3">
          <div className="flex shrink-0 items-center gap-2">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-700" />
            <div className="hidden h-4 w-14 animate-pulse rounded bg-gray-700 sm:block" />
          </div>
          <div className="flex items-center gap-1.5 pl-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-7 w-[4.5rem] animate-pulse rounded-full bg-gray-800" />
            ))}
          </div>
          <div className="flex-1" />
          <div className="hidden h-8 w-56 animate-pulse rounded-lg bg-gray-800 md:block" />
          <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-800" />
        </div>

        {/* Row 2 — hidden on mobile */}
        <div className="hidden h-12 items-center gap-2 border-t border-gray-800 bg-white px-3 dark:border-gray-800 dark:bg-gray-950 sm:flex">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </header>

      {/* Main — spacer matches LayoutWrapper (no pt on main; keeps sticky math consistent) */}
      <main className="flex min-h-dvh w-full flex-1 flex-col">
        <div aria-hidden className={`pointer-events-none ${mainTopNavSpacerClass}`} />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 dark:border-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          </div>
        </div>
      </main>
    </div>
  );
}
