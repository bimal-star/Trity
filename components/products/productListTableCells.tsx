import type { ReactNode } from 'react';
import type { Product, ProductType } from '@/types/product';
import type { TableColumnDefinition, TableColumnRenderType } from '@/types/tableView';
import { Check, ImageIcon, Minus } from 'lucide-react';
import { getProductPrimaryImageUrl } from '@/lib/productImageStorage';
import { getProductListColumnUi } from '@/lib/productListColumnCatalog';
import { getProductStockStatus } from '@/lib/productStockStatus';
import { premiumTypography } from '@/lib/premiumUi';
import { Tooltip } from '@/src/components/common/Tooltip';

export function formatProductTypeLabel(t: ProductType): string {
  return t.replace(/_/g, ' ');
}

export function formatMoney(amount: number | null | undefined, currency: string): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount));
  } catch {
    return `${currency} ${amount}`;
  }
}

/** `renderType: currency` columns — always two fractional digits (unit price uses `formatMoney` instead). */
function formatCurrencyColumnDisplay(amount: number | null | undefined, currency: string): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

function formatScalar(p: Product, key: string): ReactNode {
  const v = (p as unknown as Record<string, unknown>)[key];
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) {
    const s = v.map((x) => String(x)).join(', ');
    return s || '—';
  }
  if (typeof v === 'object') {
    const s = JSON.stringify(v);
    return s.length > 120 ? `${s.slice(0, 120)}…` : s;
  }
  return String(v);
}

/** Normalized key for `icon-status` columns (pseudo + DB). */
function iconStatusKeyForColumn(p: Product, columnId: string): string {
  if (columnId === 'stock') return getProductStockStatus(p).bucket;
  if (columnId === 'lifecycle') return p.is_deleted ? 'archived' : 'active';
  const v = (p as unknown as Record<string, unknown>)[columnId];
  if (v === null || v === undefined) return '';
  return String(v).trim().toLowerCase();
}

type CellCtx = {
  p: Product;
  idx: number;
  currencyCode: string;
  showGroupColumn: boolean;
  selected: boolean;
  onToggleSelect: (id: string, next: boolean) => void;
  onOpenRow: (p: Product) => void;
};

function resolveRenderUi(
  columnId: string,
  columnDef?: TableColumnDefinition | null
): {
  renderType: TableColumnRenderType;
  statusMap?: TableColumnDefinition['statusMap'];
  badgeMap?: TableColumnDefinition['badgeMap'];
} {
  if (columnDef) {
    return {
      renderType: columnDef.renderType ?? 'text',
      statusMap: columnDef.statusMap,
      badgeMap: columnDef.badgeMap,
    };
  }
  return getProductListColumnUi(columnId);
}

function renderIconStatusCell(
  columnId: string,
  ctx: CellCtx,
  statusMap: NonNullable<TableColumnDefinition['statusMap']>
): ReactNode {
  const { p } = ctx;
  const key = iconStatusKeyForColumn(p, columnId);
  const entry = statusMap[key] ?? {
    dotClass: 'bg-gray-300',
    label: key ? key.replace(/_/g, ' ') : 'Unknown',
  };
  return (
    <td key={columnId} className={`px-2 py-2 ${premiumTypography.tableCell}`}>
      <Tooltip label={entry.label}>
        <span className="inline-flex cursor-default items-center justify-center py-0.5">
          <span
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${entry.dotClass}`}
            aria-hidden
          />
          <span className="sr-only">{entry.label}</span>
        </span>
      </Tooltip>
    </td>
  );
}

function renderBooleanCell(columnId: string, ctx: CellCtx): ReactNode {
  const { p } = ctx;
  const raw = (p as unknown as Record<string, unknown>)[columnId];
  const on = raw === true;
  const label = on ? 'Yes' : 'No';
  return (
    <td key={columnId} className={`px-2 py-2 ${premiumTypography.tableCell}`}>
      <Tooltip label={label}>
        <span className="inline-flex cursor-default items-center justify-center py-0.5 text-gray-600 dark:text-gray-400">
          {on ? (
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : (
            <Minus className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden />
          )}
          <span className="sr-only">{label}</span>
        </span>
      </Tooltip>
    </td>
  );
}

function renderCurrencyCell(columnId: string, ctx: CellCtx): ReactNode {
  const { p, currencyCode } = ctx;
  const amount = (p as unknown as Record<string, number | null | undefined>)[columnId] as
    | number
    | null
    | undefined;
  const cur = (p.currency && String(p.currency).trim()) || currencyCode;
  return (
    <td
      key={columnId}
      className={`whitespace-nowrap px-2 py-2 tabular-nums text-gray-800 dark:text-gray-100 ${premiumTypography.tableCell}`}
    >
      {formatCurrencyColumnDisplay(amount, cur)}
    </td>
  );
}

function renderBadgeCell(
  columnId: string,
  ctx: CellCtx,
  badgeMap: NonNullable<TableColumnDefinition['badgeMap']>
): ReactNode {
  const { p } = ctx;
  const raw = (p as unknown as Record<string, unknown>)[columnId];
  const key = raw == null ? '' : String(raw).trim().toLowerCase();
  const entry = badgeMap[key] ?? {
    label: raw == null || raw === '' ? '—' : String(raw),
    className:
      'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-300',
  };
  return (
    <td key={columnId} className={`px-2 py-2 ${premiumTypography.tableCell}`}>
      <span
        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${entry.className}`}
      >
        {entry.label}
      </span>
    </td>
  );
}

