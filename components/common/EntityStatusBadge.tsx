'use client';

interface EntityStatusBadgeProps {
  status: string;
  /** Per-entity color class overrides. Merged on top of defaults (active → green, inactive → gray). */
  statusMap?: Record<string, string>;
}

const DEFAULT_STATUS_MAP: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const FALLBACK_STATUS_CLASS = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';

export function EntityStatusBadge({ status, statusMap }: EntityStatusBadgeProps) {
  const map = statusMap ? { ...DEFAULT_STATUS_MAP, ...statusMap } : DEFAULT_STATUS_MAP;
  const colorClass = map[status] ?? FALLBACK_STATUS_CLASS;

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colorClass}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
