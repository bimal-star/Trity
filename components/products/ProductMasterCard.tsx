'use client';

import { Product } from '@/types/product';
import { Package } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  discontinued: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  development: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function formatLabel(value: string | null | undefined): string {
  if (!value) return '-';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ProductMasterCardProps {
  product: Product | null;
}

export default function ProductMasterCard({ product }: ProductMasterCardProps) {
  if (!product) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-sm text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center min-h-[200px] gap-3">
        <Package className="w-8 h-8" />
        <span>Select a product from the list to view details.</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-xs shadow-sm border-l-4 border-l-green-500">
      <div className="flex flex-wrap justify-between gap-4 mb-4">
        <div className="min-w-[220px] max-w-xl">
          <div className="text-base font-semibold text-gray-900 dark:text-white mb-0.5">
            {product.name}
          </div>
          <div className="text-xs text-gray-500 mb-1.5 font-mono">SKU: {product.sku}</div>
          {product.categories && product.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {product.categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[10px]"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
          {product.short_description && (
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-xl leading-relaxed">
              {product.short_description}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs min-w-[200px]">
          <div>
            <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-0.5">
              Status
            </div>
            <span
              className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${statusColors[product.status] || 'bg-gray-100 text-gray-600'}`}
            >
              {formatLabel(product.status)}
            </span>
          </div>
          <div>
            <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-0.5">
              Type
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {formatLabel(product.product_type)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-0.5">
              Industry
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {formatLabel(product.industry_type)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-0.5">
              ID
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[180px] font-mono">
              {product.id}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
          <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 mb-1.5 tracking-wider font-medium">
            Pricing
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {product.sell_price != null ? product.sell_price : '-'}
            {product.currency && (
              <span className="text-[10px] text-gray-400 ml-1 font-normal">{product.currency}</span>
            )}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
          <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 mb-1.5 tracking-wider font-medium">
            Inventory
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-200 space-y-0.5">
            <div>
              Min: <span className="font-medium">{product.min_stock_level ?? '-'}</span> / Max:{' '}
              <span className="font-medium">{product.max_stock_level ?? '-'}</span>
            </div>
            <div>
              Reorder at <span className="font-medium">{product.reorder_point ?? '-'}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
          <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 mb-1.5 tracking-wider font-medium">
            Physical
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-200 space-y-0.5">
            <div>
              Weight: <span className="font-medium">{product.weight ?? '-'}</span>
            </div>
            <div>
              <span className="font-medium">{product.length ?? '-'}</span> x{' '}
              <span className="font-medium">{product.width ?? '-'}</span> x{' '}
              <span className="font-medium">{product.height ?? '-'}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
          <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 mb-1.5 tracking-wider font-medium">
            Lifecycle
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-200 space-y-0.5">
            <div>
              Lead: <span className="font-medium">{product.lead_time_days ?? '-'}</span> days
            </div>
            <div>
              Shelf: <span className="font-medium">{product.shelf_life_days ?? '-'}</span> days
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
