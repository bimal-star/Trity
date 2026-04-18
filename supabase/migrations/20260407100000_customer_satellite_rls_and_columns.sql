-- Align customer_* satellite RLS with public.customers (user_profiles.user_id, not id).
-- Add customers.metadata, customers.version, customers.logo_url if missing.

-- ---------------------------------------------------------------------------
-- Satellite tables: drop incorrect policies (ERP migration used user_profiles.id)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Tenants can view own customer addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Tenants can insert own customer addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Tenants can update own customer addresses" ON public.customer_addresses;

DROP POLICY IF EXISTS "Tenants can view own customer contacts" ON public.customer_contacts;
DROP POLICY IF EXISTS "Tenants can insert own customer contacts" ON public.customer_contacts;
DROP POLICY IF EXISTS "Tenants can update own customer contacts" ON public.customer_contacts;

DROP POLICY IF EXISTS "Tenants can view own customer notes" ON public.customer_notes;
DROP POLICY IF EXISTS "Tenants can insert own customer notes" ON public.customer_notes;
DROP POLICY IF EXISTS "Tenants can update own customer notes" ON public.customer_notes;

DROP POLICY IF EXISTS "Tenants can view own customer attachments" ON public.customer_attachments;
DROP POLICY IF EXISTS "Tenants can insert own customer attachments" ON public.customer_attachments;
DROP POLICY IF EXISTS "Tenants can update own customer attachments" ON public.customer_attachments;

CREATE POLICY "Tenants can view own customer addresses" ON public.customer_addresses
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Tenants can insert own customer addresses" ON public.customer_addresses
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Tenants can update own customer addresses" ON public.customer_addresses
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Tenants can view own customer contacts" ON public.customer_contacts
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Tenants can insert own customer contacts" ON public.customer_contacts
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Tenants can update own customer contacts" ON public.customer_contacts
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Tenants can view own customer notes" ON public.customer_notes
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Tenants can insert own customer notes" ON public.customer_notes
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Tenants can update own customer notes" ON public.customer_notes
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Tenants can view own customer attachments" ON public.customer_attachments
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Tenants can insert own customer attachments" ON public.customer_attachments
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Tenants can update own customer attachments" ON public.customer_attachments
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- customers: metadata, version, logo_url
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN logo_url TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.customers.metadata IS 'Arbitrary JSON; prefer typed columns where possible.';
COMMENT ON COLUMN public.customers.version IS 'Row version for optimistic concurrency (optional app use).';
COMMENT ON COLUMN public.customers.logo_url IS 'Public URL for customer logo (e.g. customer-logos bucket).';

COMMENT ON COLUMN public.customers.address_line1 IS 'Primary/default address on the master record. Use customer_addresses for multiple typed addresses.';
