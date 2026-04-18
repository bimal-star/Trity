'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NavigationItem } from '@/types/navigation';
import { X, AlertCircle, ChevronDown, ChevronUp, LogOut, Loader2 } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { isSuperAdminSession } from '@/lib/permissions';
import { WorkspaceBrandStrip } from '@/components/navigation/WorkspaceBrandStrip';
import { getIconAndPillarForNavLabel } from '@/lib/navigationItemIcons';
import { hasAppRouterDynamicSegments } from '@/lib/navigationPath';

function stringSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

/**
 * Sidebar navigation item component - extracted for cleaner JSX
 */
function NavItemContent({ 
  item, 
  isActive, 
  isCollapsed, 
  hasChildren, 
  isExpanded, 
  onToggleExpand 
}: { 
  item: NavigationItem; 
  isActive: boolean; 
  isCollapsed: boolean; 
  hasChildren: boolean; 
  isExpanded: boolean;
  onToggleExpand: (e: React.MouseEvent) => void;
}) {
  return (
    <>
      {/* Subtle left accent border - always visible when active */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`} />

      {/* Icon - Fixed size and alignment */}
      <span className={`relative z-10 flex-shrink-0 w-4 h-4 flex items-center justify-center transition-colors duration-200 ${isActive ? 'text-blue-400' : 'text-gray-500'}`}>
        {/* Icon will be rendered at size 16 by parent */}
      </span>

      {/* Label and chevron - only show when expanded */}
      {!isCollapsed && (
        <>
          <span className={`relative z-10 flex-1 truncate transition-all duration-200 ${isActive ? 'text-white font-medium' : 'font-normal text-gray-300'}`}>
            {item.label}
          </span>
          
          {/* Expand/collapse chevron for parents */}
          {hasChildren && (
            <span 
              className={`relative z-10 flex-shrink-0 w-4 h-4 flex items-center justify-center transition-all duration-200 ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-400'}`}
              onClick={onToggleExpand}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          )}
        </>
      )}
    </>
  );
}

/**
 * Sidebar component that displays navigation items fetched from Supabase
 * Features:
 * - Responsive design with collapse/expand functionality
 * - Nested navigation support (decimal positions)
 * - Loading and error states
 * - Light and dark mode support
 * - Compact Three Pillar theme with proper icon alignment
 */
interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const pendingTrailRef = useRef<string[] | null>(null);
  const pendingPathRef = useRef<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    profile,
    workspaceTenantId,
    effectiveTenantId,
    effectiveTenantDisplayName,
    effectiveTenantLogoUrl,
    exitWorkspaceTenant,
    navigationItems,
    navigationError,
    error: tenantConfigError,
    signOut,
  } = useTenant();
  const error = navigationError;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const normalizePath = (path: string | null | undefined): string => {
    if (!path) return '';
    const normalized = String(path).replace(/\\/g, '/');
    if (!normalized) return '';
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  };

  // Handle logout
  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await signOut();
      router.replace('/login');
    } catch (err) {
      console.error('Logout error:', err);
      alert('Error signing out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  /** Top-level roots that use the three-pillar chrome; labels must match DB or defaults. */
  const PILLAR_ROOT_LABELS = useMemo(
    () => ['Business Core', 'Execution', 'Analytics'] as const,
    []
  );

  const navTreeItems = useMemo(() => {
    if (!navigationItems || navigationItems.length === 0) return [] as NavigationItem[];

    const descendantIds = new Set<string>();
    const visitChildren = (items: NavigationItem[]) => {
      items.forEach((item) => {
        (item.children ?? []).forEach((child) => {
          descendantIds.add(child.id);
          if (child.children && child.children.length > 0) {
            visitChildren(child.children);
          }
        });
      });
    };

    visitChildren(navigationItems);
    return navigationItems.filter((item) => !descendantIds.has(item.id));
  }, [navigationItems]);

  const pillarRoots = useMemo(() => {
    const names = new Set<string>(PILLAR_ROOT_LABELS.map((p) => p));
    return navTreeItems.filter((item) => names.has(String(item.label ?? '').trim()));
  }, [navTreeItems, PILLAR_ROOT_LABELS]);

  const otherRoots = useMemo(() => {
    const names = new Set<string>(PILLAR_ROOT_LABELS.map((p) => p));
    return navTreeItems.filter((item) => !names.has(String(item.label ?? '').trim()));
  }, [navTreeItems, PILLAR_ROOT_LABELS]);

  /** DB labels differ from the three pillar names — still show every root in one list. */
  const useUnifiedPillarLayout = pillarRoots.length === 0 && navTreeItems.length > 0;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const width = isCollapsed ? '70px' : '246px';
    document.documentElement.style.setProperty('--sidebar-width', width);
    return () => {
      document.documentElement.style.removeProperty('--sidebar-width');
    };
  }, [isCollapsed]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onMobileClose]);

  const findNodeById = (items: NavigationItem[], targetId: string): NavigationItem | null => {
    for (const item of items) {
      if (item.id === targetId) return item;
      if (item.children && item.children.length > 0) {
        const found = findNodeById(item.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const findNodeByTrail = (items: NavigationItem[], trail: string[]): NavigationItem | null => {
    let currentItems = items;
    let currentNode: NavigationItem | null = null;

    for (const id of trail) {
      const nextNode = currentItems.find((item) => item.id === id) ?? null;
      if (!nextNode) return null;
      currentNode = nextNode;
      currentItems = nextNode.children ?? [];
    }

    return currentNode;
  };

  const collectDescendantIds = (item: NavigationItem): string[] => {
    if (!item.children || item.children.length === 0) return [];
    return item.children.flatMap((child) => [child.id, ...collectDescendantIds(child)]);
  };

  const getExpandableTrail = (trail: string[]): string[] => {
    if (!navTreeItems || navTreeItems.length === 0) return [];
    return trail.filter((_, index) => {
      const node = findNodeByTrail(navTreeItems, trail.slice(0, index + 1));
      return Boolean(node && node.children && node.children.length > 0);
    });
  };

  useEffect(() => {
    if (!navTreeItems || navTreeItems.length === 0) return;
    if (!pathname) return;

    const pendingTrail = pendingTrailRef.current;
    const pendingPath = pendingPathRef.current;
    if (pendingTrail && normalizePath(pendingPath) === normalizePath(pathname)) {
      const nextExpanded = new Set(getExpandableTrail(pendingTrail));
      setExpandedItems((prev) =>
        stringSetsEqual(prev, nextExpanded) ? prev : nextExpanded
      );
      pendingTrailRef.current = null;
      pendingPathRef.current = null;
      return;
    }

    const findPathTrails = (
      items: NavigationItem[],
      targetPath: string,
      trail: string[] = []
    ): string[][] => {
      const matches: string[][] = [];
      const normalizedTarget = normalizePath(targetPath);

      for (const item of items) {
        const nextTrail = [...trail, item.id];
        const normalizedItemPath = normalizePath(item.path);
        if (normalizedItemPath === normalizedTarget) {
          matches.push(nextTrail);
        }
        if (item.children && item.children.length > 0) {
          matches.push(...findPathTrails(item.children, targetPath, nextTrail));
        }
      }

      return matches;
    };

    const matchedTrails = findPathTrails(navTreeItems, pathname);
    
    if (matchedTrails.length > 0) {
      setExpandedItems((prev) => {
        const trailsEqual = (left: string[], right: string[]) =>
          left.length === right.length && left.every((value, index) => value === right[index]);

        const pendingTrail = pendingTrailRef.current;
        if (pendingTrail) {
          const exactMatch = matchedTrails.find((trail) => trailsEqual(trail, pendingTrail));
          if (exactMatch) {
            pendingTrailRef.current = null;
            const pendingExpandedIds = exactMatch.filter((id) => {
              const node = findNodeById(navTreeItems, id);
              return Boolean(node && node.children && node.children.length > 0);
            });
            const nextFromPending = new Set(pendingExpandedIds);
            return stringSetsEqual(prev, nextFromPending) ? prev : nextFromPending;
          }
        }

        const toPosition = (position: string | number | undefined): number => {
          const value = parseFloat(String(position ?? '9999'));
          return Number.isFinite(value) ? value : 9999;
        };

        const scoreTrail = (trail: string[]) => {
          const overlap = trail.filter((id) => prev.has(id)).length;
          const depth = trail.length;
          const leafNode = findNodeByTrail(navTreeItems, trail);
          const positionScore = toPosition(leafNode?.position);
          return { overlap, depth, positionScore };
        };

        

        const preferredTrail = matchedTrails
          .slice()
          .sort((a, b) => {
            const as = scoreTrail(a);
            const bs = scoreTrail(b);

            if (as.overlap !== bs.overlap) return bs.overlap - as.overlap;
            if (as.depth !== bs.depth) return bs.depth - as.depth;
            return as.positionScore - bs.positionScore;
          })[0];

        const expandedIds = preferredTrail.filter((id) => {
          const node = findNodeById(navTreeItems, id);
          return Boolean(node && node.children && node.children.length > 0);
        });

        const nextExpanded = new Set(expandedIds);
        return stringSetsEqual(prev, nextExpanded) ? prev : nextExpanded;
      });
    } else {
      pendingTrailRef.current = null;
      pendingPathRef.current = null;
      setExpandedItems((prev) => (prev.size === 0 ? prev : new Set()));
    }
  }, [navTreeItems, pathname]);

  // Toggle parent item expansion - only one parent and one sub-parent can be expanded at a time
  const toggleExpanded = (item: NavigationItem, itemTrail: string[]) => {
    setExpandedItems((prev) => {
      if (!navTreeItems || navTreeItems.length === 0) return prev;

      if (prev.has(item.id)) {
        const newSet = new Set(prev);
        const descendants = collectDescendantIds(item);
        descendants.forEach((id) => newSet.delete(id));
        newSet.delete(item.id);
        return newSet;
      }

      const expandableTrail = getExpandableTrail(itemTrail);

      return new Set(expandableTrail);
    });
  };

  // Render a single navigation item with reduced indentation
  const renderNavItem = (
    item: NavigationItem,
    level: number = 0,
    isPillarRoot: boolean = false,
    parentPillar?: string,
    trail: string[] = []
  ) => {
    const currentTrail = [...trail, item.id];
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const normalizedPath = normalizePath(item.path);
    const hasPath = normalizedPath.trim() !== '';
    const pathUnsafeForLink = hasPath && hasAppRouterDynamicSegments(normalizedPath);
    const useNextLink = hasPath && !pathUnsafeForLink;
    const isActive = hasPath && normalizePath(pathname) === normalizedPath;

    // Reduced indentation
    const indentClass = level === 0 ? 'pl-2' : level === 1 ? 'pl-4' : 'pl-6';
    
    // Get icon and pillar
    const { icon: IconComponent, pillar } = getIconAndPillarForNavLabel(item.label);
    const effectivePillar = parentPillar || pillar;
    
    // Color map based on pillar
    const colorMap = {
      analytics: { icon: 'text-blue-400', accent: 'bg-blue-500', hover: 'hover:text-blue-300', bg: 'hover:bg-blue-200/95' },
      businessCore: { icon: 'text-green-400', accent: 'bg-green-500', hover: 'hover:text-green-300', bg: 'hover:bg-green-200/95' },
      execution: { icon: 'text-orange-400', accent: 'bg-orange-500', hover: 'hover:text-orange-300', bg: 'hover:bg-orange-200/95' },
      other: { icon: 'text-gray-500', accent: 'bg-gray-500', hover: 'hover:text-gray-300', bg: 'bg-gray-800/50' },
    } as const;

    type PillarKey = keyof typeof colorMap;
    const pillarKey: PillarKey = effectivePillar in colorMap ? (effectivePillar as PillarKey) : 'other';
    const colors = colorMap[pillarKey];
    
    // Special styling for pillar roots
    const baseClasses = isPillarRoot ? `
      relative flex items-center gap-2 px-1.5 py-1.5 mx-1 mb-0 rounded-lg
      cursor-pointer transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-blue-500
      ${isCollapsed ? 'justify-center px-1.5' : ''}
    ` : `
      relative flex items-center gap-2 px-2 py-1 mx-1 rounded-lg
      transition-all duration-200 ease-out group
      overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500
      ${isActive ? 'bg-gray-800/50 text-white' : 'text-gray-400 hover:bg-gray-700/70 hover:text-white hover:shadow-lg'}
      ${isCollapsed ? 'justify-center px-1.5' : ''}
      ${indentClass}
    `;

    const itemContent = (
      <>
        {/* Left accent border - hidden for pillars */}
        <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${colors.accent} transition-all duration-200 ${isPillarRoot ? 'opacity-0' : isActive ? 'opacity-100' : 'opacity-0'}`} />

        {/* Icon with pillar color */}
        <span className={`relative z-10 flex-shrink-0 w-4 h-4 flex items-center justify-center transition-colors duration-200 ${colors.icon}`}>
          <IconComponent size={isPillarRoot ? 18 : 16} />
        </span>

        {/* Label and chevron */}
        {!isCollapsed && (
          <>
            <span className={`relative z-10 flex-1 truncate transition-all duration-200 ${isPillarRoot ? 'text-sm font-normal ' + colors.icon : isActive ? 'text-xs font-medium text-gray-300' : 'text-xs font-normal text-gray-400'}`} title={item.label}>
              {item.label}
            </span>
            
            {hasChildren && !isPillarRoot && (
              <button
                type="button"
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.label}`}
                aria-expanded={isExpanded}
                className={`relative z-10 flex-shrink-0 w-4 h-4 flex items-center justify-center transition-all duration-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${isActive ? colors.icon : 'text-gray-500 group-hover:text-gray-400'}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleExpanded(item, currentTrail);
                }}
              >
                {isExpanded ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
              </button>
            )}
          </>
        )}
      </>
    );

    const invalidPathTitle =
      'This path uses [segments] that Next.js cannot link to. Edit it in Navigation Manager (use a concrete URL, e.g. /admin/tenants).';

    return (
      <li key={item.id}>
        {useNextLink ? (
          <Link
            href={normalizedPath}
            className={baseClasses}
            title={item.label}
            aria-current={isActive ? 'page' : undefined}
            aria-expanded={hasChildren && !isPillarRoot ? isExpanded : undefined}
            onClick={() => {
              pendingTrailRef.current = currentTrail;
              pendingPathRef.current = normalizedPath || null;
              if (hasChildren) {
                setExpandedItems(new Set(getExpandableTrail(currentTrail)));
              }
            }}
          >
            {itemContent}
          </Link>
        ) : (
          <div
            className={`${baseClasses} ${pathUnsafeForLink ? 'opacity-70' : ''} ${hasChildren ? 'cursor-pointer' : pathUnsafeForLink ? 'cursor-help' : 'cursor-default'}`}
            title={pathUnsafeForLink ? invalidPathTitle : item.label}
            aria-expanded={hasChildren && !isPillarRoot ? isExpanded : undefined}
            onClick={() => hasChildren && !isCollapsed && toggleExpanded(item, currentTrail)}
            onKeyDown={(e) => {
              if (hasChildren && !isCollapsed && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                toggleExpanded(item, currentTrail);
              }
            }}
            tabIndex={hasChildren ? 0 : undefined}
            role={hasChildren ? 'button' : undefined}
          >
            {itemContent}
          </div>
        )}

        {/* Render children - always show for pillar roots, otherwise only when expanded */}
        {hasChildren && (isPillarRoot || isExpanded) && !isCollapsed && (
          <ul className="mt-0 space-y-0.5">
            {item.children!.map((child) =>
              renderNavItem(child, level + 1, false, isPillarRoot ? pillar : parentPillar, currentTrail)
            )}
          </ul>
        )}
      </li>
    );
  };

  if (pathname === '/login') {
    return null;
  }

  return (
    <>
      {/* Mobile backdrop — tapping it closes the drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 sm:hidden"
          aria-hidden="true"
          onClick={onMobileClose}
        />
      )}
    <aside
      aria-label="Sidebar"
      className={[
        'fixed left-0 top-0 h-screen bg-gray-900 border-r border-gray-800 shadow-2xl z-40 select-none pointer-events-auto flex flex-col',
        // Width: mobile always full (246px); sm+ respects collapsed state
        'w-[246px]',
        isCollapsed ? 'sm:w-[70px]' : '',
        // Slide in/out on mobile; always visible on sm+
        'transition-transform sm:transition-all duration-500 ease-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0',
      ].join(' ')}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Header with toggle */}
      <div className="flex min-h-[3.5rem] items-center justify-between gap-2 border-b border-gray-800 px-3 py-2">
        {!isCollapsed ? (
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer"
            onClick={() => setExpandedItems(new Set())}
          >
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-800/90 p-0.5">
              <style jsx>{`
                @keyframes shine {
                  0%, 100% { opacity: 0.6; filter: brightness(1); }
                  50% { opacity: 1; filter: brightness(1.5) drop-shadow(0 0 4px currentColor); }
                }
                .dot-1 { animation: shine 3s ease-in-out infinite; animation-delay: 0s; }
                .dot-2 { animation: shine 3s ease-in-out infinite; animation-delay: 1s; }
                .dot-3 { animation: shine 3s ease-in-out infinite; animation-delay: 2s; }
              `}</style>
              <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
                <circle cx="12" cy="6" r="2.5" className="fill-blue-400 dot-1" />
                <circle cx="7" cy="16" r="2.5" className="fill-green-400 dot-2" />
                <circle cx="17" cy="16" r="2.5" className="fill-orange-400 dot-3" />
                <line x1="12" y1="6" x2="7" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
                <line x1="12" y1="6" x2="17" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
                <line x1="7" y1="16" x2="17" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold leading-tight tracking-[0.08em] text-gray-100">
                Trity
              </h1>
            </div>
          </Link>
        ) : (
          <Link
            href="/"
            className="mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-800/90 p-0.5 hover:opacity-90 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Trity Home"
            aria-label="Trity Home"
            onClick={() => setExpandedItems(new Set())}
          >
            <style jsx>{`
              @keyframes shine {
                0%, 100% { opacity: 0.6; filter: brightness(1); }
                50% { opacity: 1; filter: brightness(1.5) drop-shadow(0 0 4px currentColor); }
              }
              .dot-1 { animation: shine 3s ease-in-out infinite; animation-delay: 0s; }
              .dot-2 { animation: shine 3s ease-in-out infinite; animation-delay: 1s; }
              .dot-3 { animation: shine 3s ease-in-out infinite; animation-delay: 2s; }
            `}</style>
            <svg viewBox="0 0 24 24" className="w-8 h-8" aria-hidden="true">
              <circle cx="12" cy="6" r="2.5" className="fill-blue-400 dot-1" />
              <circle cx="7" cy="16" r="2.5" className="fill-green-400 dot-2" />
              <circle cx="17" cy="16" r="2.5" className="fill-orange-400 dot-3" />
              <line x1="12" y1="6" x2="7" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
              <line x1="12" y1="6" x2="17" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
              <line x1="7" y1="16" x2="17" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
            </svg>
          </Link>
        )}
        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-all duration-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Collapse sidebar"
            aria-expanded={!isCollapsed}
            title="Collapse sidebar"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </div>

      {/* Navigation content */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-3">
        {/* Error state */}
        {error && (
          <div role="alert" className="flex flex-col items-center justify-center py-6 px-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" aria-hidden />
            {!isCollapsed && (
              <p className="mt-2 text-xs text-red-400 text-center">
                {error.message}
              </p>
            )}
          </div>
        )}

        {navigationItems === null && !error && tenantConfigError && (
          <div className="flex flex-col items-center justify-center py-8 px-3 gap-2">
            <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" aria-hidden />
            {!isCollapsed && (
              <p className="text-xs text-amber-200/90 text-center">
                Account setup required — see the main panel or contact support.
              </p>
            )}
          </div>
        )}

        {navigationItems === null && !error && !tenantConfigError && (
          <div role="status" aria-busy="true" aria-label="Loading navigation" className="flex flex-col items-center justify-center py-8 px-3 gap-2">
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin shrink-0" aria-hidden />
            {!isCollapsed && (
              <p className="text-xs text-gray-500 text-center" aria-hidden>Loading menu…</p>
            )}
          </div>
        )}

        {/* Navigation items - separate pillars from other items, or unified if labels differ */}
        {navTreeItems && navTreeItems.length > 0 && (
          <>
            {useUnifiedPillarLayout ? (
              <div className="space-y-0.5 mb-0.5">
                {navTreeItems.map((item) => (
                  <div key={item.id}>{renderNavItem(item, 0, true)}</div>
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-0.5 mb-0.5">
                  {pillarRoots.map((item) => (
                    <div key={item.id}>{renderNavItem(item, 0, true)}</div>
                  ))}
                </div>
                {otherRoots.length > 0 && (
                  <>
                    <div className="border-t border-gray-800 my-0.5 mx-3" />
                    <ul className="space-y-0.5">
                      {otherRoots.map((item) => renderNavItem(item))}
                    </ul>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Empty state (not while navigation is still loading) */}
        {navigationItems !== null && navTreeItems.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-6 px-3">
            {tenantConfigError ? (
              <>
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" aria-hidden />
                {!isCollapsed && (
                  <p className="mt-2 text-xs text-amber-200/90 text-center">
                    Account setup required — see the main panel or contact support.
                  </p>
                )}
              </>
            ) : (
              !isCollapsed && (
                <p className="text-xs text-gray-500 text-center">
                  No navigation items found
                </p>
              )
            )}
          </div>
        )}
      </nav>

      {/* Logout button */}
      {user && (
        <div className="border-t border-gray-800 p-3">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`
              w-full flex items-center gap-2 px-2 py-1 rounded-lg
              transition-all duration-200 ease-out
              text-gray-400 hover:bg-gray-700/70 hover:text-white hover:shadow-lg
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isCollapsed ? 'justify-center px-1.5' : ''}
            `}
            title={isCollapsed ? 'Sign Out' : undefined}
            aria-label={isCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={16} className="flex-shrink-0" aria-hidden />
            {!isCollapsed && (
              <span className="text-xs font-medium truncate">
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </span>
            )}
          </button>
        </div>
      )}

      <WorkspaceBrandStrip
        collapsed={isCollapsed}
        hasWorkspace={Boolean(effectiveTenantId)}
        displayName={effectiveTenantDisplayName}
        logoUrl={effectiveTenantLogoUrl}
        onExitWorkspace={
          user && workspaceTenantId && isSuperAdminSession(user, profile)
            ? () => { exitWorkspaceTenant(); router.push('/'); }
            : undefined
        }
      />
    </aside>
    </>
  );
}
