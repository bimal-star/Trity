'use client';

import { recordDetail, premiumTypography } from '@/lib/premiumUi';

export interface PremiumRecordSummaryField {
  label: string;
  value: React.ReactNode;
}

export interface PremiumRecordSummaryGridProps {
  fields: PremiumRecordSummaryField[];
  columns?: 1 | 2;
  className?: string;
}

export default function PremiumRecordSummaryGrid({
  fields,
  columns = 2,
  className = '',
}: PremiumRecordSummaryGridProps) {
  const colClass = columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1';

  return (
    <dl className={`grid grid-cols-1 gap-x-4 gap-y-2 ${colClass} ${className}`.trim()}>
      {fields.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className={recordDetail.fieldLabelCompact}>{label}</dt>
          <dd
            className={`mt-0.5 truncate text-sm text-gray-900 dark:text-gray-100 ${premiumTypography.tableCell}`}
          >
            {value ?? '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}
