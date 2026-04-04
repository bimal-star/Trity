# Supabase Schema Research Summary
**Date:** January 31, 2026  
**Scope:** Current state of users, groups, and access control schema

---

## Executive Summary

The schema includes foundational structures for multi-tenant user and group management, but **user_groups and group_members tables are defined in TypeScript types but NOT present in the actual Supabase database schema**. The CSV export (authoritative source) does not contain these tables, though the application code expects them.

---

## 1. Current User_Profiles Structure

### Location
- **Definition:** [types/access.ts](../../types/access.ts) (TypeScript interfaces)
- **Database Types:** [types/database.ts](../../types/database.ts) (auto-generated)
- **Authoritative Schema:** NOT in CSV export

### Columns & Types

| Column | Type | Nullable | Default | Primary Key | Notes |
|--------|------|----------|---------|-------------|-------|
| `id` | UUID | NO | uuid_generate_v4() | YES | System-generated ID |
| `user_id` | UUID | NO | - | NO | Reference to auth.users(id) - UNIQUE |
| `tenant_id` | UUID | NO | - | NO | Multi-tenant isolation |
| `full_name` | text | YES | NULL | NO | User's display name |
| `email` | text | YES | NULL | NO | User's email (from auth.users) |
| `role` | enum | NO | 'member' | NO | Values: `member` \| `admin` \| `super_admin` |
| `created_at` | timestamp | NO | now() | NO | Creation timestamp |
| `updated_at` | timestamp | NO | now() | NO | Last update timestamp |

### TypeScript Definition

```typescript
// From types/database.ts
user_profiles: {
  Row: {
    id: string
    user_id: string
    tenant_id: string
    full_name: string | null
    email: string | null
    role: 'member' | 'admin' | 'super_admin'
    created_at: string
    updated_at: string
  }
  // ... Insert, Update variants
  Relationships: []
}
```

### Relationships
- **No explicit foreign keys in database.ts** (Relationships: [])
- Should have FK to `tenants(id)` on `tenant_id`
- Should have FK to `auth.users(id)` on `user_id`
- Used for RLS policies: `WHERE user_id = auth.uid()`

### Row Level Security (RLS) Policies

From [supabase/migrations/20260131000000_optimize_rls_auth_calls.sql](../../supabase/migrations/20260131000000_optimize_rls_auth_calls.sql):

```sql
-- SELECT: Users can read own profile
CREATE POLICY "Users can read own profile by user_id" ON public.user_profiles
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- UPDATE: Users can update own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**Note:** RLS is defined but actual authentication is **NOT implemented** (as per TRITY_CONTEXT.md: "RLS **DISABLED** in development")

---

## 2. Current User_Groups Structure

### Location
- **TypeScript Interfaces:** [types/access.ts](../../types/access.ts#L86-L96)
- **Hook Implementation:** [hooks/useUserGroups.ts](../../hooks/useUserGroups.ts)
- **UI Usage:** [app/users/page.tsx](../../app/users/page.tsx)

### ⚠️ CRITICAL: Database Status
**These tables are NOT in the Supabase schema CSV!**
- They are defined in TypeScript types
- Application code expects them to exist
- Queries will fail if tables don't exist in database

### Intended Columns for user_groups

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | Primary key |
| `name` | text | NO | Group display name |
| `description` | text | YES | Optional group description |
| `tenant_id` | UUID | NO | Multi-tenant isolation |
| `created_at` | timestamp | NO | Creation timestamp |
| `updated_at` | timestamp | NO | Last update timestamp |
| `created_by` | UUID | YES | User who created group |
| `updated_by` | UUID | YES | User who last updated |
| `is_deleted` | boolean | NO | Soft delete flag (default: false) |

### TypeScript Definition

```typescript
// From types/access.ts
export interface UserGroup {
  id: string
  name: string
  description: string | null
  tenant_id: string
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
  is_deleted: boolean
  // Computed/joined fields
  member_count?: number
  members?: GroupMember[]
}
```

---

## 3. Junction Table: group_members (Expected)

### Location
- **TypeScript Interfaces:** [types/access.ts](../../types/access.ts#L98-L106)
- **Hook Implementation:** [hooks/useUserGroups.ts](../../hooks/useUserGroups.ts#L183-L233)

### ⚠️ CRITICAL: Database Status
**This table is NOT in the Supabase schema CSV!**
- Required for group membership management
- Application queries it directly in useUserGroups hook

### Intended Columns for group_members

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | Primary key |
| `group_id` | UUID | NO | FK → user_groups(id) |
| `user_id` | UUID | NO | FK → auth.users(id) |
| `role` | enum | NO | Values: `member` \| `admin` |
| `added_at` | timestamp | NO | When member was added |
| `added_by` | UUID | YES | User who added member |

### TypeScript Definition

```typescript
// From types/access.ts
export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: GroupMemberRole
  added_at: string
  added_by: string | null
  // Computed/joined fields
  user_email?: string
  user_name?: string
}

