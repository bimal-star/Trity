import type { NavigationItem } from '@/types/navigation';
import { PILLAR_DEFAULT_LANDING } from '@/lib/navPillarResolve';
import {
  PILLAR_ROOT_LABEL_ORDER,
  PILLAR_ROOT_LABELS,
  PILLAR_UI_ORDER,
  positionRootSegment,
  type PillarRootLabel,
  type PillarPositionPrefix,
} from '@/lib/navigationPillars';

export function normalizePillarPath(path: string | null | undefined): string {
  if (!path) return '';
  let p = String(path).replace(/\\/g, '/');
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

function subtreeContainsPath(item: NavigationItem, targetPath: string): boolean {
  if (normalizePillarPath(item.path) === targetPath) return true;
  for (const child of item.children ?? []) {
    if (subtreeContainsPath(child, targetPath)) return true;
  }
  return false;
}

function isRootLevelPosition(position: string | number): boolean {
  const s = String(position ?? '').trim();
  return Boolean(s) && !s.includes('.');
}

/** All nav rows whose `path` equals `targetPath` (DFS order). Used when duplicates exist under different pillars. */
function findAllNodesWithExactPath(items: NavigationItem[], targetPath: string): NavigationItem[] {
  const want = normalizePillarPath(targetPath);
  const out: NavigationItem[] = [];
  const walk = (nodes: NavigationItem[]) => {
    for (const it of nodes) {
      if (normalizePillarPath(it.path) === want) out.push(it);
      if (it.children?.length) walk(it.children);
    }
  };
  walk(items);
  return out;
}

/** Prefer Business Core over Execution over Analytics when multiple rows share the same path. */
function preferredPillarFromExactPathHits(hits: NavigationItem[]): PillarRootLabel | null {
  let best: { label: PillarRootLabel; order: number } | null = null;
  for (const h of hits) {
    const label = pillarLabelFromPositionPrefix(positionRootSegment(h.position));
    if (!label) continue;
    const order = PILLAR_ROOT_LABEL_ORDER.indexOf(label);
    if (order < 0) continue;
    if (!best || order < best.order) best = { label, order };
  }
  return best?.label ?? null;
}

/** First pillar root with a single-segment position matching `prefix`, anywhere in the tree (not only top-level). */
function findDeepSingleSegPillarRoot(
  items: NavigationItem[],
  prefix: PillarPositionPrefix
): NavigationItem | null {
  const queue = [...items];
  while (queue.length) {
    const item = queue.shift();
    if (!item) continue;
    if (isRootLevelPosition(item.position) && positionRootSegment(item.position) === prefix) {
      return item;
    }
    if (item.children?.length) queue.push(...item.children);
  }
  return null;
}

function pillarLabelFromPositionPrefix(prefix: string): PillarRootLabel | null {
  const label = PILLAR_ROOT_LABELS[prefix];
  return label && PILLAR_ROOT_LABEL_ORDER.includes(label as PillarRootLabel)
    ? (label as PillarRootLabel)
    : null;
}

function matchesPillarLandingPath(currentPath: string, label: PillarRootLabel): boolean {
  const landing = normalizePillarPath(PILLAR_DEFAULT_LANDING[label]);
  if (!landing) return false;
  // Root landing should only match root exactly; non-root landings match subtree paths too.
  if (landing === '/') return currentPath === '/';
  return currentPath === landing || currentPath.startsWith(`${landing}/`);
}

/**
 * Derives the active pillar label by walking the HIERARCHICAL navigation tree and
 * finding which pillar ROOT's subtree contains the current pathname.
 *
 * Falls back to position-prefix roots when labels do not match canonical pillar names,
 * and to any nav row whose path matches (covers orphan rows under `2.*` / `3.*` / `1.*`).
 *
 * Returns **null** when the route is outside the three product pillars (e.g. Administration,
 * Account, or unknown paths) so TopNav row-1 pills and row-2 stay cleared.
 */
export function deriveActivePillar(
  navigationItems: NavigationItem[] | null | undefined,
  pathname: string
): PillarRootLabel | null {
  const currentPath = normalizePillarPath(pathname);
  if (!currentPath) return null;

  /** Signed-in home dashboard: no product pillar tab selected. */
  if (currentPath === '/') return null;

  /** No tree yet, or empty tenant menu — do not imply a product pillar. */
  if (!navigationItems?.length) return null;

  // Canonical pillar landing routes should always map to their pillar first.
  // This protects row-2 from misconfigured/duplicated nav rows under another prefix.
  for (const label of PILLAR_ROOT_LABEL_ORDER) {
    if (matchesPillarLandingPath(currentPath, label as PillarRootLabel)) {
      return label as PillarRootLabel;
    }
  }

  // Use product pillar order, not `navigationItems` array order, so overlapping subtrees
  // (e.g. same path linked under two pillars) resolve deterministically — Business Core before Execution.
  for (const pillarName of PILLAR_ROOT_LABEL_ORDER) {
    const root = navigationItems.find((item) => String(item.label ?? '').trim() === pillarName);
    if (!root) continue;
    const label = pillarName as PillarRootLabel;
    if (subtreeContainsPath(root, currentPath)) {
      return label;
    }
  }

  for (const prefix of PILLAR_UI_ORDER as readonly PillarPositionPrefix[]) {
    const root = findDeepSingleSegPillarRoot(navigationItems, prefix);
    const pillarLabel = pillarLabelFromPositionPrefix(prefix);
    if (root && pillarLabel && subtreeContainsPath(root, currentPath)) {
      return pillarLabel;
    }
  }

  // Final fallback: rows whose own `path` equals the route (orphans). Prefer pillar order on duplicates.
  const exactHits = findAllNodesWithExactPath(navigationItems, currentPath);
  const fromPos = preferredPillarFromExactPathHits(exactHits);
  if (fromPos) {
    return fromPos;
  }

  /** Administration, Account, unknown routes — no product pillar selected. */
  return null;
}
