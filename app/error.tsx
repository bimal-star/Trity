'use client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 dark:bg-gray-950">
      <div className="max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/40 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
          This page hit an error
        </h2>
        <p className="mt-2 break-words text-sm text-gray-700 dark:text-gray-300">{error.message}</p>
        {error.digest ? (
          <p className="mt-1 font-mono text-xs text-gray-500">Digest: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
