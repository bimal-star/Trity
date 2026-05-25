'use client';

import PremiumSectionTitle from '@/components/layout/premium/PremiumSectionTitle';
import { premiumTypography } from '@/lib/premiumUi';
import type { SupplierFormData } from '@/types/supplier';

function formatSupplierTypeLabel(type: string | null | undefined): string {
  if (!type?.trim()) return '—';
  return type.replace(/_/g, ' ');
}

export interface SupplierQuickFactsProps {
  formData: SupplierFormData;
  className?: string;
}

export default function SupplierQuickFacts({ formData, className = '' }: SupplierQuickFactsProps) {
  const rows: { label: string; value: string }[] = [
    { label: 'Type', value: formatSupplierTypeLabel(formData.supplier_type) },
    { label: 'Terms', value: formData.payment_terms.trim() || '—' },
    { label: 'Currency', value: formData.currency.trim() || '—' },
    { label: 'Email', value: formData.email.trim() || '—' },
    { label: 'Phone', value: formData.phone.trim() || '—' },
  ];

  return (
    <div className={`ml-auto max-w-none shrink-0 pl-6 sm:max-w-[15.75rem] ${className}`.trim()}>
      <PremiumSectionTitle className="!mb-0.5">Supplier profile</PremiumSectionTitle>
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
