'use client';

/**
 * LayoutSkeleton – minimal, non-jumpy loading state for authenticated layout.
 * Matches sidebar (w-60) + main (flex-1 ml-60) dimensions so there is no
 * layout shift when we transition to the real Sidebar + main content.
 * Used while session/tenant/features are rehydrating.
 */
export function LayoutSkeleton() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar placeholder – same dimensions as Sidebar (w-60) */}
      <aside
        className="fixed left-0 top-0 h-screen w-60 bg-gray-900 border-r border-gray-800 flex flex-col"
        aria-hidden="true"
      >
        <div className="h-14 px-4 border-b border-gray-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
          <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
        </div>
        <nav className="flex-1 py-4 px-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </nav>
        <div className="border-t border-gray-800 p-4">
          <div className="h-10 bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </aside>
      {/* Main content placeholder */}
      <main className="flex-1 ml-60 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </main>
    </div>
  );
}
