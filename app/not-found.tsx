import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 dark:bg-gray-950">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Page not found</h1>
      <p className="max-w-md text-center text-sm text-gray-600 dark:text-gray-400">
        This URL is not part of the app. Check the address or go back to the dashboard.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Go to dashboard
      </Link>
      <Link href="/login" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        Sign in
      </Link>
    </div>
  );
}
