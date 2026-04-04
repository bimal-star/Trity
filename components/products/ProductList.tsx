'use client';

import { useState } from 'react';
import { Product } from '@/types/product';
import { Search, Eye, Package } from 'lucide-react';

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (product: Product) => void;
  selectedProductId?: string | null;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  discontinued: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  development: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function ProductList({
  products,
  isLoading,
  error,
  search,
  onSearchChange,
  onSelect,
  selectedProductId,
}: ProductListProps) {
  const allColumns: { key: string; label: string }[] = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Name' },
    { key: 'product_type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'industry_type', label: 'Industry' },
    { key: 'categories', label: 'Categories' },
  ];

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(allColumns.map((c) => c.key))
  );

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev: Set<string>) => {
      const next = new Set<string>(prev);
      if (next.has(key)) {
        if (next.size > 1) {
          next.delete(key);
        }
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const hasProducts = !isLoading && !error && products.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col h-full w-full overflow-hidden">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 min-w-0">
        <div className="relative flex-1">
          <Search className="w-3 h-3 text-gray-400 absolute left-2 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
        {!isLoading && !error && (
          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
            {products.length} {products.length === 1 ? 'item' : 'items'}
          </span>
        )}
        <div className="relative">
          <details className="group">
            <summary className="list-none flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-[11px] font-medium cursor-pointer select-none">
              <Eye className="w-3.5 h-3.5" />
              Columns
            </summary>
            <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-20 min-w-[160px] text-[11px]">
              {allColumns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="rounded text-green-600 focus:ring-green-500"
                  />
                  <span className="text-gray-700 dark:text-gray-200">{col.label}</span>
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className="flex-1 overflow-auto text-xs">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs">Loading products...</span>
          </div>
        )}
        {error && !isLoading && <div className="p-4 text-red-500 text-xs">{error}</div>}
        {!isLoading && !error && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Package className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              No products found
            </p>
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              Use the <span className="font-semibold text-green-600">New Product</span> button to
              create your first product.
            </p>
          </div>
        )}
        {hasProducts && (
          <table className="w-full table-auto text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 sticky top-0">
              <tr>
                {allColumns.map((col) =>
                  visibleColumns.has(col.key) ? (
                    <th
                      key={col.key}
                      className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      {col.label}
                    </th>
                  ) : null
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {products.map((p) => {
                const isSelected = selectedProductId === p.id;
                return (
                  <tr
                    key={p.id}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-green-50 dark:bg-green-900/20 border-l-2 border-l-green-500'
                        : 'hover:bg-green-50/50 dark:hover:bg-green-900/10 border-l-2 border-l-transparent'
                    }`}
                    onClick={() => onSelect(p)}
                  >
                    {visibleColumns.has('sku') && (
                      <td className="px-2 py-1.5 text-xs font-mono text-gray-900 dark:text-white truncate">
                        {p.sku}
                      </td>
                    )}
                    {visibleColumns.has('name') && (
                      <td
                        className={`px-2 py-1.5 text-xs truncate ${isSelected ? 'font-semibold text-green-700 dark:text-green-400' : 'text-gray-800 dark:text-gray-100'}`}
                      >
                        {p.name}
                      </td>
                    )}
                    {visibleColumns.has('product_type') && (
                      <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 truncate capitalize">
                        {p.product_type?.replace('_', ' ')}
                      </td>
                    )}
                    {visibleColumns.has('status') && (
                      <td className="px-2 py-1.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${statusColors[p.status] || 'bg-gray-100 text-gray-600'}`}
                        >
                          {p.status}
                        </span>
                      </td>
                    )}
                    {visibleColumns.has('industry_type') && (
                      <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 truncate capitalize">
                        {p.industry_type?.replace('_', ' ')}
                      </td>
                    )}
                    {visibleColumns.has('categories') && (
                      <td className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                        {p.categories && p.categories.length > 0 ? p.categories.join(', ') : '-'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
