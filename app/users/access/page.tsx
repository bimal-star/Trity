'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { useTenant } from '@/contexts/TenantContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useUserGroups } from '@/hooks/useUserGroups';
import { supabase } from '@/lib/supabaseClient';
import { comparePositions } from '@/lib/navigation-hierarchy';
import {
  isRoutableNavRow,
  PILLAR_ROOT_LABEL_ORDER,
  routableIdsOutsideThreePillars,
  routableRowsInPillarSubtreeByLabel,
  premiumModuleForPillarLabel,
  type NavPillarRow,
  type PillarRootLabel,
} from '@/lib/navigationPillars';
import { pillarAccent, premiumPrimaryButton, premiumSurfaces } from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import { Users, Save, AlertCircle, Loader2, Search } from 'lucide-react';

interface UserAccess {
  [key: string]: boolean;
}

function accessTriState(ids: string[], userAccess: UserAccess): 'all' | 'some' | 'none' {
  if (ids.length === 0) return 'none';
  const allowed = ids.filter((id) => userAccess[id] !== false).length;
  if (allowed === 0) return 'none';
  if (allowed === ids.length) return 'all';
  return 'some';
}

function PillarAccessMasterCheckbox({
  triState,
  disabled,
  onToggle,
}: {
  triState: 'all' | 'some' | 'none';
  disabled?: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = triState === 'some';
  }, [triState]);

  return (
    <input
      ref={ref}
      type="checkbox"
      disabled={disabled}
      checked={triState === 'all'}
      onChange={onToggle}
      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500 dark:border-gray-600"
      aria-label="Toggle all modules in this pillar"
    />
  );
}

