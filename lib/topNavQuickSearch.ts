import type { NavigationItem } from '@/types/navigation';
import { hasAppRouterDynamicSegments } from '@/lib/navigationPath';

export interface QuickSearchNavEntry {
  id: string;
  label: string;
  path: string;
  /** Breadcrumb-style context for matching and display. */
  trail: string;
}

function normPath(path: string | null | undefined): string {
  if (!path) return '';
  const p = String(path).replace(/\\/g, '/');
  return p.startsWith('/') ? p : `/${p}`;
}

/**
 * Collects enabled nav rows with a concrete App Router path (depth-first).
 * `extras` (e.g. platform admin links) are appended with `extraTrailPrefix` as the first trail segment when provided.
 */
export function collectRoutableQuickSearchEntries(
  items: NavigationItem[] | null | undefined,
  extras?: NavigationItem[] | null,
  extraTrailPrefix?: string
): QuickSearchNavEntry[] {
  const out: QuickSearchNavEntry[] = [];

  const walk = (nodes: NavigationItem[], ancestors: string[]) => {
    for (const node of nodes) {
      if (node.is_enabled === false) continue;
      const label = String(node.label ?? '').trim();
      const chain = label ? [...ancestors, label] : [...ancestors];
      const p = normPath(node.path);
      const id = node.id != null && String(node.id).trim() !== '' ? String(node.id) : '';
      if (id && p && !hasAppRouterDynamicSegments(p)) {
        out.push({
          id,
          label: label || p,
          path: p,
          trail: chain.join(' › '),
        });
      }
      if (node.children?.length) walk(node.children, chain);
    }
  };

  if (items?.length) walk(items, []);
  if (extras?.length) {
    const prefix = extraTrailPrefix?.trim() ? [extraTrailPrefix.trim()] : [];
    walk(extras, prefix);
  }

  const seenPath = new Set<string>();
  return out.filter((e) => {
    if (seenPath.has(e.path)) return false;
    seenPath.add(e.path);
    return true;
  });
}

/**
 * Parent label for quick-search disambiguation: immediate parent of the page, but never the
 * pillar (first trail segment). Direct children of the pillar (`Pillar › Page`) → null.
 */
export function quickSearchBracketParent(entry: QuickSearchNavEntry): string | null {
  const parts = entry.trail
    .split(' › ')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 3) return null;
  const pillar = parts[0];
  const immediateParent = parts[parts.length - 2] ?? null;
  if (!immediateParent || immediateParent === pillar) return null;
  return immediateParent;
}

export function filterQuickSearchEntries(
  entries: QuickSearchNavEntry[],
  query: string,
  max = 40
): QuickSearchNavEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return entries
    .filter((e) => {
      const hay = `${e.label}\n${e.path}\n${e.trail}`.toLowerCase();
      return hay.includes(q);
    })
    .slice(0, max);
}
