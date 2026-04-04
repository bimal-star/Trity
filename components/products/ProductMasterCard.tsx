'use client';

import { Product } from '@/types/product';
import { Package, DollarSign, Warehouse, Box, Clock } from 'lucide-react';

interface ProductMasterCardProps {
  product: Product | null;
}

const statusBadge: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  discontinued: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  development: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function ProductMasterCard({ product }: ProductMasterCardProps) {
  if (!product) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center justify-center min-h-[200px]">
        <Package className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No product selected</p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
          Click a product in the list to view its details
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-xs shadow-sm border-l-4 border-l-green-500">
      <div className="flex flex-wrap justify-between gap-4 mb-4">
        <div className="min-w-[220px] max-w-xl">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
              {product.name}
            </h2>
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusBadge[product.status] || 'bg-gray-100 text-gray-600'}`}
            >
              {product.status}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-1.5">
            SKU: {product.sku}
          </div>
          {product.categories && product.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {product.categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-block px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[10px]"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
          {product.short_description && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-xl leading-relaxed">
              {product.short_description}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs min-w-[200px]">
          <div>
            <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-0.5">
              Type
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
              {product.product_type?.replace('_', ' ')}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-0.5">
              Industry
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
              {product.industry_type?.replace('_', ' ')}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-0.5">
              ID
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate max-w-[260px]">
              {product.id}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3 border border-green-100 dark:border-green-900/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <DollarSign className="w-3 h-3 text-green-600 dark:text-green-500" />
            <span className="text-[10px] uppercase text-green-700 dark:text-green-500 tracking-wider font-medium">
              Pricing
            </span>
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-white">
            {product.sell_price != null ? product.sell_price : '-'}
            {product.currency && (
              <span className="text-xs font-normal text-gray-500 ml-1">{product.currency}</span>
            )}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-100 dark:border-blue-900/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Warehouse className="w-3 h-3 text-blue-600 dark:text-blue-500" />
            <span className="text-[10px] uppercase text-blue-700 dark:text-blue-500 tracking-wider font-medium">
              Inventory
            </span>
          </div>
          <div className="text-xs text-gray-800 dark:text-gray-100 space-y-0.5">
            <div>
              Min: {product.min_stock_level ?? '-'} / Max: {product.max_stock_level ?? '-'}
            </div>
            <div>Reorder at {product.reorder_point ?? '-'}</div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-3 border border-purple-100 dark:border-purple-900/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Box className="w-3 h-3 text-purple-600 dark:text-purple-500" />
            <span className="text-[10px] uppercase text-purple-700 dark:text-purple-500 tracking-wider font-medium">
              Physical
            </span>
          </div>
          <div className="text-xs text-gray-800 dark:text-gray-100 space-y-0.5">
            <div>Weight: {product.weight ?? '-'}</div>
            <div>
              {product.length ?? '-'} x {product.width ?? '-'} x {product.height ?? '-'}
            </div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-100 dark:border-amber-900/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-500" />
            <span className="text-[10px] uppercase text-amber-700 dark:text-amber-500 tracking-wider font-medium">
              Lifecycle
            </span>
          </div>
          <div className="text-xs text-gray-800 dark:text-gray-100 space-y-0.5">
            <div>Lead: {product.lead_time_days ?? '-'} days</div>
            <div>Shelf life: {product.shelf_life_days ?? '-'} days</div>
          </div>
        </div>
      </div>
    </div>
  );
}
