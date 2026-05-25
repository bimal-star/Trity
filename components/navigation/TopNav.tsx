'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LogOut,
  Loader2,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  User,
  Settings,
  Bell,
  Home,
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { isSuperAdminSession } from '@/lib/permissions';
import { getIconAndPillarForNavLabel } from '@/lib/navigationItemIcons';
import { hasAppRouterDynamicSegments } from '@/lib/navigationPath';
import {
  PILLAR_UI_ORDER,
  PILLAR_ROOT_LABELS,
  premiumModuleForPillarLabel,
  type PillarRootLabel,
  type PillarPositionPrefix,
} from '@/lib/navigationPillars';
import { deriveActivePillar, normalizePillarPath } from '@/lib/activeNavPillar';
import type { NavigationItem } from '@/types/navigation';
import { WorkspaceBrandStrip } from '@/components/navigation/WorkspaceBrandStrip';
import { TopNavQuickSearch } from '@/components/navigation/TopNavQuickSearch';
import { pillarAccent, type PremiumModule } from '@/lib/premiumUi';
import { buildNavBreadcrumbs } from '@/lib/navBreadcrumbs';
import {
  enabledSectionChildren,
  findProductPillarRoot,
  firstEnabledPathUnderPillarPrefix,
  PILLAR_DEFAULT_LANDING,
  pillarSectionRowItems,
} from '@/lib/navPillarResolve';
import { Row2SectionFlyout } from '@/components/navigation/Row2SectionFlyout';

interface TopNavProps {
  mobileSidebarOpen: boolean;
  onMobileSidebarToggle: () => void;
}

const PLATFORM_ADMIN_LINKS: NavigationItem[] = [
  { id: 'pa-users', label: 'Users', position: '4.1', is_enabled: true, path: '/users' },
  {
    id: 'pa-access',
    label: 'Access Levels',
    position: '4.7',
    is_enabled: true,
    path: '/users/access',
  },
  {
    id: 'pa-settings',
    label: 'Tenant Settings',
    position: '4.3',
    is_enabled: true,
    path: '/tenant-settings',
  },
  {
    id: 'pa-tenants',
    label: 'Tenants Hub',
    position: '4.4',
    is_enabled: true,
    path: '/admin/tenants',
  },
  {
    id: 'pa-subs',
    label: 'Subscription packages',
    position: '4.45',
    is_enabled: true,
    path: '/admin/subscription-packages',
  },
  {
    id: 'pa-nav',
    label: 'Navigation Manager',
    position: '4.5',
    is_enabled: true,
    path: '/navigation-manager',
  },
  {
    id: 'pa-ie',
    label: 'Import/Export',
    position: '4.6',
    is_enabled: true,
    path: '/import-export',
  },
];

const INVALID_DYNAMIC_PATH_TITLE =
  'This path uses [segments] that Next.js cannot link to. Edit it in Navigation Manager (use a concrete URL, e.g. /admin/tenants).';

/** Active-state dot on pillar tabs (Tailwind bg-*). */
const PILLAR_TAB_DOT: Record<PremiumModule, string> = {
  businessCore: 'bg-green-500',
  analytics: 'bg-blue-500',
  execution: 'bg-orange-500',
  platform: 'bg-amber-500',
};

/** Pillar label on dark row-1 when tab is not selected (theme tint). */
const PILLAR_TAB_LABEL_IDLE: Record<PremiumModule, string> = {
  businessCore: 'text-green-400 hover:text-green-300',
  analytics: 'text-blue-400 hover:text-blue-300',
  execution: 'text-orange-400 hover:text-orange-300',
  platform: 'text-amber-400 hover:text-amber-300',
};

/** Row 2 section tab: bottom border + label colour when route is under that section. */
const ROW2_TAB_ACTIVE: Record<PremiumModule, string> = {
  businessCore: 'border-green-600 text-green-700 dark:border-green-500 dark:text-green-400',
  analytics: 'border-blue-600 text-blue-700 dark:border-blue-500 dark:text-blue-400',
  execution: 'border-orange-600 text-orange-800 dark:border-orange-500 dark:text-orange-400',
  platform: 'border-amber-600 text-amber-900 dark:border-amber-500 dark:text-amber-300',
};

