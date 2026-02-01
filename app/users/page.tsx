'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { useTenantUsers } from '@/hooks/useTenantUsers';
import { useUserGroups } from '@/hooks/useUserGroups';
import { useTenantInvites } from '@/hooks/useTenantInvites';
import { usePermissions } from '@/hooks/usePermissions';
import type { TenantUser } from '@/hooks/useTenantUsers';
import { Users, Loader2, AlertCircle, Mail, Plus, ChevronDown } from 'lucide-react';

export default function UsersPage() {
  const router = useRouter();
  const { user, tenant_id } = useTenant();
  const { profile, isLoading: profileLoading } = useProfile(user?.id);
  const { users, isLoading: usersLoading, error, updateUserGroup } = useTenantUsers(tenant_id);
  const { groups, createGroup } = useUserGroups(tenant_id ?? undefined);
  const { createInvite, isLoading: invitesLoading, error: invitesError } = useTenantInvites(tenant_id, user?.id);
  const { can } = usePermissions();
  const [updatingGroupUserId, setUpdatingGroupUserId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  
  // Form visibility state
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  
  // Add user form state
  const [addUserEmail, setAddUserEmail] = useState('');
  const [addUserGroupId, setAddUserGroupId] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  
  // Create group form state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  const canManageUsers = can('manage_users');

  useEffect(() => {
    if (profileLoading || !user || !tenant_id) return;
    if (profile != null && !canManageUsers) {
      router.replace('/');
    }
  }, [profileLoading, user, tenant_id, profile, canManageUsers, router]);

  const handleGroupChange = async (u: TenantUser, newGroupId: string) => {
    setRoleError(null);
    setUpdatingGroupUserId(u.user_id);
    try {
      const result = await updateUserGroup(u.user_id, newGroupId || null);
      if (!result.success) {
        setRoleError(result.error || 'Failed to update group');
      }
    } finally {
      setUpdatingGroupUserId(null);
    }
  };

  const handleInviteSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setRoleError(null);

    try {
      if (!addUserEmail.trim()) {
        setRoleError('Email is required');
        return;
      }

      // Invites always default to 'member' role; admins can promote later
      await createInvite(addUserEmail, 'member', addUserGroupId || undefined);
      
      // Reset form
      setAddUserEmail('');
      setAddUserGroupId('');
      setShowAddUserForm(false);
      setRoleError(null);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Failed to send invite');
    }
  };

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    setGroupError(null);
    setIsCreatingGroup(true);

    try {
      if (!groupName.trim()) {
        setGroupError('Group name is required');
        return;
      }

      await createGroup({
        name: groupName,
        description: groupDescription || undefined,
      });

      // Reset form
      setGroupName('');
      setGroupDescription('');
      setGroupError(null);
      setShowGroupForm(false);
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const isAdminReady = profile != null && canManageUsers;
  const isRedirecting = profile != null && !canManageUsers;

  if (!isAdminReady) {
    return (
      <ProtectedRoute>
        <PageContainer title="User Management">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400 mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isRedirecting ? 'Redirecting…' : 'Loading…'}
            </p>
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageContainer module="analytics">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2">
                <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Manage team members and group assignments
                </p>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddUserForm(!showAddUserForm)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add User
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAddUserForm ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => setShowGroupForm(!showGroupForm)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Group
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showGroupForm ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Add User Form */}
        {showAddUserForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Add New User</h2>
            <form onSubmit={handleInviteSubmit} className="space-y-3">
              {roleError && (
                <div className="flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-300">{roleError}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="Email address *"
                  value={addUserEmail}
                  onChange={(e) => setAddUserEmail(e.target.value)}
                  disabled={invitesLoading}
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                />
                <select
                  value={addUserGroupId}
                  onChange={(e) => setAddUserGroupId(e.target.value)}
                  disabled={invitesLoading}
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                User will receive an invite email with a link to join
              </p>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={invitesLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded disabled:opacity-50 transition-colors"
                >
                  {invitesLoading ? 'Sending…' : 'Send Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserForm(false);
                    setAddUserEmail('');
                    setAddUserGroupId('');
                    setRoleError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Collapsible Group Form */}
        {showGroupForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              {groupError && (
                <div className="flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-300">{groupError}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Group name *"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={isCreatingGroup}
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  disabled={isCreatingGroup}
                  rows={1}
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 disabled:opacity-50 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isCreatingGroup}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded disabled:opacity-50 transition-colors"
                >
                  {isCreatingGroup ? 'Creating…' : 'Create Group'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupForm(false);
                    setGroupName('');
                    setGroupDescription('');
                    setGroupError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {(roleError || groupError) && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{roleError || groupError}</p>
            </div>
          )}

          {usersLoading ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400 mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading users…</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Cannot load users</p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No users yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Add team members to your tenant.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Group</th>
                      <th className="px-3 py-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.user_id}
                        className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        <td className="px-3 py-2.5 text-xs text-gray-900 dark:text-white font-medium">
                          {u.full_name || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">
                          {u.displayEmail ?? u.email ?? '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={u.primary_group_id ?? ''}
                            onChange={(e) => handleGroupChange(u, e.target.value)}
                            disabled={updatingGroupUserId === u.user_id}
                            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                          >
                            <option value="">No group</option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
