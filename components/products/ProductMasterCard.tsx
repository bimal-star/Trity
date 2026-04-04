'use client';

import { Package2 } from 'lucide-react';
import { Product } from '@/types/product';

interface ProductMasterCardProps {
  product: Product | null;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  discontinued: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
  planned: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  development: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
};

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-gray-400 text-xs">—</span>;
  const style =
    STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${style}`}
    >
      {status}
    </span>
  );
}

function MetaChip({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-200 dark:border-gray-700">
      <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-1 font-medium">
        {label}
      </div>
      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
        {value ?? <span className="text-gray-400 dark:text-gray-600 font-normal">—</span>}
      </div>
    </div>
  );
}

export default function ProductMasterCard({ product }: ProductMasterCardProps) {
  if (!product) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center justify-center gap-2 min-h-[160px] text-center shadow-sm">
        <Package2 className="w-8 h-8 text-gray-200 dark:text-gray-600" />
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Select a product from the list to view details
        </p>
      </div>
    );
  }

  const priceDisplay =
    product.sell_price != null
      ? `${product.sell_price}${product.currency ? ' ' + product.currency : ''}`
      : null;

  const inventoryDisplay =
    product.min_stock_level != null || product.max_stock_level != null
      ? `${product.min_stock_level ?? '—'} / ${product.max_stock_level ?? '—'}`
      : null;

  const physicalDisplay = product.weight != null ? `${product.weight} kg` : null;

  const sizeDisplay =
    product.length != null || product.width != null || product.height != null
      ? `${product.length ?? '—'} × ${product.width ?? '—'} × ${product.height ?? '—'}`
      : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 border-purple-500 border border-gray-200 dark:border-gray-700 p-5 text-xs">
      {/* Top row: identity + status badges */}
      <div className="flex flex-wrap justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
              {product.name}
            </h2>
            <StatusBadge status={product.status} />
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 mb-2">
            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
              {product.sku}
            </span>
            {product.product_type && (
              <span className="capitalize">{product.product_type.replace(/_/g, ' ')}</span>
            )}
            {product.industry_type && (
              <span className="capitalize text-gray-400">
                {product.industry_type.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          {product.short_description && (
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-prose">
              {product.short_description}
            </p>
          )}
          {product.categories && product.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-[10px] font-medium border border-purple-200 dark:border-purple-800"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono self-start">
          ID: <span className="select-all">{product.id}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetaChip label="Sell Price" value={priceDisplay} />
        <MetaChip
          label="Inventory (min/max)"
          value={
            inventoryDisplay ??
            (product.reorder_point != null ? `Reorder at ${product.reorder_point}` : null)
          }
        />
        <MetaChip label="Weight" value={physicalDisplay} />
        <MetaChip label="Dimensions (L×W×H)" value={sizeDisplay} />
      </div>

      {/* Lifecycle row */}
      {(product.lead_time_days != null || product.shelf_life_days != null) && (
        <div className="flex gap-4 mt-3 text-[11px] text-gray-500 dark:text-gray-400">
          {product.lead_time_days != null && (
            <span>
              Lead time:{' '}
              <strong className="text-gray-700 dark:text-gray-300">
                {product.lead_time_days} days
              </strong>
            </span>
          )}
          {product.shelf_life_days != null && (
            <span>
              Shelf life:{' '}
              <strong className="text-gray-700 dark:text-gray-300">
                {product.shelf_life_days} days
              </strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
