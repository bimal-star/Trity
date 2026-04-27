-- Switch supplier_code format from SUP-YYYYMMDD-##### to SUP-YYYY-#####
-- Applies to newly generated codes via trigger/function.

CREATE OR REPLACE FUNCTION public.generate_supplier_code(p_tenant_id uuid)
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

    SELECT COUNT(*) INTO v_count
    FROM public.suppliers
    WHERE tenant_id = p_tenant_id
      AND supplier_code IS NOT NULL
      AND supplier_code LIKE 'SUP-%';

    v_code := 'SUP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((v_count + 1)::text, 5, '0');

    IF NOT EXISTS (
      SELECT 1
      FROM public.suppliers
      WHERE tenant_id = p_tenant_id
        AND supplier_code = v_code
    ) THEN
      RETURN v_code;
    END IF;

    EXIT WHEN v_attempt >= v_max_attempts;
  END LOOP;

  RETURN 'SUP-' || TO_CHAR(NOW(), 'YYYY') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
END;
$$;

