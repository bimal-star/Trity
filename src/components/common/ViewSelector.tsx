'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { premiumInputCompact, premiumTypography } from '@/lib/premiumUi';

const MENU_MIN_WIDTH_PX = 224; // 14rem

export type ViewSelectorItem = {
  id: string;
  name: string;
  is_personal_default?: boolean;
};

type ViewSelectorProps = {
  views: ViewSelectorItem[];
  selection: string;
  onSelectionChange: (key: string) => void;
  loading: boolean;
  onSaveView: () => void;
  onSetPersonalDefault: () => void;
  onClearPersonalDefault: () => void;
  onSaveWorkspaceDefault?: () => void;
  canWorkspaceDefault: boolean;
  /** When set, shows “Delete this view…” for the current selection (saved views only). */
  onDeleteSelectedView?: () => void;
};

export function ViewSelector({
  views,
  selection,
  onSelectionChange,
  loading,
  onSaveView,
  onSetPersonalDefault,
  onClearPersonalDefault,
  onSaveWorkspaceDefault,
  canWorkspaceDefault,
  onDeleteSelectedView,
}: ViewSelectorProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const updateMenuPosition = useCallback(() => {
    const btn = menuBtnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const w = Math.max(MENU_MIN_WIDTH_PX, r.width);
    let left = r.right - w;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    const top = r.bottom + 4;
    setMenuPos((prev) => {
      if (prev && prev.top === top && prev.left === left && prev.width === w) return prev;
      return { top, left, width: w };
    });
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
    // Do not use capture: true — it receives scroll events from nested overflow areas (e.g. the
    // product table), causing constant re-renders and broken clicks / cursor flicker.
    window.addEventListener('scroll', updateMenuPosition, { passive: true });
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      window.removeEventListener('scroll', updateMenuPosition);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [menuOpen, updateMenuPosition]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuPanelRef.current?.contains(t)) return;
      if (menuBtnRef.current?.contains(t)) return;
      closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, closeMenu]);

  const filterControlClass = `${premiumInputCompact} h-9 ${premiumTypography.tableCell}`;

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-1">
      <label
        className={`flex min-w-0 items-center gap-1 text-xs text-gray-600 dark:text-gray-400 ${premiumTypography.tableCell}`}
      >
        <span className="sr-only sm:not-sr-only sm:inline shrink-0">View</span>
        <select
          value={selection}
          onChange={(e) => onSelectionChange(e.target.value)}
          disabled={loading}
          className={`${filterControlClass} min-w-0 max-w-[10rem] sm:max-w-[14rem]`}
          aria-label="Saved list view"
        >
          <option value="system">System default</option>
          <option value="workspace">Workspace default</option>
          {views.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.is_personal_default ? ' (my default)' : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="relative shrink-0">
        <button
          ref={menuBtnRef}
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          disabled={loading}
          title="View actions"
          onClick={() => setMenuOpen((o) => !o)}
          className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 ${premiumTypography.tableCell}`}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
          <span className="sr-only">View actions menu</span>
        </button>
        {menuOpen &&
          menuPos &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={menuPanelRef}
              role="menu"
              style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                zIndex: 220,
              }}
              className="rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-xs text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  closeMenu();
                  onSaveView();
                }}
              >
                Save view…
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={selection === 'system' || selection === 'workspace'}
                className="block w-full px-3 py-2 text-left text-xs text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  closeMenu();
                  onSetPersonalDefault();
                }}
              >
                Set as my default
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-xs text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  closeMenu();
                  onClearPersonalDefault();
                }}
              >
                Clear my default
              </button>
              {canWorkspaceDefault && onSaveWorkspaceDefault && (
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-xs text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={() => {
                    closeMenu();
                    onSaveWorkspaceDefault();
                  }}
                >
                  Save as workspace default
                </button>
              )}
              {onDeleteSelectedView && (
                <>
                  <div
                    className="my-1 border-t border-gray-100 dark:border-gray-800"
                    role="separator"
                    aria-hidden
                  />
                  <button
                    type="button"
                    role="menuitem"
                    disabled={selection === 'system' || selection === 'workspace'}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    onClick={() => {
                      closeMenu();
                      onDeleteSelectedView();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Delete this view…
                  </button>
                </>
              )}
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}
