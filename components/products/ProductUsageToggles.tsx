'use client';

import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import PremiumSectionTitle from '@/components/layout/premium/PremiumSectionTitle';
import type { Product, ProductFormData } from '@/types/product';
export type ProductUsagePatch = Pick<
  ProductFormData,
  'is_sellable' | 'is_purchasable' | 'is_manufacturable' | 'is_component'
>;

const USAGE_TOGGLES: {
  key: keyof ProductUsagePatch;
  label: string;
  description: string;
}[] = [
  { key: 'is_sellable', label: 'Sellable', description: 'May be sold' },
  { key: 'is_purchasable', label: 'Purchasable', description: 'May be purchased' },
  { key: 'is_manufacturable', label: 'Manufacturable', description: 'May be produced' },
  { key: 'is_component', label: 'Component', description: 'May be used in BOMs' },
];

function UsageSwitchRow({
  id,
  label,
  description,
  checked,
  disabled,
  isSaving,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  isSaving: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-[0.15rem]">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer" title={description}>
        <span className="block text-sm leading-[1.35] text-gray-800 dark:text-gray-200">
          {label}
        </span>
      </label>
      <div className="relative flex shrink-0 items-center pr-4">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            id={id}
            type="checkbox"
            role="switch"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="h-5 w-9 rounded-full bg-gray-300 transition-colors peer-checked:bg-green-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-green-500 peer-disabled:opacity-50 dark:bg-gray-600 dark:peer-checked:bg-green-500"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4 peer-disabled:opacity-50"
          />
        </label>
        {isSaving ? (
          <Loader2
            className="absolute right-0 h-3.5 w-3.5 animate-spin text-green-600 dark:text-green-400"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}

export interface ProductUsageTogglesProps {
  product: Product;
  disabled?: boolean;
  onUpdate: (patch: ProductUsagePatch) => Promise<void>;
  className?: string;
}

export default function ProductUsageToggles({
  product,
  disabled = false,
  onUpdate,
  className = '',
}: ProductUsageTogglesProps) {
  const [savingKey, setSavingKey] = useState<keyof ProductUsagePatch | null>(null);

  const handleToggle = useCallback(
    async (key: keyof ProductUsagePatch, next: boolean) => {
      if (disabled || savingKey) return;
      setSavingKey(key);
      try {
        await onUpdate({ [key]: next });
      } finally {
        setSavingKey(null);
      }
    },
    [disabled, onUpdate, savingKey]
  );

  return (
    <div className={`max-w-[15.75rem] space-y-0.5 ${className}`.trim()}>
      <PremiumSectionTitle as="h3" className="!mb-0 !normal-case tracking-wide leading-[1.35]">
        Product usage
      </PremiumSectionTitle>
      <p className="text-[11px] leading-[1.35] text-gray-500 dark:text-gray-400">
        Where this SKU is used in workflows.
      </p>
      <div className="space-y-0.5">
        {USAGE_TOGGLES.map(({ key, label, description }) => {
          const inputId = `product-usage-${product.id}-${key}`;
          return (
            <UsageSwitchRow
              key={key}
              id={inputId}
              label={label}
              description={description}
              checked={Boolean(product[key])}
              disabled={disabled || Boolean(savingKey)}
              isSaving={savingKey === key}
              onChange={(next) => void handleToggle(key, next)}
            />
          );
        })}
      </div>
    </div>
  );
}
