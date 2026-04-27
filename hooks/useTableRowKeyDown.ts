import { useCallback } from 'react';
import type { KeyboardEvent } from 'react';

/**
 * Returns a keyboard handler for selectable table rows.
 * Fires `onSelect` when the user presses Enter or Space on a focusable <tr>.
 *
 * Usage:
 *   const handleRowKeyDown = useTableRowKeyDown(setSelectedId);
 *   <tr tabIndex={0} onKeyDown={(e) => handleRowKeyDown(e, item.id)} onClick={() => setSelectedId(item.id)} />
 */
export function useTableRowKeyDown<T>(onSelect: (item: T) => void) {
  return useCallback(
    (e: KeyboardEvent<HTMLTableRowElement>, item: T) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(item);
      }
    },
    [onSelect]
  );
}
