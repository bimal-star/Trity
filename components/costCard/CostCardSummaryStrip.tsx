'use client';

import { formatPercent } from '@/lib/costCardCalculations';
import { premiumTypography } from '@/lib/premiumUi';

interface CostCardSummaryStripProps {
  productCount: number;
  averageMarginPct: number | null;
  belowTargetCount: number;
  fxExposureCount: number;
}

export default function CostCardSummaryStrip({
  productCount,
  averageMarginPct,
  belowTargetCount,
  fxExposureCount,
}: CostCardSummaryStripProps) {
  const stats = [
    { label: 'Products', value: String(productCount) },
    { label: 'Avg margin', value: formatPercent(averageMarginPct) },
    { label: 'Below target', value: String(belowTargetCount), alert: belowTargetCount > 0 },
    { label: 'FX exposure', value: String(fxExposureCount), alert: fxExposureCount > 0 },
  ];

  return (
    <div className="sticky bottom-0 z-10 shrink-0 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
      <div className="flex flex-wrap gap-6">
        {stats.map((s) => (
          <div key={s.label}>
            <p className={premiumTypography.sectionTitle}>{s.label}</p>
            <p
              className={`${premiumTypography.body} font-semibold ${
                s.alert ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