export type GroupMemberRole = 'member' | 'admin';
```

### Application Usage

[hooks/useUserGroups.ts](../../hooks/useUserGroups.ts#L90-L110) - Creating groups with members:
```typescript
// Add members if provided
if (data.member_ids && data.member_ids.length > 0) {
  const membersData = data.member_ids.map(userId => ({
    group_id: newGroup.id,
    user_id: userId,
    role: 'member' as GroupMemberRole,
    added_by: currentUserId,
  }));

  const { error: membersError } = await supabase
    .from('group_members')
    .insert(membersData as any);
}
```

---

## 4. Foreign Key Relationships

### Current State (from types/database.ts)
- **Tenants table:** 9 columns (id, name, company_name, slug, is_active, logo_url, settings, created_at, updated_at)
- **User_profiles:** Has `tenant_id` but no explicit FK constraint defined
- **User_groups:** Expected but missing
- **Group_members:** Expected but missing

### Recommended Relationships

```
auth.users (Supabase managed)
    ↓ (REFERENCES user_profiles.user_id)
    
user_profiles
    ├─ REFERENCES tenants(id) ON DELETE CASCADE
    ├─ REFERENCES audit_logs (for tracking)
    └─ Used in RLS policies (WHERE user_id = auth.uid())
    
user_groups (MISSING - needs creation)
    ├─ REFERENCES tenants(id) ON DELETE CASCADE
    ├─ REFERENCES user_profiles(id) for created_by/updated_by
    
group_members (MISSING - needs creation)
    ├─ REFERENCES user_groups(id) ON DELETE CASCADE
    ├─ REFERENCES auth.users(id) ON DELETE CASCADE
```

---

## 5. RLS Policies - Current Implementation

### user_profiles RLS (Enabled)
From [supabase/migrations/20260131110000_consolidate_duplicate_policies.sql](../../supabase/migrations/20260131110000_consolidate_duplicate_policies.sql#L409):

```sql
-- SELECT: Users can view own profile
CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- UPDATE: Users can update own profile
CREATE POLICY "user_profiles_update" ON public.user_profiles
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

### user_groups & group_members RLS (Expected but not yet implemented)
Based on pattern from other tables, should include:
- SELECT: Admins view all groups in tenant, members view groups they belong to
- INSERT: Admins only
- UPDATE: Admins and group admins
- DELETE: Admins only (soft delete)

---

## 6. Standard Audit Fields

All tables follow this pattern:

```sql
created_by UUID | NULL              -- Who created
updated_by UUID | NULL              -- Who last updated
created_at TIMESTAMP NOT NULL       -- When created
updated_at TIMESTAMP NOT NULL       -- When updated
is_deleted BOOLEAN DEFAULT false    -- Soft delete
```

**Status:** user_groups includes these; group_members does NOT.

---

## 7. Schema Dependencies & Usage

