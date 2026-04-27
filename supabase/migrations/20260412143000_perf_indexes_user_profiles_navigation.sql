-- Performance: speed up lookups used by RLS helpers and app queries.
-- user_profiles: frequent WHERE user_id = auth.uid() (and API .eq('user_id', ...)).
-- navigation: tenant-scoped menu with is_enabled filter and position ordering.

CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx
  ON public.user_profiles (user_id);

CREATE INDEX IF NOT EXISTS navigation_tenant_enabled_position_idx
  ON public.navigation (tenant_id, is_enabled, "position");
