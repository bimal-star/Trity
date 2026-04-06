'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import { NavigationItem } from '@/types/navigation';
import { organizeHierarchy } from '@/lib/navigation-hierarchy';
import { defaultNavigationItems } from '@/lib/navigation-default';
import { UserProfile } from '@/types/profile';
import {
  getEffectiveTenantIdFromSession,
  getImpersonationFromSession,
  startTenantImpersonation as apiStartImpersonation,
  endTenantImpersonation as apiEndImpersonation,
} from '@/lib/impersonation';

const CACHE_KEY = 'trity_tenant_cache';

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
 *    - Updates only when explicitly refreshed via refreshTenant()
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

function getTenantCache(): { userId: string; tenant_id: string } | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: string; tenant_id?: string };
    if (typeof parsed?.userId === 'string' && typeof parsed?.tenant_id === 'string')
      return parsed as { userId: string; tenant_id: string };
    return null;
  } catch {
    return null;
  }
}

function setTenantCache(userId: string, tenant_id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, tenant_id }));
  } catch {
    /* ignore */
  }
}

function clearTenantCache(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidTenantId(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export interface TenantImpersonationState {
  targetTenantId: string;
  readOnly: boolean;
}

export interface TenantContextType {
  /** Effective tenant for RLS and data (impersonation overrides home for super_admin). */
  tenant_id: string | null;
  /** Home tenant from profile/metadata (never the impersonation target). */
  homeTenantId: string | null;
  user: User | null;
  /** User profile from user_profiles table. Cached in memory, loaded once on authentication. */
  profile: UserProfile | null;
  isLoading: boolean;
  /** True once session + (if authenticated) profile + tenant_id + features are fully rehydrated.
   * Layout must NOT render sidebar/page until ready. Avoids flicker on tab return. */
  ready: boolean;
  error: string | null;
  /** Tenant features (navigation items). Cached in memory; refetch only on session/tenant change. */
  navigationItems: NavigationItem[] | null;
  navigationError: Error | null;
  /** Super-admin viewing another tenant via JWT app_metadata. */
  impersonation: TenantImpersonationState | null;
  refreshTenant: () => Promise<void>;
  signOut: () => Promise<void>;
  startTenantImpersonation: (tenantId: string, options?: { readOnly?: boolean }) => Promise<void>;
  endTenantImpersonation: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenant_id: null,
  homeTenantId: null,
  user: null,
  profile: null,
  isLoading: true,
  ready: false,
  error: null,
  navigationItems: null,
  navigationError: null,
  impersonation: null,
  refreshTenant: async () => {},
  signOut: async () => {},
  startTenantImpersonation: async () => {},
  endTenantImpersonation: async () => {},
});

function fetchNavigation(tenantId?: string | null): Promise<{
  data: NavigationItem[] | null;
  error: Error | null;
}> {
  let query = supabase
    .from('navigation')
    .select('*')
    .eq('is_enabled', true)
    .order('position', { ascending: true });

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  return query
    .then(({ data, error: fetchError }) => {
      if (fetchError) {
        const message = fetchError.message || '';
        const code = fetchError.code || '';
        const isStackDepth = code === '54001' || message.toLowerCase().includes('stack depth');

        if (isStackDepth) {
          console.warn('Navigation fetch failed due to stack depth. Using fallback navigation.');
          const organizedFallback = organizeHierarchy(defaultNavigationItems);
          return { data: organizedFallback, error: null };
        }

        return {
          data: null,
          error: new Error(
            `Supabase error: ${fetchError.message} (${fetchError.code || 'no code'})`
          ),
        };
      }
      const organized = organizeHierarchy((data || []) as NavigationItem[]);
      return { data: organized, error: null };
    })
    .catch((err) => ({
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch navigation'),
    }));
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant_id, setTenantId] = useState<string | null>(null);
  const [homeTenantId, setHomeTenantId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [impersonation, setImpersonation] = useState<TenantImpersonationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[] | null>(null);
  const [navigationError, setNavigationError] = useState<Error | null>(null);

  const lastNavigationFetchAt = useRef(0);
  const hasUserAndTenantRef = useRef(false);
  const hasSignedOutRef = useRef(false);
  /** In-memory cache: we only re-fetch tenant/profile/features when session or tenant_id changes. */
  const lastUserIdRef = useRef<string | null>(null);
  const lastTenantIdRef = useRef<string | null>(null);
  /** Effective tenant (includes impersonation); used to detect JWT tenant switches without user change. */
  const lastEffectiveTenantRef = useRef<string | null>(null);
  /** Track if we've already loaded profile to prevent re-fetching on navigation */
  const profileLoadedRef = useRef(false);
  const profileRef = useRef<UserProfile | null>(null);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  /**
   * Fetch user profile from user_profiles table.
   * This is called once when user is authenticated and cached in memory.
   */
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, user_id, tenant_id, full_name, email, role, created_at, updated_at')
        .eq('user_id', userId)
        .single();

      if (profileError || !data) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      return data as UserProfile;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  const loadNavigation = useCallback(async (background: boolean, tenantId?: string | null) => {
    if (!background) {
      setNavigationError(null);
    }
    const tid = tenantId ?? lastTenantIdRef.current ?? null;
    const { data, error: navErr } = await fetchNavigation(tid);
    lastNavigationFetchAt.current = Date.now();
    setNavigationItems(data);
    setNavigationError(navErr);
  }, []);

  /**
   * Revalidate session, profile, tenant, and features.
   * Only called when session actually changes (via onAuthStateChange) or on initial boot.
   * Never called on navigation or visibility changes to ensure instant navigation.
   *
   * Stable check: if same user and we've already loaded profile + tenant, skip all
   * fetches. Session refresh events must not trigger full reloads.
   */
  const revalidate = useCallback(
    async (background: boolean) => {
      console.log('🔄 TenantContext revalidate called, background:', background);
      if (!background) {
        setIsLoading(true);
        setError(null);
      }
      try {
        console.log('📡 Getting session from localStorage...');

        // Add timeout to prevent infinite hang
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Session check timeout - check Supabase configuration')),
            3000
          )
        );

        // Use getSession() instead of getUser() - it's instant (reads from localStorage)
        // getUser() makes a network call which can hang
        const sessionPromise = supabase.auth.getSession();

        const {
          data: { session },
          error: sessionError,
        } = await Promise.race([sessionPromise, timeoutPromise]);

        const currentUser = session?.user || null;
        console.log('📡 Session result:', { hasUser: !!currentUser, hasError: !!sessionError });
        if (sessionError || !currentUser) {
          if (!background) {
            hasUserAndTenantRef.current = false;
            lastUserIdRef.current = null;
            lastTenantIdRef.current = null;
            lastEffectiveTenantRef.current = null;
            profileLoadedRef.current = false;
            setUser(null);
            setProfile(null);
            setHomeTenantId(null);
            setImpersonation(null);
            setTenantId(null);
            setNavigationItems(null);
            setNavigationError(null);
            clearTenantCache();
          }
          return;
        }

        // Stable check: same user, same effective tenant (profile + JWT impersonation).
        const tentativeProfile =
          profileLoadedRef.current && currentUser.id === lastUserIdRef.current
            ? profileRef.current
            : null;
        const tentativeEffective = getEffectiveTenantIdFromSession(currentUser, tentativeProfile);
        if (
          currentUser.id === lastUserIdRef.current &&
          profileLoadedRef.current &&
          tentativeEffective &&
          lastEffectiveTenantRef.current === tentativeEffective
        ) {
          if (!background) setIsLoading(false);
          return;
        }

        console.log('📊 Fetching profile and tenant...');
        const prevUserId = lastUserIdRef.current;
        const userChanged = prevUserId !== currentUser.id;

        let userProfile: UserProfile | null = null;
        if (userChanged || !profileLoadedRef.current) {
          console.log('📝 Fetching user profile...');
          userProfile = await fetchProfile(currentUser.id);
          console.log('📝 Profile result:', { hasProfile: !!userProfile });
          if (userProfile) {
            setProfile(userProfile);
            profileLoadedRef.current = true;
          }
        } else {
          userProfile = profileRef.current;
        }

        const effectiveTid = getEffectiveTenantIdFromSession(
          currentUser,
          userProfile ?? profileRef.current
        );
        console.log('🏢 Effective tenant ID:', effectiveTid);

        if (!effectiveTid) {
          if (!background) {
            hasUserAndTenantRef.current = false;
            lastUserIdRef.current = null;
            lastTenantIdRef.current = null;
            lastEffectiveTenantRef.current = null;
            profileLoadedRef.current = false;

            const invalidTenantId =
              currentUser.user_metadata?.tenant_id ||
              currentUser.app_metadata?.tenant_id ||
              userProfile?.tenant_id;

            if (invalidTenantId && typeof invalidTenantId === 'string') {
              setError(
                `Invalid tenant ID format: "${invalidTenantId}". Expected a valid UUID. Please contact support to fix your account configuration.`
              );
            } else if (userProfile?.role === 'super_admin') {
              setError(
                'Your account has no home tenant. Set tenant_id on your profile or start tenant impersonation from Admin → Tenants.'
              );
            } else {
              setError('Your account is not associated with a tenant. Please contact support.');
            }

            setTenantId(null);
            setHomeTenantId(null);
            setImpersonation(null);
            setNavigationItems(null);
            setNavigationError(null);
            clearTenantCache();
          }
          return;
        }

        if (hasSignedOutRef.current) return;

        const homeFromProfile =
          userProfile?.tenant_id && isValidTenantId(userProfile.tenant_id)
            ? userProfile.tenant_id
            : null;
        const homeFromMeta = isValidTenantId(currentUser.user_metadata?.tenant_id)
          ? (currentUser.user_metadata?.tenant_id as string)
          : isValidTenantId(currentUser.app_metadata?.tenant_id)
            ? (currentUser.app_metadata?.tenant_id as string)
            : null;
        setHomeTenantId(homeFromProfile ?? homeFromMeta);
        setImpersonation(getImpersonationFromSession(currentUser));

        const prevEffective = lastEffectiveTenantRef.current;
        const prevTenantId = lastTenantIdRef.current;
        hasUserAndTenantRef.current = true;
        lastUserIdRef.current = currentUser.id;
        lastTenantIdRef.current = effectiveTid;
        lastEffectiveTenantRef.current = effectiveTid;
        setUser(currentUser);
        setTenantId(effectiveTid);
        tenantedSupabase.setTenantId(effectiveTid);
        setError(null);
        setTenantCache(currentUser.id, effectiveTid);
        console.log('✓ User authenticated with tenant:', effectiveTid);

        const sessionOrTenantChanged =
          userChanged || prevEffective !== effectiveTid || prevTenantId !== effectiveTid;
        if (sessionOrTenantChanged) {
          await loadNavigation(background, effectiveTid);
        }
      } catch (err: unknown) {
        if (!background) {
          hasUserAndTenantRef.current = false;
          lastUserIdRef.current = null;
          lastTenantIdRef.current = null;
          lastEffectiveTenantRef.current = null;
          profileLoadedRef.current = false;
          setError(err instanceof Error ? err.message : 'Failed to load tenant information');
          setTenantId(null);
          setHomeTenantId(null);
          setImpersonation(null);
          tenantedSupabase.setTenantId(null);
          setProfile(null);
          setNavigationItems(null);
          setNavigationError(null);
          clearTenantCache();
        }
      } finally {
        if (!background) setIsLoading(false);
      }
    },
    [fetchProfile, loadNavigation]
  );

  const refreshTenant = useCallback(() => revalidate(false), [revalidate]);

  const signOut = useCallback(async () => {
    hasSignedOutRef.current = true;
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      hasUserAndTenantRef.current = false;
      lastUserIdRef.current = null;
      lastTenantIdRef.current = null;
      lastEffectiveTenantRef.current = null;
      profileLoadedRef.current = false;
      clearTenantCache();
      setUser(null);
      setProfile(null);
      setHomeTenantId(null);
      setImpersonation(null);
      setTenantId(null);
      setError(null);
      setNavigationItems(null);
      setNavigationError(null);
      setIsLoading(false);
    }
  }, []);

  const startTenantImpersonation = useCallback(
    async (targetTenantId: string, options?: { readOnly?: boolean }) => {
      await apiStartImpersonation(targetTenantId, options);
      await revalidate(false);
    },
    [revalidate]
  );

  const endTenantImpersonation = useCallback(async () => {
    await apiEndImpersonation();
    await revalidate(false);
  }, [revalidate]);

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

      // Rehydration: single getSession() at boot. Supabase restores from storage;
      // we avoid double-fetch by not calling getUser again until we need to validate.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session?.user) {
        hasUserAndTenantRef.current = false;
        lastUserIdRef.current = null;
        lastTenantIdRef.current = null;
        lastEffectiveTenantRef.current = null;
        setUser(null);
        setTenantId(null);
        setHomeTenantId(null);
        setImpersonation(null);
        setError(null);
        setNavigationItems(null);
        setNavigationError(null);
        clearTenantCache();
        setIsLoading(false);
        return;
      }

      const userProfileBoot = await fetchProfile(session.user.id);
      if (cancelled) return;
      if (userProfileBoot) {
        setProfile(userProfileBoot);
        profileLoadedRef.current = true;
        profileRef.current = userProfileBoot;
      }
      const effectiveBoot = getEffectiveTenantIdFromSession(session.user, userProfileBoot);

      if (
        cache &&
        cache.userId === session.user.id &&
        isValidTenantId(cache.tenant_id) &&
        cache.tenant_id === effectiveBoot
      ) {
        setUser(session.user);
        setTenantId(effectiveBoot);
        setHomeTenantId(
          userProfileBoot?.tenant_id && isValidTenantId(userProfileBoot.tenant_id)
            ? userProfileBoot.tenant_id
            : isValidTenantId(session.user.user_metadata?.tenant_id)
              ? (session.user.user_metadata?.tenant_id as string)
              : isValidTenantId(session.user.app_metadata?.tenant_id)
                ? (session.user.app_metadata?.tenant_id as string)
                : null
        );
        setImpersonation(getImpersonationFromSession(session.user));
        setError(null);
        hasUserAndTenantRef.current = true;
        lastUserIdRef.current = session.user.id;
        lastTenantIdRef.current = effectiveBoot;
        lastEffectiveTenantRef.current = effectiveBoot;
        tenantedSupabase.setTenantId(effectiveBoot);

        const navResult = await fetchNavigation(effectiveBoot);
        if (cancelled) return;
        lastNavigationFetchAt.current = Date.now();
        setNavigationItems(navResult.data);
        setNavigationError(navResult.error);
        setIsLoading(false);
        return;
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
      if (event === 'TOKEN_REFRESHED') {
        if (!session?.user) return;
        const nextEffective = getEffectiveTenantIdFromSession(session.user, profileRef.current);
        if (
          nextEffective &&
          nextEffective !== lastEffectiveTenantRef.current &&
          session.user.id === lastUserIdRef.current
        ) {
          await revalidate(true);
        }
        return;
      }
      if (event === 'INITIAL_SESSION') {
        return;
      }
      if (event === 'SIGNED_OUT' || !session) {
        hasSignedOutRef.current = true;
        hasUserAndTenantRef.current = false;
        lastUserIdRef.current = null;
        lastTenantIdRef.current = null;
        lastEffectiveTenantRef.current = null;
        profileLoadedRef.current = false;
        clearTenantCache();
        setUser(null);
        setProfile(null);
        setHomeTenantId(null);
        setImpersonation(null);
        setTenantId(null);
        setError(null);
        setNavigationItems(null);
        setNavigationError(null);
        setIsLoading(false);
        return;
      }
      if (event === 'SIGNED_IN' && session?.user) {
        hasSignedOutRef.current = false;
        if (session.user.id === lastUserIdRef.current) {
          const nextEffective = getEffectiveTenantIdFromSession(session.user, profileRef.current);
          if (nextEffective && nextEffective !== lastEffectiveTenantRef.current) {
            await revalidate(false);
          }
          return;
        }
        await revalidate(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // revalidate is stable (useCallback with stable deps), so this effect
    // will only run once on mount, never on route changes
  }, [revalidate, fetchProfile]);

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
      if (hasUserAndTenantRef.current) loadNavigation(true, lastTenantIdRef.current);
    };
    window.addEventListener('navigation-updated', onRefresh);
    return () => window.removeEventListener('navigation-updated', onRefresh);
  }, [loadNavigation]);

  /**
   * Ready state: true when session, profile (if authenticated), tenant_id, and features
   * are fully loaded. This ensures we don't render pages until all data is available.
   */
  const ready =
    !isLoading &&
    ((!user && !tenant_id) ||
      (!!user &&
        (profile?.role === 'super_admin' && !tenant_id
          ? true
          : !!tenant_id && (navigationItems !== null || !!navigationError))));

  return (
    <TenantContext.Provider
      value={{
        tenant_id,
        homeTenantId,
        user,
        profile,
        isLoading,
        ready,
        error,
        navigationItems,
        navigationError,
        impersonation,
        refreshTenant,
        signOut,
        startTenantImpersonation,
        endTenantImpersonation,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
