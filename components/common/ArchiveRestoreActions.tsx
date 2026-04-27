'use client';

import { Archive, RotateCcw } from 'lucide-react';

interface ArchiveRestoreActionsProps<T> {
  entity: T;
  isArchived: boolean;
  onArchive?: (entity: T) => void;
  onRestore?: (entity: T) => void;
  archiveTitle?: string;
  restoreTitle?: string;
}

export function ArchiveRestoreActions<T>({
  entity,
  isArchived,
  onArchive,
  onRestore,
  archiveTitle = 'Archive: keep data but hide from active lists.',
  restoreTitle = 'Restore to active lists.',
}: ArchiveRestoreActionsProps<T>) {
  if (isArchived) {
    if (!onRestore) return null;
    return (
      <button
        type="button"
        title={restoreTitle}
        aria-label={restoreTitle}
        onClick={() => onRestore(entity)}
        className="inline-flex items-center gap-1 rounded-lg border border-green-200 px-2.5 py-1 text-xs font-medium text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/20"
      >
        <RotateCcw className="h-3 w-3" aria-hidden />
        Restore
      </button>
    );
  }

  if (!onArchive) return null;
  return (
    <button
      type="button"
      title={archiveTitle}
      aria-label={archiveTitle}
      onClick={() => onArchive(entity)}
      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
    >
      <Archive className="h-3 w-3" aria-hidden />
      Archive
    </button>
  );
}
