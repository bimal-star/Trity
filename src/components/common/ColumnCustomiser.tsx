'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical } from 'lucide-react';
import { premiumPrimaryButton, premiumSecondaryButton, premiumTypography } from '@/lib/premiumUi';

export type ColumnCustomiserModule = 'businessCore';

type ColumnCustomiserProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  columnOrder: string[];
  columnHidden: string[];
  /** Shown first, always visible, no visibility toggle (e.g. row select + thumbnail). */
  alwaysOnIds: string[];
  /** If set, rows with this id are omitted (e.g. product_group when catalogue has no groups). */
  excludeColumnId?: string | null;
  /** When set, columns for which this returns false are omitted from the picker (not reorderable here). */
  isColumnPickable?: (id: string) => boolean;
  getLabel: (id: string) => string;
  onApply: (order: string[], hidden: string[]) => void;
  /** Tailwind max-h for the scrollable column list. */
  listMaxHeightClass?: string;
  module?: ColumnCustomiserModule;
};

const DEFAULT_LIST_MAX = 'max-h-[min(70vh,18rem)]';

/** Panel width cap (px); narrower = fewer wrapped labels, same typography / list gaps. */
const PANEL_W = 18 * 16;

export function ColumnCustomiser({
  open,
  onClose,
  anchorRef,
  columnOrder,
  columnHidden,
  alwaysOnIds,
  excludeColumnId,
  isColumnPickable,
  getLabel,
  onApply,
  listMaxHeightClass = DEFAULT_LIST_MAX,
  module = 'businessCore',
}: ColumnCustomiserProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<string | null>(null);
  const [draftOrder, setDraftOrder] = useState<string[]>(columnOrder);
  const [draftHidden, setDraftHidden] = useState<Set<string>>(() => new Set(columnHidden));
  const [dragId, setDragId] = useState<string | null>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, maxHeight: 480 });

  const alwaysOnSet = useMemo(() => new Set(alwaysOnIds), [alwaysOnIds]);
  const defaultPickable = useCallback(() => true, []);
  const pick = isColumnPickable ?? defaultPickable;

  useEffect(() => {
    if (!open) return;
    const always = new Set(alwaysOnIds);
    setDraftOrder(columnOrder.filter((id) => always.has(id) || pick(id)));
    setDraftHidden(new Set(columnHidden));
  }, [open, columnOrder, columnHidden, alwaysOnIds, pick]);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const update = () => {
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const panelWidth = Math.min(
        PANEL_W,
        typeof window !== 'undefined' ? window.innerWidth - 24 : PANEL_W
      );
      let left = r.left;
      if (typeof window !== 'undefined') {
        if (left + panelWidth > window.innerWidth - 12) {
          left = Math.max(12, window.innerWidth - 12 - panelWidth);
        } else {
          left = Math.max(12, left);
        }
      }
      const top = r.bottom + 8;
      const maxHeight =
        typeof window !== 'undefined' ? Math.max(200, window.innerHeight - top - 16) : 480;
      setPanelPos((prev) => {
        if (prev.top === top && prev.left === left && prev.maxHeight === maxHeight) return prev;
        return { top, left, maxHeight };
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  const toggleHidden = useCallback(
    (id: string) => {
      if (alwaysOnSet.has(id)) return;
      if (excludeColumnId && id === excludeColumnId) return;
      setDraftHidden((prev) => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      });
    },
    [alwaysOnSet, excludeColumnId]
  );

  const moveRow = useCallback(
    (fromId: string, toId: string) => {
      if (alwaysOnSet.has(fromId) || alwaysOnSet.has(toId)) return;
      if (!pick(fromId) || !pick(toId)) return;
      setDraftOrder((prev) => {
        const pins = alwaysOnIds.filter((id) => prev.includes(id));
        const rest = prev.filter((id) => !alwaysOnSet.has(id) && pick(id));
        const i = rest.indexOf(fromId);
        const j = rest.indexOf(toId);
        if (i < 0 || j < 0 || i === j) return prev;
        const nextRest = [...rest];
        nextRest.splice(i, 1);
        nextRest.splice(j, 0, fromId);
        return [...pins, ...nextRest];
      });
    },
    [alwaysOnSet, alwaysOnIds, pick]
  );

  const onDragStart = (e: React.DragEvent, id: string) => {
    if (alwaysOnSet.has(id)) return;
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    dragIdRef.current = id;
    setDragId(id);
  };
  const onDragOverRow = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    const current = dragIdRef.current;
    if (!current || current === id) return;
    moveRow(current, id);
  };
  const onDragEnd = () => {
    dragIdRef.current = null;
    setDragId(null);
  };

  if (!open) return null;

  const filteredOrder = draftOrder.filter((id) => !(excludeColumnId && id === excludeColumnId));
  const toggleable = filteredOrder.filter(
    (id) => !alwaysOnSet.has(id) && pick(id) && !(excludeColumnId && id === excludeColumnId)
  );

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Optional columns"
      className={`fixed z-[200] flex min-h-0 w-[min(18rem,calc(100vw-1.5rem))] flex-col rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 ${premiumTypography.tableCell}`}
      style={{ top: panelPos.top, left: panelPos.left, maxHeight: panelPos.maxHeight }}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2.5 py-2">
        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Optional columns
          </p>
          <ul
            className={`min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain pr-0.5 ${listMaxHeightClass}`}
          >
            {toggleable.map((id) => {
              const visible = !draftHidden.has(id);
              return (
                <li
                  key={id}
                  onDragOver={(e) => onDragOverRow(e, id)}
                  className="flex items-center gap-1.5 rounded-md border border-transparent px-0.5 py-1 hover:border-gray-200 hover:bg-gray-50 dark:hover:border-gray-600 dark:hover:bg-gray-800/80"
                >
                  <span
                    role="presentation"
                    draggable
                    tabIndex={-1}
                    title="Drag to reorder"
                    className="w-4 shrink-0 cursor-grab text-gray-400 active:cursor-grabbing"
                    onDragStart={(ev) => onDragStart(ev, id)}
                    onDragEnd={onDragEnd}
                  >
                    <GripVertical className="pointer-events-none h-4 w-4" aria-hidden />
                  </span>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={() => toggleHidden(id)}
                      className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-green-600"
                    />
                    <span className="truncate text-xs">{getLabel(id)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-2 flex shrink-0 justify-end gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
          <button
            type="button"
            className={premiumSecondaryButton(module, 'sm', 'auto')}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={premiumPrimaryButton(module, 'sm', 'auto')}
            onClick={() => {
              onApply(draftOrder, [...draftHidden]);
              onClose();
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
