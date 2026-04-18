'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AccessLevelSelect } from '@/components/access/AccessLevelSelect';
import { RoleBadge } from '@/components/access/RoleBadge';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { useTenantUsers } from '@/hooks/useTenantUsers';
import { useTenantInvites } from '@/hooks/useTenantInvites';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabaseClient';
import { defaultNavigationItems } from '@/lib/navigation-default';
import { getRoleDefaultAccess, mapAccessRecord } from '@/lib/accessControl';
import {
  actionsToAccessLevel,
  NAV_RESOURCE_PREFIX,
  resolveEffectiveModuleAccess,
} from '@/lib/permissionResolver';
import type { NavigationItem } from '@/types/navigation';
import type { AccessLevel } from '@/types/access';
import type { UserProfile } from '@/types/profile';
import type { TenantUser } from '@/hooks/useTenantUsers';
import { Users, Loader2, Plus, ChevronDown, Search, User } from 'lucide-react';
import {
  comparePositions,
  flattenNavigationTreeForAccess,
  organizeHierarchy,
} from '@/lib/navigation-hierarchy';
import { pillarAccent, premiumPrimaryButton, premiumTertiaryButton, premiumTypography } from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';

const an = pillarAccent('analytics');

interface ModuleOption {
  id: string;
  label: string;
  position?: string | number;
}

function navigationTreeForAccess(
  navigationItems: NavigationItem[] | null,
  fallbackFlat: NavigationItem[]
): NavigationItem[] {
  if (navigationItems && navigationItems.length > 0) {
    return navigationItems;
  }
  return organizeHierarchy(fallbackFlat) as NavigationItem[];
}

function modulePositionDepth(position: string | number | undefined): number {
  const s = String(position ?? '').trim();
  if (!s) return 0;
  return Math.max(0, s.split('.').length - 1);
}

