'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ProductRecordNavigatorProps {
  index: number;
  total: number;
  prevId: string | null;
  nextId: string | null;
  isLoading?: boolean;
  onNavigate: (productId: string) => void;
  className?: string;
}

export default function ProductRecordNavigator({
  index,
  total,
  prevId,
  nextId,
  isLoading = false,
  onNavigate,
  className = '',
}: ProductRecordNavigatorProps) {
  if (total <= 0) return null;

  return (
    <div
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-md border border-gray-200 bg-white px-0.5 py-0.5 tabular-nums dark:border-gray-600 dark:bg-gray-900 ${className}`.trim()}
      aria-label="Product record navigation"
    >
      <button
        type="button"
        disabled={!prevId || isLoading}
        onClick={() => prevId && onNavigate(prevId)}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Previous product"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span className="min-w-[3.5rem] px-1 text-center text-xs font-medium text-gray-600 dark:text-gray-400">
        {isLoading ? '…' : `${index} of ${total}`}
      </span>
      <button
        type="button"
        disabled={!nextId || isLoading}
        onClick={() => nextId && onNavigate(nextId)}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Next product"
      >
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
