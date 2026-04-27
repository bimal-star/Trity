'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import { NavigationItem } from '@/types/navigation';
import { organizeHierarchy } from '@/lib/navigation-hierarchy';
import { defaultNavigationItems } from '@/lib/navigation-default';
import { UserProfile } from '@/types/profile';
import { isSuperAdminRole, isSuperAdminSession, resolveProfileRole } from '@/lib/permissions';
import {
  getTenantCache,
  setTenantCache,
  clearTenantCache,
  isValidTenantId,
} from '@/lib/tenantCache';
import { type CatalogueMode, normalizeCatalogueMode } from '@/lib/productCatalogue';
import { getImpersonationFromSession, endTenantImpersonation } from '@/lib/impersonation';

/**
 * TenantContext - Global Authentication & Tenant State Provider
 *
 * SESSION REFRESH MUST NOT TRIGGER FULL RELOADS:
 * ===============================================
 * When returning from another tab, Supabase refreshes the token and may emit
 * TOKEN_REFRESHED or SIGNED_IN. If we re-fetched profile/tenant/features on
 * those events, every tab return would cause slow validation and re-fetches.
 * We load profile/tenant/features ONCE and cache them; only true login/logout
 * resets or reloads. Same user ID → no re-fetch.
 *
 * STABILITY CONTRACT:
 * ===================
 * This provider is mounted ONCE at the root layout level via AppProviders.
 * It NEVER unmounts during navigation - only the children prop changes.
 *
 * This means:
 * - All state (user, profile, tenant_id, features) persists in memory
 * - No re-fetching occurs on route changes
 * - Navigation is instant because data is already cached
 * - Only re-fetches when session actually changes (sign in/out)
 *
 * Caching and Rehydration Strategy:
 * ==================================
 *
 * 1. Session:
 *    - Loaded ONCE via getSession() at boot (Supabase restores from storage)
 *    - Only calls getUser() when session actually changes (via onAuthStateChange)
 *    - Never re-fetches on navigation or route changes
 *
 * 2. Profile:
 *    - Fetched ONCE when user is authenticated
 *    - Cached in memory (React state)
 *    - Never re-fetched unless session changes (user signs out/in)
 *    - Updates only when explicitly refreshed via refreshTenant() or refreshCatalogueMode()
 *
 * 3. Tenant ID:
 *    - Cached in localStorage (userId + tenant_id) for fast rehydration
 *    - Fetched ONCE on initial load
 *    - Only re-validated if session changes (different user signs in)
 *    - Never re-fetched on navigation
 *
 * 4. Features (Navigation):
 *    - In-memory cache (React state)
 *    - Loaded ONCE when authenticated
 *    - Only refetched when:
 *      a) Session/tenant changes (different user/tenant)
 *      b) Explicit refresh event ('navigation-updated' custom event)
 *    - NEVER refetched on route changes
 *
 * 5. onAuthStateChange:
 *    - Single stable listener registered once on mount
 *    - TOKEN_REFRESHED / INITIAL_SESSION: NEVER re-fetch. Same user, new tokens only.
 *      (Returning from another tab triggers token refresh; full reload would cause slow nav.)
 *    - SIGNED_IN: revalidate ONLY if user ID changed (true login). Same user → no-op.
 *    - SIGNED_OUT: clear all cached data
 *    - Never triggers on navigation
 *
 * ROUTE INDEPENDENCE:
 * ===================
 * This provider has ZERO dependencies on:
 * - pathname
 * - router
 * - route changes
 * - navigation events
 *
 * All useEffect hooks are independent of routing and only depend on:
 * - Session state (via onAuthStateChange)
 * - Custom events (navigation-updated)
 * - Initial mount (boot sequence)
 *
 * DO NOT ADD:
 * - useEffect hooks that depend on pathname, router, or router events
 * - Logic that triggers on route changes or navigation
 * - Any navigation-dependent fetching
 * - Handling of TOKEN_REFRESHED / INITIAL_SESSION that triggers re-fetch (must no-op)
 * - Re-fetch on session changes that are only token refreshes (same user)
 */

const WORKSPACE_STORAGE_PREFIX = 'trity_super_admin_workspace:';

function workspaceStorageKey(userId: string): string {
  return `${WORKSPACE_STORAGE_PREFIX}${userId}`;
}

function parseWorkspaceStored(raw: string | null): { id: string; label?: string } | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as { id?: unknown; label?: unknown };
    if (isValidTenantId(p?.id)) {
      const label = p.label;
      return {
        id: p.id as string,
        label: typeof label === 'string' && label.trim() ? label.trim() : undefined,
      };
    }
  } catch {
    /* legacy or non-JSON */
  }
  if (isValidTenantId(raw)) return { id: raw };
  return null;
}

function writeWorkspaceStored(userId: string, id: string, label?: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      workspaceStorageKey(userId),
      JSON.stringify({
        id,
        ...(label?.trim() ? { label: label.trim() } : {}),
      })
    );
  } catch {
    /* ignore */
  }
}

