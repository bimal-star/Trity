'use client';

import PremiumCard from '@/components/layout/premium/PremiumCard';
import { premiumTypography } from '@/lib/premiumUi';
import { Loader2 } from 'lucide-react';
import type { PurchaseOrder } from '@/types/purchase';

export default function PurchaseOrderList({
  orders,
  selectedId,
  isLoading,
  error,
  search,
  onSearchChange,
  onSelect,
}: {
  orders: PurchaseOrder[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (po: PurchaseOrder) => void;
}) {
  return (
    <PremiumCard className="!p-0 flex h-full min-h-0 flex-col">
      <div className="border-b border-gray-200 p-3 dark:border-gray-700">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search PO number…"
          className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900 ${premiumTypography.body}`}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex justify-center py-8 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {error && <p className={`p-3 text-red-600 ${premiumTypography.helper}`}>{error}</p>}
        {!isLoading &&
          !error &&
          orders.map((po) => (
            <button
              key={po.id}
              type="button"
              onClick={() => onSelect(po)}
              className={`mb-1 w-full rounded-lg px-3 py-2 text-left transition-colors ${premiumTypography.body} ${
                selectedId === po.id
                  ? 'bg-green-100 font-medium text-green-900 dark:bg-green-900/40 dark:text-green-100'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700/80'
              }`}
            >
              <div className="truncate">{po.po_number}</div>
              <div className={premiumTypography.helper}>{po.status}</div>
            </button>
          ))}
        {!isLoading && !error && orders.length === 0 && (
          <p className={`p-4 text-center ${premiumTypography.helper}`}>No purchase orders</p>
        )}
      </div>
    </PremiumCard>
  );
}