### Where user_profiles is used:
1. [contexts/TenantContext.tsx](../../contexts/TenantContext.tsx#L232-L260) - Fetch user profile
2. [hooks/useTenantUsers.ts](../../hooks/useTenantUsers.ts) - List tenant users
3. [app/users/page.tsx](../../app/users/page.tsx) - User management UI
4. RLS policies in all migrations

### Where user_groups/group_members are used:
1. [hooks/useUserGroups.ts](../../hooks/useUserGroups.ts) - CRUD operations
2. [app/users/page.tsx](../../app/users/page.tsx) - Group management UI
3. [app/users/page.tsx](../../app/users/page.tsx) - Role assignment
4. Expected in audit logs

### Example Query (useUserGroups)
[hooks/useUserGroups.ts](../../hooks/useUserGroups.ts#L27-L50):
```typescript
const { data, error: fetchError } = await supabase
  .from('user_groups')
  .select(`
    *,
    group_members (id, user_id, role, added_at)
  `)
  .eq('is_deleted', false)
  .eq('tenant_id', tenantId)
  .order('name', { ascending: true });
```

---

## 8. Access Control Types (Defined in types/access.ts)

### Tenant Roles
```typescript
type TenantRole = 'member' | 'admin' | 'super_admin'
```

### Group Member Role
```typescript
type GroupMemberRole = 'member' | 'admin'
```

### Permissions by Role
```typescript
const ROLE_PERMISSIONS: Record<TenantRole, PermissionAction[]> = {
  member: [
    'view_users',
    'access_calendar',
    'access_products',
    'access_workstreams',
    'access_okrs',
  ],
  admin: [
    'view_users',
    'invite_users',
    'manage_users',
    'change_user_roles',
    'remove_users',
    'manage_groups',
    'view_tenant_settings',
    'edit_tenant_settings',
    'view_audit_logs',
    'manage_invites',
    'access_calendar',
    'access_products',
    'access_workstreams',
    'access_okrs',
  ],
  super_admin: [
    // All permissions
  ]
}
```

---

## 9. Key Issues & Gaps

### ❌ CRITICAL ISSUES

1. **user_groups table missing from database**
   - Defined in types/access.ts
   - Application code queries it
   - Will cause runtime errors
   - Status: Needs migration

2. **group_members table missing from database**
   - Defined in types/access.ts
   - Application code queries it (adds/removes members)
   - Will cause runtime errors
   - Status: Needs migration

3. **No foreign keys defined in types/database.ts**
   - user_profiles.tenant_id should reference tenants(id)
   - user_profiles.user_id should reference auth.users(id)
   - group_members.group_id should reference user_groups(id)
   - group_members.user_id should reference auth.users(id)

4. **Missing RLS policies for user_groups and group_members**
   - group_members table has no RLS
   - user_groups has no RLS

### ⚠️ WARNINGS

1. **Authentication NOT implemented**
   - RLS policies assume auth.uid() works
   - But Supabase Auth is not set up in app
   - RLS is disabled in development

2. **CSV schema export is incomplete**
   - Missing user_profiles, user_groups, group_members, tenants
   - Lists 40+ product/inventory tables
   - Last updated: Not specified in header

3. **No user profile auto-creation**
   - When auth.users created, no automatic user_profiles entry
   - Application must handle manually

---

## 10. Summary Table: Current vs Expected

| Component | Status | Location | Database | TypeScript |
|-----------|--------|----------|----------|------------|
| **tenants** | ✅ Exists | - | ✅ Present | ✅ types/database.ts |
| **user_profiles** | ✅ Exists | - | ✅ Present | ✅ types/database.ts |
| **user_groups** | ❌ Missing | types/access.ts | ❌ Missing | ✅ Defined |
| **group_members** | ❌ Missing | types/access.ts | ❌ Missing | ✅ Defined |
| **RLS on user_profiles** | ✅ Exists | migrations | ✅ Policies set | - |
| **RLS on user_groups** | ❌ Missing | - | ❌ No policies | - |
| **RLS on group_members** | ❌ Missing | - | ❌ No policies | - |

---

## 11. Files Referenced

**Type Definitions:**
- [types/access.ts](../../types/access.ts) - UserGroup, GroupMember interfaces
- [types/database.ts](../../types/database.ts) - Database types (auto-generated)

**Hooks & Context:**
- [hooks/useUserGroups.ts](../../hooks/useUserGroups.ts) - Group CRUD operations
- [hooks/useTenantUsers.ts](../../hooks/useTenantUsers.ts) - User management
- [contexts/TenantContext.tsx](../../contexts/TenantContext.tsx) - User profile fetching

**Pages:**
- [app/users/page.tsx](../../app/users/page.tsx) - Group management UI
- [app/users/page.tsx](../../app/users/page.tsx) - User management UI

**Migrations:**
- [supabase/migrations/20260131000000_optimize_rls_auth_calls.sql](../../supabase/migrations/20260131000000_optimize_rls_auth_calls.sql) - RLS optimization
- [supabase/migrations/20260131110000_consolidate_duplicate_policies.sql](../../supabase/migrations/20260131110000_consolidate_duplicate_policies.sql) - Policy consolidation
- [supabase/migrations/20260131150000_create_user_module_access.sql](../../supabase/migrations/20260131150000_create_user_module_access.sql) - Module access table

**Documentation:**
- [TRITY_CONTEXT.md](../../TRITY_CONTEXT.md) - Project context
- [supabase-multi-tenant-audit-report.md](supabase-multi-tenant-audit-report.md) - Schema audit

---

## Conclusion

The schema has **foundational user and group structures defined in code**, but the actual database tables for user groups and group membership are **missing from Supabase**. This represents a gap between:

- **Defined:** TypeScript types expect user_groups and group_members tables
- **Actual:** Only tenants and user_profiles exist in database

This must be addressed by creating the missing migrations and RLS policies before the groups feature can function in production.

