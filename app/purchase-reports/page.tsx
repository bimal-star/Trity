'use client';

import { useMemo, useState } from 'react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useSuppliers } from '@/hooks/useSuppliers';
import { runPurchaseReport, type PurchaseReportPreset } from '@/lib/purchaseReportQueries';
import {
  pillarAccent,
  premiumPrimaryButton,
  premiumSurfaces,
  premiumTertiaryButton,
  premiumTypography,
} from '@/lib/premiumUi';
import { BookOpen } from 'lucide-react';
import { ExportFormatDropdown } from '@/components/common/ExportFormatDropdown';

const bc = pillarAccent('businessCore');

const PRESETS: { id: PurchaseReportPreset; label: string; hint: string }[] = [
  { id: 'open_pos', label: 'Open purchase orders', hint: 'Draft, sent, or partially received' },
  { id: 'posted_receipts', label: 'Posted goods receipts', hint: 'By received date' },
  { id: 'invoice_price_exceptions', label: 'Invoice price variances', hint: 'Matched lines with price_variance' },
  { id: 'invoice_qty_exceptions', label: 'Invoice quantity variances', hint: 'Matched lines with qty_variance' },
];

export default function PurchaseReportsPage() {
  const { effectiveTenantId: tenant_id } = useTenant();
  const { suppliers } = useSuppliers(undefined, { loadSuppliers: true });

  const [preset, setPreset] = useState<PurchaseReportPreset>('open_pos');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [supplierId, setSupplierId] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s.legal_name])), [suppliers]);

  const run = async () => {
    if (!tenant_id) return;
    setErr(null);
    setLoading(true);
    try {
      const r = await runPurchaseReport(tenant_id, preset, {
        fromDate,
        toDate,
        supplierId: supplierId || undefined,
      });
      setColumns(r.columns);
      setRows(r.rows);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Report failed');
      setRows([]);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          icon={BookOpen}
          title="Purchase reports"
          subtitle="Preset queries with CSV or Excel export (tenant-scoped)"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
          right={
            <ExportFormatDropdown
              filenameBase={`purchase-report-${preset}-${new Date().toISOString().slice(0, 10)}`}
              title="Download report as CSV"
              disabled={!rows.length}
              getData={() => ({
                headers: columns,
                rows: rows.map((r) =>
                  columns.map((c) => {
                    const v = r[c];
                    if (v == null) return '';
                    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
                    return String(v);
                  })
                ),
              })}
              buttonClassName={premiumTertiaryButton('sm', 'standard')}
            />
          }
        />

        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        <div className="mb-6 flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <label className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Preset</span>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as PurchaseReportPreset)}
              className="mt-1 block min-w-[240px] rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-gray-500">
              {PRESETS.find((p) => p.id === preset)?.hint}
            </span>
          </label>

          <label className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
            />
          </label>
          <label className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
            />
          </label>

          <label className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Supplier filter</span>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="mt-1 block min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
            >
              <option value="">All</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.legal_name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => void run()}
              disabled={loading || !tenant_id}
              className={premiumPrimaryButton('businessCore', 'md', 'wide')}
            >
              {loading ? 'Running…' : 'Run Report'}
            </button>
          </div>
        </div>

        {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-xs uppercase dark:bg-gray-900">
              <tr>
                {columns.map((c) => (
                  <th key={c} className="px-3 py-2">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                  {columns.map((c) => (
                    <td key={c} className="px-3 py-2">
                      {c === 'supplier_id' && typeof r[c] === 'string'
                        ? supplierMap.get(r[c] as string) ?? r[c]
                        : String(r[c] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !loading && (
            <p className="p-8 text-center text-sm text-gray-500">Run a report to see rows</p>
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
