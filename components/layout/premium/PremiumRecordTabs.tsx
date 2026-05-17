'use client';

import type { PremiumModule } from '@/lib/premiumUi';
import { recordDetail, recordTabClass } from '@/lib/premiumUi';

export interface PremiumRecordTabItem {
  id: string;
  label: string;
  badge?: number;
}

function TabBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-1 inline-flex min-w-[1.125rem] justify-center rounded-full bg-gray-200 px-1 py-0.5 text-[10px] font-bold leading-none text-gray-800 dark:bg-gray-700 dark:text-gray-100">
      {n > 99 ? '99+' : n}
    </span>
  );
}

export interface PremiumRecordTabsProps {
  module?: PremiumModule | null;
  tabs: PremiumRecordTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function PremiumRecordTabs({
  module = 'businessCore',
  tabs,
  activeId,
  onChange,
  className = '',
}: PremiumRecordTabsProps) {
  return (
    <div className={`${recordDetail.tabBar} ${className}`.trim()}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={recordTabClass(module, activeId === tab.id)}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.badge != null ? <TabBadge n={tab.badge} /> : null}
        </button>
      ))}
    </div>
  );
}
