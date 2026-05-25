'use client';

import {
  blockSubtotals,
  formatCurrency,
  lineCost,
  totalCogsForLines,
} from '@/lib/costCardCalculations';
import { premiumTypography } from '@/lib/premiumUi';
import type { CostCardProductEntryWithRelations } from '@/types/costCard';
import { COST_LINE_BLOCK_ORDER } from '@/types/costCard';

interface CostCardEntryExpandedProps {
  entry: CostCardProductEntryWithRelations;
  readOnly?: boolean;
}

function blockLabel(block: string): string {
  return block.replace(/_/g, ' ');
}

export default function CostCardEntryExpanded({
  entry,
  readOnly = false,
}: CostCardEntryExpandedProps) {
  const lines = entry.cost_lines ?? [];
  const blocks = blockSubtotals(lines);
  const total = totalCogsForLines(lines);
  const currency = entry.base_currency ?? 'GBP';

  const linesByBlock = COST_LINE_BLOCK_ORDER.reduce<Record<string, typeof lines>>((acc, b) => {
    const group = lines.filter((l) => l.block_type === b);
    if (group.length > 0) acc[b] = group;
    return acc;
  }, {});

  return (
    <div className="space-y-2 bg-gray-50/80 px-2 py-2 dark:bg-gray-900/40">
      {blocks.length === 0 ? (
        <p className={premiumTypography.helper}>No cost lines for this product yet.</p>
      ) : (
        Object.keys(linesByBlock).map((blockType) => {
          const blockLines = linesByBlock[blockType];
          const subtotal = blockLines.reduce((s, l) => s + lineCost(l), 0);
          return (
            <div
              key={blockType}
              className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-2 py-1 dark:border-gray-700">
                <span className={`${premiumTypography.tableCell} font-semibold capitalize`}>
                  {blockLabel(blockType)}
                </span>
                <span className={`${premiumTypography.tableCell} font-medium`}>
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className={`min-w-full text-left ${premiumTypography.tableCell}`}>
                  <thead>
                    <tr className={premiumTypography.tableHeaderDense}>
                      <th className="px-1.5 py-0.5">Description</th>
                      <th className="px-1.5 py-0.5">Qty</th>
                      <th className="px-1.5 py-0.5">UOM</th>
                      <th className="px-1.5 py-0.5">Unit</th>
                      <th className="px-1.5 py-0.5">CCY</th>
                      <th className="px-1.5 py-0.5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockLines.map((line) => (
                      <tr key={line.id} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="max-w-[160px] truncate px-1.5 py-0.5">
                          {line.description || '—'}
                          {readOnly && line.is_locked && (
                            <span className="ml-1 text-gray-400">(locked)</span>
                          )}
                        </td>
                        <td className="px-1.5 py-0.5">{line.quantity ?? '—'}</td>
                        <td className="px-1.5 py-0.5">{line.uom ?? '—'}</td>
                        <td className="px-1.5 py-0.5">{line.resolved_unit_cost ?? '—'}</td>
                        <td className="px-1.5 py-0.5">{line.source_currency}</td>
                        <td className="px-1.5 py-0.5">
                          {formatCurrency(lineCost(line), currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
      <div className="flex justify-end border-t border-gray-200 pt-1.5 dark:border-gray-700">
        <span className={`${premiumTypography.tableCell} font-semibold`}>
          Total COGS: {formatCurrency(total, currency)}
        </span>
      </div>
    </div>
  );
}
