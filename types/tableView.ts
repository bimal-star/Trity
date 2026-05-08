/** How a list column renders its cell (Products table and other consumers). */
export type TableColumnRenderType = 'text' | 'badge' | 'icon-status' | 'currency' | 'boolean';

/** One state for `icon-status` columns: coloured dot + tooltip label. */
export type TableColumnIconStatusMapEntry = {
  /** Tailwind classes for the dot, e.g. `bg-emerald-500` */
  dotClass: string;
  label: string;
};

/** Optional pill styling for `badge` renderType. */
export type TableColumnBadgeMapEntry = {
  label: string;
  className: string;
};

/** Column metadata for list UIs using `useTableView` / `ColumnCustomiser`. */
export type TableColumnDefinition = {
  id: string;
  label: string;
  defaultVisible: boolean;
  /** When true, column is always shown (e.g. row selection). */
  alwaysOn?: boolean;
  /**
   * Cell presentation. Defaults to `text` when omitted.
   * Products list applies this in `renderProductListTableCell` for any visible column.
   */
  renderType?: TableColumnRenderType;
  /** Required when `renderType` is `icon-status`: maps normalized value → dot + tooltip. */
  statusMap?: Record<string, TableColumnIconStatusMapEntry>;
  /** When `renderType` is `badge`: maps normalized enum/value → pill label + classes. */
  badgeMap?: Record<string, TableColumnBadgeMapEntry>;
};
