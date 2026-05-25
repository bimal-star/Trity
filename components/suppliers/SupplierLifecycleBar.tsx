'use client';

import type { SupplierStatus } from '@/types/supplier';
import { premiumTypography } from '@/lib/premiumUi';

const SUPPLIER_LIFECYCLE_STAGES: { id: SupplierStatus; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'on_hold', label: 'On hold' },
];

function stageClassName({
  isCurrent,
  isPast,
  canClick,
}: {
  isCurrent: boolean;
  isPast: boolean;
  canClick: boolean;
}): string {
  const base = `rounded px-2 py-0.5 text-[10px] transition-colors ${premiumTypography.helper}`;

  if (isCurrent) {
    return `${base} font-semibold bg-green-600 text-white shadow-sm ring-1 ring-green-700/25 dark:bg-green-600 dark:ring-green-500/30`;
  }

  if (isPast) {
    return `${base} font-normal bg-gray-50 text-gray-500 dark:bg-gray-800/60 dark:text-gray-500 ${
      canClick
        ? 'hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300'
        : ''
    }`;
  }

  return `${base} font-normal border border-dashed border-gray-200 bg-transparent text-gray-400 dark:border-gray-700 dark:text-gray-600 ${
    canClick
      ? 'hover:border-gray-300 hover:text-gray-500 dark:hover:border-gray-600 dark:hover:text-gray-500'
      : 'opacity-80'
  }`;
}

export interface SupplierLifecycleBarProps {
  status: SupplierStatus | string;
  isArchived?: boolean;
  disabled?: boolean;
  onStatusChange?: (status: SupplierStatus) => void;
  className?: string;
}

export default function SupplierLifecycleBar({
  status,
  isArchived = false,
  disabled = false,
  onStatusChange,
  className = '',
}: SupplierLifecycleBarProps) {
  if (isArchived) {
    return (
      <span
        className={`inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300 ${className}`}
      >
        Archived
      </span>
    );
  }

  const normalized = String(status) as SupplierStatus;
  const currentIndex = SUPPLIER_LIFECYCLE_STAGES.findIndex((s) => s.id === normalized);
  const resolvedIndex = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div
      className={`flex flex-wrap items-center gap-0.5 ${className}`.trim()}
      role="group"
      aria-label="Supplier status"
    >
      {SUPPLIER_LIFECYCLE_STAGES.map((stage, i) => {
        const isCurrent = i === resolvedIndex;
        const isPast = i < resolvedIndex;
        const canClick = Boolean(onStatusChange) && !disabled;
        const classNameForStage = stageClassName({ isCurrent, isPast, canClick });

        return (
          <div key={stage.id} className="flex items-center">
            {canClick ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onStatusChange?.(stage.id)}
                className={classNameForStage}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {stage.label}
              </button>
            ) : (
              <span className={classNameForStage} aria-current={isCurrent ? 'step' : undefined}>
                {stage.label}
              </span>
            )}
            {i < SUPPLIER_LIFECYCLE_STAGES.length - 1 ? (
              <span
                className={`mx-0.5 text-[10px] ${
                  isCurrent || i + 1 === resolvedIndex
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-300 dark:text-gray-700'
                }`}
                aria-hidden
              >
                /
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
