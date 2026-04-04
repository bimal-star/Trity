'use client';

import { useState } from 'react';
import { Product } from '@/types/product';
import { Copy, Check } from 'lucide-react';

interface ProductMasterCardProps {
  product: Product | null;
}

function formatPrice(
  value: number | null | undefined,
  currency: string | null | undefined
): string {
  if (value == null || Number.isNaN(value)) return '—';
  const code = currency && currency.length === 3 ? currency.toUpperCase() : undefined;
  try {
    return new Intl.NumberFormat(undefined, {
      style: code ? 'currency' : 'decimal',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value}${currency ? ` ${currency}` : ''}`;
  }
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);
}

function shortId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export default function ProductMasterCard({ product }: ProductMasterCardProps) {
  const [copied, setCopied] = useState(false);

  if (!product) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center min-h-[200px] shadow-sm">
        Select a product from the list to view details.
      </div>
    );
  }

  const dimUnit = product.dimension_unit_id ? ` ${product.dimension_unit_id}` : '';
  const weightUnit = product.weight_unit_id ? ` ${product.weight_unit_id}` : '';

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(product.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-xs shadow-md border-l-4 border-green-600 dark:border-green-500">
      <div className="flex flex-wrap justify-between gap-4 mb-4">
        <div className="min-w-[220px] max-w-xl">
          <div className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
            {product.name}
          </div>
          <div className="text-xs text-gray-500 mb-1.5">SKU: {product.sku}</div>
          {product.categories && product.categories.length > 0 && (
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
              <span className="font-medium text-gray-700 dark:text-gray-200">Categories:</span>{' '}
              {product.categories.join(', ')}
            </div>
          )}
          {product.short_description && (
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-xl">
              {product.short_description}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 min-w-[200px]">
          <div>
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400 tracking-wide mb-0.5">
              Status
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {product.status}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400 tracking-wide mb-0.5">
              Type
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {product.product_type}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400 tracking-wide mb-0.5">
              Industry
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {product.industry_type}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400 tracking-wide mb-0.5">
              Product ID
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="text-xs text-gray-700 dark:text-gray-300 truncate font-mono"
                title={product.id}
              >
                {shortId(product.id)}
              </span>
              <button
                type="button"
                onClick={copyId}
                className="shrink-0 p-1 rounded-md text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                title="Copy full ID"
                aria-label="Copy full product ID to clipboard"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-600" aria-hidden />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs uppercase text-gray-500 mb-1 tracking-wide">Pricing</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatPrice(product.sell_price, product.currency)}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs uppercase text-gray-500 mb-1 tracking-wide">Inventory</div>
          <div className="text-xs text-gray-800 dark:text-gray-100 space-y-0.5">
            <div>
              Min: {formatNumber(product.min_stock_level)} / Max:{' '}
              {formatNumber(product.max_stock_level)}
            </div>
            <div>Reorder at {formatNumber(product.reorder_point)}</div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs uppercase text-gray-500 mb-1 tracking-wide">Physical</div>
          <div className="text-xs text-gray-800 dark:text-gray-100 space-y-0.5">
            <div>
              Weight: {formatNumber(product.weight)}
              {weightUnit}
            </div>
            <div>
              Size: {formatNumber(product.length)}
              {dimUnit} × {formatNumber(product.width)}
              {dimUnit} × {formatNumber(product.height)}
              {dimUnit}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs uppercase text-gray-500 mb-1 tracking-wide">Lifecycle</div>
          <div className="text-xs text-gray-800 dark:text-gray-100 space-y-0.5">
            <div>Lead time: {formatNumber(product.lead_time_days)} days</div>
            <div>Shelf life: {formatNumber(product.shelf_life_days)} days</div>
          </div>
        </div>
      </div>
    </div>
  );
}
