-- Industries master table
--
-- Tenants pick their industry from this table (via app/admin/tenants form).
-- Super-admins can extend the list via the "Add industry" UI (enforced by RLS).
-- The table is intentionally a plain data table (no Postgres enum) so new
-- industries can be added at runtime without migrations.

CREATE TABLE IF NOT EXISTS public.industries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT industries_slug_fmt CHECK (slug ~ '^[a-z][a-z0-9_]*$')
);

CREATE INDEX IF NOT EXISTS industries_sort_label_idx
  ON public.industries (sort_order, label);

ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user (every tenant form needs the list).
DROP POLICY IF EXISTS industries_select_authenticated ON public.industries;
CREATE POLICY industries_select_authenticated
  ON public.industries
  FOR SELECT
  TO authenticated
  USING (true);

-- Write: platform super-admins only.
-- Uses the canonical helper public.is_tenants_platform_super_admin() defined
-- in migration 20260412100000_tenants_super_admin_rls.sql, matching the
-- pattern used by tenants / subscription_packages / tenant logos policies.
DROP POLICY IF EXISTS industries_super_admin_insert ON public.industries;
CREATE POLICY industries_super_admin_insert
  ON public.industries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_tenants_platform_super_admin());

DROP POLICY IF EXISTS industries_super_admin_update ON public.industries;
CREATE POLICY industries_super_admin_update
  ON public.industries
  FOR UPDATE
  TO authenticated
  USING (public.is_tenants_platform_super_admin())
  WITH CHECK (public.is_tenants_platform_super_admin());

DROP POLICY IF EXISTS industries_super_admin_delete ON public.industries;
CREATE POLICY industries_super_admin_delete
  ON public.industries
  FOR DELETE
  TO authenticated
  USING (public.is_tenants_platform_super_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.industries TO authenticated;

-- Seed with the existing industry_type enum values so tenants created
-- today keep working without any behavioural change.
INSERT INTO public.industries (slug, label, sort_order) VALUES
  ('bakery',        'Bakery',        10),
  ('ready_meals',   'Ready Meals',   20),
  ('pizza',         'Pizza',         30),
  ('construction',  'Construction',  40),
  ('manufacturing', 'Manufacturing', 50),
  ('retail',        'Retail',        60),
  ('other',         'Other',        999)
ON CONFLICT (slug) DO NOTHING;
