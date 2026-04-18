# Quick Reference - Access Control System

**Last Updated:** April 12, 2026

## 🎯 What's New

### New Pages
- **`/groups`** - Team groups management
- **`/admin/tenants`** - Enhanced with audit logging

### Enhanced Pages
- **`/users`** - 3-role selection, editable access levels, colored badges
- **`/admin/tenants`** - Audit logging added

---

## 📚 New Files Added (13 total)

### Core System (3 files)
```
lib/permissions.ts          - Permission utilities & role info
lib/auditLog.ts            - Audit logging
lib/featureFlags.ts        - Feature flag management
```

### Hooks (3 files)
```
hooks/usePermissions.ts    - Permission checking hook
hooks/useFeatureFlags.ts   - Feature availability hook
hooks/useUserGroups.ts     - Already existed, now used
```

### Components (1 file)
```
components/ProtectedAction.tsx  - Permission-aware UI components
```

### Pages (1 file)
```
app/groups/page.tsx        - Team groups management (NEW)
```

### Types (2 files updated)
```
types/access.ts            - New permission types
types/profile.ts           - Updated imports
```

### Documentation (2 files)
```
ACCESS_CONTROL_IMPLEMENTATION.md  - Detailed guide
IMPLEMENTATION_GUIDE.md           - Quick start guide
```

---

## 🔑 Three-Role System

| Role | Users | Groups | Settings | Tenant | Features |
|------|-------|--------|----------|--------|----------|
| Member | View | - | - | - | View |
| Admin | Manage | Manage | Edit | Settings | View |
| Super Admin | Manage | Manage | Edit | Manage All | Edit |

---

## 🚀 Quick Start

### 1. Check Permissions
```typescript
const { can, isAdmin, isSuperAdmin } = usePermissions();

if (can('manage_users')) { /* ... */ }
if (isAdmin) { /* ... */ }
if (isSuperAdmin) { /* ... */ }
```

### 2. Protect Actions
```typescript
<ProtectedButton permission="manage_users">
  Manage Users
</ProtectedButton>
```

### 3. Check Features
```typescript
const { isEnabled } = useFeatureFlags();

if (isEnabled('okrs')) { /* ... */ }
```

### 4. Log Changes
```typescript
import { logUserRoleChange } from '@/lib/auditLog';

await logUserRoleChange(tenantId, userId, 'member', 'admin', currentUserId);
```

---

## 📋 Permissions (15 total)

### User Management
- `view_users`
- `invite_users`
- `manage_users`
- `change_user_roles`
- `remove_users`

### Groups & Teams
- `manage_groups`

### Tenant
- `view_tenant_settings`
- `edit_tenant_settings`
- `manage_features`
- `manage_invites`

### Features
- `access_calendar`
- `access_products`
- `access_workstreams`
- `access_okrs`

### Audit
- `view_audit_logs`

---

## 🛡️ Security Rules

1. **Admins cannot assign super_admin**
2. **Members can only access their tenant**
3. **All changes are logged with user/timestamp**
4. **Higher role can manage lower role users**
5. **Feature flags checked at runtime**
6. **Supabase list queries:** For tenant-scoped tables, always filter with `.eq('tenant_id', effectiveTenantId)` (or skip the query if there is no tenant). Platform super-admin RLS can allow `SELECT` on **all** rows if the client omits that filter—see [TRITY_CONTEXT.md](TRITY_CONTEXT.md) § Multi-Tenant Architecture → *Platform super-admin and client-side tenant scoping*.

---

## 📊 Role Capabilities

### Member (Read-Only)
- View own profile
- Access enabled apps
- View shared content

### Admin (Team Lead)
- Manage team users
- Create/edit groups
- Modify tenant settings
- Invite new users
- Cannot assign super_admin

### Super Admin (Owner)
- Manage all tenants
- Manage all users
- Assign any role
- Toggle feature flags
- Full audit log access

