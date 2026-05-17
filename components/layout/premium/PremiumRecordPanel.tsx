'use client';

import { recordDetail } from '@/lib/premiumUi';

export interface PremiumRecordPanelProps {
  children: React.ReactNode;
  className?: string;
}

export default function PremiumRecordPanel({ children, className = '' }: PremiumRecordPanelProps) {
  return <div className={`${recordDetail.panel} ${className}`.trim()}>{children}</div>;
}
