'use client';

import { FileDown, Loader2 } from 'lucide-react';
import { downloadTableCsv } from '@/lib/csvDownload';

export type ExportTablePayload = {
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
};

type ExportCsvButtonProps = {
  filenameBase?: string;
  getData?: () => ExportTablePayload;
  /** When set (e.g. import/export page), invoked instead of client-side CSV download. */
  onExport?: () => void | Promise<void>;
  buttonClassName?: string;
  disabled?: boolean;
  isLoading?: boolean;
  title?: string;
};

const DEFAULT_EXPORT_BUTTON_CLASS =
  'inline-flex min-w-[8rem] h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-2.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700';

/** Single-action export control — downloads CSV from `getData` or runs `onExport`. */
export function ExportFormatDropdown({
  filenameBase,
  getData,
  onExport,
  buttonClassName,
  disabled,
  isLoading = false,
  title = 'Export as CSV',
}: ExportCsvButtonProps) {
  const runExport = async () => {
    if (onExport) {
      await onExport();
      return;
    }
    if (!filenameBase || !getData) return;
    const { headers, rows } = getData();
    downloadTableCsv(filenameBase, headers, rows);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={() => void runExport()}
      className={buttonClassName ?? DEFAULT_EXPORT_BUTTON_CLASS}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
      ) : (
        <FileDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      <span className="leading-none">Export CSV</span>
    </button>
  );
}
