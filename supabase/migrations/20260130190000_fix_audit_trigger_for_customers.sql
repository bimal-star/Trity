-- Fix audit trigger that references removed first_name/last_name columns
-- This migration drops ALL triggers and functions that might reference those fields

-- Drop ALL triggers on customers table (except system triggers)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'customers'
    AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND NOT t.tgisinternal
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.customers CASCADE';
  END LOOP;
END $$;

-- Drop any audit-related functions that might exist
DROP FUNCTION IF EXISTS public.audit_customers_changes() CASCADE;
DROP FUNCTION IF EXISTS public.log_customer_changes() CASCADE;
DROP FUNCTION IF EXISTS public.handle_customer_audit() CASCADE;

-- Only recreate the audit trigger if audit_log table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
    
    -- Create a new generic audit function
    CREATE OR REPLACE FUNCTION public.audit_customers_changes()
    RETURNS TRIGGER AS $func$
    BEGIN
      INSERT INTO public.audit_log (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_by,
        tenant_id
      ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        COALESCE(NEW.updated_by, OLD.updated_by, NEW.created_by, OLD.created_by),
        COALESCE(NEW.tenant_id, OLD.tenant_id)
      );
      
      RETURN COALESCE(NEW, OLD);
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Recreate the trigger
    CREATE TRIGGER audit_customers_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_customers_changes();
    
  END IF;
END $$;
