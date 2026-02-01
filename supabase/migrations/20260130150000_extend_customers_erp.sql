-- Extend customers table to ERP-grade master data (Unleashed/SAP-like)
-- Do NOT redefine tenant_id/user_id/RLS/updated_at triggers

-- Enums (create only if missing)
DO $$
BEGIN
  CREATE TYPE public.customer_type AS ENUM ('individual', 'business', 'distributor', 'internal');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.customer_status AS ENUM ('active', 'inactive', 'on_hold', 'prospect');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Extend customers table with ERP core + commercial + logistics + sales profile fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='customer_code') THEN
    ALTER TABLE public.customers ADD COLUMN customer_code TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='customer_type') THEN
    ALTER TABLE public.customers ADD COLUMN customer_type public.customer_type;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='status') THEN
    -- Only attempt to coerce if status is not already the enum
    IF (SELECT data_type FROM information_schema.columns WHERE table_name='customers' AND column_name='status') <> 'USER-DEFINED' THEN
      ALTER TABLE public.customers ALTER COLUMN status TYPE public.customer_status USING status::text::public.customer_status;
    END IF;
  ELSE
    ALTER TABLE public.customers ADD COLUMN status public.customer_status DEFAULT 'active';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='legal_name') THEN
    ALTER TABLE public.customers ADD COLUMN legal_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='trading_name') THEN
    ALTER TABLE public.customers ADD COLUMN trading_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='registration_number') THEN
    ALTER TABLE public.customers ADD COLUMN registration_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='vat_number') THEN
    ALTER TABLE public.customers ADD COLUMN vat_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='tax_scheme') THEN
    ALTER TABLE public.customers ADD COLUMN tax_scheme TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='credit_rating') THEN
    ALTER TABLE public.customers ADD COLUMN credit_rating TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='risk_category') THEN
    ALTER TABLE public.customers ADD COLUMN risk_category TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='payment_terms') THEN
    ALTER TABLE public.customers ADD COLUMN payment_terms TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='credit_limit') THEN
    ALTER TABLE public.customers ADD COLUMN credit_limit NUMERIC(14,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='credit_hold') THEN
    ALTER TABLE public.customers ADD COLUMN credit_hold BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='currency') THEN
    ALTER TABLE public.customers ADD COLUMN currency TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='price_list_id') THEN
    ALTER TABLE public.customers ADD COLUMN price_list_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='discount_rate') THEN
    ALTER TABLE public.customers ADD COLUMN discount_rate NUMERIC(8,4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='tax_inclusive') THEN
    ALTER TABLE public.customers ADD COLUMN tax_inclusive BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='default_warehouse_id') THEN
    ALTER TABLE public.customers ADD COLUMN default_warehouse_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='delivery_instructions') THEN
    ALTER TABLE public.customers ADD COLUMN delivery_instructions TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='preferred_carrier') THEN
    ALTER TABLE public.customers ADD COLUMN preferred_carrier TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='shipping_account_number') THEN
    ALTER TABLE public.customers ADD COLUMN shipping_account_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='incoterms') THEN
    ALTER TABLE public.customers ADD COLUMN incoterms TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='sales_rep_id') THEN
    ALTER TABLE public.customers ADD COLUMN sales_rep_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='channel') THEN
    ALTER TABLE public.customers ADD COLUMN channel TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='region') THEN
    ALTER TABLE public.customers ADD COLUMN region TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='forecast_group') THEN
    ALTER TABLE public.customers ADD COLUMN forecast_group TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='demand_profile') THEN
    ALTER TABLE public.customers ADD COLUMN demand_profile TEXT;
  END IF;
END $$;

-- Optional uniqueness for customer_code per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_customer_code
  ON public.customers(tenant_id, customer_code)
  WHERE customer_code IS NOT NULL;

-- Module tables
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  address_type TEXT NOT NULL CHECK (address_type IN ('billing', 'shipping', 'registered', 'returns')),
  line1 TEXT,
  line2 TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  role TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.customer_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for module tables
CREATE INDEX IF NOT EXISTS idx_customer_addresses_tenant_id ON public.customer_addresses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_tenant_id ON public.customer_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON public.customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_tenant_id ON public.customer_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON public.customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_attachments_tenant_id ON public.customer_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_attachments_customer_id ON public.customer_attachments(customer_id);

-- RLS (use existing tenant pattern)
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_attachments ENABLE ROW LEVEL SECURITY;

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
  USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can insert own customer addresses" ON public.customer_addresses
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can update own customer addresses" ON public.customer_addresses
  FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can view own customer contacts" ON public.customer_contacts
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can insert own customer contacts" ON public.customer_contacts
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can update own customer contacts" ON public.customer_contacts
  FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can view own customer notes" ON public.customer_notes
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can insert own customer notes" ON public.customer_notes
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can update own customer notes" ON public.customer_notes
  FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can view own customer attachments" ON public.customer_attachments
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can insert own customer attachments" ON public.customer_attachments
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can update own customer attachments" ON public.customer_attachments
  FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