export default function UserAccessPage() {
  const router = useRouter();
  const { effectiveTenantId: tenant_id } = useTenant();
  const { can } = usePermissions();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [accessScope, setAccessScope] = useState<'user' | 'group'>('user');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const { groups, isLoading: groupsLoading } = useUserGroups(tenant_id ?? undefined);
  const [userAccess, setUserAccess] = useState<UserAccess>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [navRows, setNavRows] = useState<NavPillarRow[]>([]);
  const [navLoading, setNavLoading] = useState(false);

  useEffect(() => {
    if (!can('manage_users')) {
      router.replace('/');
    }
  }, [can, router]);

  useEffect(() => {
    setUserAccess({});
    if (accessScope === 'user') {
      setSelectedGroupId('');
    } else {
      setSelectedUserId('');
    }
  }, [accessScope]);

  useEffect(() => {
    if (!tenant_id) return;

    const loadUsers = async () => {
      try {
        setIsLoading(true);
        const { data, error: err } = await supabase
          .from('user_profiles')
          .select('user_id, email, full_name')
          .eq('tenant_id', tenant_id)
          .order('full_name');

        if (err) throw err;
        setUsers(data || []);
      } catch {
        toast.error('Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [tenant_id, toast]);

  useEffect(() => {
    if (!tenant_id) return;

    const loadNav = async () => {
      setNavLoading(true);
      try {
        const { data, error: err } = await supabase
          .from('navigation')
          .select('id,label,position,path,is_enabled,is_deleted')
          .eq('tenant_id', tenant_id)
          .order('position', { ascending: true });

        if (err) throw err;
        setNavRows((data ?? []) as NavPillarRow[]);
      } catch {
        toast.error('Failed to load navigation');
        setNavRows([]);
      } finally {
        setNavLoading(false);
      }
    };

    void loadNav();
  }, [tenant_id, toast]);

  useEffect(() => {
    if (!tenant_id) return;

    const loadAccess = async () => {
      try {
        if (accessScope === 'user') {
          if (!selectedUserId) return;
          const { data, error: err } = await (supabase as any)
            .from('user_module_access')
            .select('module_id, has_access')
            .eq('tenant_id', tenant_id)
            .eq('user_id', selectedUserId);

          if (err) throw err;

          const accessMap: UserAccess = {};
          (data || []).forEach((record: { module_id: string; has_access: boolean }) => {
            accessMap[record.module_id] = record.has_access;
          });
          setUserAccess(accessMap);
        } else {
          if (!selectedGroupId) return;
          const { data, error: err } = await (supabase as any)
            .from('group_module_access')
            .select('module_id, has_access')
            .eq('group_id', selectedGroupId);

          if (err) throw err;

          const accessMap: UserAccess = {};
          (data || []).forEach((record: { module_id: string; has_access: boolean }) => {
            accessMap[record.module_id] = record.has_access;
          });
          setUserAccess(accessMap);
        }
      } catch {
        toast.error('Failed to load access permissions');
      }
    };

    void loadAccess();
  }, [accessScope, selectedUserId, selectedGroupId, tenant_id, toast]);

  const routableModules = navRows.filter(isRoutableNavRow);
  const allModuleIds = routableModules.map((r) => r.id);

  const handleAccessToggle = (moduleId: string) => {
    setUserAccess((prev) => ({
      ...prev,
      [moduleId]: !(prev[moduleId] ?? true),
    }));
  };

  const setPillarAccess = (ids: string[], allow: boolean) => {
    setUserAccess((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (allow) {
          delete next[id];
        } else {
          next[id] = false;
        }
      }
      return next;
    });
  };

  const togglePillarAccess = (pillarLabel: PillarRootLabel) => {
    const ids = routableRowsInPillarSubtreeByLabel(navRows, pillarLabel).map((r) => r.id);
    const tri = accessTriState(ids, userAccess);
    const allow = tri !== 'all';
    setPillarAccess(ids, allow);
  };

  const toggleAdministrationAccess = () => {
    const ids = routableIdsOutsideThreePillars(navRows);
    const tri = accessTriState(ids, userAccess);
    const allow = tri !== 'all';
    setPillarAccess(ids, allow);
  };

  const handleSaveAccess = async () => {
    if (!tenant_id) return;
    if (accessScope === 'user' && !selectedUserId) return;
    if (accessScope === 'group' && !selectedGroupId) return;
    if (allModuleIds.length === 0) {
      toast.error('No navigation modules to save. Check Navigation Manager for this tenant.');
      return;
    }

    try {
      setIsSaving(true);

      const accessData = allModuleIds.map((moduleId) =>
        accessScope === 'user'
          ? {
              tenant_id,
              user_id: selectedUserId,
              module_id: moduleId,
              has_access: userAccess[moduleId] !== false,
            }
          : {
              group_id: selectedGroupId,
              module_id: moduleId,
              has_access: userAccess[moduleId] !== false,
            }
      );

      const { error: upsertErr } = await (supabase as any)
        .from(accessScope === 'user' ? 'user_module_access' : 'group_module_access')
        .upsert(
          accessData,
          accessScope === 'user'
            ? { onConflict: 'tenant_id,user_id,module_id' }
            : { onConflict: 'group_id,module_id' }
        );

      if (upsertErr) throw upsertErr;

      toast.success('Access permissions saved successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const adminIds = routableIdsOutsideThreePillars(navRows);
  const adminItems = routableModules
    .filter((r) => adminIds.includes(r.id))
    .sort((a, b) => comparePositions(a.position, b.position));

  const hasSelection = accessScope === 'user' ? Boolean(selectedUserId) : Boolean(selectedGroupId);

  return (
    <PageContainer module={null}>
      <PremiumStickyHeader
        icon={Users}
        title="Access Levels"
        subtitle="Manage module-level access permissions for users and groups"
      />

      <div className={`mb-6 ${premiumSurfaces.divider}`} />

      <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAccessScope('user')}
                  className={`flex-1 rounded px-3 py-2 text-xs font-medium ${
                    accessScope === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  Users
                </button>
                <button
                  type="button"
                  onClick={() => setAccessScope('group')}
                  className={`flex-1 rounded px-3 py-2 text-xs font-medium ${
                    accessScope === 'group'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  Groups
                </button>
              </div>
            </div>

            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={accessScope === 'user' ? 'Search users...' : 'Search groups...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white py-2 pl-9 pr-4 text-xs text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {accessScope === 'user' ? (
                isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">No users found</div>
                ) : (
                  users
                    .filter(
                      (u) =>
                        (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((u) => (
                      <button
                        key={u.user_id}
                        type="button"
                        onClick={() => setSelectedUserId(u.user_id)}
                        className={`w-full border-b border-gray-200 px-4 py-3 text-left text-xs transition-colors last:border-0 dark:border-gray-700 ${
                          selectedUserId === u.user_id
                            ? 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {(u.full_name || '').trim() || u.email}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                      </button>
                    ))
                )
              ) : groupsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : groups.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">No groups found</div>
              ) : (
                groups
                  .filter((g) => (g.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGroupId(g.id)}
                      className={`w-full border-b border-gray-200 px-4 py-3 text-left text-xs transition-colors last:border-0 dark:border-gray-700 ${
                        selectedGroupId === g.id
                          ? 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{g.name}</div>
                      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {g.description || 'No description'}
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {hasSelection ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <AlertCircle className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-200">Module Access Control</p>
                  <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                    {accessScope === 'user'
                      ? 'Configure access for an individual user. User-level settings can override group access.'
                      : 'Configure access for a group. All group members inherit these permissions.'}
                  </p>
                </div>
              </div>

              {navLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : allModuleIds.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  No routable navigation items for this tenant. Open Navigation Manager to configure the menu.
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    {PILLAR_ROOT_LABEL_ORDER.map((pillarLabel) => {
                      const mod = pillarAccent(premiumModuleForPillarLabel(pillarLabel));
                      const items = routableRowsInPillarSubtreeByLabel(navRows, pillarLabel);
                      const ids = items.map((r) => r.id);
                      const tri = accessTriState(ids, userAccess);

                      return (
                        <div
                          key={pillarLabel}
                          className={`overflow-hidden rounded-xl border bg-white/90 dark:bg-gray-900/50 ${mod.outlineAccent}`}
                        >
                          <div
                            className={`flex items-center gap-2 border-b border-gray-200/80 px-3 py-2.5 dark:border-gray-600/60 ${mod.iconTile} border-0 rounded-none`}
                          >
                            <PillarAccessMasterCheckbox
                              triState={tri}
                              disabled={items.length === 0}
                              onToggle={() => togglePillarAccess(pillarLabel)}
                            />
                            <h3 className={`text-sm font-semibold ${mod.titleText}`}>{pillarLabel}</h3>
                          </div>
                          <ul className="max-h-[min(22rem,45vh)] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700">
                            {items.map((item) => (
                              <li key={item.id}>
                                <label className="flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                  <input
                                    type="checkbox"
                                    checked={userAccess[item.id] !== false}
                                    onChange={() => handleAccessToggle(item.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500 dark:border-gray-600"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                                  </div>
                                  {userAccess[item.id] !== false ? (
                                    <span className="flex-shrink-0 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-200">
                                      Allowed
                                    </span>
                                  ) : null}
                                </label>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>

                  {adminItems.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/80">
                        <PillarAccessMasterCheckbox
                          triState={accessTriState(adminIds, userAccess)}
                          onToggle={toggleAdministrationAccess}
                        />
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Administration</h3>
                      </div>
                      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {adminItems.map((item) => (
                          <li key={item.id}>
                            <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                              <input
                                type="checkbox"
                                checked={userAccess[item.id] !== false}
                                onChange={() => handleAccessToggle(item.id)}
                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500 dark:border-gray-600"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                              </div>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveAccess}
                      disabled={isSaving}
                      className={premiumPrimaryButton('analytics', 'md', 'wide')}
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save Access'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex h-96 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="text-center">
                <Users className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {accessScope === 'user' ? 'Select a user to manage access' : 'Select a group to manage access'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
