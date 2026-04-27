-- Canonicalize legacy tenant role strings in user_profiles to match app TenantRole
-- (see lib/permissions.ts normalizeTenantRole).

UPDATE public.user_profiles
SET role = 'super_admin'
WHERE lower(replace(replace(trim(role), '-', '_'), ' ', '_')) IN (
  'platform_admin',
  'global_admin',
  'system_admin',
  'superadmin',
  'super_administrator'
);

UPDATE public.user_profiles
SET role = 'admin'
WHERE lower(replace(replace(trim(role), '-', '_'), ' ', '_')) IN (
  'administrator',
  'tenant_admin'
);
