-- DISABLED: Use 20260131130000_fix_security_warnings_v2.sql instead
-- This version uses ALTER FUNCTION which is safer and doesn't break dependencies
-- 
-- Original approach below (commented out):
/*
-- Functions without SECURITY DEFINER or fixed search_path can be vulnerable to
-- schema injection attacks. Always set search_path to 'public' (or restrict it).

-- 1. Fix generate_customer_code function
-- Drop all overloaded versions
DROP FUNCTION IF EXISTS public.generate_customer_code CASCADE;

CREATE OR REPLACE FUNCTION public.generate_customer_code(
  p_tenant_id uuid,
  p_prefix text DEFAULT 'CUST'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count INTEGER;
  v_code TEXT;
  v_max_attempts INTEGER := 100;
  v_attempt INTEGER := 0;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;
    
    -- Generate a code: PREFIX-YYYYMMDD-XXXXX (where X is sequential)
    SELECT COUNT(*) INTO v_count 
    FROM customers 
    WHERE tenant_id = p_tenant_id 
    AND customer_code LIKE p_prefix || '-%';
    
    v_code := p_prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((v_count + 1)::text, 5, '0');
    
    -- Check if code already exists
    IF NOT EXISTS (
      SELECT 1 FROM customers 
      WHERE tenant_id = p_tenant_id 
      AND customer_code = v_code
    ) THEN
      RETURN v_code;
    END IF;
    
    EXIT WHEN v_attempt >= v_max_attempts;
  END LOOP;
  
  -- Fallback: use UUID-based code if loop limit reached
  RETURN p_prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
END;
$$;

COMMENT ON FUNCTION public.generate_customer_code IS 'Generates unique customer codes. SECURITY DEFINER with fixed search_path.';

-- 2. Fix customers_before_insert trigger function
DROP FUNCTION IF EXISTS public.customers_before_insert() CASCADE;

CREATE OR REPLACE FUNCTION public.customers_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-generate customer code if not provided
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code := generate_customer_code(NEW.tenant_id, 'CUST');
  END IF;
  
  -- Set default status if not provided
  IF NEW.status IS NULL THEN
    NEW.status := 'active';
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.customers_before_insert IS 'Auto-generates customer codes on insert. SECURITY DEFINER with fixed search_path.';

-- Recreate the trigger
DROP TRIGGER IF EXISTS customers_before_insert_trigger ON public.customers;

CREATE TRIGGER customers_before_insert_trigger
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.customers_before_insert();

-- 3. Fix customers_before_update trigger function
DROP FUNCTION IF EXISTS public.customers_before_update() CASCADE;

CREATE OR REPLACE FUNCTION public.customers_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-generate customer code if it was cleared
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    IF OLD.customer_code IS NOT NULL THEN
      -- Keep the old code if updating to empty
      NEW.customer_code := OLD.customer_code;
    ELSE
      -- Generate new code
      NEW.customer_code := generate_customer_code(NEW.tenant_id, 'CUST');
    END IF;
  END IF;
  
  -- Update timestamp (handled by trigger, but explicit for clarity)
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.customers_before_update IS 'Maintains customer codes on update. SECURITY DEFINER with fixed search_path.';

-- Recreate the trigger
DROP TRIGGER IF EXISTS customers_before_update_trigger ON public.customers;

CREATE TRIGGER customers_before_update_trigger
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.customers_before_update();

-- ============================================================================
-- Fix Materialized View API Access (SECURITY)
-- ============================================================================
-- Materialized view cached_timezones should not be exposed over API
-- Solution: Revoke public access and add RLS

ALTER MATERIALIZED VIEW public.cached_timezones OWNER TO postgres;

-- Revoke all default access
REVOKE ALL ON public.cached_timezones FROM public;
REVOKE ALL ON public.cached_timezones FROM authenticated;
REVOKE ALL ON public.cached_timezones FROM anon;

-- Grant read-only access to authenticated users only
GRANT SELECT ON public.cached_timezones TO authenticated;

-- Optional: If admins need this, grant specific role
-- GRANT SELECT ON public.cached_timezones TO admin_role;

COMMENT ON MATERIALIZED VIEW public.cached_timezones IS 'Cached timezone reference data. Access restricted to authenticated users only.';
*/
