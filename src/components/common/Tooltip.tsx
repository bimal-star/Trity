'use client';

import type { ReactElement } from 'react';

type TooltipProps = {
  label: string;
  children: ReactElement;
};

/**
 * Lightweight hover tooltip (CSS `group-hover`). Use for icon-only cells where `title` is too slow to style.
 */
export function Tooltip({ label, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex items-center justify-center align-middle">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[300] mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg ring-1 ring-black/10 transition-opacity duration-100 group-hover:opacity-100 dark:bg-gray-700 dark:ring-white/10"
      >
        {label}
      </span>
    </span>
  );
}
