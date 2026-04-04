'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Product } from '@/types/product';
import { Search, Eye, Loader2 } from 'lucide-react';

interface ProductListProps {
  products: Product[];
  selectedProductId: string | null;
  isLoading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (product: Product) => void;
}

export default function ProductList({
  products,
  selectedProductId,
  isLoading,
  error,
  search,
  onSearchChange,
  onSelect,
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
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      const el = detailsRef.current;
      if (!el?.open) return;
      const t = e.target as Node;
      if (el.contains(t)) return;
      el.open = false;
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

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

  const activateRow = (p: Product) => {
    onSelect(p);
  };

  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, p: Product) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activateRow(p);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col h-full w-full min-h-0 overflow-hidden">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 min-w-0 shrink-0">
        <div className="relative flex-1">
          <Search className="w-3 h-3 text-gray-400 absolute left-2 top-2.5" aria-hidden />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-green-500"
            aria-label="Search products"
          />
        </div>
        <div className="relative shrink-0">
          <details ref={detailsRef} className="group">
            <summary className="list-none flex items-center gap-1 px-2.5 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-[11px] font-medium cursor-pointer select-none">
              <Eye className="w-3.5 h-3.5" aria-hidden />
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
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-200">{col.label}</span>
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col text-xs">
        {error && !isLoading && (
          <div className="p-3 text-red-500 text-xs shrink-0" role="alert">
            {error}
          </div>
        )}
        {isLoading && (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-gray-500"
            role="status"
            aria-live="polite"
          >
            <Loader2
              className="w-6 h-6 animate-spin text-green-600 dark:text-green-500"
              aria-hidden
            />
            <span>Loading products…</span>
          </div>
        )}
        {!isLoading && !error && products.length === 0 && (
          <div className="p-3 text-gray-400">
            <p className="text-xs">No products found.</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Use the <span className="font-medium">New Product</span> button in the header to
              create your first product.
            </p>
          </div>
        )}
        {!isLoading && (
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full table-auto text-left">
              <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                <tr>
                  {allColumns.map((col) =>
                    visibleColumns.has(col.key) ? (
                      <th
                        key={col.key}
                        scope="col"
                        className="px-2 py-2 text-xs font-medium text-gray-600 dark:text-gray-300"
                      >
                        {col.label}
                      </th>
                    ) : null
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {products.map((p) => {
                  const selected = p.id === selectedProductId;
                  return (
                    <tr
                      key={p.id}
                      tabIndex={0}
                      aria-selected={selected}
                      aria-label={`${p.name}, SKU ${p.sku}. Press Enter to view details.`}
                      className={`cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 ${
                        selected
                          ? 'bg-green-50 dark:bg-green-900/25 hover:bg-green-100 dark:hover:bg-green-900/35'
                          : 'hover:bg-green-50/70 dark:hover:bg-green-900/15'
                      }`}
                      onClick={() => activateRow(p)}
                      onKeyDown={(e) => onRowKeyDown(e, p)}
                    >
                      {visibleColumns.has('sku') && (
                        <td className="px-2 py-1.5 text-xs text-gray-900 dark:text-white truncate">
                          {p.sku}
                        </td>
                      )}
                      {visibleColumns.has('name') && (
                        <td className="px-2 py-1.5 text-xs text-gray-800 dark:text-gray-100 truncate">
                          {p.name}
                        </td>
                      )}
                      {visibleColumns.has('product_type') && (
                        <td className="px-2 py-1.5 text-xs truncate">{p.product_type}</td>
                      )}
                      {visibleColumns.has('status') && (
                        <td className="px-2 py-1.5 text-xs truncate">{p.status}</td>
                      )}
                      {visibleColumns.has('industry_type') && (
                        <td className="px-2 py-1.5 text-xs truncate">{p.industry_type}</td>
                      )}
                      {visibleColumns.has('categories') && (
                        <td className="px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 truncate">
                          {p.categories && p.categories.length > 0 ? p.categories.join(', ') : '-'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
