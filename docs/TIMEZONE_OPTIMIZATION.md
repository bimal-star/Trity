# Timezone Optimization Reference

This project uses a materialized view (`public.cached_timezones`) to avoid repeated slow reads from `pg_timezone_names`.

## Why This Exists

- Improves timezone query performance
- Avoids repeated system catalog scans
- Provides a stable table-like source for application queries

## Query Example

```ts
const { data, error } = await supabase
  .from('cached_timezones')
  .select('name, abbrev, utc_offset, is_dst')
  .order('name', { ascending: true });
```

## Manual Refresh

Run in Supabase SQL editor:

```sql
SELECT public.refresh_cached_timezones();
```

## Optional Scheduled Refresh

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'refresh_cached_timezones',
  '0 2 * * 0',
  $$SELECT public.refresh_cached_timezones()$$
);
```

## Related Files

- [SUPABASE_OPTIMIZATION_SUMMARY.md](SUPABASE_OPTIMIZATION_SUMMARY.md)
- [../SUPABASE_INTEGRATION_STATUS.md](../SUPABASE_INTEGRATION_STATUS.md)
- [../supabase/migrations/README.md](../supabase/migrations/README.md)