const PROFILE_FETCH_TIMEOUT_MS = 25_000;
const NAV_FETCH_TIMEOUT_MS = 25_000;
const SESSION_GET_TIMEOUT_MS = 3_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timed out (${ms}ms)`)), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

/** Catalogue mode plus workspace label/logo for sidebar chrome (one tenants row fetch). */
export type EffectiveTenantSurface = {
  mode: CatalogueMode;
  displayName: string | null;
  logoUrl: string | null;
};

function tenantRowToSurface(data: Record<string, unknown> | null): EffectiveTenantSurface {
  const company =
    typeof data?.company_name === 'string' && data.company_name.trim()
      ? data.company_name.trim()
      : null;
  const name = typeof data?.name === 'string' && data.name.trim() ? data.name.trim() : null;
  const logoRaw =
    typeof data?.logo_url === 'string' && data.logo_url.trim() ? data.logo_url.trim() : null;
  return {
    mode: normalizeCatalogueMode(
      typeof data?.catalogue_mode === 'string' ? data.catalogue_mode : undefined
    ),
    displayName: company || name,
    logoUrl: logoRaw,
  };
}

async function fetchEffectiveTenantSurface(tenantId: string): Promise<EffectiveTenantSurface> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('catalogue_mode, name, company_name, logo_url')
      .eq('id', tenantId)
      .maybeSingle();
    if (error) throw error;
    return tenantRowToSurface((data as Record<string, unknown>) ?? null);
  } catch {
    return { mode: 'simple', displayName: null, logoUrl: null };
  }
}

/** Boot and revalidate must not hang if getSession() never settles (storage / client quirks). */
async function getSessionWithTimeout(): Promise<{
  data: { session: Session | null };
  error: Awaited<ReturnType<typeof supabase.auth.getSession>>['error'];
}> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('Session check timeout - check Supabase configuration')),
      SESSION_GET_TIMEOUT_MS
    )
  );
  return Promise.race([supabase.auth.getSession(), timeoutPromise]);
}

/** Prefer JWT hints so we load the correct user_profiles row when multiple exist. */
function tenantIdHintFromUser(u: User): string | null {
  const a = u.user_metadata?.tenant_id;
  if (isValidTenantId(a)) return a;
  const b = u.app_metadata?.tenant_id;
  if (isValidTenantId(b)) return b;
  return null;
}

/** Same as JWT hints plus profile row — used to prefetch navigation while tenant_id resolves. */
function tenantIdFromUserAndProfile(u: User, profile: UserProfile | null): string | null {
  const fromJwt = tenantIdHintFromUser(u);
  if (fromJwt) return fromJwt;
  if (profile?.tenant_id && isValidTenantId(profile.tenant_id)) return profile.tenant_id;
  return null;
}

export interface TenantContextType {
  /** Home tenant from profile / JWT (unchanged by workspace mode). */
  tenant_id: string | null;
  /** Tenant used for data queries and navigation: workspace override, else `tenant_id`. */
  effectiveTenantId: string | null;
  /** Super-admin workspace: acting as this tenant (persisted per user in localStorage). */
  workspaceTenantId: string | null;
  workspaceTenantLabel: string | null;
  enterWorkspaceTenant: (tenantId: string, displayLabel?: string | null) => void;
  exitWorkspaceTenant: () => void;
  user: User | null;
  /** User profile from user_profiles table. Cached in memory, loaded once on authentication. */
  profile: UserProfile | null;
  isLoading: boolean;
  /** True once session is resolved (isLoading false). Logged-out: no user/tenant.
   * Logged-in: ready even without tenant_id (e.g. platform super_admin shell). */
  ready: boolean;
  error: string | null;
  /** Tenant features (navigation items). Cached in memory; refetch only on session/tenant change. */
  navigationItems: NavigationItem[] | null;
  navigationError: Error | null;
  catalogue_mode: CatalogueMode;
  /** Workspace label for chrome: company name, else tenant name (effective tenant). */
  effectiveTenantDisplayName: string | null;
  /** Public logo URL for the effective tenant, if set. */
  effectiveTenantLogoUrl: string | null;
  refreshTenant: () => Promise<void>;
  /** Re-fetch catalogue mode and workspace branding for the current effective tenant. Use after admin or settings update the tenant row. */
  refreshCatalogueMode: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Super-admin JWT impersonation (see `lib/impersonation.ts`). */
  impersonation: { targetTenantId: string; readOnly: boolean } | null;
  endTenantImpersonation: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenant_id: null,
  effectiveTenantId: null,
  workspaceTenantId: null,
  workspaceTenantLabel: null,
  enterWorkspaceTenant: () => {},
  exitWorkspaceTenant: () => {},
  user: null,
  profile: null,
  isLoading: true,
  ready: false,
  error: null,
  navigationItems: null,
  navigationError: null,
  catalogue_mode: 'simple',
  effectiveTenantDisplayName: null,
  effectiveTenantLogoUrl: null,
  refreshTenant: async () => {},
  refreshCatalogueMode: async () => {},
  signOut: async () => {},
  impersonation: null,
  endTenantImpersonation: async () => {},
});

async function fetchNavigation(
  tenantId?: string | null,
  skipEnabledFilter = false
): Promise<{
  data: NavigationItem[] | null;
  error: Error | null;
}> {
  let query = supabase.from('navigation').select('*').order('position', { ascending: true });

  if (!skipEnabledFilter) {
    query = query.eq('is_enabled', true);
  }

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  try {
    type NavRow = Record<string, unknown>;
    const navPromise = Promise.resolve(
      query as unknown as Promise<{
        data: NavRow[] | null;
        error: { message: string; code?: string } | null;
      }>
    );
    const { data, error: fetchError } = await withTimeout(
      navPromise,
      NAV_FETCH_TIMEOUT_MS,
      'navigation query'
    );
    if (fetchError) {
      const message = fetchError.message || '';
      const code = fetchError.code || '';
      const isStackDepth = code === '54001' || message.toLowerCase().includes('stack depth');

      if (isStackDepth) {
        console.warn('Navigation fetch failed due to stack depth. Using fallback navigation.');
        const organizedFallback = organizeHierarchy(defaultNavigationItems);
        return { data: organizedFallback as NavigationItem[], error: null };
      }

      return {
        data: null,
        error: new Error(`Supabase error: ${fetchError.message} (${fetchError.code || 'no code'})`),
      };
    }
    const raw = (data || []) as NavigationItem[];
    let organized = organizeHierarchy(raw);
    if (organized.length === 0 && raw.length === 0) {
      console.warn('[navigation] public.navigation returned no rows; using built-in default menu.');
      organized = organizeHierarchy(defaultNavigationItems) as NavigationItem[];
    }
    return { data: organized as NavigationItem[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch navigation';
    console.warn('[navigation]', message, '— using default menu');
    const organizedFallback = organizeHierarchy(defaultNavigationItems);
    return { data: organizedFallback as NavigationItem[], error: null };
  }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant_id, setTenantId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[] | null>(null);
  const [navigationError, setNavigationError] = useState<Error | null>(null);
  const [workspaceTenantId, setWorkspaceTenantId] = useState<string | null>(null);
  const [workspaceTenantLabel, setWorkspaceTenantLabel] = useState<string | null>(null);
  const [catalogueMode, setCatalogueMode] = useState<CatalogueMode>('simple');
  const [effectiveTenantDisplayName, setEffectiveTenantDisplayName] = useState<string | null>(null);
  const [effectiveTenantLogoUrl, setEffectiveTenantLogoUrl] = useState<string | null>(null);

  const lastNavigationFetchAt = useRef(0);
  const hasUserAndTenantRef = useRef(false);
  const hasSignedOutRef = useRef(false);
  /** In-memory cache: we only re-fetch tenant/profile/features when session or tenant_id changes. */
  const lastUserIdRef = useRef<string | null>(null);
  const lastTenantIdRef = useRef<string | null>(null);
  /** Track if we've already loaded profile to prevent re-fetching on navigation */
  const profileLoadedRef = useRef(false);
  /** Same-user session resolved as super_admin with no tenant_id (platform shell). */
  const superAdminNoTenantRef = useRef(false);
  /** Latest profile for callbacks (revalidate) without adding profile to useCallback deps. */
  const profileRef = useRef<UserProfile | null>(null);
  profileRef.current = profile;
  /** Whether the current session is a super-admin — updated each render so stable callbacks can read it. */
  const isSuperAdminRef = useRef(false);
  isSuperAdminRef.current = user ? isSuperAdminSession(user, profile) : false;
  /** True after navigation fetch completed at least once for this session (or boot cache applied it). */
  const navigationHydratedRef = useRef(false);
  const workspaceTenantIdRef = useRef<string | null>(null);
  workspaceTenantIdRef.current = workspaceTenantId;
  const tenantIdRef = useRef<string | null>(null);
  tenantIdRef.current = tenant_id;
  /** Cleared on sign-out; used to restore workspace from localStorage once per login. */
  const lastRestoredWorkspaceUserRef = useRef<string | null>(null);

  const effectiveTenantId = useMemo(
    () => workspaceTenantId ?? tenant_id,
    [workspaceTenantId, tenant_id]
  );

  const effectiveTenantIdRef = useRef<string | null>(null);
  effectiveTenantIdRef.current = effectiveTenantId;

  /**
   * Fetch user profile from user_profiles table.
   * This is called once when user is authenticated and cached in memory.
   */
  const fetchProfile = useCallback(
    async (
      userId: string,
      options?: { authUser?: User | null; tenantIdHint?: string | null }
    ): Promise<UserProfile | null> => {
      const authUser = options?.authUser;
      const tenantHint = options?.tenantIdHint;
      const columns = 'id, user_id, tenant_id, full_name, email, role, created_at, updated_at';

      try {
        return await withTimeout(
          (async (): Promise<UserProfile | null> => {
            let data: Record<string, unknown> | null = null;

            if (tenantHint && isValidTenantId(tenantHint)) {
              const scoped = await supabase
                .from('user_profiles')
                .select(columns)
                .eq('user_id', userId)
                .eq('tenant_id', tenantHint)
                .maybeSingle();
              if (scoped.data && !scoped.error) {
                data = scoped.data as Record<string, unknown>;
              }
            }

            if (!data) {
              const multi = await supabase
                .from('user_profiles')
                .select(columns)
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(12);
              if (multi.error) {
                console.error('Error fetching profile:', multi.error);
                return null;
              }
              const rows = (multi.data ?? []) as Record<string, unknown>[];
              const hintRow =
                tenantHint && isValidTenantId(tenantHint)
                  ? rows.find((r) => r.tenant_id === tenantHint)
                  : undefined;
              const pick = hintRow ?? rows[0];
              if (!pick) {
                console.error('No user_profiles row for user:', userId);
                return null;
              }
              data = pick;
            }

            const jwtRaw = authUser?.app_metadata?.role;
            const appMetaRole = typeof jwtRaw === 'string' ? jwtRaw : undefined;

            return {
              ...data,
              role: resolveProfileRole(data.role as string | null | undefined, appMetaRole),
            } as UserProfile;
          })(),
          PROFILE_FETCH_TIMEOUT_MS,
          'user_profiles fetch'
        );
      } catch (err) {
        console.error('Error fetching profile:', err);
        return null;
      }
    },
    []
  );

  /**
   * Fetch tenant_id from user metadata or profile.
   * This is called once when user is authenticated and cached in memory.
   */
  const fetchTenantId = useCallback(
    async (currentUser: User, userProfile?: UserProfile | null): Promise<string | null> => {
      try {
        // First check user metadata
        let tid = currentUser.user_metadata?.tenant_id;
        if (isValidTenantId(tid)) return tid;

        tid = currentUser.app_metadata?.tenant_id;
        if (isValidTenantId(tid)) return tid;

        // If we have profile, use it
        if (userProfile?.tenant_id && isValidTenantId(userProfile.tenant_id)) {
          return userProfile.tenant_id;
        }

        // Otherwise fetch from profile table (timeout so revalidate can always finish)
        const { data: profile, error: profileError } = await withTimeout(
          (async () =>
            supabase
              .from('user_profiles')
              .select('tenant_id')
              .eq('user_id', currentUser.id)
              .single())(),
          PROFILE_FETCH_TIMEOUT_MS,
          'tenant_id from user_profiles'
        );
        if (!profileError && profile?.tenant_id && isValidTenantId(profile.tenant_id)) {
          console.log('✓ Tenant ID from profile:', profile.tenant_id);
          return profile.tenant_id;
        }

        console.error('✗ No valid tenant_id found for user:', currentUser.id);
        return null;
      } catch (err) {
        console.error('Error fetching tenant_id:', err);
        return null;
      }
    },
    []
  );

  const loadNavigation = useCallback(
    async (background: boolean, tenantIdOverride?: string | null) => {
      if (!background) {
        setNavigationError(null);
      }
      // Explicit `null` = no tenant filter (platform super shell / RLS-wide read). Do not use
      // `??` here: `null ?? lastTenantIdRef` would incorrectly fall back to the ref.
      const tid =
        tenantIdOverride !== undefined ? tenantIdOverride : (lastTenantIdRef.current ?? null);
      const { data, error: navErr } = await fetchNavigation(tid, isSuperAdminRef.current);
      lastNavigationFetchAt.current = Date.now();
      setNavigationItems(data);
      setNavigationError(navErr);
      navigationHydratedRef.current = true;
    },
    []
  );

  const enterWorkspaceTenant = useCallback(
    (targetId: string, displayLabel?: string | null) => {
      if (!user || !isValidTenantId(targetId)) return;
      if (!isSuperAdminSession(user, profileRef.current)) return;
      setWorkspaceTenantId(targetId);
      setWorkspaceTenantLabel(displayLabel?.trim() || null);
      writeWorkspaceStored(user.id, targetId, displayLabel);
      tenantedSupabase.setTenantId(targetId);
      void Promise.all([
        loadNavigation(false, targetId),
        fetchEffectiveTenantSurface(targetId).then((s) => {
          if (hasSignedOutRef.current) return;
          setCatalogueMode(s.mode);
          setEffectiveTenantDisplayName(s.displayName);
          setEffectiveTenantLogoUrl(s.logoUrl);
        }),
      ]);
    },
    [user, loadNavigation]
  );

  const exitWorkspaceTenant = useCallback(() => {
    if (!user) return;
    setWorkspaceTenantId(null);
    setWorkspaceTenantLabel(null);
    try {
      localStorage.removeItem(workspaceStorageKey(user.id));
    } catch {
      /* ignore */
    }
    const home = tenantIdRef.current;
    tenantedSupabase.setTenantId(home);
    void Promise.all([
      loadNavigation(false, home ?? undefined),
      home
        ? fetchEffectiveTenantSurface(home).then((s) => {
            if (hasSignedOutRef.current) return;
            setCatalogueMode(s.mode);
            setEffectiveTenantDisplayName(s.displayName);
            setEffectiveTenantLogoUrl(s.logoUrl);
          })
        : Promise.resolve().then(() => {
            if (hasSignedOutRef.current) return;
            setCatalogueMode('simple');
            setEffectiveTenantDisplayName(null);
            setEffectiveTenantLogoUrl(null);
          }),
    ]);
  }, [user, loadNavigation]);

  /**
   * Revalidate session, profile, tenant, and features.
   * Only called when session actually changes (via onAuthStateChange) or on initial boot.
   * Never called on navigation or visibility changes to ensure instant navigation.
   *
   * Stable check: if same user and we've already loaded profile + tenant, skip all
   * fetches. Session refresh events must not trigger full reloads.
   */
  const revalidate = useCallback(
    async (background: boolean, sessionHint?: Session | null) => {
      console.log('🔄 TenantContext revalidate called, background:', background);
      if (!background) {
        setIsLoading(true);
        setError(null);
      }
      try {
        console.log('📡 Getting session from localStorage...');

        const {
          data: { session },
          error: sessionError,
        } = await getSessionWithTimeout();

        // Prefer getSession(); fall back to SIGNED_IN hint so we never clear the user while
        // storage is still catching up (fixes post-sign-on "stuck loading").
        const currentUser = session?.user ?? sessionHint?.user ?? null;
        console.log('📡 Session result:', {
          hasUser: !!currentUser,
          hasError: !!sessionError,
          usedSessionHint: Boolean(sessionHint?.user && !session?.user),
        });
        if (!currentUser) {
          if (!background) {
            hasUserAndTenantRef.current = false;
            superAdminNoTenantRef.current = false;
            lastUserIdRef.current = null;
            lastTenantIdRef.current = null;
            profileLoadedRef.current = false;
            setUser(null);
            setProfile(null);
            setTenantId(null);
            setCatalogueMode('simple');
            setEffectiveTenantDisplayName(null);
            setEffectiveTenantLogoUrl(null);
            setNavigationItems(null);
            setNavigationError(null);
            navigationHydratedRef.current = false;
            clearTenantCache();
          }
          return;
        }

        // Stable check: same user ID and already loaded → no re-fetch. Ensures session
        // refresh / tab return never triggers profile/tenant/features reload.
        if (
          currentUser.id === lastUserIdRef.current &&
          profileLoadedRef.current &&
          (lastTenantIdRef.current || superAdminNoTenantRef.current)
        ) {
          console.log('✓ Using cached tenant data, no re-fetch needed');
          if (!navigationHydratedRef.current) {
            if (lastTenantIdRef.current) {
              await loadNavigation(background, lastTenantIdRef.current);
            } else if (superAdminNoTenantRef.current) {
              await loadNavigation(background, null);
            }
          }
          if (!background) setIsLoading(false);
          return;
        }

        console.log('📊 Fetching profile and tenant...');
        const prevUserId = lastUserIdRef.current;
        const userChanged = prevUserId !== currentUser.id;

        // Fetch profile only when user changed or not yet loaded. Never re-fetch on
        // session refresh (same user).
        let userProfile: UserProfile | null = null;
        if (userChanged || !profileLoadedRef.current) {
          console.log('📝 Fetching user profile...');
          userProfile = await fetchProfile(currentUser.id, {
            authUser: currentUser,
            tenantIdHint: tenantIdHintFromUser(currentUser),
          });
          console.log('📝 Profile result:', { hasProfile: !!userProfile });
          if (userProfile) {
            setProfile(userProfile);
            profileLoadedRef.current = true;
          }
        }

        console.log('🏢 Fetching tenant ID...');
        const profileForTenant = userProfile ?? profileRef.current;
        const tidHint = tenantIdFromUserAndProfile(currentUser, profileForTenant);
        const prefetchNav =
          tidHint != null ? loadNavigation(background, tidHint) : Promise.resolve();
        const tid = await fetchTenantId(currentUser, profileForTenant);
        await prefetchNav;
        console.log('🏢 Tenant ID result:', tid);
        if (!tid) {
          if (hasSignedOutRef.current) return;

          tenantedSupabase.setTenantId(null);
          hasUserAndTenantRef.current = false;
          lastTenantIdRef.current = null;
          clearTenantCache();
          setCatalogueMode('simple');
          setEffectiveTenantDisplayName(null);
          setEffectiveTenantLogoUrl(null);

          const jwtRole = currentUser.app_metadata?.role ?? currentUser.user_metadata?.role;
          const effectiveProfile = userProfile ?? profileRef.current;
          const isSuperShell =
            isSuperAdminRole(effectiveProfile?.role) ||
            isSuperAdminRole(typeof jwtRole === 'string' ? jwtRole : undefined);

          superAdminNoTenantRef.current = isSuperShell;

          if (isSuperShell) {
            lastUserIdRef.current = currentUser.id;
            if (userProfile) profileLoadedRef.current = true;
          } else {
            lastUserIdRef.current = null;
            profileLoadedRef.current = false;
          }

          if (!background) {
            setUser(currentUser);
            setTenantId(null);
            setNavigationError(null);

            if (isSuperShell) {
              setNavigationItems(null);
              navigationHydratedRef.current = false;
              setError(null);
            } else {
              // Non-null [] so Sidebar does not treat nav as "still loading" (see LayoutWrapper vs ProtectedRoute).
              setNavigationItems([]);
              navigationHydratedRef.current = true;
              const invalidTenantId =
                currentUser.user_metadata?.tenant_id ||
                currentUser.app_metadata?.tenant_id ||
                userProfile?.tenant_id;

              if (invalidTenantId && typeof invalidTenantId === 'string') {
                setError(
                  `Invalid tenant ID format: "${invalidTenantId}". Expected a valid UUID. Please contact support to fix your account configuration.`
                );
              } else {
                setError('Your account is not associated with a tenant. Please contact support.');
              }
            }
          }
          // Platform super shell: no tenant_id but RLS allows reading navigation (see
          // navigation_select_platform_super_admin). Without this, sidebar spins forever.
          if (isSuperShell) {
            await loadNavigation(background, null);
          }
          return;
        }

        if (hasSignedOutRef.current) return;

        const prevTenantId = lastTenantIdRef.current;
        hasUserAndTenantRef.current = true;
        superAdminNoTenantRef.current = false;
        lastUserIdRef.current = currentUser.id;
        lastTenantIdRef.current = tid;
        setUser(currentUser);
        setTenantId(tid);
        // IMPORTANT: Set tenant ID on schema-aware client
        // This enables automatic schema routing for all queries
        tenantedSupabase.setTenantId(tid);
        setError(null);
        setTenantCache(currentUser.id, tid);
        console.log('✓ User authenticated with tenant:', tid);

        const sessionOrTenantChanged = userChanged || prevTenantId !== tid;
        const navPromise = (async () => {
          if (tid !== tidHint) {
            await loadNavigation(background, tid);
          } else if (!tidHint && (sessionOrTenantChanged || !navigationHydratedRef.current)) {
            await loadNavigation(background, tid);
          }
        })();
        const surfacePromise = fetchEffectiveTenantSurface(tid).then((s) => {
          if (hasSignedOutRef.current) return;
          setCatalogueMode(s.mode);
          setEffectiveTenantDisplayName(s.displayName);
          setEffectiveTenantLogoUrl(s.logoUrl);
        });
        await Promise.all([navPromise, surfacePromise]);
      } catch (err: unknown) {
        if (!background) {
          const msg = err instanceof Error ? err.message : 'Failed to load tenant information';
          setError(msg);

          const recovered =
            sessionHint?.user ??
            (await supabase.auth
              .getSession()
              .then(({ data }) => data.session?.user ?? null)
              .catch(() => null));

          if (recovered) {
            setUser(recovered);
            hasUserAndTenantRef.current = false;
            superAdminNoTenantRef.current = false;
            lastTenantIdRef.current = null;
            profileLoadedRef.current = false;
            setProfile(null);
            setTenantId(null);
            setCatalogueMode('simple');
            setEffectiveTenantDisplayName(null);
            setEffectiveTenantLogoUrl(null);
            tenantedSupabase.setTenantId(null);
            clearTenantCache();
            setNavigationItems(null);
            setNavigationError(null);
            navigationHydratedRef.current = false;
          } else {
            hasUserAndTenantRef.current = false;
            superAdminNoTenantRef.current = false;
            lastUserIdRef.current = null;
            lastTenantIdRef.current = null;
            profileLoadedRef.current = false;
            setTenantId(null);
            setCatalogueMode('simple');
            setEffectiveTenantDisplayName(null);
            setEffectiveTenantLogoUrl(null);
            tenantedSupabase.setTenantId(null);
            setProfile(null);
            setUser(null);
            setNavigationItems(null);
            setNavigationError(null);
            navigationHydratedRef.current = false;
            clearTenantCache();
          }
        }
      } finally {
        if (!background) setIsLoading(false);
      }
    },
    [fetchTenantId, fetchProfile, loadNavigation]
  );

  const refreshTenant = useCallback(() => revalidate(false), [revalidate]);

  const refreshCatalogueMode = useCallback(async () => {
    const tid = effectiveTenantIdRef.current;
    if (!tid || !isValidTenantId(tid)) {
      if (!hasSignedOutRef.current) {
        setCatalogueMode('simple');
        setEffectiveTenantDisplayName(null);
        setEffectiveTenantLogoUrl(null);
      }
      return;
    }
    try {
      const s = await fetchEffectiveTenantSurface(tid);
      if (!hasSignedOutRef.current) {
        setCatalogueMode(s.mode);
        setEffectiveTenantDisplayName(s.displayName);
        setEffectiveTenantLogoUrl(s.logoUrl);
      }
    } catch {
      /* keep existing surface */
    }
  }, []);

  const signOut = useCallback(async () => {
    hasSignedOutRef.current = true;
    const uid = lastUserIdRef.current;
    if (uid) {
      try {
        localStorage.removeItem(workspaceStorageKey(uid));
      } catch {
        /* ignore */
      }
    }
    lastRestoredWorkspaceUserRef.current = null;
    setWorkspaceTenantId(null);
    setWorkspaceTenantLabel(null);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      hasUserAndTenantRef.current = false;
      superAdminNoTenantRef.current = false;
      lastUserIdRef.current = null;
      lastTenantIdRef.current = null;
      profileLoadedRef.current = false;
      clearTenantCache();
      setUser(null);
      setProfile(null);
      setTenantId(null);
      setCatalogueMode('simple');
      setEffectiveTenantDisplayName(null);
      setEffectiveTenantLogoUrl(null);
      setError(null);
      setNavigationItems(null);
      setNavigationError(null);
      navigationHydratedRef.current = false;
      setIsLoading(false);
    }
  }, []);

  /**
   * BOOT SEQUENCE - Runs ONCE on initial mount
   *
   * This effect runs exactly once when the component mounts. Since this provider
   * is mounted at the root layout level via AppProviders and never unmounts,
   * this boot sequence runs exactly once per app session.
   *
   * What it does:
   * 1. Restores session from Supabase storage (getSession) - no network call if cached
   * 2. If session exists, loads profile + tenant_id + features in parallel
   * 3. Sets up onAuthStateChange listener for future session changes
   *
   * What it does NOT do:
   * - Re-run on route changes (revalidate is stable via useCallback)
   * - Re-fetch on navigation
   * - Depend on pathname/router
   *
   * The revalidate callback is stable (useCallback with stable deps), so including
   * it in the dependency array is safe - it won't cause re-runs.
   */
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      hasSignedOutRef.current = false;
      const cache = getTenantCache();
      if (cache && isValidTenantId(cache.tenant_id)) {
        hasUserAndTenantRef.current = true;
      } else {
        hasUserAndTenantRef.current = false;
      }

      // Rehydration: getSession with timeout (same as revalidate) so boot cannot hang.
      let session: Session | null = null;
      try {
        const { data, error: bootSessionErr } = await getSessionWithTimeout();
        if (bootSessionErr) {
          console.warn('Boot getSession error:', bootSessionErr);
        }
        session = data?.session ?? null;
      } catch (e) {
        console.error('Boot getSession failed:', e);
        session = null;
      }
      if (cancelled) {
        setIsLoading(false);
        return;
      }

      if (!session?.user) {
        hasUserAndTenantRef.current = false;
        superAdminNoTenantRef.current = false;
        lastUserIdRef.current = null;
        lastTenantIdRef.current = null;
        setUser(null);
        setTenantId(null);
        setError(null);
        setNavigationItems(null);
        setNavigationError(null);
        navigationHydratedRef.current = false;
        clearTenantCache();
        setIsLoading(false);
        return;
      }

      if (cache && cache.userId === session.user.id && isValidTenantId(cache.tenant_id)) {
        try {
          // Fast path: restore from cache. Load profile + nav once; do NOT revalidate.
          // Session refresh must not trigger full reloads; only login/logout reset data.
          setUser(session.user);
          setTenantId(cache.tenant_id);
          setError(null);
          hasUserAndTenantRef.current = true;
          superAdminNoTenantRef.current = false;
          lastUserIdRef.current = session.user.id;
          lastTenantIdRef.current = cache.tenant_id;

          const [userProfile, navResult, surface] = await Promise.all([
            fetchProfile(session.user.id, {
              authUser: session.user,
              tenantIdHint: cache.tenant_id,
            }),
            fetchNavigation(cache.tenant_id),
            fetchEffectiveTenantSurface(cache.tenant_id),
          ]);

          if (cancelled) {
            setIsLoading(false);
            return;
          }

          if (!hasSignedOutRef.current) {
            setCatalogueMode(surface.mode);
            setEffectiveTenantDisplayName(surface.displayName);
            setEffectiveTenantLogoUrl(surface.logoUrl);
          }

          if (userProfile) {
            setProfile(userProfile);
            profileLoadedRef.current = true;
          }

          lastNavigationFetchAt.current = Date.now();
          setNavigationItems(navResult.data);
          setNavigationError(navResult.error);
          // Only mark hydrated when we have a real outcome; otherwise a later revalidate must load.
          navigationHydratedRef.current = navResult.error != null || navResult.data != null;
          if (!navigationHydratedRef.current) {
            await loadNavigation(false, cache.tenant_id);
          }
          if (cancelled) {
            setIsLoading(false);
            return;
          }
          setIsLoading(false);
          return;
        } catch (bootCacheErr) {
          console.error('Boot tenant-cache path failed:', bootCacheErr);
          if (cancelled) {
            setIsLoading(false);
            return;
          }
          hasUserAndTenantRef.current = false;
          setIsLoading(true);
          setError(null);
          await revalidate(false);
          return;
        }
      }

      hasUserAndTenantRef.current = false;
      setIsLoading(true);
      setError(null);
      await revalidate(false);
    }

    boot();

    // Stable onAuthStateChange listener.
    //
    // Session refresh events (TOKEN_REFRESHED, INITIAL_SESSION) must NOT trigger full
    // reloads: when returning from another tab, Supabase refreshes the token and emits
    // TOKEN_REFRESHED. If we re-fetched profile/tenant/features here, every tab return
    // would cause slow validation and re-fetches. Profile/tenant/features are loaded
    // once and cached; only true login/logout should reset or reload them.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        // Same user, new tokens only. Do nothing. Prevents slow reload on tab return.
        return;
      }
      if (event === 'SIGNED_OUT' || !session) {
        hasSignedOutRef.current = true;
        const uid = lastUserIdRef.current;
        if (uid) {
          try {
            localStorage.removeItem(workspaceStorageKey(uid));
          } catch {
            /* ignore */
          }
        }
        lastRestoredWorkspaceUserRef.current = null;
        setWorkspaceTenantId(null);
        setWorkspaceTenantLabel(null);
        hasUserAndTenantRef.current = false;
        superAdminNoTenantRef.current = false;
        lastUserIdRef.current = null;
        lastTenantIdRef.current = null;
        profileLoadedRef.current = false;
        clearTenantCache();
        setUser(null);
        setProfile(null);
        setTenantId(null);
        setError(null);
        setNavigationItems(null);
        setNavigationError(null);
        navigationHydratedRef.current = false;
        setIsLoading(false);
        return;
      }
      if (event === 'SIGNED_IN' && session?.user) {
        hasSignedOutRef.current = false;
        // Match revalidate's stable check: skip only when this user is fully hydrated.
        // Do not skip on user-id match alone — lastUserIdRef can be set while profile/tenant load failed.
        if (
          session.user.id === lastUserIdRef.current &&
          profileLoadedRef.current &&
          (lastTenantIdRef.current || superAdminNoTenantRef.current)
        ) {
          // Duplicate SIGNED_IN while already hydrated: never leave isLoading true (e.g. prior setIsLoading(true) + noop).
          setIsLoading(false);
          return;
        }
        // Update `user` immediately so routes like `/` see an authenticated session. Never
        // await revalidate in this callback: GoTrue may await listeners before resolving
        // signInWithPassword, which left the login button stuck on "Signing in...".
        setIsLoading(true);
        setUser(session.user);
        queueMicrotask(() => {
          void revalidate(false, session);
        });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // revalidate is stable (useCallback with stable deps), so this effect
    // will only run once on mount, never on route changes
  }, [revalidate]);

  /**
   * Listen for navigation-updated events to refresh navigation items.
   *
   * IMPORTANT: This is NOT triggered by route changes. It only listens for
   * a custom 'navigation-updated' event (e.g. when items change in DB).
   *
   * Mount-only: no deps on pathname, router, user, or tenant_id. Uses
   * hasUserAndTenantRef so we never re-fetch on navigation or session refresh.
   */
  useEffect(() => {
    const onRefresh = () => {
      if (!lastUserIdRef.current) return;
      const tid = workspaceTenantIdRef.current ?? lastTenantIdRef.current;
      if (tid) void loadNavigation(true, tid);
    };
    window.addEventListener('navigation-updated', onRefresh);
    return () => window.removeEventListener('navigation-updated', onRefresh);
  }, [loadNavigation]);

  useEffect(() => {
    tenantedSupabase.setTenantId(effectiveTenantId);
  }, [effectiveTenantId]);

  /** Primitive deps only — avoids effect storms when `profile`/`user` object identity churns. */
  const jwtAppRoleHint = typeof user?.app_metadata?.role === 'string' ? user.app_metadata.role : '';
  const jwtUserRoleHint =
    typeof user?.user_metadata?.role === 'string' ? user.user_metadata.role : '';
  // Intentionally omit `user`/`profile` object deps — reference churn re-ran workspace effects every render.
  const platformSuperSession = useMemo(() => {
    if (!user) return false;
    return isSuperAdminSession(user, profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable primitive hints above
  }, [user?.id, jwtAppRoleHint, jwtUserRoleHint, profile?.user_id, profile?.role]);

  useEffect(() => {
    if (isLoading || !user) return;
    if (platformSuperSession) return;
    if (!profile) return;
    setWorkspaceTenantId(null);
    setWorkspaceTenantLabel(null);
    try {
      localStorage.removeItem(workspaceStorageKey(user.id));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- user/profile via platformSuperSession + ids
  }, [isLoading, user?.id, profile?.user_id, platformSuperSession]);

  useEffect(() => {
    if (isLoading || !user) return;
    if (!platformSuperSession) return;
    if (lastRestoredWorkspaceUserRef.current === user.id) return;
    lastRestoredWorkspaceUserRef.current = user.id;
    const parsed = parseWorkspaceStored(
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(workspaceStorageKey(user.id))
        : null
    );
    if (parsed) {
      setWorkspaceTenantId(parsed.id);
      setWorkspaceTenantLabel(parsed.label ?? null);
      void Promise.all([
        loadNavigation(false, parsed.id),
        fetchEffectiveTenantSurface(parsed.id).then((s) => {
          if (hasSignedOutRef.current) return;
          setCatalogueMode(s.mode);
          setEffectiveTenantDisplayName(s.displayName);
          setEffectiveTenantLogoUrl(s.logoUrl);
        }),
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- user/profile via platformSuperSession + ids
  }, [isLoading, user?.id, profile?.user_id, platformSuperSession, loadNavigation]);

  const prevAuthUserIdForWorkspaceRef = useRef<string | null>(null);
  useEffect(() => {
    const id = user?.id ?? null;
    if (!id) {
      prevAuthUserIdForWorkspaceRef.current = null;
      return;
    }
    const prev = prevAuthUserIdForWorkspaceRef.current;
    if (prev != null && prev !== id) {
      setWorkspaceTenantId(null);
      setWorkspaceTenantLabel(null);
      lastRestoredWorkspaceUserRef.current = null;
    }
    prevAuthUserIdForWorkspaceRef.current = id;
  }, [user?.id]);

  /**
   * Ready once session bootstrap finished. LayoutWrapper uses this for LayoutSkeleton;
   * sign-out and revalidate error paths clear user + tenant together so we do not need
   * a separate `!user => !tenant_id` guard (which could strand ready if state drifted).
   */
  const ready = !isLoading;

  const contextValue = useMemo(
    () => ({
      tenant_id,
      effectiveTenantId,
      workspaceTenantId,
      workspaceTenantLabel,
      enterWorkspaceTenant,
      exitWorkspaceTenant,
      user,
      profile,
      isLoading,
      ready,
      error,
      navigationItems,
      navigationError,
      catalogue_mode: catalogueMode,
      effectiveTenantDisplayName,
      effectiveTenantLogoUrl,
      refreshTenant,
      refreshCatalogueMode,
      signOut,
      impersonation: user ? getImpersonationFromSession(user) : null,
      endTenantImpersonation,
    }),
    [
      tenant_id,
      effectiveTenantId,
      workspaceTenantId,
      workspaceTenantLabel,
      enterWorkspaceTenant,
      exitWorkspaceTenant,
      user,
      profile,
      isLoading,
      ready,
      error,
      navigationItems,
      navigationError,
      catalogueMode,
      effectiveTenantDisplayName,
      effectiveTenantLogoUrl,
      refreshTenant,
      refreshCatalogueMode,
      signOut,
    ]
  );

  return <TenantContext.Provider value={contextValue}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