/** Row 2 idle tab: pillar-tinted label + icon (still readable on white bar). */
const ROW2_TAB_IDLE: Record<PremiumModule, string> = {
  businessCore:
    'text-green-900/85 hover:text-green-800 dark:text-green-400/90 dark:hover:text-green-300',
  analytics: 'text-blue-900/85 hover:text-blue-800 dark:text-blue-400/90 dark:hover:text-blue-300',
  execution:
    'text-orange-950/90 hover:text-orange-900 dark:text-orange-400/90 dark:hover:text-orange-300',
  platform:
    'text-amber-950/90 hover:text-amber-900 dark:text-amber-400/90 dark:hover:text-amber-300',
};

function normalizeNavPath(path: string | null | undefined): string {
  if (!path) return '';
  const p = String(path).replace(/\\/g, '/');
  return p.startsWith('/') ? p : `/${p}`;
}

function flattenAll(items: NavigationItem[]): NavigationItem[] {
  const result: NavigationItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.children?.length) result.push(...flattenAll(item.children));
  }
  return result;
}

function firstEnabledNavPathInTree(items: NavigationItem[]): string | null {
  for (const item of items) {
    if (item.is_enabled === false) continue;
    const p = normalizeNavPath(item.path);
    if (p && !hasAppRouterDynamicSegments(p)) return p;
    if (item.children?.length) {
      const nested = firstEnabledNavPathInTree(item.children);
      if (nested) return nested;
    }
  }
  return null;
}

function subtreeContainsPath(item: NavigationItem, targetPath: string): boolean {
  const norm = normalizeNavPath(targetPath);
  const p = normalizeNavPath(item.path);
  if (p && p === norm) return true;
  for (const c of item.children ?? []) {
    if (subtreeContainsPath(c, norm)) return true;
  }
  return false;
}

/** Shallowest label match anywhere in the tree (same idea as pillar root BFS in navPillarResolve). */
function findNavNodeByLabelBfs(
  items: NavigationItem[] | null | undefined,
  label: string
): NavigationItem | null {
  if (!items?.length) return null;
  const want = label.trim();
  let queue = [...items];
  while (queue.length) {
    const next: NavigationItem[] = [];
    for (const item of queue) {
      if (String(item.label ?? '').trim() === want) return item;
      if (item.children?.length) next.push(...item.children);
    }
    queue = next;
  }
  return null;
}

