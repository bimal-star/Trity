'use client';

import type { ReactNode } from 'react';
import { pillarAccent, premiumTypography } from '@/lib/premiumUi';

const bc = pillarAccent('businessCore');

export const costCardPanelHeaderBarClass =
  'flex min-h-[2.25rem] shrink-0 items-center justify-between gap-2 border-b border-green-200/60 bg-green-50/90 px-2 py-1.5 dark:border-green-900/50 dark:bg-green-950/40';

interface CostCardPanelHeaderProps {
  title: string;
  count?: number;
  action?: ReactNode;
}

export default function CostCardPanelHeader({ title, count, action }: CostCardPanelHeaderProps) {
  return (
    <div className={costCardPanelHeaderBarClass}>
      <h3 className={`${premiumTypography.sectionTitle} ${bc.titleText}`}>
        {title}
        {count != null && (
          <span className="ml-1.5 font-normal normal-case tracking-normal text-gray-500 dark:text-gray-400">
            ({count})
          </span>
        )}
      </h3>
      {action}
    </div>
  );
}
