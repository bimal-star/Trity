# Supabase Migrations

This directory contains ordered SQL migrations for schema, RLS, and performance work.

## How to Apply

- Preferred: `supabase db push`
- Manual: apply files in filename order (timestamp prefix)

## Migration Catalog

| File                                                 | Purpose                                   |
| ---------------------------------------------------- | ----------------------------------------- |
| `20260130150000_extend_customers_erp.sql`            | Extend customer ERP-related schema        |
| `20260130160000_remove_customer_first_last_name.sql` | Remove legacy customer name columns       |
| `20260130170000_add_customer_code_generator.sql`     | Add customer code generator logic         |
| `20260130180000_customers_rls_policies.sql`          | Add/adjust customer RLS policies          |
| `20260130190000_fix_audit_trigger_for_customers.sql` | Fix customer audit trigger behavior       |
| `20260131000000_optimize_rls_auth_calls.sql`         | Optimize auth calls in RLS predicates     |
| `20260131100000_fix_duplicate_indexes.sql`           | Remove/fix duplicate indexes              |
| `20260131110000_consolidate_duplicate_policies.sql`  | Consolidate duplicated policy definitions |
| `20260131120000_fix_security_warnings.sql`           | Resolve security warning set (v1)         |
| `20260131130000_fix_security_warnings_v2.sql`        | Resolve remaining security warnings (v2)  |
| `20260131140000_drop_workstreams_tables.sql`         | Remove obsolete workstream table set      |
| `20260131150000_create_user_module_access.sql`       | Create user module access controls        |
| `20260131160000_restructure_access_control.sql`      | Restructure RBAC/access-control schema    |
| `20260201000000_schema_isolation_infrastructure.sql` | Add schema isolation infrastructure       |

## Conventions

- One logical change per migration
- Use `public.` schema qualification for clarity
- Include safe guards (`IF EXISTS` / `IF NOT EXISTS`) where possible
- Keep RLS policies explicit and easy to audit

## Related Docs

- [../../SUPABASE_INTEGRATION_STATUS.md](../../SUPABASE_INTEGRATION_STATUS.md)
- [../../docs/SUPABASE_OPTIMIZATION_SUMMARY.md](../../docs/SUPABASE_OPTIMIZATION_SUMMARY.md)
- [../../docs/TYPE_GENERATION.md](../../docs/TYPE_GENERATION.md)
