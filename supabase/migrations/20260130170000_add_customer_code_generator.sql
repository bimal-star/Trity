-- Add trigger to auto-generate customer codes in format CUS-YYYY-XXXXXX

-- Create sequence for customer code generation per tenant
CREATE SEQUENCE IF NOT EXISTS customer_code_seq START 1 INCREMENT 1;

-- Create function to generate customer code
CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_code TEXT;
BEGIN
  -- Only generate if customer_code is null
  IF NEW.customer_code IS NULL THEN
    v_year := TO_CHAR(NOW(), 'YYYY');
    v_sequence := nextval('customer_code_seq');
    v_code := 'CUS-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
    NEW.customer_code := v_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_generate_customer_code ON public.customers;

-- Create trigger on customers table
CREATE TRIGGER trigger_generate_customer_code
BEFORE INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.generate_customer_code();
