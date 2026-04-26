-- Live Supabase projects may use enum public.tenant_role for user_profiles.role
-- with only member/admin. App RLS and impersonation require super_admin.

ALTER TYPE public.tenant_role ADD VALUE IF NOT EXISTS 'super_admin';