function AccessSourceBadge({ variant }: { variant: 'override' | 'policy' | 'roleDefault' }) {
  const styles = {
    override:
      'bg-violet-100 text-violet-800 dark:bg-violet-900/35 dark:text-violet-200',
    policy: 'bg-sky-100 text-sky-800 dark:bg-sky-900/35 dark:text-sky-200',
    roleDefault:
      'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300',
  };
  const labels = {
    override: 'Override',
    policy: 'Policy',
    roleDefault: 'Role default',
  };
  return (
    <span
      className={`inline-flex rounded-full font-medium text-[11px] px-2 py-0.5 ${styles[variant]}`}
    >
      {labels[variant]}
    </span>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUserId = searchParams.get('userId') ?? '';
  const { user, effectiveTenantId: tenant_id, navigationItems, ready, isLoading: tenantBootLoading } =
    useTenant();
  const { profile: actorProfile } = useProfile(user?.id);
  const { users, isLoading: usersLoading, error } = useTenantUsers(tenant_id);
  const { createInvite, isLoading: invitesLoading } = useTenantInvites(tenant_id, user?.id);
  const { can } = usePermissions();
  const { toast } = useToast();

  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [addUserEmail, setAddUserEmail] = useState('');
  const [query, setQuery] = useState('');
  const [moduleQuery, setModuleQuery] = useState('');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [overrides, setOverrides] = useState<Record<string, AccessLevel>>({});
  const [effectiveByModule, setEffectiveByModule] = useState<Record<string, AccessLevel>>({});
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const modules = useMemo(() => {
    const tree = navigationTreeForAccess(
      navigationItems as NavigationItem[] | null,
      defaultNavigationItems as NavigationItem[]
    );
    const flattened = flattenNavigationTreeForAccess(tree as Parameters<typeof flattenNavigationTreeForAccess>[0]);
    return flattened.sort((a, b) => comparePositions(a.position, b.position));
  }, [navigationItems]);

  const filteredModules = useMemo(() => {
    const q = moduleQuery.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((m) => m.label.toLowerCase().includes(q));
  }, [modules, moduleQuery]);

  const roleDefault = getRoleDefaultAccess(profile?.role ?? null);

  const canManageUsers = can('manage_users');

  useEffect(() => {
    if (!ready || tenantBootLoading || !user || !tenant_id) return;
    if (actorProfile != null && !canManageUsers) {
      router.replace('/');
    }
  }, [
    ready,
    tenantBootLoading,
    user?.id,
    tenant_id,
    actorProfile?.user_id,
    actorProfile?.role,
    canManageUsers,
    router,
  ]);

  useEffect(() => {
    setModuleQuery('');
  }, [selectedUserId]);

  useEffect(() => {
    if (!tenant_id || !selectedUserId) {
      setProfile(null);
      setOverrides({});
      setEffectiveByModule({});
      setIsAccessLoading(false);
      return;
    }

    const loadUserAccess = async () => {
      try {
        setIsAccessLoading(true);

        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, user_id, tenant_id, full_name, email, role, created_at, updated_at')
          .eq('tenant_id', tenant_id)
          .eq('user_id', selectedUserId)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData as UserProfile);

        const tree = navigationTreeForAccess(
          navigationItems as NavigationItem[] | null,
          defaultNavigationItems as NavigationItem[]
        );
        const flat = flattenNavigationTreeForAccess(
          tree as Parameters<typeof flattenNavigationTreeForAccess>[0]
        ).sort((a, b) => comparePositions(a.position, b.position));
        const moduleIds = flat.map((m) => m.id);

        const [effectiveMap, grantRes, legacyRes] = await Promise.all([
          resolveEffectiveModuleAccess(
            supabase,
            tenant_id,
            selectedUserId,
            moduleIds,
            profileData.role
          ),
          (supabase as any)
            .from('user_resource_grants')
            .select('allowed_actions, effect, permission_resources!inner(resource_key)')
            .eq('tenant_id', tenant_id)
            .eq('user_id', selectedUserId),
          (supabase as any)
            .from('user_module_access')
            .select('module_id, has_access, is_readonly')
            .eq('tenant_id', tenant_id)
            .eq('user_id', selectedUserId),
        ]);

        if (grantRes.error) throw grantRes.error;
        if (legacyRes.error) throw legacyRes.error;

        const accessMap: Record<string, AccessLevel> = {};
        (grantRes.data ?? []).forEach((row: any) => {
          const rk = row.permission_resources?.resource_key as string | undefined;
          if (!rk || !rk.startsWith(NAV_RESOURCE_PREFIX)) return;
          const mid = rk.slice(NAV_RESOURCE_PREFIX.length);
          if (row.effect === 'deny') {
            accessMap[mid] = 'blocked';
            return;
          }
          if (row.effect === 'allow') {
            const rawActs = row.allowed_actions as string[] | null | undefined;
            if (!rawActs?.length) return;
            accessMap[mid] = actionsToAccessLevel(rawActs);
            return;
          }
          const legacyActs = row.allowed_actions ?? [];
          if (legacyActs.length) accessMap[mid] = actionsToAccessLevel(legacyActs);
        });
        (legacyRes.data ?? []).forEach((record: any) => {
          if (accessMap[record.module_id] === undefined) {
            accessMap[record.module_id] = mapAccessRecord(record);
          }
        });

        setOverrides(accessMap);
        setEffectiveByModule(effectiveMap);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load user access');
      } finally {
        setIsAccessLoading(false);
      }
    };

    loadUserAccess();
  }, [tenant_id, selectedUserId, navigationItems]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      return (
        (user.full_name || '').toLowerCase().includes(q) ||
        (user.email || '').toLowerCase().includes(q) ||
        (user.displayEmail || '').toLowerCase().includes(q)
      );
    });
  }, [query, users]);

  const handleSelectUser = (userId: string) => {
    router.push(`/users?userId=${userId}`);
  };

  const handleClearSelection = () => {
    router.push('/users');
  };

  const handleInviteSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      if (!addUserEmail.trim()) {
        toast.error('Email is required');
        return;
      }

      await createInvite(addUserEmail, 'member');

      toast.success('Invite sent.');
      setAddUserEmail('');
      setShowAddUserForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite');
    }
  };

  const isBootstrapping = !ready || tenantBootLoading;
  const isAdminReady = !isBootstrapping && actorProfile != null && canManageUsers;
  const isRedirecting = !isBootstrapping && actorProfile != null && !canManageUsers;

  const handleAccessChange = async (moduleId: string, nextAccess: AccessLevel) => {
    if (!selectedUserId) return;

    try {
      setIsSaving(moduleId);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error('Session expired. Please sign in again.');
      }

      const response = await fetch('/api/access/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          user_id: selectedUserId,
          module_id: moduleId,
          access: nextAccess,
          ...(tenant_id ? { target_tenant_id: tenant_id } : {}),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to update access');
      }

      setOverrides((prev) => {
        if (nextAccess === roleDefault) {
          const { [moduleId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [moduleId]: nextAccess };
      });

      if (tenant_id && selectedUserId && profile) {
        const refreshed = await resolveEffectiveModuleAccess(
          supabase,
          tenant_id,
          selectedUserId,
          modules.map((m) => m.id),
          profile.role
        );
        setEffectiveByModule(refreshed);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update access');
    } finally {
      setIsSaving(null);
    }
  };

  if (!isAdminReady) {
    return (
      <ProtectedRoute>
        <PageContainer
          module="analytics"
          rootClassName="h-dvh min-h-0 overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900 pt-4 pb-2 px-6"
          innerClassName="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <div className="flex flex-col flex-1 min-h-0 items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400 mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isRedirecting ? 'Redirecting...' : 'Loading...'}
            </p>
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageContainer
        module="analytics"
        rootClassName="h-dvh min-h-0 max-h-dvh overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900 pt-4 pb-2 px-6"
        innerClassName="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PremiumStickyHeader
          module="analytics"
          icon={Users}
          title="Users"
          subtitle="Manage team members and access overrides"
          className="mb-3 flex-shrink-0"
          right={
            <button
              type="button"
              onClick={() => setShowAddUserForm(!showAddUserForm)}
              className={premiumPrimaryButton('analytics', 'md', 'standard')}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add User
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showAddUserForm ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
          }
        />

        {showAddUserForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/90 dark:border-gray-700 shadow-sm p-4 mb-3 flex-shrink-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Add New User</h2>
            <form onSubmit={handleInviteSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="Email address *"
                  value={addUserEmail}
                  onChange={(e) => setAddUserEmail(e.target.value)}
                  disabled={invitesLoading}
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                User will receive an invite email with a link to join
              </p>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={invitesLoading}
                  className={premiumPrimaryButton('analytics', 'md', 'wide')}
                >
                  {invitesLoading ? 'Sending...' : 'Send Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserForm(false);
                    setAddUserEmail('');
                  }}
                  className={premiumTertiaryButton('md', 'standard')}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0 gap-3 pb-2 overflow-hidden">
          <div className="rounded-2xl bg-gray-50/40 dark:bg-gray-900/25 py-3 md:py-4 px-0 ring-1 ring-black/[0.04] dark:ring-white/[0.06] flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,32rem),1fr] gap-4 lg:gap-6 xl:items-stretch xl:grid-rows-1 max-xl:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] flex-1 min-h-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/90 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col min-h-0 h-full max-h-full ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
              <div className="p-4 border-b border-gray-200/80 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-900/20 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {usersLoading ? (
                <div className="flex flex-1 min-h-0 items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : error ? (
                <div className="p-4 text-xs text-red-600 dark:text-red-300 flex-1 min-h-0 overflow-y-auto">{error}</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400 flex-1 min-h-0 flex items-center justify-center">No users found</div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto min-h-0 flex-1">
                  {filteredUsers.map((userItem: TenantUser) => {
                    const isSelected = selectedUserId === userItem.user_id;
                    return (
                      <button
                        key={userItem.user_id}
                        type="button"
                        onClick={() => handleSelectUser(userItem.user_id)}
                        className={`w-full text-left px-4 py-3 text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {(userItem.full_name || '').trim() || userItem.email || 'User'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {userItem.displayEmail ?? userItem.email ?? 'No email on file'}
                            </div>
                          </div>
                          <RoleBadge role={userItem.role} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/90 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col min-h-0 h-full max-h-full ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
              <div className="p-4 border-b border-gray-200/80 dark:border-gray-700/80 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-blue-600/[0.06] to-transparent dark:from-blue-500/[0.08] dark:to-transparent">
                <div className="flex items-center gap-2">
                  <div className="p-2">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Access Overrides</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Overrides apply per user and fall back to role defaults
                    </p>
                  </div>
                </div>
                {selectedUserId ? (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              <div className="flex flex-col flex-1 min-h-0">
              {!selectedUserId ? (
                <div className="flex flex-1 flex-col items-center justify-center min-h-[12rem] py-16 text-center rounded-b-xl bg-gray-50/30 dark:bg-gray-900/20">
                  <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Select a user to manage access.</p>
                </div>
              ) : isAccessLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center min-h-[12rem] py-12 text-center bg-gray-50/30 dark:bg-gray-900/20">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading access...</p>
                </div>
              ) : profile ? (
                <div className="p-3 sm:p-4 space-y-3 flex flex-col min-h-0 flex-1 overflow-hidden bg-gray-50/30 dark:bg-gray-900/15">
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 shadow-sm flex-shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {profile.full_name || profile.email || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {profile.email || 'No email on file'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Role</span>
                        <RoleBadge role={profile.role} size="md" />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Role default: <span className="font-medium text-gray-700 dark:text-gray-200">{roleDefault}</span>
                    </p>
                  </div>

                  <div className="relative flex-shrink-0">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="search"
                      placeholder="Filter modules..."
                      value={moduleQuery}
                      onChange={(e) => setModuleQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Filter modules"
                    />
                  </div>

                  <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200/90 dark:border-gray-700 shadow-inner bg-white dark:bg-gray-800/50">
                    <table className="w-full min-w-[24rem]">
                      <thead className="sticky top-0 z-10">
                        <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 shadow-sm">
                          <th className="px-2.5 py-1.5 font-medium min-w-[12rem] bg-gray-50 dark:bg-gray-950">
                            Module
                          </th>
                          <th className="px-2.5 py-1.5 font-medium w-36 whitespace-nowrap bg-gray-50 dark:bg-gray-950">
                            Access
                          </th>
                          <th className="px-2.5 py-1.5 font-medium min-w-[7.5rem] bg-gray-50 dark:bg-gray-950">
                            Source
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredModules.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-2.5 py-5 text-center text-xs text-gray-500 dark:text-gray-400"
                            >
                              No modules match your filter.
                            </td>
                          </tr>
                        ) : (
                          filteredModules.map((module) => {
                            const depth = modulePositionDepth(module.position);
                            const pad = 12 + Math.min(depth, 8) * 12;
                            const hasExplicit = overrides[module.id] !== undefined;
                            const effective = effectiveByModule[module.id] ?? roleDefault;
                            const sourceVariant = hasExplicit
                              ? 'override'
                              : effective !== roleDefault
                                ? 'policy'
                                : 'roleDefault';
                            return (
                              <tr
                                key={module.id}
                                className="border-b border-gray-200 dark:border-gray-700 last:border-0 bg-white dark:bg-gray-800"
                              >
                                <td
                                  className="px-2.5 py-1 text-xs text-gray-900 dark:text-white font-medium align-middle leading-tight"
                                  style={{ paddingLeft: pad }}
                                >
                                  {module.label}
                                </td>
                                <td className="px-2.5 py-1 align-middle w-36">
                                  <AccessLevelSelect
                                    value={effective}
                                    onChange={(value) => handleAccessChange(module.id, value)}
                                    disabled={isSaving === module.id}
                                  />
                                </td>
                                <td className="px-2.5 py-1 align-middle w-[7.5rem]">
                                  <AccessSourceBadge variant={sourceVariant} />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center min-h-[12rem] py-12 text-center bg-gray-50/30 dark:bg-gray-900/20">
                  <p className="text-sm text-gray-500 dark:text-gray-400">User not found.</p>
                </div>
              )}
              </div>
            </div>
          </div>
          </div>
        </div>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}

