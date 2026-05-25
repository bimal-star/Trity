'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { GripVertical, Loader2, Trash2 } from 'lucide-react';
import CostCardPanelHeader from '@/components/costCard/CostCardPanelHeader';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import { getBomProductDragData } from '@/hooks/useBomComponentCandidates';
import { formatBomCurrency, formatWastePct } from '@/lib/bomCalculations';
import { pillarAccent, premiumInputCompact, premiumTypography } from '@/lib/premiumUi';
import type { BomLineCostingRow, BomLineUpdate } from '@/hooks/useBom';

const bc = pillarAccent('businessCore');

interface BomLinesTableProps {
  lines: BomLineCostingRow[];
  isLoading: boolean;
  error: string | null;
  readOnly?: boolean;
  dropEnabled?: boolean;
  emptyHint?: string;
  onAddLine: (productId: string, quantity: number) => Promise<{ success: boolean; error?: string }>;
  onUpdateLine: (
    lineId: string,
    patch: BomLineUpdate
  ) => Promise<{ success: boolean; error?: string }>;
  onRemoveLine: (lineId: string) => Promise<{ success: boolean; error?: string }>;
  onReorderLines: (orderedIds: string[]) => Promise<{ success: boolean; error?: string }>;
}

export default function BomLinesTable({
  lines,
  isLoading,
  error,
  readOnly = false,
  dropEnabled = true,
  emptyHint,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
  onReorderLines,
}: BomLinesTableProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [savingLineId, setSavingLineId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [dropHighlight, setDropHighlight] = useState(false);

  const handleRowReorderDrop = useCallback(
    async (targetId: string) => {
      if (!dragId || dragId === targetId || readOnly) return;
      const ids = lines.map((l) => l.bom_line_id);
      if (!ids.includes(dragId)) return;
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(targetId);
      if (from < 0 || to < 0) return;
      const next = [...ids];
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      setReordering(true);
      await onReorderLines(next);
      setReordering(false);
      setDragId(null);
    },
    [dragId, lines, onReorderLines, readOnly]
  );

  const handleExternalDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDropHighlight(false);
      if (readOnly || !dropEnabled) return;
      const productId = getBomProductDragData(e.dataTransfer);
      if (!productId) return;
      const existing = lines.some((l) => l.component_product_id === productId);
      if (existing) return;
      await onAddLine(productId, 1);
    },
    [readOnly, dropEnabled, lines, onAddLine]
  );

  const onLineDragStart = (lineId: string) => (e: React.DragEvent) => {
    setDragId(lineId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const defaultEmpty =
    emptyHint ?? 'No components yet. Drag products from the panel on the right onto this table.';

  return (
    <PremiumCard className="flex min-h-0 flex-1 flex-col overflow-hidden !rounded-xl !p-0 ring-1 ring-green-200/50 dark:ring-green-900/40">
      <CostCardPanelHeader title="BOM components" count={lines.length} />

      {error && (
        <p className="mx-2 mt-1 shrink-0 rounded-lg bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      )}

      {isLoading || reordering ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <Loader2 className={`h-7 w-7 animate-spin ${bc.iconColor}`} />
        </div>
      ) : (
        <div
          className={`min-h-0 flex-1 overflow-auto transition-colors ${
            dropHighlight
              ? 'bg-green-50/80 ring-2 ring-inset ring-green-400 dark:bg-green-950/40 dark:ring-green-600'
              : ''
          }`}
          onDragOver={(e) => {
            if (!dropEnabled || readOnly) return;
            if (getBomProductDragData(e.dataTransfer)) {
              e.preventDefault();
              setDropHighlight(true);
            }
          }}
          onDragLeave={() => setDropHighlight(false)}
          onDrop={handleExternalDrop}
        >
          {lines.length === 0 ? (
            <p className={`${premiumTypography.helper} px-4 py-10 text-center`}>{defaultEmpty}</p>
          ) : (
            <table className="min-w-full text-left">
              <thead className="sticky top-0 z-[1] bg-white dark:bg-gray-800">
                <tr className={premiumTypography.tableHeaderDense}>
                  <th className="w-8 px-1 py-1.5" aria-label="Reorder" />
                  <th className="px-2 py-1.5">#</th>
                  <th className="min-w-[140px] px-2 py-1.5">Component</th>
                  <th className="w-20 px-2 py-1.5 text-right">Qty</th>
                  <th className="w-14 px-2 py-1.5">UOM</th>
                  <th className="w-16 px-2 py-1.5 text-right">Waste %</th>
                  <th className="w-24 px-2 py-1.5 text-right">Last buy</th>
                  <th className="w-24 px-2 py-1.5 text-right">Avg landing</th>
                  <th className="w-24 px-2 py-1.5 text-right">Line total</th>
                  <th className="w-10 px-1 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const lineId = line.bom_line_id;
                  const busy = savingLineId === lineId;
                  return (
                    <tr
                      key={lineId}
                      draggable={!readOnly}
                      onDragStart={onLineDragStart(lineId)}
                      onDragEnd={() => setDragId(null)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        const external = getBomProductDragData(e.dataTransfer);
                        e.dataTransfer.dropEffect = external ? 'copy' : 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const external = getBomProductDragData(e.dataTransfer);
                        if (external) {
                          void handleExternalDrop(e);
                          return;
                        }
                        void handleRowReorderDrop(lineId);
                      }}
                      className={`border-b border-gray-100 dark:border-gray-800 ${
                        dragId === lineId ? 'opacity-50' : ''
                      } ${busy ? 'opacity-70' : ''}`}
                    >
                      <td className="px-1 py-1 align-middle text-gray-400">
                        {!readOnly && (
                          <GripVertical className="mx-auto h-4 w-4 cursor-grab active:cursor-grabbing" />
                        )}
                      </td>
                      <td className={`px-2 py-1 align-middle ${premiumTypography.tableCell}`}>
                        {idx + 1}
                      </td>
                      <td
                        className={`min-w-0 px-2 py-1 align-middle ${premiumTypography.tableCell}`}
                      >
                        {line.component_product_id ? (
                          <Link
                            href={`/products/${line.component_product_id}`}
                            className="font-medium text-green-700 hover:underline dark:text-green-400"
                          >
                            <span className="block truncate">
                              {line.component_sku ?? '—'} — {line.component_name ?? 'Component'}
                            </span>
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-2 py-1 align-middle text-right">
                        <input
                          type="number"
                          min="0.0001"
                          step="any"
                          defaultValue={line.quantity ?? 1}
                          disabled={readOnly || busy}
                          className={`${premiumInputCompact} w-20 text-right tabular-nums`}
                          onBlur={(e) => {
                            const n = parseFloat(e.target.value);
                            if (!Number.isFinite(n) || n <= 0) return;
                            if (n === Number(line.quantity)) return;
                            setSavingLineId(lineId);
                            void onUpdateLine(lineId, { quantity: n }).finally(() =>
                              setSavingLineId(null)
                            );
                          }}
                        />
                      </td>
                      <td className={`px-2 py-1 align-middle ${premiumTypography.tableCell}`}>
                        {line.uom_symbol ?? line.base_unit_symbol ?? '—'}
                      </td>
                      <td className="px-2 py-1 align-middle text-right">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          defaultValue={line.line_waste_percentage ?? ''}
                          disabled={readOnly || busy}
                          placeholder={formatWastePct(line.product_waste_percentage)}
                          className={`${premiumInputCompact} w-16 text-right tabular-nums`}
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            const waste =
                              raw === ''
                                ? null
                                : (() => {
                                    const n = parseFloat(raw);
                                    return Number.isFinite(n) ? n : null;
                                  })();
                            if (raw !== '' && waste === null) return;
                            setSavingLineId(lineId);
                            void onUpdateLine(lineId, { waste_percentage: waste }).finally(() =>
                              setSavingLineId(null)
                            );
                          }}
                        />
                      </td>
                      <td
                        className={`px-2 py-1 align-middle text-right tabular-nums ${premiumTypography.tableCell}`}
                      >
                        {formatBomCurrency(
                          line.last_buy_unit_price,
                          line.last_buy_currency ?? 'GBP'
                        )}
                      </td>
                      <td
                        className={`px-2 py-1 align-middle text-right tabular-nums ${premiumTypography.tableCell}`}
                      >
                        {formatBomCurrency(line.avg_landing_unit_cost)}
                      </td>
                      <td
                        className={`px-2 py-1 align-middle text-right font-semibold tabular-nums ${premiumTypography.tableCell}`}
                      >
                        {formatBomCurrency(line.line_total_cost_landing)}
                      </td>
                      <td className="px-1 py-1 align-middle">
                        <button
                          type="button"
                          disabled={readOnly || busy}
                          onClick={() => void onRemoveLine(lineId)}
                          className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                          aria-label="Remove line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 bg-green-50/90 dark:bg-green-950/40">
                <tr>
                  <td
                    colSpan={8}
                    className={`px-3 py-2 text-right ${premiumTypography.tableHeaderDense}`}
                  >
                    BOM total (landing)
                  </td>
                  <td
                    className={`px-2 py-2 text-right font-bold tabular-nums ${premiumTypography.tableCell}`}
                  >
                    {formatBomCurrency(
                      lines.reduce((s, l) => s + (Number(l.line_total_cost_landing) || 0), 0)
                    )}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </PremiumCard>
  );
}
