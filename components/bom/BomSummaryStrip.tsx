'use client';

import { formatBomCurrency, formatBomQty } from '@/lib/bomCalculations';
import { pillarAccent, premiumTypography } from '@/lib/premiumUi';
import type { BomHeaderCostingRow } from '@/hooks/useBom';

interface BomSummaryStripProps {
  header: BomHeaderCostingRow;
}

function Chip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 ${
        highlight
          ? 'border-green-300 bg-green-100/80 text-green-900 dark:border-green-800 dark:bg-green-900/40 dark:text-green-100'
          : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-300'
      }`}
    >
      <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${premiumTypography.tableCell}`}>
        {value}
      </span>
    </span>
  );
}

export default function BomSummaryStrip({ header }: BomSummaryStripProps) {
  const outQty = header.output_quantity ?? 1;
  const uom = header.output_unit_symbol?.trim() || 'unit';

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-green-200/50 bg-green-50/40 px-3 py-2 dark:border-green-900/35 dark:bg-green-950/20">
      {header.bom_code ? <Chip label="BOM" value={header.bom_code} highlight /> : null}
      <Chip label="Output" value={`${formatBomQty(outQty)} ${uom}`} />
      <Chip label="Components" value={String(header.component_count ?? 0)} />
      <Chip label="Total (standard)" value={formatBomCurrency(header.total_component_cost)} />
      <Chip
        label="Total (landing)"
        value={formatBomCurrency(header.total_component_cost_landing)}
        highlight
      />
      <Chip
        label="Total (last buy)"
        value={formatBomCurrency(header.total_component_cost_last_buy)}
      />
      <Chip
        label="Cost / output (landing)"
        value={formatBomCurrency(header.cost_per_unit_landing)}
        highlight
      />
    </div>
  );
}
