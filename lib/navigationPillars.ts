/**
 * Pillar helpers: legacy **position** first segment `1` / `2` / `3` maps to Analytics / Business Core / Execution
 * (see PILLAR_ROOT_LABELS). Multi-column UIs should prefer **label + hierarchy** (`PILLAR_ROOT_LABEL_ORDER`,
 * `pillarColumnRowsByLabel`, …) so columns stay aligned after Navigation Manager reorders roots.
 */
import {
  comparePositions,
  organizeHierarchy,
  type HierarchicalItem,
} from '@/lib/navigation-hierarchy';
import type { PremiumModule } from '@/lib/premiumUi';

export type PillarPositionPrefix = '1' | '2' | '3';

export const PILLAR_ROOT_LABELS: Record<string, string> = {
  '1': 'Analytics',
  '2': 'Business Core',
  '3': 'Execution',
};

/** Left-to-right column order for pillar grids (Business Core → Execution → Analytics). */
export const PILLAR_UI_ORDER: readonly PillarPositionPrefix[] = ['2', '3', '1'];

/** Top-level root labels (trimmed exact match) for the three product pillars; same narrative order as PILLAR_UI_ORDER. */
export const PILLAR_ROOT_LABEL_ORDER = ['Business Core', 'Execution', 'Analytics'] as const;
export type PillarRootLabel = (typeof PILLAR_ROOT_LABEL_ORDER)[number];

export interface NavPillarRow {
  id: string;
  label: string;
  position: string | number;
  path: string | null;
  is_enabled: boolean;
  is_deleted?: boolean | null;
}

export function positionRootSegment(position: string | number): string {
  return String(position ?? '').split('.')[0] ?? '';
}

export function isThreePillarPrefix(seg: string): seg is PillarPositionPrefix {
  return seg === '1' || seg === '2' || seg === '3';
}

export function premiumModuleForPillarPrefix(prefix: PillarPositionPrefix): PremiumModule {
  switch (prefix) {
    case '1':
      return 'analytics';
    case '2':
      return 'businessCore';
    case '3':
      return 'execution';
    default:
      return 'analytics';
  }
}

export function premiumModuleForPillarLabel(label: string): PremiumModule {
  switch (String(label).trim()) {
    case 'Business Core':
      return 'businessCore';
    case 'Execution':
      return 'execution';
    case 'Analytics':
      return 'analytics';
    default:
      return 'analytics';
  }
}

function navRowsForHierarchy(rows: NavPillarRow[]): NavPillarRow[] {
  return rows.filter((r) => !r.is_deleted);
}

function findPillarRootNode(
  tree: HierarchicalItem<NavPillarRow>[],
  pillarLabel: string
): HierarchicalItem<NavPillarRow> | null {
  const want = pillarLabel.trim();
  for (const node of tree) {
    if (String(node.label ?? '').trim() === want) return node;
  }
  return null;
}

function collectSubtreeIdsIncludingRoot(node: HierarchicalItem<NavPillarRow>): string[] {
  const ids: string[] = [node.id];
  for (const c of node.children ?? []) {
    ids.push(...collectSubtreeIdsIncludingRoot(c as HierarchicalItem<NavPillarRow>));
  }
  return ids;
}

function collectDescendantIdsOnly(node: HierarchicalItem<NavPillarRow>): string[] {
  const ids: string[] = [];
  for (const c of node.children ?? []) {
    ids.push(c.id);
    ids.push(...collectDescendantIdsOnly(c as HierarchicalItem<NavPillarRow>));
  }
  return ids;
}

function findNodeById(
  tree: HierarchicalItem<NavPillarRow>[],
  id: string
): HierarchicalItem<NavPillarRow> | null {
  for (const n of tree) {
    if (n.id === id) return n;
    const found = findNodeById((n.children ?? []) as HierarchicalItem<NavPillarRow>[], id);
    if (found) return found;
  }
  return null;
}

