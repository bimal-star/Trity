'use client';

import type { LogisticsChargeType, LogisticsRateLineFormData } from '@/types/logistics';
import { LOGISTICS_CHARGE_TYPE_LABELS } from '@/types/logistics';
import { premiumInputCompact, premiumTypography } from '@/lib/premiumUi';
import { Trash2 } from 'lucide-react';

export type EditableRateLine = LogisticsRateLineFormData & { rowKey: string };

interface LogisticsRateLinesTableProps {
  lines: EditableRateLine[];
  onChange: (lines: EditableRateLine[]) => void;
  readOnly?: boolean;
}

const CHARGE_TYPES = Object.keys(LOGISTICS_CHARGE_TYPE_LABELS) as LogisticsChargeType[];

export default function LogisticsRateLinesTable({
  lines,
  onChange,
  readOnly = false,
}: LogisticsRateLinesTableProps) {
  const updateLine = (index: number, patch: Partial<EditableRateLine>) => {
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-left">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr className={premiumTypography.tableHeader}>
            <th className="px-3 py-2">Lane</th>
            <th className="px-3 py-2">Charge type</th>
            <th className="px-3 py-2">Rate</th>
            <th className="px-3 py-2">Currency</th>
            <th className="px-3 py-2">Min charge</th>
            <th className="px-3 py-2">Fuel %</th>
            <th className="px-3 py-2">Notes</th>
            {!readOnly && <th className="px-3 py-2 w-10" />}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td
                colSpan={readOnly ? 7 : 8}
                className={`px-3 py-6 text-center ${premiumTypography.helper}`}
              >
                No rate lines yet.
              </td>
            </tr>
          ) : (
            lines.map((line, index) => (
              <tr key={line.rowKey} className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-2 py-1.5">
                  <input
                    className={premiumInputCompact}
                    value={line.lane}
                    disabled={readOnly}
                    onChange={(e) => updateLine(index, { lane: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    className={premiumInputCompact}
                    value={line.charge_type}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateLine(index, { charge_type: e.target.value as LogisticsChargeType })
                    }
                  >
                    {CHARGE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {LOGISTICS_CHARGE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    step="0.0001"
                    className={premiumInputCompact}
                    value={line.rate}
                    disabled={readOnly}
                    onChange={(e) => updateLine(index, { rate: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className={premiumInputCompact}
                    maxLength={3}
                    value={line.currency}
                    disabled={readOnly}
                    onChange={(e) => updateLine(index, { currency: e.target.value.toUpperCase() })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    step="0.0001"
                    className={premiumInputCompact}
                    value={line.min_charge}
                    disabled={readOnly}
                    onChange={(e) => updateLine(index, { min_charge: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    step="0.01"
                    className={premiumInputCompact}
                    value={line.fuel_surcharge_pct}
                    disabled={readOnly}
                    onChange={(e) => updateLine(index, { fuel_surcharge_pct: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className={premiumInputCompact}
                    value={line.notes}
                    disabled={readOnly}
                    onChange={(e) => updateLine(index, { notes: e.target.value })}
                  />
                </td>
                {!readOnly && (
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      aria-label="Delete line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function emptyRateLine(): EditableRateLine {
  return {
    rowKey: `draft-${crypto.randomUUID()}`,
    lane: '',
    charge_type: 'per_unit',
    rate: '',
    currency: 'GBP',
    min_charge: '',
    fuel_surcharge_pct: '',
    notes: '',
  };
}

export function lineFromDb(line: {
  id: string;
  lane: string | null;
  charge_type: string;
  rate: number;
  currency: string;
  min_charge: number | null;
  fuel_surcharge_pct: number | null;
  notes: string | null;
}): EditableRateLine {
  return {
    rowKey: line.id,
    lane: line.lane ?? '',
    charge_type: line.charge_type as LogisticsChargeType,
    rate: String(line.rate),
    currency: line.currency,
    min_charge: line.min_charge != null ? String(line.min_charge) : '',
    fuel_surcharge_pct: line.fuel_surcharge_pct != null ? String(line.fuel_surcharge_pct) : '',
    notes: line.notes ?? '',
  };
}
