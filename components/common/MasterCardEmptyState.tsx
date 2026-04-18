'use client';

import type { LucideIcon } from 'lucide-react';

interface MasterCardEmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export function MasterCardEmptyState({ icon: Icon, message }: MasterCardEmptyStateProps) {
  return (
    <div className="flex min-h-[88px] items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gradient-to-r from-gray-50/80 to-white px-4 py-3 text-sm text-gray-500 shadow-md dark:border-gray-600 dark:from-gray-900/50 dark:to-gray-800 dark:text-gray-400">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/80 dark:border-gray-600 dark:bg-gray-900/80"
        aria-hidden
      >
        <Icon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="text-left leading-snug">{message}</p>
    </div>
  );
}
