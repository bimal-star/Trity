/**
 * Navigation Hierarchy Algorithm
 *
 * This module implements the position-based hierarchical navigation system
 * using dot-notation position strings (e.g., "1", "1.1", "1.1.1").
 *
 * This is a proprietary algorithm that provides:
 * - Unlimited depth hierarchy without foreign key constraints
 * - Efficient tree organization and traversal
 * - Position-based sorting and recalculation
 * - Virtual parent-child relationship derivation
 *
 * @module lib/navigation-hierarchy
 */

/**
 * Base interface for navigation items with position strings
 */
export interface PositionedItem {
  id: string;
  position: string | number;
  [key: string]: any;
}

/**
 * Hierarchical item with children array
 */
export interface HierarchicalItem<
  T extends PositionedItem = PositionedItem,
> extends PositionedItem {
  children?: HierarchicalItem<T>[];
}

/**
 * Metadata derived from position string
 */
export interface PositionMetadata {
  level: number;
  order: number;
  parentPosition: string | null;
  parts: number[];
}

/**
 * Compare two position strings for sorting
 * Handles dot-notation strings like "1", "1.1", "1.1.1"
 *
 * @param a - First position string
 * @param b - Second position string
 * @returns Comparison result (-1, 0, or 1)
 *
 * @example
 * comparePositions("1", "2") // -1
 * comparePositions("1.1", "1.2") // -1
 * comparePositions("1.1.1", "1.1") // 1
 */
export function comparePositions(a: string | number, b: string | number): number {
  const aParts = String(a)
    .split('.')
    .map((n) => parseInt(n, 10));
  const bParts = String(b)
    .split('.')
    .map((n) => parseInt(n, 10));
  const maxLen = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLen; i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal !== bVal) return aVal - bVal;
  }
  return 0;
}

/**
 * Parse position string into metadata
 *
 * @param position - Position string (e.g., "1.2.3")
 * @returns Position metadata including level, order, and parent position
 *
 * @example
 * parsePosition("1.2.3")
 * // Returns: { level: 2, order: 3, parentPosition: "1.2", parts: [1, 2, 3] }
 */
export function parsePosition(position: string | number): PositionMetadata {
  const posStr = String(position);
  const parts = posStr.split('.').map((n) => parseInt(n, 10));
  const level = parts.length - 1;
  const order = parts[parts.length - 1] || 0;
  const parentPosition = level > 0 ? parts.slice(0, -1).join('.') : null;

  return {
    level,
    order,
    parentPosition,
    parts,
  };
}

/**
 * Get parent position from a given position string
 *
 * @param position - Position string (e.g., "1.2.3")
 * @returns Parent position string or null if root level
 *
 * @example
 * getParentPosition("1.2.3") // "1.2"
 * getParentPosition("1") // null
 */
export function getParentPosition(position: string | number): string | null {
  const posStr = String(position);
  const parts = posStr.split('.');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
}

/**
 * Check if one position is a descendant of another
 *
 * @param ancestor - Potential ancestor position
 * @param descendant - Potential descendant position
 * @returns True if descendant is a child/grandchild/etc. of ancestor
 *
 * @example
 * isDescendantOf("1", "1.2.3") // true
 * isDescendantOf("1.2", "1.2.3") // true
 * isDescendantOf("1.2", "1.3") // false
 */
export function isDescendantOf(ancestor: string | number, descendant: string | number): boolean {
  const ancestorStr = String(ancestor);
  const descendantStr = String(descendant);
  return descendantStr.startsWith(ancestorStr + '.') || descendantStr === ancestorStr;
}

/**
 * Get all descendants of a position from a list of items
 *
 * @param position - Position to find descendants for
 * @param items - Array of positioned items
 * @returns Array of items that are descendants of the given position
 */
export function getDescendants<T extends PositionedItem>(
  position: string | number,
  items: T[]
): T[] {
  const positionStr = String(position);
  return items.filter((item) => {
    const itemPos = String(item.position);
    return itemPos.startsWith(positionStr + '.') && itemPos !== positionStr;
  });
}

/**
 * Recalculate descendant positions when a parent moves
 *
 * @param oldPosition - Original position of moved item
 * @param newPosition - New position of moved item
 * @param descendant - Descendant item to update
 * @returns New position string for the descendant
 *
 * @example
 * recalculateDescendantPosition("1.2", "2.3", { position: "1.2.1" })
 * // Returns: "2.3.1"
 */