/** Recursive nav renderer; `accentModule` tints icons/rows for pillar (or `platform` for admin menus). */
function MenuTree({
  items,
  depth = 0,
  onClose,
  accentModule,
  variant = 'darkPanel',
}: {
  items: NavigationItem[];
  depth?: number;
  onClose: () => void;
  accentModule: PremiumModule | null;
  variant?: 'darkPanel' | 'lightFlyout';
}) {
  const pathname = usePathname();
  const accent = pillarAccent(accentModule ?? undefined);
  const enabled = items.filter((item) => item.is_enabled !== false);
  if (!enabled.length) return null;

  const rowBase =
    variant === 'darkPanel'
      ? 'group flex items-center gap-2 py-1.5 pr-3 text-sm hover:bg-gray-800'
      : 'group flex items-center gap-2 py-1.5 pr-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800';

  return (
    <>
      {enabled.map((item) => {
        const path = normalizeNavPath(item.path);
        const children = (item.children ?? []).filter((c) => c.is_enabled !== false);
        const hasChildren = children.length > 0;
        const { icon: Icon } = getIconAndPillarForNavLabel(item.label);
        const paddingLeft = 12 + depth * 12;
        const hasPath = path.trim() !== '';
        const pathUnsafeForLink = hasPath && hasAppRouterDynamicSegments(path);
        const useNextLink = hasPath && !pathUnsafeForLink;
        const isActive = hasPath && normalizeNavPath(pathname) === path;

        const iconClass = [
          accent.iconColor,
          'shrink-0',
          isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100',
        ].join(' ');

        const labelMuted =
          variant === 'darkPanel'
            ? 'min-w-0 truncate text-gray-300 group-hover:text-white'
            : 'min-w-0 truncate text-gray-800 dark:text-gray-200';

        const labelClass = isActive
          ? variant === 'darkPanel'
            ? 'min-w-0 truncate font-medium text-white'
            : `min-w-0 truncate font-medium ${accent.titleText}`
          : labelMuted;

        const labelCell = (
          <>
            <Icon size={14} className={iconClass} aria-hidden />
            <span className={labelClass}>{item.label}</span>
          </>
        );

        const activeRow =
          variant === 'darkPanel'
            ? 'bg-gray-800/90'
            : `bg-gray-50 font-medium dark:bg-gray-800/90 ${accent.titleText}`;

        // No path assigned yet and no children — visible placeholder, not clickable.
        if (!path && !hasChildren) {
          return (
            <div
              key={item.id}
              title="Page not yet assigned"
              className={`${rowBase} cursor-default opacity-50`}
              style={{ paddingLeft }}
            >
              {labelCell}
            </div>
          );
        }

        return (
          <div key={item.id}>
            {path ? (
              useNextLink ? (
                <Link
                  href={path}
                  role="menuitem"
                  onClick={onClose}
                  aria-current={isActive ? 'page' : undefined}
                  className={`${rowBase} ${isActive ? activeRow : ''}`}
                  style={{ paddingLeft }}
                >
                  {labelCell}
                </Link>
              ) : (
                <div
                  role="menuitem"
                  title={INVALID_DYNAMIC_PATH_TITLE}
                  className={`${rowBase} cursor-help opacity-70`}
                  style={{ paddingLeft }}
                >
                  {labelCell}
                </div>
              )
            ) : (
              <div
                className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500"
                style={{ paddingLeft }}
              >
                {item.label}
              </div>
            )}
            {hasChildren && (
              <MenuTree
                items={children}
                depth={depth + 1}
                onClose={onClose}
                accentModule={accentModule}
                variant={variant}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export function TopNav({ mobileSidebarOpen, onMobileSidebarToggle }: TopNavProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [sectionAnchorEl, setSectionAnchorEl] = useState<HTMLElement | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const row2NavRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    profile,
    workspaceTenantId,
    effectiveTenantId,
    workspaceTenantLabel,
    effectiveTenantDisplayName,
    effectiveTenantLogoUrl,
    exitWorkspaceTenant,
    navigationItems,
    signOut,
  } = useTenant();

  const activePillarLabel = useMemo(
    () => deriveActivePillar(navigationItems, pathname),
    [navigationItems, pathname]
  );

  const activeAccentModule = useMemo(
    () => (activePillarLabel == null ? null : premiumModuleForPillarLabel(activePillarLabel)),
    [activePillarLabel]
  );

  const activeAccent = pillarAccent(activeAccentModule);

  const chromeDisplayName = workspaceTenantId
    ? (workspaceTenantLabel ?? effectiveTenantDisplayName)
    : effectiveTenantDisplayName;

  /** Row-2 tab colour maps are keyed by `PremiumModule`; use a pillar when none is active (e.g. home `/`). */
  const row2TabModule: PremiumModule = activeAccentModule ?? 'businessCore';

  const getSectionItems = (label: string): NavigationItem[] => {
    const root = findNavNodeByLabelBfs(navigationItems, label);
    return root?.children ?? [];
  };

  const adminSectionItems = useMemo(
    () => getSectionItems('Administration'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigationItems]
  );

  const accountSectionItems = useMemo(
    () => getSectionItems('Account'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigationItems]
  );

  const adminHasItems = useMemo(
    () =>
      flattenAll(adminSectionItems).some(
        (i) => !!normalizeNavPath(i.path) && i.is_enabled !== false
      ),
    [adminSectionItems]
  );

  const sectionRowItems = useMemo(
    () =>
      activePillarLabel == null ? [] : pillarSectionRowItems(navigationItems, activePillarLabel),
    [navigationItems, activePillarLabel]
  );

  const openSectionItem = useMemo(
    () => sectionRowItems.find((i) => i.id === openSectionId) ?? null,
    [sectionRowItems, openSectionId]
  );

  const openSectionChildren = useMemo(
    () => (openSectionItem ? enabledSectionChildren(openSectionItem, navigationItems) : []),
    [openSectionItem, navigationItems]
  );

  const firstPathInActivePillar = useMemo(
    () => firstEnabledNavPathInTree(sectionRowItems),
    [sectionRowItems]
  );

  const breadcrumbs = useMemo(
    () =>
      buildNavBreadcrumbs(navigationItems, pathname, activePillarLabel, firstPathInActivePillar),
    [navigationItems, pathname, activePillarLabel, firstPathInActivePillar]
  );

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [userMenuOpen]);

  useEffect(() => {
    setUserMenuOpen(false);
    setOpenSectionId(null);
    setSectionAnchorEl(null);
  }, [pathname]);

  useEffect(() => {
    if (openSectionId === null) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (row2NavRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('[data-row2-section-flyout]')) return;
      setOpenSectionId(null);
      setSectionAnchorEl(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openSectionId]);

  useEffect(() => {
    if (openSectionId === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenSectionId(null);
        setSectionAnchorEl(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [openSectionId]);

  useEffect(() => {
    setOpenSectionId(null);
  }, [pathname]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut();
      router.replace('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName =
    profile?.full_name || (user?.email ? user.email.split('@')[0] : null) || 'Account';

  const navigateToPillar = (label: PillarRootLabel) => {
    setUserMenuOpen(false);
    setOpenSectionId(null);
    if (!navigationItems?.length) {
      router.push(PILLAR_DEFAULT_LANDING[label]);
      return;
    }
    const step1 = firstEnabledPathUnderPillarPrefix(navigationItems, label);
    const step2 = firstEnabledNavPathInTree(pillarSectionRowItems(navigationItems, label));
    let dest = step1 ?? step2;
    if (!dest) {
      const root = findProductPillarRoot(navigationItems, label);
      if (root?.children?.length) dest = firstEnabledNavPathInTree(root.children);
    }
    dest = dest ?? PILLAR_DEFAULT_LANDING[label];
    // Analytics: always open the known app route so row-2 and pillar state stay aligned.
    // Execution must NOT be forced to `/` — `deriveActivePillar('/')` is intentionally null (home),
    // which made Execution look "unrecognised" and cleared row-2.
    if (label === 'Analytics') {
      dest = PILLAR_DEFAULT_LANDING[label];
    }
    // Mis-typed nav rows (e.g. Analytics prefix with path "/") would make pillar push a no-op after visiting home.
    if (label !== 'Execution' && normalizePillarPath(dest) === normalizePillarPath('/')) {
      dest = PILLAR_DEFAULT_LANDING[label];
    }
    const finalDest = dest ?? '/';
    if (normalizePillarPath(finalDest) === normalizePillarPath(pathname)) {
      router.refresh();
    } else {
      router.push(finalDest);
    }
  };

  const initial = displayName.trim().charAt(0).toUpperCase() || '?';
  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 flex flex-col border-b border-gray-950 bg-gray-950 shadow-md">
        {/* Row 1 — global */}
        <div className="grid h-16 min-h-[4rem] min-w-0 grid-cols-[auto_1fr_auto] items-center gap-2 px-2 sm:gap-3 sm:px-3">
          <div className="relative z-30 flex min-w-0 shrink-0 items-center gap-2 sm:gap-2">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 rounded-lg px-1.5 py-1 transition-opacity hover:opacity-80"
              aria-label="Trity home"
            >
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-800/90 p-0.5">
                <style jsx>{`
                  @keyframes shine {
                    0%,
                    100% {
                      opacity: 0.6;
                      filter: brightness(1);
                    }
                    50% {
                      opacity: 1;
                      filter: brightness(1.5) drop-shadow(0 0 4px currentColor);
                    }
                  }
                  .tn-dot-1 {
                    animation: shine 3s ease-in-out infinite;
                    animation-delay: 0s;
                  }
                  .tn-dot-2 {
                    animation: shine 3s ease-in-out infinite;
                    animation-delay: 1s;
                  }
                  .tn-dot-3 {
                    animation: shine 3s ease-in-out infinite;
                    animation-delay: 2s;
                  }
                `}</style>
                <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
                  <circle cx="12" cy="6" r="2.5" className="fill-blue-400 tn-dot-1" />
                  <circle cx="7" cy="16" r="2.5" className="fill-green-400 tn-dot-2" />
                  <circle cx="17" cy="16" r="2.5" className="fill-orange-400 tn-dot-3" />
                  <line
                    x1="12"
                    y1="6"
                    x2="7"
                    y2="16"
                    className="stroke-blue-400/60"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="12"
                    y1="6"
                    x2="17"
                    y2="16"
                    className="stroke-blue-400/60"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="7"
                    y1="16"
                    x2="17"
                    y2="16"
                    className="stroke-blue-400/60"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <span className="hidden text-base font-semibold tracking-[0.06em] text-gray-100 sm:inline">
                Trity
              </span>
            </Link>
          </div>

          <nav
            className="pointer-events-auto relative z-20 hidden w-full min-w-0 items-center justify-center sm:flex"
            aria-label="Product pillars"
          >
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              {(PILLAR_UI_ORDER as readonly PillarPositionPrefix[]).map((prefix, pillarIndex) => {
                const label = PILLAR_ROOT_LABELS[prefix] as PillarRootLabel;
                const mod = premiumModuleForPillarLabel(label);
                const tabAccent = pillarAccent(mod);
                const isActive = activePillarLabel != null && activePillarLabel === label;
                const showConnector =
                  pillarIndex < (PILLAR_UI_ORDER as readonly PillarPositionPrefix[]).length - 1;
                return (
                  <Fragment key={prefix}>
                    <button
                      type="button"
                      onClick={() => navigateToPillar(label)}
                      aria-current={isActive ? 'page' : undefined}
                      className={[
                        'pointer-events-auto flex h-11 min-w-[10.5rem] cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-center text-sm font-semibold leading-tight transition-colors',
                        isActive
                          ? `${tabAccent.pillSelected} ring-1 ring-inset ring-black/20 dark:ring-white/15`
                          : `${PILLAR_TAB_LABEL_IDLE[mod]} hover:bg-gray-800/80`,
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'h-2.5 w-2.5 shrink-0 rounded-full',
                          PILLAR_TAB_DOT[mod],
                          isActive ? '' : 'opacity-80',
                        ].join(' ')}
                      />
                      <span className="whitespace-nowrap text-center">{label}</span>
                    </button>
                    {showConnector ? (
                      <span
                        aria-hidden
                        className="pointer-events-none h-8 w-px shrink-0 bg-gray-700/80 dark:bg-gray-600"
                      />
                    ) : null}
                  </Fragment>
                );
              })}
            </div>
          </nav>

          <div className="pointer-events-none col-start-3 ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              className="pointer-events-auto relative hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 sm:flex"
              aria-label="Notifications (coming soon)"
            >
              <Bell size={18} aria-hidden />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-900" />
            </button>

            <div ref={userMenuRef} className="pointer-events-auto relative">
              <button
                type="button"
                onClick={() => {
                  setOpenSectionId(null);
                  setUserMenuOpen((v) => !v);
                }}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-gray-300 transition-all hover:bg-gray-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-600 text-xs font-semibold text-white">
                  {initial}
                </span>
                <ChevronDown
                  size={13}
                  className={`hidden shrink-0 transition-transform duration-150 sm:block ${userMenuOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-[60] mt-1 w-60 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 py-1 shadow-2xl"
                >
                  <div className="border-b border-gray-800 px-3 py-2">
                    <p className="truncate text-xs font-medium text-gray-200">{displayName}</p>
                    {user?.email && (
                      <p className="truncate text-[11px] text-gray-500">{user.email}</p>
                    )}
                  </div>

                  <div className="px-3 pb-0.5 pt-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      <Settings size={10} aria-hidden />
                      Administration
                    </span>
                  </div>
                  {adminHasItems ? (
                    <MenuTree
                      items={adminSectionItems}
                      onClose={() => setUserMenuOpen(false)}
                      accentModule="platform"
                    />
                  ) : (
                    <MenuTree
                      items={PLATFORM_ADMIN_LINKS}
                      onClose={() => setUserMenuOpen(false)}
                      accentModule="platform"
                    />
                  )}

                  <div className="mt-1 border-t border-gray-800 px-3 pb-0.5 pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Account
                    </span>
                  </div>
                  {accountSectionItems.length > 0 ? (
                    <MenuTree
                      items={accountSectionItems}
                      onClose={() => setUserMenuOpen(false)}
                      accentModule="platform"
                    />
                  ) : (
                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      <User size={14} aria-hidden />
                      Profile
                    </Link>
                  )}

                  <div className="mt-1 border-t border-gray-800 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 disabled:opacity-50"
                    >
                      {isLoggingOut ? (
                        <Loader2 size={14} className="animate-spin" aria-hidden />
                      ) : (
                        <LogOut size={14} aria-hidden />
                      )}
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pointer-events-auto hidden min-h-0 min-w-0 max-w-[200px] shrink overflow-hidden lg:block">
              <WorkspaceBrandStrip
                collapsed={false}
                hasWorkspace={Boolean(effectiveTenantId)}
                displayName={chromeDisplayName}
                logoUrl={effectiveTenantLogoUrl}
                onExitWorkspace={
                  user && workspaceTenantId && isSuperAdminSession(user, profile)
                    ? () => {
                        exitWorkspaceTenant();
                        router.push('/');
                      }
                    : undefined
                }
                className="border-0 px-1 py-0 [&_.min-h-11]:min-h-0 [&_.h-11]:h-9"
              />
            </div>

            <button
              type="button"
              className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 sm:hidden"
              aria-label={mobileSidebarOpen ? 'Close navigation' : 'Open navigation'}
              onClick={onMobileSidebarToggle}
            >
              {mobileSidebarOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
            </button>
          </div>
        </div>

        {/* Row 2 — contextual (desktop) */}
        <nav
          ref={row2NavRef}
          className="hidden min-h-12 items-center justify-between gap-3 border-t border-gray-800/80 bg-white px-2 py-1 dark:border-gray-800 dark:bg-gray-950 sm:flex sm:px-3"
          aria-label="Module sections"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-visible py-0.5">
            <div className="pointer-events-auto hidden shrink-0 md:block">
              <TopNavQuickSearch
                navigationItems={navigationItems}
                effectiveTenantId={effectiveTenantId}
                user={user}
                profile={profile}
                platformAdminExtras={PLATFORM_ADMIN_LINKS}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5 overflow-x-auto overflow-y-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navigationItems === null ? (
                <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Loading…
                </div>
              ) : (
                sectionRowItems.map((item, sectionIndex) => {
                  const path = normalizeNavPath(item.path);
                  const children = enabledSectionChildren(item, navigationItems);
                  const hasChildren = children.length > 0;
                  const { icon: SecIcon } = getIconAndPillarForNavLabel(item.label);
                  const sectionActive = subtreeContainsPath(item, pathname);
                  const isOpen = openSectionId === item.id;
                  const hasPath = path.trim() !== '';
                  const pathOk = hasPath && !hasAppRouterDynamicSegments(path);

                  const row2IconClass = [
                    activeAccent.iconColor,
                    sectionActive || isOpen ? 'opacity-100' : 'opacity-60',
                  ].join(' ');

                  const rowSep =
                    sectionIndex > 0 ? (
                      <div
                        key={`${item.id}-row2-sep`}
                        className="mx-0.5 h-5 w-px shrink-0 self-center bg-gray-200 dark:bg-gray-600"
                        aria-hidden
                      />
                    ) : null;

                  // No path assigned yet and no children — show as a muted placeholder tab.
                  if (!hasPath && !hasChildren) {
                    return (
                      <Fragment key={item.id}>
                        {rowSep}
                        <div
                          title="Page not yet assigned"
                          className={`flex shrink-0 cursor-default items-center gap-1.5 border-b-2 border-transparent px-2.5 py-2 text-sm font-medium opacity-40 ${ROW2_TAB_IDLE[row2TabModule]}`}
                        >
                          <SecIcon size={14} className={row2IconClass} aria-hidden />
                          {item.label}
                        </div>
                      </Fragment>
                    );
                  }

                  if (!hasChildren && hasPath && !pathOk) {
                    return (
                      <Fragment key={item.id}>
                        {rowSep}
                        <div
                          title={INVALID_DYNAMIC_PATH_TITLE}
                          className={`flex shrink-0 cursor-help items-center gap-1.5 border-b-2 border-transparent px-2.5 py-2 text-sm opacity-70 ${ROW2_TAB_IDLE[row2TabModule]}`}
                        >
                          <SecIcon size={14} className={row2IconClass} aria-hidden />
                          {item.label}
                        </div>
                      </Fragment>
                    );
                  }

                  if (!hasChildren && pathOk) {
                    return (
                      <Fragment key={item.id}>
                        {rowSep}
                        <Link
                          href={path}
                          onClick={() => {
                            setUserMenuOpen(false);
                            setOpenSectionId(null);
                          }}
                          className={[
                            'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-2.5 py-2 text-sm font-medium transition-colors',
                            sectionActive
                              ? ROW2_TAB_ACTIVE[row2TabModule]
                              : ROW2_TAB_IDLE[row2TabModule],
                          ].join(' ')}
                        >
                          <SecIcon size={14} className={row2IconClass} aria-hidden />
                          {item.label}
                        </Link>
                      </Fragment>
                    );
                  }

                  const splitTabBarClass = [
                    'flex items-stretch gap-0 border-b-2 border-transparent',
                    sectionActive || isOpen
                      ? ROW2_TAB_ACTIVE[row2TabModule]
                      : ROW2_TAB_IDLE[row2TabModule],
                  ].join(' ');

                  const toggleSectionFlyout = (anchor: HTMLElement) => {
                    setUserMenuOpen(false);
                    setOpenSectionId((id) => {
                      if (id === item.id) {
                        setSectionAnchorEl(null);
                        return null;
                      }
                      setSectionAnchorEl(anchor);
                      return item.id;
                    });
                  };

                  // Path + children: label navigates (matches Sidebar), chevron opens flyout only.
                  if (hasChildren && pathOk) {
                    return (
                      <Fragment key={item.id}>
                        {rowSep}
                        <div
                          className="relative shrink-0"
                          ref={(el) => {
                            if (isOpen && el) setSectionAnchorEl(el);
                          }}
                        >
                          <div className={splitTabBarClass}>
                            <Link
                              href={path}
                              onClick={() => {
                                setUserMenuOpen(false);
                                setOpenSectionId(null);
                                setSectionAnchorEl(null);
                              }}
                              className="flex min-w-0 shrink items-center gap-1.5 whitespace-nowrap px-2 py-2 pl-2.5 text-sm font-medium transition-colors"
                            >
                              <SecIcon size={14} className={row2IconClass} aria-hidden />
                              <span className="whitespace-nowrap">{item.label}</span>
                            </Link>
                            <button
                              type="button"
                              aria-label={`${item.label} submenu`}
                              aria-expanded={isOpen}
                              aria-haspopup="menu"
                              className="flex shrink-0 items-center rounded-none px-1.5 py-2 transition-colors focus:outline-none"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const anchor = e.currentTarget.closest('.relative');
                                if (anchor instanceof HTMLElement) toggleSectionFlyout(anchor);
                              }}
                            >
                              <ChevronDown
                                size={14}
                                className={`shrink-0 opacity-70 ${isOpen ? 'rotate-180' : ''}`}
                                aria-hidden
                              />
                            </button>
                          </div>
                        </div>
                      </Fragment>
                    );
                  }

                  // Invalid path but has children: show help on label; chevron still opens menu.
                  if (hasChildren && hasPath && !pathOk) {
                    return (
                      <Fragment key={item.id}>
                        {rowSep}
                        <div
                          className="relative shrink-0"
                          ref={(el) => {
                            if (isOpen && el) setSectionAnchorEl(el);
                          }}
                        >
                          <div className={splitTabBarClass}>
                            <div
                              title={INVALID_DYNAMIC_PATH_TITLE}
                              className="flex min-w-0 shrink cursor-help items-center gap-1.5 whitespace-nowrap px-2 py-2 pl-2.5 text-sm opacity-70"
                            >
                              <SecIcon size={14} className={row2IconClass} aria-hidden />
                              <span className="whitespace-nowrap">{item.label}</span>
                            </div>
                            <button
                              type="button"
                              aria-label={`${item.label} submenu`}
                              aria-expanded={isOpen}
                              aria-haspopup="menu"
                              className="flex shrink-0 cursor-pointer items-center rounded-none px-1.5 py-2 transition-colors focus:outline-none"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const anchor = e.currentTarget.closest('.relative');
                                if (anchor instanceof HTMLElement) toggleSectionFlyout(anchor);
                              }}
                            >
                              <ChevronDown
                                size={14}
                                className={`shrink-0 opacity-70 ${isOpen ? 'rotate-180' : ''}`}
                                aria-hidden
                              />
                            </button>
                          </div>
                        </div>
                      </Fragment>
                    );
                  }

                  return (
                    <Fragment key={item.id}>
                      {rowSep}
                      <div
                        className="relative shrink-0"
                        ref={(el) => {
                          if (isOpen && el) setSectionAnchorEl(el);
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            setUserMenuOpen(false);
                            const anchor = e.currentTarget.closest('.relative');
                            if (anchor instanceof HTMLElement) toggleSectionFlyout(anchor);
                          }}
                          aria-expanded={isOpen}
                          aria-haspopup="menu"
                          className={[
                            'flex cursor-pointer items-center gap-1 border-b-2 border-transparent px-2.5 py-2 text-sm font-medium transition-colors',
                            sectionActive || isOpen
                              ? ROW2_TAB_ACTIVE[row2TabModule]
                              : ROW2_TAB_IDLE[row2TabModule],
                          ].join(' ')}
                        >
                          <SecIcon size={14} className={row2IconClass} aria-hidden />
                          <span className="whitespace-nowrap">{item.label}</span>
                          <ChevronDown
                            size={14}
                            className={`shrink-0 opacity-70 ${isOpen ? 'rotate-180' : ''}`}
                            aria-hidden
                          />
                        </button>
                      </div>
                    </Fragment>
                  );
                })
              )}
            </div>
          </div>

          <div className="hidden max-w-[min(50vw,32rem)] shrink-0 items-center gap-1 overflow-x-auto text-xs tracking-[var(--trity-tracking)] text-gray-600 [-ms-overflow-style:none] [scrollbar-width:none] dark:text-gray-400 md:flex [&::-webkit-scrollbar]:hidden">
            {breadcrumbs.map((c, i) => {
              const isPillarCrumb = c.label === activePillarLabel;
              const crumbAccent = isPillarCrumb ? activeAccent : null;
              /** Uniform font-medium + explicit tracking so the last crumb does not look wider than links (semibold + same tracking). */
              const crumbLinkClass = `shrink-0 font-medium hover:underline tracking-[var(--trity-tracking)] ${
                crumbAccent ? crumbAccent.titleText : 'text-gray-600 dark:text-gray-300'
              }`;
              return (
                <Fragment key={`${c.label}-${i}`}>
                  {i > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                  )}
                  {i === 0 ? (
                    c.href ? (
                      <Link
                        href={c.href}
                        className="shrink-0 tracking-[var(--trity-tracking)] text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                        aria-label={c.label}
                      >
                        <Home className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    ) : (
                      <span className="shrink-0 tracking-[var(--trity-tracking)]">{c.label}</span>
                    )
                  ) : c.href && !c.current ? (
                    <Link href={c.href} className={crumbLinkClass}>
                      {c.label}
                    </Link>
                  ) : (
                    <span
                      className={`shrink-0 font-medium tracking-[var(--trity-tracking)] ${
                        c.current
                          ? 'text-gray-900 dark:text-gray-100'
                          : crumbAccent
                            ? crumbAccent.titleText
                            : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {c.label}
                    </span>
                  )}
                </Fragment>
              );
            })}
          </div>
          <Row2SectionFlyout
            open={Boolean(openSectionItem && openSectionChildren.length > 0)}
            anchorEl={sectionAnchorEl}
            sectionLabel={String(openSectionItem?.label ?? '').trim()}
            sectionPath={openSectionItem ? normalizeNavPath(openSectionItem.path) || null : null}
            sectionPathOk={Boolean(
              openSectionItem &&
              normalizeNavPath(openSectionItem.path).trim() !== '' &&
              !hasAppRouterDynamicSegments(normalizeNavPath(openSectionItem.path))
            )}
            items={openSectionChildren}
            onClose={() => {
              setOpenSectionId(null);
              setSectionAnchorEl(null);
            }}
            accentModule={row2TabModule}
            MenuTree={MenuTree}
          />
        </nav>
      </header>

      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 top-16 z-40 bg-black/50 sm:hidden"
            aria-hidden="true"
            onClick={onMobileSidebarToggle}
          />
          <div
            className="fixed bottom-0 left-0 right-0 top-16 z-[41] flex flex-col overflow-hidden border-t border-gray-800 bg-gray-900 sm:hidden"
            role="dialog"
            aria-label="Navigation"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {navigationItems === null ? (
                <div
                  className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-gray-500"
                  role="status"
                  aria-busy="true"
                  aria-label="Loading navigation"
                >
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                  Loading menu…
                </div>
              ) : (
                (PILLAR_UI_ORDER as readonly PillarPositionPrefix[]).map((prefix) => {
                  const label = PILLAR_ROOT_LABELS[prefix] as PillarRootLabel;
                  const { icon: PillarIcon } = getIconAndPillarForNavLabel(label);
                  const items = pillarSectionRowItems(navigationItems, label);
                  const pillarMod = premiumModuleForPillarLabel(label);
                  return (
                    <section
                      key={prefix}
                      className="mb-4 border-b border-gray-800 pb-4 last:mb-0 last:border-0 last:pb-0"
                    >
                      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <PillarIcon
                          size={14}
                          className={pillarAccent(pillarMod).iconColor}
                          aria-hidden
                        />
                        {label}
                      </h2>
                      <MenuTree
                        items={items}
                        onClose={onMobileSidebarToggle}
                        accentModule={pillarMod}
                        variant="darkPanel"
                      />
                    </section>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