export function renderProductListTableCell(
  columnId: string,
  ctx: CellCtx,
  columnDef?: TableColumnDefinition | null
): ReactNode {
  const { p, currencyCode, selected, onToggleSelect, onOpenRow } = ctx;

  switch (columnId) {
    case '_select':
      return (
        <td
          key={columnId}
          className="px-2 py-1.5 align-middle"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            aria-label={`Select ${p.name}`}
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            onChange={(e) => onToggleSelect(p.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        </td>
      );
    case '_thumbnail': {
      const thumb = getProductPrimaryImageUrl(p);
      return (
        <td key={columnId} className="px-1 py-1 align-middle">
          <button
            type="button"
            className="h-11 w-11 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900"
            onClick={() => onOpenRow(p)}
            aria-label={`Open ${p.name}`}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-gray-400">
                <ImageIcon className="h-5 w-5" aria-hidden />
              </span>
            )}
          </button>
        </td>
      );
    }
    case 'categories': {
      const cat = p.categories?.length ? p.categories.slice(0, 2).join(' · ') : '—';
      return (
        <td
          key={columnId}
          className={`truncate px-2 py-2 text-gray-600 dark:text-gray-400 ${premiumTypography.tableCell}`}
        >
          {cat}
        </td>
      );
    }
    case 'product_group':
      return (
        <td
          key={columnId}
          className={`truncate px-2 py-2 text-gray-600 dark:text-gray-400 ${premiumTypography.tableCell}`}
        >
          {p.product_group_name?.trim() || '—'}
        </td>
      );
    case 'product_type':
      return (
        <td
          key={columnId}
          className={`truncate px-2 py-2 capitalize text-gray-600 dark:text-gray-400 ${premiumTypography.tableCell}`}
        >
          {formatProductTypeLabel(p.product_type)}
        </td>
      );
    case 'sell_price':
      return (
        <td
          key={columnId}
          className={`whitespace-nowrap px-2 py-2 tabular-nums text-gray-800 dark:text-gray-100 ${premiumTypography.tableCell}`}
        >
          {formatMoney(p.sell_price, currencyCode)}
        </td>
      );
    case 'sku':
      return (
        <td
          key={columnId}
          className={`truncate px-2 py-2 font-medium text-gray-900 dark:text-white ${premiumTypography.tableCell}`}
        >
          {p.sku}
        </td>
      );
    case 'name':
      return (
        <td
          key={columnId}
          className={`truncate px-2 py-2 text-gray-900 dark:text-gray-50 ${premiumTypography.tableCell}`}
        >
          {p.name}
        </td>
      );
    default:
      break;
  }

  const ui = resolveRenderUi(columnId, columnDef);

  if (ui.renderType === 'icon-status') {
    if (ui.statusMap) return renderIconStatusCell(columnId, ctx, ui.statusMap);
    // Misconfigured column: fall back to text rather than rendering empty.
  }
  if (ui.renderType === 'boolean') {
    return renderBooleanCell(columnId, ctx);
  }
  if (ui.renderType === 'currency') {
    return renderCurrencyCell(columnId, ctx);
  }
  if (ui.renderType === 'badge') {
    if (ui.badgeMap) return renderBadgeCell(columnId, ctx, ui.badgeMap);
  }

  return (
    <td
      key={columnId}
      className={`max-w-[16rem] truncate px-2 py-2 text-gray-700 dark:text-gray-300 ${premiumTypography.tableCell}`}
    >
      {formatScalar(p, columnId)}
    </td>
  );
}