export function recalculateDescendantPosition(
  oldPosition: string | number,
  newPosition: string | number,
  descendant: PositionedItem
): string {
  const oldPosStr = String(oldPosition);
  const newPosStr = String(newPosition);
  const descPosStr = String(descendant.position);

  if (!descPosStr.startsWith(oldPosStr + '.')) {
    return descPosStr; // Not a descendant, return unchanged
  }

  // Replace the old position prefix with the new position
  return descPosStr.replace(oldPosStr, newPosStr);
}

/**
 * Organize flat array of items into hierarchical tree structure
 *
 * This is the core algorithm that converts a flat list with position strings
 * into a nested tree structure with parent-child relationships.
 *
 * @param items - Flat array of positioned items
 * @returns Hierarchical tree structure with children arrays
 *
 * @example
 * organizeHierarchy([
 *   { id: "1", position: "1", label: "Home" },
 *   { id: "2", position: "1.1", label: "Sub" },
 *   { id: "3", position: "2", label: "About" }
 * ])
 * // Returns: [
 * //   { id: "1", position: "1", label: "Home", children: [
 * //     { id: "2", position: "1.1", label: "Sub", children: [] }
 * //   ]},
 * //   { id: "3", position: "2", label: "About", children: [] }
 * // ]
 */
export function organizeHierarchy<T extends PositionedItem>(items: T[]): HierarchicalItem<T>[] {
  const organized: HierarchicalItem<T>[] = [];
  const itemsMap = new Map<string, HierarchicalItem<T>>();

  // Sort items by position string first
  const sortedItems = [...items].sort((a, b) => comparePositions(a.position, b.position));

  // First pass: create all items with empty children arrays
  sortedItems.forEach((item) => {
    const posStr = String(item.position);
    itemsMap.set(posStr, { ...item, children: [] } as HierarchicalItem<T>);
  });

  // Second pass: organize hierarchy
  sortedItems.forEach((item) => {
    const posStr = String(item.position);
    const parts = posStr.split('.');

    if (parts.length === 1) {
      // Root level item (e.g., "1", "2", "3")
      const parent = itemsMap.get(posStr);
      if (parent) {
        organized.push(parent);
      }
    } else {
      // Child or grandchild item (e.g., "1.1", "1.1.1")
      const parentPos = parts.slice(0, -1).join('.');
      const parent = itemsMap.get(parentPos);
      const child = itemsMap.get(posStr);

      if (parent && child) {
        parent.children = parent.children || [];
        parent.children.push(child);
      }
    }
  });

  // Third pass: promote "orphan" items whose parent position is missing from the result
  // (e.g. RLS returns children but not parent rows). Without this, the tree is empty and
  // the sidebar shows nothing.
  const markVisited = (nodes: HierarchicalItem<T>[], seen: Set<string>) => {
    for (const n of nodes) {
      seen.add(String(n.position));
      if (n.children?.length) markVisited(n.children, seen);
    }
  };
  const visited = new Set<string>();
  markVisited(organized, visited);

  const depthOf = (pos: string) => pos.split('.').length;
  const unattached = sortedItems
    .filter((i) => !visited.has(String(i.position)))
    .sort((a, b) => depthOf(String(a.position)) - depthOf(String(b.position)));

  for (const item of unattached) {
    const posStr = String(item.position);
    if (visited.has(posStr)) continue;
    const parts = posStr.split('.');
    const parentPos = parts.length > 1 ? parts.slice(0, -1).join('.') : '';
    const parentInMap = Boolean(parentPos && itemsMap.has(parentPos));
    const parentVisited = Boolean(parentPos && visited.has(parentPos));
    const promote = parts.length === 1 || !parentInMap || !parentVisited;
    if (promote) {
      const node = itemsMap.get(posStr);
      if (node) {
        organized.push(node);
        markVisited([node], visited);
      }
    }
  }

  return organized;
}

/**
 * Depth-first flatten of navigation tree for module access UI (id, label, position only).
 */
export function flattenNavigationTreeForAccess(
  items: HierarchicalItem<PositionedItem & { id?: string; label?: string }>[]
): Array<{ id: string; label: string; position: string | number }> {
  const results: Array<{ id: string; label: string; position: string | number }> = [];
  const stack = [...items];
  while (stack.length > 0) {
    const current = stack.shift();
    if (!current) continue;
    const id = (current as { id?: string }).id;
    const label = (current as { label?: string }).label;
    if (id && label) {
      results.push({ id, label, position: current.position });
    }
    const kids = current.children;
    if (kids && kids.length > 0) {
      stack.push(...kids);
    }
  }
  return results;
}

/**
 * Enrich item with virtual metadata derived from position
 *
 * @param item - Item to enrich
 * @param allItems - All items in the collection (for finding parent by ID)
 * @returns Item with added level, order, and parent_id fields
 */
