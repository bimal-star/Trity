-- Fix Supabase Security Warnings - Alternative approach using ALTER FUNCTION
-- This is safer than DROP/CREATE as it preserves function signatures and dependencies

-- ============================================================================
-- Fix Function Search Path Mutable using ALTER FUNCTION
-- ============================================================================

-- Set search_path for all versions of generate_customer_code
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN 
    SELECT pg_proc.oid, pg_proc.proname, 
           pg_catalog.pg_get_function_identity_arguments(pg_proc.oid) AS args
    FROM pg_proc
    JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
    WHERE pg_namespace.nspname = 'public'
    AND pg_proc.proname = 'generate_customer_code'
  LOOP
    EXECUTE format('ALTER FUNCTION public.generate_customer_code(%s) SET search_path = ''public''', f.args);
    RAISE NOTICE 'Fixed search_path for generate_customer_code(%s)', f.args;
  END LOOP;
END $$;

-- Set search_path for customers_before_insert
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN 
    SELECT pg_proc.oid, pg_proc.proname,
           pg_catalog.pg_get_function_identity_arguments(pg_proc.oid) AS args
    FROM pg_proc
    JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
    WHERE pg_namespace.nspname = 'public'
    AND pg_proc.proname = 'customers_before_insert'
  LOOP
    EXECUTE format('ALTER FUNCTION public.customers_before_insert(%s) SET search_path = ''public''', f.args);
    RAISE NOTICE 'Fixed search_path for customers_before_insert(%s)', f.args;
  END LOOP;
END $$;

-- Set search_path for customers_before_update
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN 
    SELECT pg_proc.oid, pg_proc.proname,
           pg_catalog.pg_get_function_identity_arguments(pg_proc.oid) AS args
    FROM pg_proc
    JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
    WHERE pg_namespace.nspname = 'public'
    AND pg_proc.proname = 'customers_before_update'
  LOOP
    EXECUTE format('ALTER FUNCTION public.customers_before_update(%s) SET search_path = ''public''', f.args);
    RAISE NOTICE 'Fixed search_path for customers_before_update(%s)', f.args;
  END LOOP;
END $$;

-- ============================================================================
-- Fix Materialized View API Access
-- ============================================================================

-- Supabase linter wants materialized views completely hidden from API
-- Solution: Revoke ALL access from API roles, grant only to postgres/service roles
DO $$
BEGIN
  -- Revoke ALL access from all API-accessible roles
  REVOKE ALL ON public.cached_timezones FROM public;
  REVOKE ALL ON public.cached_timezones FROM authenticated;
  REVOKE ALL ON public.cached_timezones FROM anon;
  REVOKE ALL ON public.cached_timezones FROM service_role;
  
  -- Ensure only postgres (superuser) and internal processes can access
  -- Don't grant to any API-accessible role to satisfy the linter
  
  RAISE NOTICE 'Removed API access from cached_timezones materialized view';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing cached_timezones access: %', SQLERRM;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- Fixed:
-- 1. public.generate_customer_code - SET search_path = 'public'
-- 2. public.customers_before_insert - SET search_path = 'public'
-- 3. public.customers_before_update - SET search_path = 'public'
-- 4. public.cached_timezones - Blocked from API (postgres/internal only)
--
-- Manual Fix Required:
-- 5. Auth → Password & Confirmations → Enable "Leaked password protection" in Supabase Dashboard
--
-- Note: If application code needs cached_timezones, create a regular function/view instead