/** All ids in the subtree of a node by row id (including the node). */
export function allIdsInNodeSubtree(rows: NavPillarRow[], nodeId: string): string[] {
  const tree = organizeHierarchy(navRowsForHierarchy(rows));
  const node = findNodeById(tree, nodeId);
  if (!node) return [nodeId];
  return collectSubtreeIdsIncludingRoot(node);
}

/** True if this navigation row has child rows in the hierarchy. */
export function navRowHasDescendants(rows: NavPillarRow[], nodeId: string): boolean {
  const tree = organizeHierarchy(navRowsForHierarchy(rows));
  const node = findNodeById(tree, nodeId);
  return Boolean(node?.children && node.children.length > 0);
}

/**
 * Direct children of a pillar root only (first level under Business Core / Execution / Analytics).
 * Sorted by position; excludes deleted.
 */
export function directChildrenOfPillarRoot(rows: NavPillarRow[], pillarLabel: string): NavPillarRow[] {
  const tree = organizeHierarchy(navRowsForHierarchy(rows));
  const root = findPillarRootNode(tree, pillarLabel);
  if (!root?.children?.length) return [];
  const byId = new Map(navRowsForHierarchy(rows).map((r) => [r.id, r]));
  const kids = (root.children as HierarchicalItem<NavPillarRow>[])
    .map((c) => byId.get(c.id))
    .filter((r): r is NavPillarRow => Boolean(r));
  return kids.sort((a, b) => comparePositions(a.position, b.position));
}

/** Top-level navigation roots that are not the three product pillar labels. */
export function nonPillarForestTopLevel(rows: NavPillarRow[]): HierarchicalItem<NavPillarRow>[] {
  const tree = organizeHierarchy(navRowsForHierarchy(rows));
  const labels = new Set<string>(PILLAR_ROOT_LABEL_ORDER as unknown as string[]);
  return tree.filter((n) => !labels.has(String(n.label ?? '').trim()));
}

/** Union of all row ids under Business Core, Execution, and Analytics pillar roots. */
export function productPillarSubtreeIdSet(rows: NavPillarRow[]): Set<string> {
  const s = new Set<string>();
  for (const label of PILLAR_ROOT_LABEL_ORDER) {
    for (const id of allIdsInSubtreeByLabel(rows, label)) s.add(id);
  }
  return s;
}

/** Every row id in the subtree of the top-level root with this label (including the root). */
export function allIdsInSubtreeByLabel(rows: NavPillarRow[], pillarLabel: string): string[] {
  const tree = organizeHierarchy(navRowsForHierarchy(rows));
  const root = findPillarRootNode(tree, pillarLabel);
  if (!root) return [];
  return collectSubtreeIdsIncludingRoot(root);
}

/**
 * Descendants of the pillar root only (excludes the root), sorted by position.
 * Non-deleted rows only; respects the same visibility rules as prefix-based `pillarColumnRows`.
 */
export function pillarColumnRowsByLabel(rows: NavPillarRow[], pillarLabel: string): NavPillarRow[] {
  const tree = organizeHierarchy(navRowsForHierarchy(rows));
  const root = findPillarRootNode(tree, pillarLabel);
  if (!root) return [];
  const descIds = collectDescendantIdsOnly(root);
  const byId = new Map(navRowsForHierarchy(rows).map((r) => [r.id, r]));
  const out: NavPillarRow[] = [];
  for (const id of descIds) {
    const r = byId.get(id);
    if (r) out.push(r);
  }
  return out.sort((a, b) => comparePositions(a.position, b.position));
}

/** Tri-state for all rows in a label-based pillar subtree (including root), for master checkbox + bulk toggle. */
export function pillarTriStateForSubtreeByLabel(rows: NavPillarRow[], pillarLabel: string): PillarTriState {
  const idSet = new Set(allIdsInSubtreeByLabel(rows, pillarLabel));
  if (idSet.size === 0) return 'none';
  const subset = rows.filter((r) => idSet.has(r.id) && !r.is_deleted);
  if (subset.length === 0) return 'none';
  const enabled = subset.filter((r) => r.is_enabled).length;
  if (enabled === 0) return 'none';
  if (enabled === subset.length) return 'all';
  return 'some';
}