export function enrichWithMetadata<T extends PositionedItem>(
  item: T,
  allItems: T[]
): T & PositionMetadata & { parent_id: string | null } {
  const metadata = parsePosition(item.position);
  const parentPosition = metadata.parentPosition;

  // Find parent by matching position
  let parent_id: string | null = null;
  if (parentPosition) {
    const parent = allItems.find((i) => String(i.position) === parentPosition);
    parent_id = parent?.id || null;
  }

  return {
    ...item,
    ...metadata,
    parent_id,
  };
}

/**
 * Calculate next root position for adding a new top-level item
 *
 * @param items - Existing items
 * @returns Next available root position string
 *
 * @example
 * getNextRootPosition([
 *   { position: "1" },
 *   { position: "2" },
 *   { position: "3" }
 * ])
 * // Returns: "4"
 */
export function getNextRootPosition<T extends PositionedItem>(items: T[]): string {
  const rootItems = items.filter((item) => {
    const posStr = String(item.position);
    return posStr.split('.').length === 1;
  });

  if (rootItems.length === 0) return '1';

  const maxPosition = Math.max(
    ...rootItems.map((item) => {
      const posStr = String(item.position);
      return parseInt(posStr.split('.')[0], 10) || 0;
    })
  );

  return String(maxPosition + 1);
}

/** Direct children of `parentPosition` (one extra path segment), not deeper descendants. */
export function getDirectChildren<T extends PositionedItem>(
  parentPosition: string | number | null,
  items: T[]
): T[] {
  const parentStr = parentPosition == null ? null : String(parentPosition);
  return items.filter((item) => {
    const p = getParentPosition(String(item.position));
    if (parentStr === null) return p === null;
    return p === parentStr;
  });
}

/**
 * Calculate next child position for adding under a parent
 *
 * @param parentPosition - Parent position string
 * @param items - Existing items
 * @returns Next available child position string
 *
 * @example
 * getNextChildPosition("1", [
 *   { position: "1.1" },
 *   { position: "1.2" }
 * ])
 * // Returns: "1.3"
 */
export function getNextChildPosition<T extends PositionedItem>(
  parentPosition: string | number,
  items: T[]
): string {
  const parentStr = String(parentPosition);
  const children = getDirectChildren(parentStr, items);

  if (children.length === 0) {
    return `${parentStr}.1`;
  }

  const maxOrder = Math.max(
    ...children.map((item) => {
      const itemPos = String(item.position);
      const parts = itemPos.split('.');
      const lastPart = parts[parts.length - 1];
      return parseInt(lastPart, 10) || 0;
    })
  );

  return `${parentStr}.${maxOrder + 1}`;
}

export type NavigationPositionUpdate = { id: string; position: string };

/**
 * Reassigns dot positions so active rows are consecutive under each parent, with soft-deleted
 * rows (`is_deleted === true`) after active siblings. Preserves relative order within each group.
 * Returns only rows whose position string changes.
 */
export function renumberNavigationPositions<T extends PositionedItem & { is_deleted?: boolean }>(
  items: T[]
): NavigationPositionUpdate[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => comparePositions(a.position, b.position));
  const tree = organizeHierarchy(sorted);

  const sortChildrenDeep = (nodes: HierarchicalItem<T>[]) => {
    nodes.sort((a, b) => comparePositions(a.position, b.position));
    for (const n of nodes) {
      if (n.children?.length) sortChildrenDeep(n.children as HierarchicalItem<T>[]);
    }
  };
  sortChildrenDeep(tree);

  const newById = new Map<string, string>();

  const walk = (parentNewPos: string | null, nodes: HierarchicalItem<T>[]) => {
    const ordered = [...nodes].sort((a, b) => comparePositions(a.position, b.position));
    const active = ordered.filter((n) => !n.is_deleted);
    const tomb = ordered.filter((n) => Boolean(n.is_deleted));
    const seq = [...active, ...tomb];
    seq.forEach((node, idx) => {
      const newPos = parentNewPos === null ? String(idx + 1) : `${parentNewPos}.${idx + 1}`;
      newById.set(String(node.id), newPos);
      const kids = node.children as HierarchicalItem<T>[] | undefined;
      if (kids?.length) walk(newPos, kids);
    });
  };

  walk(null, tree);

  const out: NavigationPositionUpdate[] = [];
  for (const n of items) {
    const id = String(n.id);
    const newP = newById.get(id);
    if (newP != null && String(n.position) !== newP) {
      out.push({ id, position: newP });
    }
  }
  return out;
}
