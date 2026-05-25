'use client';

import PremiumSectionTitle from '@/components/layout/premium/PremiumSectionTitle';
import { premiumTypography } from '@/lib/premiumUi';
import type { CustomerFormData } from '@/types/customer';

function formatCustomerTypeLabel(type: string | null | undefined): string {
  if (!type?.trim()) return '—';
  return type.replace(/_/g, ' ');
}

export interface CustomerQuickFactsProps {
  formData: CustomerFormData;
  className?: string;
}

export default function CustomerQuickFacts({ formData, className = '' }: CustomerQuickFactsProps) {
  const rows: { label: string; value: string }[] = [
    { label: 'Type', value: formatCustomerTypeLabel(formData.customer_type) },
    { label: 'Terms', value: (formData.payment_terms ?? '').trim() || '—' },
    { label: 'Currency', value: (formData.currency ?? '').trim() || '—' },
    { label: 'Email', value: formData.email.trim() || '—' },
    { label: 'Phone', value: (formData.phone ?? '').trim() || '—' },
  ];

  return (
    <div className={`ml-auto max-w-none shrink-0 pl-6 sm:max-w-[15.75rem] ${className}`.trim()}>
      <PremiumSectionTitle className="!mb-0.5">Customer profile</PremiumSectionTitle>
      <p className={`mb-2 ${premiumTypography.helper}`}>Commercial and contact summary</p>
      <dl className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className={`shrink-0 ${premiumTypography.helper}`}>{row.label}</dt>
            <dd
              className={`min-w-0 truncate text-right text-sm text-gray-800 dark:text-gray-200 ${premiumTypography.body}`}
              title={row.value}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
