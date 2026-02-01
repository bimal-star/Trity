"use client";

import { Product } from "@/types/product";

interface ProductMasterCardProps {
  product: Product | null;
}

export default function ProductMasterCard({ product }: ProductMasterCardProps) {
  if (!product) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center min-h-[200px] shadow-sm">
        Select a product from the list to view details.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-xs shadow-md border-l-4 border-purple-500">
      <div className="flex flex-wrap justify-between gap-4 mb-4">
        <div className="min-w-[220px] max-w-xl">
          <div className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
            {product.name}
          </div>
          <div className="text-xs text-gray-500 mb-1.5">SKU: {product.sku}</div>
          {product.categories && product.categories.length > 0 && (
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
              <span className="font-medium text-gray-700 dark:text-gray-200">Categories:</span>{" "}
              {product.categories.join(", ")}
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
              ID
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
              {product.id}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs uppercase text-gray-500 mb-1 tracking-wide">
            Pricing
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {product.sell_price != null ? product.sell_price : "-"}
            {product.currency && (
              <span className="text-xs text-gray-500 ml-1">
                {product.currency}
              </span>
            )}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs uppercase text-gray-500 mb-1 tracking-wide">
            Inventory
          </div>
          <div className="text-xs text-gray-800 dark:text-gray-100 space-y-0.5">
            <div>
              Min: {product.min_stock_level ?? "-"} / Max: {product.max_stock_level ?? "-"}
            </div>
            <div>
              Reorder at {product.reorder_point ?? "-"}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs uppercase text-gray-500 mb-1 tracking-wide">
            Physical
          </div>
          <div className="text-xs text-gray-800 dark:text-gray-100 space-y-0.5">
            <div>Weight: {product.weight ?? "-"}</div>
            <div>
              Size: {product.length ?? "-"} x {product.width ?? "-"} x {product.height ?? "-"}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs uppercase text-gray-500 mb-1 tracking-wide">
            Lifecycle
          </div>
          <div className="text-xs text-gray-800 dark:text-gray-100 space-y-0.5">
            <div>Lead time: {product.lead_time_days ?? "-"} days</div>
            <div>Shelf life: {product.shelf_life_days ?? "-"} days</div>
          </div>
        </div>
      </div>
    </div>
  );
}
