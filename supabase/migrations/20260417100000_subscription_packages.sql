-- Catalog of sellable subscription packages; tenants.subscription_tier stays the behavioral key
-- (basic | professional | enterprise). subscription_package_id links the tenant to a named SKU.

CREATE TABLE public.subscription_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  mapped_tier text NOT NULL CHECK (mapped_tier IN ('basic', 'professional', 'enterprise')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscription_packages IS
  'Platform-defined packages; mapped_tier drives feature flags and nav presets (see lib/featureFlags, lib/tierNavigationPreset).';

CREATE INDEX idx_subscription_packages_active_sort
  ON public.subscription_packages (is_active, sort_order);

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subscription_package_id uuid REFERENCES public.subscription_packages (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_subscription_package_id ON public.tenants (subscription_package_id);

ALTER TABLE public.subscription_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_packages_select_platform_super_admin ON public.subscription_packages
  FOR SELECT TO authenticated
  USING (public.is_tenants_platform_super_admin());

CREATE POLICY subscription_packages_insert_platform_super_admin ON public.subscription_packages
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenants_platform_super_admin());

CREATE POLICY subscription_packages_update_platform_super_admin ON public.subscription_packages
  FOR UPDATE TO authenticated
  USING (public.is_tenants_platform_super_admin())
  WITH CHECK (public.is_tenants_platform_super_admin());

CREATE POLICY subscription_packages_delete_platform_super_admin ON public.subscription_packages
  FOR DELETE TO authenticated
  USING (public.is_tenants_platform_super_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_packages TO authenticated;

-- Seed default packages (idempotent)
INSERT INTO public.subscription_packages (name, description, mapped_tier, is_active, sort_order)
SELECT v.name, v.description, v.mapped_tier, v.is_active, v.sort_order
FROM (
  VALUES
    ('Basic'::text, 'Core business features'::text, 'basic'::text, true, 1),
    ('Professional', 'Business Core + Execution + Analytics', 'professional', true, 2),
    ('Enterprise', 'Full platform capabilities', 'enterprise', true, 3)
) AS v(name, description, mapped_tier, is_active, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_packages LIMIT 1);

-- Backfill tenant FK where tier matches exactly one seeded package per tier
UPDATE public.tenants t
SET subscription_package_id = s.id
FROM (
  SELECT DISTINCT ON (mapped_tier) id, mapped_tier
  FROM public.subscription_packages
  WHERE is_active = true
  ORDER BY mapped_tier, sort_order ASC, created_at ASC
) AS s
WHERE t.subscription_package_id IS NULL
  AND t.subscription_tier IS NOT NULL
  AND lower(trim(t.subscription_tier)) = s.mapped_tier;
