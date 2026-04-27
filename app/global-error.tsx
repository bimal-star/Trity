'use client';

/**
 * Root-level error UI (replaces the root layout when the root layout or template throws).
 * Must define html + body — see Next.js global-error docs.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <div className="max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/40 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
              Application error
            </h2>
            <p className="mt-2 break-words text-sm text-gray-700 dark:text-gray-300">
              {error.message}
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
