-- Seed missing calendar day rows for a tenant/year (SECURITY DEFINER for workspace super-admin).

CREATE OR REPLACE FUNCTION public.seed_tenant_calendar_year(
  p_tenant_id uuid,
  p_year integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_year IS NULL OR p_year < 2000 OR p_year > 2100 THEN
    RAISE EXCEPTION 'invalid year';
  END IF;

  IF p_tenant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = p_tenant_id) THEN
    RAISE EXCEPTION 'tenant not found';
  END IF;

  IF p_tenant_id IS DISTINCT FROM public.app_effective_tenant_id()
     AND NOT public.is_tenants_platform_super_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF public.app_impersonation_write_blocked() THEN
    RAISE EXCEPTION 'writes blocked while impersonating in read-only mode';
  END IF;

  INSERT INTO public.calendar (
    tenant_id,
    date,
    year,
    month,
    month_name,
    day,
    day_name,
    day_of_week,
    week_iso,
    week_monday,
    week_sunday,
    julian_day
  )
  SELECT
    p_tenant_id,
    gs::date,
    EXTRACT(YEAR FROM gs)::integer,
    EXTRACT(MONTH FROM gs)::integer,
    trim(to_char(gs, 'FMMonth')),
    EXTRACT(DAY FROM gs)::integer,
    trim(to_char(gs, 'FMDay')),
    EXTRACT(DOW FROM gs)::integer,
    EXTRACT(WEEK FROM gs)::integer,
    EXTRACT(WEEK FROM gs)::integer,
    ((EXTRACT(DOY FROM gs)::integer - 1) + EXTRACT(DOW FROM make_date(p_year, 1, 1))::integer) / 7 + 1,
    EXTRACT(DOY FROM gs)::integer
  FROM generate_series(
    make_date(p_year, 1, 1),
    (make_date(p_year, 1, 1) + interval '1 year - 1 day')::date,
    interval '1 day'
  ) AS gs
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.calendar c
    WHERE c.tenant_id = p_tenant_id
      AND c.date = gs::date
  );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_tenant_calendar_year(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_tenant_calendar_year(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_tenant_calendar_year(uuid, integer) TO service_role;

COMMENT ON FUNCTION public.seed_tenant_calendar_year(uuid, integer) IS
  'Insert missing day rows for tenant/year. Callable by tenant members or platform super admins.';
