-- Remove first_name and last_name from customers table
-- These belong in customer_contacts table only
-- For individual customers, use legal_name field

DO $$
BEGIN
  -- Drop first_name if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.customers DROP COLUMN first_name;
  END IF;

  -- Drop last_name if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.customers DROP COLUMN last_name;
  END IF;
END $$;

-- Add comment to clarify the distinction
COMMENT ON TABLE public.customers IS 'Business entity master data. Use legal_name for company name or individual full name. Contact persons belong in customer_contacts table.';
COMMENT ON TABLE public.customer_contacts IS 'Individual contact persons associated with customer business entities.';
