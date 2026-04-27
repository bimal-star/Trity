export default function ImportExportLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 dark:border-gray-600 dark:border-t-blue-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading import / export…</p>
      </div>
    </div>
  );
}
