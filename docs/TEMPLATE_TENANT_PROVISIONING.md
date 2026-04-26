# Template tenant provisioning

## Purpose

One **template (developer) tenant** holds the canonical **navigation** and **permission catalog** (module resources, role grants, action rows). New tenants are provisioned by copying only that configuration—not business data.

## Configuration

1. **Mark a tenant** as template: Admin → Tenants → Edit → check **Template (developer workspace)**, or
2. Set **`NEXT_PUBLIC_TEMPLATE_TENANT_ID`** to that tenant’s UUID (takes precedence over the flag).

## Allowlist (copied by `provision_tenant_from_template`)

- `public.navigation`
- `public.permission_resources` (keys remapped from `nav.<old_nav_uuid>` to `nav.<new_nav_uuid>`)
- `public.role_resource_grants`
- `public.permission_actions`

Rows missing in the template (sparse catalog) are **supplemented** with the same defaults as `ensurePermissionResourceForModule` (member/admin/super_admin grants + read/write actions).

## Denylist (never copied)

All transactional / business tables (products, customers, orders, inventory, etc.), `user_profiles`, `user_resource_grants`, `group_resource_grants`, `user_module_access`, `group_module_access`, `group_members`, and similar.

## Operations

- **New tenant**: After insert, the app calls `provision_tenant_from_template` when a template id resolves; otherwise it falls back to `seed_tenant_default_navigation`.
- **Existing tenant**: Use **Provision from template** on the tenant row (platform super admin). Skips if the tenant already has navigation rows.

## Cross-tenant module access

Platform super admins can edit **Users → Access** while in **Open workspace** for a customer tenant. The UI sends `target_tenant_id` to `/api/access/update`; RLS policies `*_platform_super_admin` on module/grant tables allow those writes.

## Migration

Apply `supabase/migrations/20260415140000_template_tenant_provisioning.sql` (adds `tenants.is_template`, RPC, and super-admin policies).
