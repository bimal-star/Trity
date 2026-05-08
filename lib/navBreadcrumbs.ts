import type { NavigationItem } from '@/types/navigation';
import { PILLAR_ROOT_LABEL_ORDER, type PillarRootLabel } from '@/lib/navigationPillars';

function normalizePath(path: string | null | undefined): string {
  if (!path) return '';
  const p = String(path).replace(/\\/g, '/');
  return p.startsWith('/') ? p : `/${p}`;
}

/** UUID-shaped segment (RFC-style) for readable breadcrumb labels on dynamic routes. */
function isUuidLikeSegment(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    segment.trim()
  );
}

function findPathChain(
  items: NavigationItem[],
  targetPath: string,
  chain: NavigationItem[] = []
): NavigationItem[] | null {
  const normTarget = normalizePath(targetPath);
  if (!normTarget) return null;

  for (const item of items) {
    if (item.is_enabled === false) continue;
    const next = [...chain, item];
    const p = normalizePath(item.path);
    if (p && p === normTarget) return next;
    if (item.children?.length) {
      const found = findPathChain(item.children, targetPath, next);
      if (found) return found;
    }
  }
  return null;
}

function isPillarRootLabel(label: string): label is PillarRootLabel {
  return (PILLAR_ROOT_LABEL_ORDER as readonly string[]).includes(String(label ?? '').trim());
}

export type NavBreadcrumbSegment = {
  href: string | null;
  label: string;
  current?: boolean;
};

/**
 * Builds a small trail for the contextual bar: Home → … → current.
 * Uses the hierarchical nav tree when an item path matches `pathname` exactly.
 */
export function buildNavBreadcrumbs(
  navigationItems: NavigationItem[] | null | undefined,
  pathname: string,
  pillarLabel: PillarRootLabel | null,
  firstPathInPillar: string | null
): NavBreadcrumbSegment[] {
  const crumbs: NavBreadcrumbSegment[] = [{ href: '/', label: 'Home' }];

  const pathNorm = normalizePath(pathname);
  if (pillarLabel == null && pathNorm === '/') {
    crumbs.push({ href: null, label: 'Dashboard', current: true });
    return crumbs;
  }

  const titleFromPathTail = (path: string): string => {
    const segments = path.split('/').filter(Boolean);
    const tail = segments[segments.length - 1];
    if (!tail) return 'Page';

    if (segments[0] === 'products' && segments.length === 2 && isUuidLikeSegment(tail)) {
      return 'Product';
    }
    if (
      segments[0] === 'products' &&
      segments[1] === 'groups' &&
      segments.length === 3 &&
      isUuidLikeSegment(tail)
    ) {
      return 'Product group';
    }

    return tail.replace(/-/g, ' ');
  };

  if (!navigationItems?.length) {
    if (pillarLabel != null) {
      crumbs.push({
        href: firstPathInPillar,
        label: pillarLabel,
        current: true,
      });
    } else {
      crumbs.push({
        href: null,
        label: titleFromPathTail(pathname),
        current: true,
      });
    }
    return crumbs;
  }

  const chain = findPathChain(navigationItems, pathname);
  if (!chain?.length) {
    if (pillarLabel != null) {
      crumbs.push({
        href: firstPathInPillar,
        label: pillarLabel,
      });
      crumbs.push({
        href: null,
        label: titleFromPathTail(pathname),
        current: true,
      });
    } else {
      crumbs.push({
        href: null,
        label: titleFromPathTail(pathname),
        current: true,
      });
    }
    return crumbs;
  }

  const pillarIdx = chain.findIndex((n) => isPillarRootLabel(String(n.label ?? '').trim()));
  const fromPillar = pillarIdx >= 0 ? chain.slice(pillarIdx) : chain;

  for (let i = 0; i < fromPillar.length; i++) {
    const node = fromPillar[i];
    const label = String(node.label ?? '').trim() || 'Untitled';
    const p = normalizePath(node.path);
    const isLast = i === fromPillar.length - 1;
    const isPillar = isPillarRootLabel(label);

    let href: string | null = p || null;
    if (isPillar && !href) href = firstPathInPillar;

    crumbs.push({
      href: isLast ? null : href,
      label,
      current: isLast,
    });
  }

  return crumbs;
}
