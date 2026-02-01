'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import { useTenant } from '@/contexts/TenantContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useUserGroups } from '@/hooks/useUserGroups';
import { supabase } from '@/lib/supabaseClient';
import { defaultNavigationItems } from '@/lib/navigation-default';
import { NavigationItem } from '@/types/navigation';
import { Users, Save, AlertCircle, Loader2, CheckCircle, Search } from 'lucide-react';

interface UserAccess {
  [key: string]: boolean;
}

const PILLAR_COLORS = {
  'Analytics': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', icon: 'text-blue-600' },
  'Business Core': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', icon: 'text-green-600' },
  'Execution': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', icon: 'text-orange-600' },
};

export default function UserAccessPage() {
  const router = useRouter();
  const { tenant_id } = useTenant();
  const { can } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [accessScope, setAccessScope] = useState<'user' | 'group'>('user');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const { groups, isLoading: groupsLoading } = useUserGroups(tenant_id ?? undefined);
  const [userAccess, setUserAccess] = useState<UserAccess>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check permissions
  useEffect(() => {
    if (!can('manage_users')) {
      router.replace('/');
    }
  }, [can, router]);

  useEffect(() => {
    setUserAccess({});
    setError(null);
    setSuccess(null);
    if (accessScope === 'user') {
      setSelectedGroupId('');
    } else {
      setSelectedUserId('');
    }
  }, [accessScope]);

  // Load users
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
      } catch (err: any) {
        setError('Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [tenant_id]);

  // Load access for selected user or group
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

        setError(null);
        setSuccess(null);
      } catch (err: any) {
        setError('Failed to load access permissions');
      }
    };

    loadAccess();
  }, [accessScope, selectedUserId, selectedGroupId, tenant_id]);

  const handleAccessToggle = (moduleId: string) => {
    setUserAccess(prev => ({
      ...prev,
      [moduleId]: !(prev[moduleId] ?? true),
    }));
  };

  const handleSaveAccess = async () => {
    if (!tenant_id) return;
    if (accessScope === 'user' && !selectedUserId) return;
    if (accessScope === 'group' && !selectedGroupId) return;

    try {
      setIsSaving(true);
      setError(null);

      // Get all modules from navigation
      const allModules = defaultNavigationItems
        .filter(item => item.path && !['Analytics', 'Business Core', 'Execution'].includes(item.label))
        .map(item => item.id);

      // Build upsert data
      const accessData = allModules.map(moduleId =>
        accessScope === 'user'
          ? {
              tenant_id,
              user_id: selectedUserId,
              module_id: moduleId,
              has_access: userAccess[moduleId] ?? true,
            }
          : {
              group_id: selectedGroupId,
              module_id: moduleId,
              has_access: userAccess[moduleId] ?? true,
            }
      );

      // Upsert all records
      const { error: upsertErr } = await (supabase as any)
        .from(accessScope === 'user' ? 'user_module_access' : 'group_module_access')
        .upsert(
          accessData,
          accessScope === 'user'
            ? { onConflict: 'tenant_id,user_id,module_id' }
            : { onConflict: 'group_id,module_id' }
        );

      if (upsertErr) throw upsertErr;

      setSuccess('Access permissions saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Get all non-pillar items, sorted by position
  const allAccessibleItems = defaultNavigationItems
    .filter(item => item.path && !['Analytics', 'Business Core', 'Execution'].includes(item.label))
    .sort((a, b) => {
      const posA = parseFloat(String(a.position ?? '999'));
      const posB = parseFloat(String(b.position ?? '999'));
      return posA - posB;
    });

  // Organize items by pillar group for the right panel
  const itemsByPillar = allAccessibleItems.reduce((acc, item) => {
    // Extract pillar from position (1.x = Analytics, 2.x = Business Core, 3.x = Execution)
    const positionPrefix = String(item.position ?? '').split('.')[0];
    let pillar = '';
    if (positionPrefix === '1') pillar = 'Analytics';
    else if (positionPrefix === '2') pillar = 'Business Core';
    else if (positionPrefix === '3') pillar = 'Execution';
    else pillar = 'Administration';

    if (!acc[pillar]) acc[pillar] = [];
    acc[pillar].push(item);
    return acc;
  }, {} as Record<string, NavigationItem[]>);

  return (
    <PageContainer title="Access Levels">
      {/* Two-Tier Header */}
      <div className="mb-6 -mt-1">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2">
              <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-700 dark:text-gray-300">
              Access Levels
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
          Manage module-level access permissions for users and groups
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent mb-6" />

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT PANEL: Scope + Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAccessScope('user')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded ${
                    accessScope === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Users
                </button>
                <button
                  type="button"
                  onClick={() => setAccessScope('group')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded ${
                    accessScope === 'group'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Groups
                </button>
              </div>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={accessScope === 'user' ? 'Search users...' : 'Search groups...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {accessScope === 'user' ? (
                isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                    No users found
                  </div>
                ) : (
                  users
                    .filter(u =>
                      (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(u => (
                      <button
                        key={u.user_id}
                        onClick={() => setSelectedUserId(u.user_id)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-xs transition-colors last:border-0 ${
                          selectedUserId === u.user_id
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {(u.full_name || '').trim() || u.email}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{u.email}</div>
                      </button>
                    ))
                )
              ) : (
                groupsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : groups.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                    No groups found
                  </div>
                ) : (
                  groups
                    .filter(g => (g.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(g => (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGroupId(g.id)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-xs transition-colors last:border-0 ${
                          selectedGroupId === g.id
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {g.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {g.description || 'No description'}
                        </div>
                      </button>
                    ))
                )
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Access Matrix */}
        <div className="lg:col-span-2">
          {(accessScope === 'user' ? selectedUserId : selectedGroupId) ? (
            <div className="space-y-4">
              {/* Info Box */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-200">Module Access Control</p>
                  <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                    {accessScope === 'user'
                      ? 'Configure access for an individual user. User-level settings can override group access.'
                      : 'Configure access for a group. All group members inherit these permissions.'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-700 dark:text-green-300">{success}</p>
                </div>
              )}

              {/* Access Matrix by Pillar */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {['Analytics', 'Business Core', 'Execution', 'Administration'].map((pillar) => {
                    const pillarItems = itemsByPillar[pillar] || [];
                    if (pillarItems.length === 0) return null;

                    const colors = PILLAR_COLORS[pillar as keyof typeof PILLAR_COLORS];
                    const bgColor = colors ? colors.bg : 'bg-gray-100';
                    const textColor = colors ? colors.text : 'text-gray-700';
                    const borderColor = colors ? colors.border : 'border-gray-300';

                    return (
                      <div key={pillar}>
                        {/* Pillar Header */}
                        <div className={`px-6 py-3 ${bgColor} border-b border-gray-200 dark:border-gray-700`}>
                          <h3 className={`text-sm font-semibold ${textColor}`}>
                            {pillar}
                          </h3>
                        </div>

                        {/* Module Items */}
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                          {pillarItems.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={userAccess[item.id] ?? true}
                                onChange={() => handleAccessToggle(item.id)}
                                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {item.label}
                                </p>
                              </div>
                              {userAccess[item.id] !== false && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 flex-shrink-0">
                                  Allowed
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveAccess}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Access'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="text-center">
                <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
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
