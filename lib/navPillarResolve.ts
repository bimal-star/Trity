import type { NavigationItem } from '@/types/navigation';
import { comparePositions, getParentPosition } from '@/lib/navigation-hierarchy';
import { hasAppRouterDynamicSegments } from '@/lib/navigationPath';
import {
  PILLAR_ROOT_LABELS,
  positionRootSegment,
  isThreePillarPrefix,
  type PillarRootLabel,
  type PillarPositionPrefix,
} from '@/lib/navigationPillars';

function normNavPath(path: string | null | undefined): string {
  if (!path) return '';
  let p = String(path).replace(/\\/g, '/');
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

function pillarPrefixForLabel(label: PillarRootLabel): PillarPositionPrefix | null {
  const entry = Object.entries(PILLAR_ROOT_LABELS).find(([, lab]) => lab === label);
  const key = entry?.[0];
  return key && isThreePillarPrefix(key) ? key : null;
}

/** Same path normalization as `normalizePillarPath` in `activeNavPillar` (keep pillar nav consistent). */
function subtreeContainsNavPath(node: NavigationItem, targetPath: string): boolean {
  const t = normNavPath(targetPath);
  if (!t) return false;
  if (normNavPath(node.path) === t) return true;
  for (const c of node.children ?? []) {
    if (subtreeContainsNavPath(c, t)) return true;
  }
  return false;
}

/** First concrete route under this pillar anywhere in the nav tree (by position prefix). */
export function firstEnabledPathUnderPillarPrefix(
  navigationItems: NavigationItem[] | null | undefined,
  pillarLabel: PillarRootLabel
): string | null {
  const prefix = pillarPrefixForLabel(pillarLabel);
  if (!prefix || !navigationItems?.length) return null;

  const hits: NavigationItem[] = [];
  const walk = (items: NavigationItem[]) => {
    for (const it of items) {
      if (positionRootSegment(it.position) === prefix) hits.push(it);
      if (it.children?.length) walk(it.children);
    }
  };
  walk(navigationItems);
  hits.sort((a, b) => comparePositions(a.position, b.position));

  const pillarRoot = findProductPillarRoot(navigationItems, pillarLabel);

  for (const it of hits) {
    if (it.is_enabled === false) continue;
    const p = normNavPath(it.path);
    if (!p || hasAppRouterDynamicSegments(p)) continue;
    // Rows can share a position *prefix* but sit outside this pillar's subtree (e.g. `/import-export`
    // with `2.*` under Execution). Skip those so pillar click + `deriveActivePillar` stay aligned.
    if (pillarRoot && !subtreeContainsNavPath(pillarRoot, p)) continue;
    return p;
  }
  return null;
}

/** When the tenant tree has no resolvable link, land on these known App Router paths. */
export const PILLAR_DEFAULT_LANDING: Record<PillarRootLabel, string> = {
  'Business Core': '/products',
  /** App home dashboard — not first tree leaf (Calendar at 3.1). */
  Execution: '/',
  /** Matches `app/analytics/page.tsx` until sub-routes exist. */
  Analytics: '/analytics',
};

function isSingleSegmentPosition(position: string | number): boolean {
  const s = String(position ?? '').trim();
  return Boolean(s) && !s.includes('.');
}

function findNodeWithExactPath(
  items: NavigationItem[] | null | undefined,
  targetPath: string
): NavigationItem | null {
  if (!items?.length || !targetPath) return null;
  const want = normNavPath(targetPath);
  const queue = [...items];
  while (queue.length) {
    const item = queue.shift();
    if (!item) continue;
    if (normNavPath(item.path) === want) return item;
    if (item.children?.length) queue.push(...item.children);
  }
  return null;
}

/** Flatten the resolved nav tree (same order as a pre-order walk). */
function flattenNavigationItems(items: NavigationItem[] | null | undefined): NavigationItem[] {
  const out: NavigationItem[] = [];
  const walk = (nodes: NavigationItem[]) => {
    for (const n of nodes) {
      out.push(n);
      if (n.children?.length) walk(n.children);
    }
  };
  if (items?.length) walk(items);
  return out;
}

/**
 * Product pillar root anywhere in the tree: exact label match, else single-segment
 * position whose first segment matches the pillar (1 / 2 / 3).
 *
 * Uses breadth-first search so behaviour matches the old top-level-only scan when
 * pillars sit at depth 0, but still finds roots nested under a parent row (Navigation
 * Manager parent → pillar → child) which previously left TopNav row 2 empty.
 */
export function findProductPillarRoot(
  navigationItems: NavigationItem[] | null | undefined,
  pillarLabel: PillarRootLabel
): NavigationItem | null {
  if (!navigationItems?.length) return null;
  const want = pillarLabel.trim();
  const prefix = pillarPrefixForLabel(pillarLabel);

  // Pass 1: exact label match anywhere in tree (most reliable after pillar reordering/renames).
  let queue = [...navigationItems];
  while (queue.length) {
    const next: NavigationItem[] = [];
    for (const item of queue) {
      const label = String(item.label ?? '').trim();
      if (label === want) return item;
      if (item.children?.length) next.push(...item.children);
    }
    queue = next;
  }

  // Pass 2: static prefix fallback for legacy data when label match is unavailable.
  queue = [...navigationItems];
  while (queue.length) {
    const next: NavigationItem[] = [];
    for (const item of queue) {
      if (
        prefix &&
        isSingleSegmentPosition(item.position) &&
        positionRootSegment(item.position) === prefix
      ) {
        return item;
      }
      if (item.children?.length) next.push(...item.children);
    }
    queue = next;
  }

  // If labels were renamed/reordered, infer pillar root from canonical landing route.
  // Example: `/analytics` may exist under a moved root whose prefix no longer matches static 1/2/3 mapping.
  const landingPath = PILLAR_DEFAULT_LANDING[pillarLabel];
  const landingNode = findNodeWithExactPath(navigationItems, landingPath);
  if (landingNode) {
    const landingPrefix = positionRootSegment(landingNode.position);
    const fromLandingPrefix = flattenNavigationItems(navigationItems).find(
      (item) =>
        isSingleSegmentPosition(item.position) &&
        positionRootSegment(item.position) === landingPrefix
    );
    if (fromLandingPrefix) return fromLandingPrefix;
  }

  return null;
}

/** Direct children under the pillar root (preferred). */
export function pillarDirectChildren(
  navigationItems: NavigationItem[] | null | undefined,
  pillarLabel: PillarRootLabel
): NavigationItem[] {
  const root = findProductPillarRoot(navigationItems, pillarLabel);
  return (root?.children ?? []).filter((c) => c.is_enabled !== false);
}

/**
 * Row-2 / pillar menu items: children of the pillar root when the tree is well-formed;
 * else direct children by dot-parent vs resolved root (when hierarchy links are incomplete);
 * else roots with positions `prefix.N` (orphan first level under that pillar).
 */
export function pillarSectionRowItems(
  navigationItems: NavigationItem[] | null | undefined,
  pillarLabel: PillarRootLabel
): NavigationItem[] {
  const root = findProductPillarRoot(navigationItems, pillarLabel);
  const direct = (root?.children ?? []).filter((c) => c.is_enabled !== false);
  if (direct.length > 0) {
    return [...direct].sort((a, b) => comparePositions(a.position, b.position));
  }

  if (root) {
    const flat = flattenNavigationItems(navigationItems);
    const rootPos = String(root.position);
    const byParentPosition = flat.filter(
      (item) => item.is_enabled !== false && getParentPosition(String(item.position)) === rootPos
    );
    if (byParentPosition.length > 0) {
      return [...byParentPosition].sort((a, b) => comparePositions(a.position, b.position));
    }
  }

  if (!navigationItems?.length) return [];

  // Prefer the located root's actual top-level position segment (supports reordered pillars).
  // Fall back to static label→prefix mapping only when no root row can be resolved.
  const rootPrefix = root ? positionRootSegment(root.position) : null;
  const prefix = rootPrefix || pillarPrefixForLabel(pillarLabel);
  if (!prefix) return [];

  const orphans = flattenNavigationItems(navigationItems).filter((item) => {
    if (item.is_enabled === false) return false;
    const parts = String(item.position ?? '').split('.');
    return parts.length === 2 && parts[0] === prefix;
  });
  return orphans.sort((a, b) => comparePositions(a.position, b.position));
}
