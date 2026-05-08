'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { stickyBelowTopNavClass } from '@/lib/appChrome';
import { premiumPrimaryButton, premiumSecondaryButton, premiumTypography } from '@/lib/premiumUi';

/** Default panel width; use the same value for main-content `margin-inline-end` when pushing. */
export const FILTER_DRAWER_DEFAULT_WIDTH_PX = 280;

export interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
  children: ReactNode;
  title?: string;
  width?: number;
}

/** Panel slide: translateX(100%) → 0; pair with content `margin-inline-end` + same duration/ease. */
const DRAWER_TRANSITION = 'duration-[250ms] [transition-timing-function:ease]';

export default function FilterDrawer({
  isOpen,
  onClose,
  onApply,
  onClear,
  children,
  title = 'Filters',
  width = FILTER_DRAWER_DEFAULT_WIDTH_PX,
}: FilterDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-drawer-title"
      style={{ width: `${width}px` }}
      className={`fixed bottom-0 right-0 z-[101] flex max-w-[100vw] flex-col overflow-hidden border-l-[0.5px] border-gray-200 bg-white shadow-xl transition-transform dark:border-gray-700 dark:bg-gray-900 ${stickyBelowTopNavClass} ${DRAWER_TRANSITION} ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } ${!isOpen ? 'pointer-events-none' : ''}`}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2
          id="filter-drawer-title"
          className={`text-base font-semibold leading-tight text-gray-900 dark:text-white ${premiumTypography.body}`}
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="-m-1 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          aria-label="Close filters"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-3">
        {children}
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${premiumSecondaryButton('businessCore', 'sm', 'auto')} px-4`}
            onClick={onClear}
          >
            Clear all
          </button>
          <button
            type="button"
            className={`${premiumPrimaryButton('businessCore', 'sm', 'auto')} px-5`}
            onClick={onApply}
          >
            Apply
          </button>
        </div>
      </div>
    </aside>,
    document.body
  );
}