/** Routable (leaf path) modules under a pillar subtree, sorted by position. */
export function routableRowsInPillarSubtreeByLabel(rows: NavPillarRow[], pillarLabel: string): NavPillarRow[] {
  const idSet = new Set(allIdsInSubtreeByLabel(rows, pillarLabel));
  return rows
    .filter((r) => idSet.has(r.id) && isRoutableNavRow(r))
    .sort((a, b) => comparePositions(a.position, b.position));
}

/** Rows whose dot-position is under a pillar root (e.g. 2, 2.1, 2.6.1). */
export function rowsUnderPillarPrefix(rows: NavPillarRow[], prefix: PillarPositionPrefix): NavPillarRow[] {
  return rows.filter((r) => {
    if (r.is_deleted) return false;
    const seg = positionRootSegment(r.position);
    return seg === prefix;
  });
}

/** Leaf routes only (sidebar links), under one pillar. */
export function routableRowsUnderPillar(
  rows: NavPillarRow[],
  prefix: PillarPositionPrefix
): NavPillarRow[] {
  return rowsUnderPillarPrefix(rows, prefix).filter(
    (r) => r.path != null && String(r.path).trim() !== ''
  );
}

/**
 * Rows for a pillar admin column: under the prefix except the bare root (e.g. exclude `"2"` only).
 * Includes section headers with no `path` when the DB omits paths on parents.
 */
export function pillarColumnRows(rows: NavPillarRow[], prefix: PillarPositionPrefix): NavPillarRow[] {
  const p = String(prefix);
  return rowsUnderPillarPrefix(rows, prefix)
    .filter((r) => String(r.position) !== p)
    .sort((a, b) => comparePositions(a.position, b.position));
}

export type PillarTriState = 'all' | 'some' | 'none';

/** Tri-state from routable items only (meaningful for “module” access). */
export function pillarTriStateForRoutable(
  rows: NavPillarRow[],
  prefix: PillarPositionPrefix
): PillarTriState {
  const routable = routableRowsUnderPillar(rows, prefix);
  if (routable.length === 0) return 'none';
  const enabled = routable.filter((r) => r.is_enabled).length;
  if (enabled === 0) return 'none';
  if (enabled === routable.length) return 'all';
  return 'some';
}

/** Tri-state for all rows under a pillar (including root), for master checkbox + bulk toggle. */
export function pillarTriStateForSubtree(
  rows: NavPillarRow[],
  prefix: PillarPositionPrefix
): PillarTriState {
  const subset = rowsUnderPillarPrefix(rows, prefix);
  if (subset.length === 0) return 'none';
  const enabled = subset.filter((r) => r.is_enabled).length;
  if (enabled === 0) return 'none';
  if (enabled === subset.length) return 'all';
  return 'some';
}

/** All row ids under pillar (including folders) for bulk enable/disable. */
export function allIdsUnderPillar(rows: NavPillarRow[], prefix: PillarPositionPrefix): string[] {
  return rowsUnderPillarPrefix(rows, prefix).map((r) => r.id);
}

/** Group label for access UI: three pillars by position, everything else → Administration. */
export function pillarDisplayNameForPosition(position: string | number): string {
  const seg = positionRootSegment(position);
  if (isThreePillarPrefix(seg)) return PILLAR_ROOT_LABELS[seg];
  return 'Administration';
}

export function isRoutableNavRow(row: NavPillarRow): boolean {
  if (row.is_deleted) return false;
  return row.path != null && String(row.path).trim() !== '';
}

export function routableRowsOutsideThreePillars(rows: NavPillarRow[]): NavPillarRow[] {
  const inProductPillar = productPillarSubtreeIdSet(rows);
  return rows.filter((r) => isRoutableNavRow(r) && !inProductPillar.has(r.id));
}

export function routableIdsOutsideThreePillars(rows: NavPillarRow[]): string[] {
  return routableRowsOutsideThreePillars(rows).map((r) => r.id);
}
