'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { resolveEffectiveModuleAccess } from '@/lib/permissionResolver';
import {
  collectRoutableQuickSearchEntries,
  filterQuickSearchEntries,
  quickSearchBracketParent,
} from '@/lib/topNavQuickSearch';
import type { NavigationItem } from '@/types/navigation';
import type { AccessLevel } from '@/types/access';
import type { UserProfile } from '@/types/profile';
import { isSuperAdminSession } from '@/lib/permissions';

const MAX_VISIBLE = 40;

export function TopNavQuickSearch({
  navigationItems,
  effectiveTenantId,
  user,
  profile,
  platformAdminExtras,
}: {
  navigationItems: NavigationItem[] | null;
  effectiveTenantId: string | null;
  user: User | null;
  profile: UserProfile | null;
  platformAdminExtras: NavigationItem[] | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [moduleAccess, setModuleAccess] = useState<Record<string, AccessLevel> | null>(null);

  const includePlatformAdmin = Boolean(user && profile && isSuperAdminSession(user, profile));

  const allEntries = useMemo(
    () =>
      collectRoutableQuickSearchEntries(
        navigationItems ?? undefined,
        includePlatformAdmin ? (platformAdminExtras ?? undefined) : undefined,
        'Administration'
      ),
    [navigationItems, includePlatformAdmin, platformAdminExtras]
  );

  const moduleIds = useMemo(() => [...new Set(allEntries.map((e) => e.id))], [allEntries]);

  const platformIdSet = useMemo(
    () => new Set((platformAdminExtras ?? []).map((x) => String(x.id))),
    [platformAdminExtras]
  );

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || moduleIds.length === 0) {
      setModuleAccess({});
      return () => {
        cancelled = true;
      };
    }
    if (!effectiveTenantId) {
      const onlyPlatform = moduleIds.length > 0 && moduleIds.every((id) => platformIdSet.has(id));
      if (includePlatformAdmin && onlyPlatform) {
        setModuleAccess(
          Object.fromEntries(moduleIds.map((id) => [id, 'allowed' as AccessLevel])) as Record<
            string,
            AccessLevel
          >
        );
      } else {
        setModuleAccess({});
      }
      return () => {
        cancelled = true;
      };
    }
    setModuleAccess(null);
    void resolveEffectiveModuleAccess(
      supabase,
      effectiveTenantId,
      user.id,
      moduleIds,
      profile?.role
    )
      .then((map) => {
        if (!cancelled) setModuleAccess(map);
      })
      .catch(() => {
        if (!cancelled) setModuleAccess({});
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, effectiveTenantId, profile?.role, moduleIds, includePlatformAdmin, platformIdSet]);

  const allowedEntries = useMemo(() => {
    if (!moduleAccess) return [];
    return allEntries.filter((e) => (moduleAccess[e.id] ?? 'allowed') !== 'blocked');
  }, [allEntries, moduleAccess]);

  const visible = useMemo(() => {
    const list = filterQuickSearchEntries(allowedEntries, query, MAX_VISIBLE);
    return list;
  }, [allowedEntries, query]);

  const showParentInBrackets = useMemo(() => {
    const parents = visible
      .map((e) => quickSearchBracketParent(e))
      .filter((p): p is string => Boolean(p));
    return new Set(parents).size > 1;
  }, [visible]);

  useEffect(() => {
    setHighlight(0);
  }, [query, visible.length]);

  const go = useCallback(
    (path: string) => {
      setOpen(false);
      setQuery('');
      router.push(path);
    },
    [router]
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || visible.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((i) => (i + 1) % visible.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => (i - 1 + visible.length) % visible.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = visible[highlight];
      if (pick) go(pick.path);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const accessLoading =
    moduleAccess === null && moduleIds.length > 0 && Boolean(user?.id && effectiveTenantId);
  const showPanel = open && (query.trim().length > 0 || accessLoading);

  return (
    <div ref={rootRef} className="relative w-56 min-w-[10rem] max-w-md lg:w-72">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-gray-500"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        autoComplete="off"
        spellCheck={false}
        placeholder="Jump to page…"
        aria-label="Quick navigation search"
        aria-expanded={showPanel}
        aria-controls="topnav-quicksearch-listbox"
        aria-autocomplete="list"
        role="combobox"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full rounded-xl border border-gray-200/90 bg-white py-2 pl-9 pr-3 text-[13px] font-medium leading-snug tracking-[var(--trity-tracking)] text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-gray-500 dark:focus:ring-white/10"
      />

      {showPanel ? (
        <div
          id="topnav-quicksearch-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-full z-[80] mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-gray-200/90 bg-white/95 py-0.5 shadow-lg ring-1 ring-black/[0.04] backdrop-blur-sm dark:border-gray-700/90 dark:bg-gray-950/95 dark:ring-white/[0.06]"
        >
          {accessLoading ? (
            <div className="flex items-center gap-2 px-2.5 py-2 text-xs tracking-[var(--trity-tracking)] text-gray-500 dark:text-gray-400">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              Checking access…
            </div>
          ) : query.trim().length === 0 ? (
            <div className="px-2.5 py-2 text-xs tracking-[var(--trity-tracking)] text-gray-500 dark:text-gray-400">
              Type to filter pages
            </div>
          ) : visible.length === 0 ? (
            <div className="px-2.5 py-2 text-xs tracking-[var(--trity-tracking)] text-gray-500 dark:text-gray-400">
              No matching pages
            </div>
          ) : (
            visible.map((entry, idx) => {
              const parent = quickSearchBracketParent(entry);
              const suffix =
                showParentInBrackets && parent ? (
                  <span className="shrink-0 font-normal opacity-70"> [{parent}]</span>
                ) : null;
              const rowLabel =
                showParentInBrackets && parent ? `${entry.label} [${parent}]` : entry.label;
              return (
                <button
                  key={`${entry.id}-${entry.path}`}
                  type="button"
                  role="option"
                  aria-selected={idx === highlight}
                  aria-label={`${rowLabel}, ${entry.path}`}
                  title={entry.path}
                  className={[
                    'flex w-full min-w-0 items-center px-2.5 py-1.5 text-left text-[13px] font-medium leading-snug tracking-[var(--trity-tracking)] transition-colors',
                    idx === highlight
                      ? 'bg-gray-100 text-gray-950 dark:bg-gray-800/90 dark:text-gray-50'
                      : 'text-gray-800 hover:bg-gray-50/90 dark:text-gray-200 dark:hover:bg-gray-800/55',
                  ].join(' ')}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(entry.path);
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                >
                  <span className="flex min-w-0 items-baseline gap-1">
                    <span className="min-w-0 truncate">{entry.label}</span>
                    {suffix}
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