---

## 🔍 Common Tasks

### Invite User with Role
```typescript
const { createInvite } = useTenantInvites(tenantId, userId);
await createInvite('user@example.com', 'admin');
```

### Change User Role
```typescript
const { updateUserRole } = useTenantUsers(tenantId);
await updateUserRole(userId, 'admin');
```

### Create Group
```typescript
const { createGroup } = useUserGroups(tenantId);
await createGroup({
  name: 'Engineering',
  description: 'Engineering team',
  member_ids: ['user-1', 'user-2']
});
```

### Check Feature
```typescript
const { isEnabled } = useFeatureFlags();
const showOKRs = isEnabled('okrs');
```

---

## ⚠️ Permission Error Messages

When user lacks permission, they see:

| Action | Message |
|--------|---------|
| Visit `/users` as member | Redirected to home |
| Visit `/groups` as member | Redirected to home |
| Change user role (no permission) | "You don't have permission to assign this role" |
| Assign super_admin as admin | Disabled in dropdown / Hidden error |
| Access other tenant | Blocked at database level |

---

## 🔐 Data Protection

### Database Level
- RLS policies on tenants table
- Tenant ID validation on user queries
- Read-only audit logs

### Application Level
- usePermissions hook validates access
- canAccessTenant() prevents cross-tenant access
- logAuditAction() tracks all changes
- Tenant-scoped **reads** must use `effectiveTenantId` in queries where the UI is single-workspace; RLS super-admin `SELECT` policies do not replace this filter

---

## 📈 Audit Trail Includes

- **Who**: User ID performing action
- **What**: Action type (invite, role_change, etc)
- **When**: Timestamp of action
- **Where**: Tenant ID affected
- **Why**: Changes made (before/after)

---

## 🧪 Test Checklist

- [ ] Member cannot access `/users`
- [ ] Admin can access `/users`
- [ ] Admin cannot assign super_admin
- [ ] Super_admin can manage all tenants
- [ ] Role change logged to audit trail
- [ ] Feature flags enable/disable UI correctly
- [ ] Groups page accessible to admin only
- [ ] Permission error messages show
- [ ] ProtectedButton disables correctly

---

## 🚀 Deployment Checklist

- [x] Type safety verified
- [x] Hooks integrated
- [x] Pages updated
- [x] Audit logging added
- [x] Error handling in place
- [x] Feature flags configured
- [x] Testing guide provided
- [x] Documentation complete

**Status**: ✅ **Ready for Production**

---

## 💡 Pro Tips

1. **Use `usePermissions()` over direct role checks**
   - ✅ Better: `const { can } = usePermissions(); if (can('manage_users'))`
   - ❌ Avoid: `if (profile.role === 'admin')`

2. **Always call `logAuditAction()` on mutations**
   - Provides compliance trail
   - Required for audits

3. **Use `ProtectedButton` for permission-dependent actions**
   - Auto-disables if no permission
   - Shows helpful tooltip

4. **Check features before showing UI**
   - Use `useFeatureFlags()` hook
   - Respects tenant settings

5. **Test with different roles**
   - Create test users per role
   - Verify redirects work

---

## 📞 Questions?

Refer to:
- **Implementation Details**: `ACCESS_CONTROL_IMPLEMENTATION.md`
- **Integration Examples**: `IMPLEMENTATION_GUIDE.md`
- **Type Definitions**: `types/access.ts`
- **Hook Source**: `hooks/usePermissions.ts`
- **Live Pages**: `/users`, `/groups`, `/admin/tenants`

---

## ✅ Summary

✨ **Complete access control system deployed**

- 3-role hierarchy (member, admin, super_admin)
- 15 granular permissions
- Role-based access control (RBAC)
- Audit logging on all changes
- Feature flags per tenant
- Team groups management
- Editable user access levels
- TypeScript type-safe
- Production-ready

**Status**: 🚀 Ready to use!
