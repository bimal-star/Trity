"use client";

import { useState } from "react";
import { Product } from "@/types/product";
import { Search, Eye } from "lucide-react";

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (product: Product) => void;
}

export default function ProductList({
  products,
  isLoading,
  error,
  search,
  onSearchChange,
  onSelect,
}: ProductListProps) {

  const allColumns: { key: string; label: string }[] = [
    { key: "sku", label: "Sku" },
    { key: "name", label: "Name" },
    { key: "product_type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "industry_type", label: "Industry" },
    { key: "categories", label: "Categories" },
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
        <div className="relative">
          <details className="group">
            <summary className="list-none flex items-center gap-1 px-2.5 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-[11px] font-medium cursor-pointer select-none">
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
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-200">{col.label}</span>
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className="flex-1 overflow-hidden text-xs">
        {isLoading && (
          <div className="p-3 text-gray-500">Loading products...</div>
        )}
        {error && !isLoading && (
          <div className="p-3 text-red-500 text-xs">{error}</div>
        )}
        {!isLoading && !error && products.length === 0 && (
          <div className="p-3 text-gray-400">
            <p className="text-xs">No products found.</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Use the <span className="font-medium">New Product</span> button in the header to create your first product.
            </p>
          </div>
        )}
        <table className="w-full table-auto text-left">
          <thead className="bg-gray-100 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {allColumns.map((col) =>
                visibleColumns.has(col.key) ? (
                  <th
                    key={col.key}
                    className="px-2 py-2 text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    {col.label}
                  </th>
                ) : null
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {products.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-purple-50 dark:hover:bg-purple-900/40 cursor-pointer transition-colors"
                onClick={() => onSelect(p)}
              >
                {visibleColumns.has("sku") && (
                  <td className="px-2 py-1.5 text-xs text-gray-900 dark:text-white truncate">
                    {p.sku}
                  </td>
                )}
                {visibleColumns.has("name") && (
                  <td className="px-2 py-1.5 text-xs text-gray-800 dark:text-gray-100 truncate">
                    {p.name}
                  </td>
                )}
                {visibleColumns.has("product_type") && (
                  <td className="px-2 py-1.5 text-xs truncate">{p.product_type}</td>
                )}
                {visibleColumns.has("status") && (
                  <td className="px-2 py-1.5 text-xs truncate">{p.status}</td>
                )}
                {visibleColumns.has("industry_type") && (
                  <td className="px-2 py-1.5 text-xs truncate">{p.industry_type}</td>
                )}
                {visibleColumns.has("categories") && (
                  <td className="px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 truncate">
                    {p.categories && p.categories.length > 0
                      ? p.categories.join(", ")
                      : "-"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
