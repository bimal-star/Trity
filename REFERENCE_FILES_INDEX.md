# Reference Files Index

**Last Updated:** April 4, 2026  
**Status:** Tidied and current

---

## Overview

The repository now keeps only the core entrypoint documents at the root:

- [README.md](README.md) - quick start and project overview
- [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) - deep technical guide
- [TRITY_CONTEXT.md](TRITY_CONTEXT.md) - consolidated project context for contributors and AI tooling
- [REFERENCE_FILES_INDEX.md](REFERENCE_FILES_INDEX.md) - this index

Implementation, database, and historical notes now live under `docs/` so the root stays easier to scan.

---

## Documentation Layout

### `docs/reference/` - Active implementation guides

- [docs/reference/IMPLEMENTATION_GUIDE.md](docs/reference/IMPLEMENTATION_GUIDE.md)
- [docs/reference/ACCESS_CONTROL_IMPLEMENTATION.md](docs/reference/ACCESS_CONTROL_IMPLEMENTATION.md)
- [docs/reference/QUICK_REFERENCE.md](docs/reference/QUICK_REFERENCE.md)
- [docs/reference/PAGE_HEADERS_COLOR_THEME.md](docs/reference/PAGE_HEADERS_COLOR_THEME.md)

### `docs/database/` - Schema, migrations, and Supabase notes

- [docs/database/SUPABASE_INTEGRATION_STATUS.md](docs/database/SUPABASE_INTEGRATION_STATUS.md)
- [docs/database/SUPABASE_OPTIMIZATION_SUMMARY.md](docs/database/SUPABASE_OPTIMIZATION_SUMMARY.md)
- [docs/database/TYPE_GENERATION.md](docs/database/TYPE_GENERATION.md)
- [docs/database/SCHEMA_ISOLATION_SETUP.md](docs/database/SCHEMA_ISOLATION_SETUP.md)
- [docs/database/SCHEMA_ISOLATION_IMPLEMENTATION.md](docs/database/SCHEMA_ISOLATION_IMPLEMENTATION.md)
- [docs/database/SCHEMA_ISOLATION_NEXT_STEPS.md](docs/database/SCHEMA_ISOLATION_NEXT_STEPS.md)
- [docs/database/SCHEMA_RESEARCH_SUMMARY.md](docs/database/SCHEMA_RESEARCH_SUMMARY.md)
- [docs/database/MIGRATION_GUIDE_depends_on_workstream_id.md](docs/database/MIGRATION_GUIDE_depends_on_workstream_id.md)
- [docs/database/CUSTOMER_SCHEMA_FIX.md](docs/database/CUSTOMER_SCHEMA_FIX.md)
- [docs/database/SUPABASE_PERFORMANCE_FIXES.md](docs/database/SUPABASE_PERFORMANCE_FIXES.md)
- [docs/database/SUPABASE_SECURITY_FIXES.md](docs/database/SUPABASE_SECURITY_FIXES.md)

### `docs/archive/` - Historical summaries and audits

- [docs/archive/CLEANUP_SUMMARY.md](docs/archive/CLEANUP_SUMMARY.md)
- [docs/archive/FILES_MODIFIED_SUMMARY.md](docs/archive/FILES_MODIFIED_SUMMARY.md)
- [docs/archive/HOUSEKEEPING_AUDIT_SUMMARY.md](docs/archive/HOUSEKEEPING_AUDIT_SUMMARY.md)
- [docs/archive/REFERENCE_UPDATE_COMPLETE.md](docs/archive/REFERENCE_UPDATE_COMPLETE.md)
- [docs/archive/REFERENCE_UPDATE_SUMMARY.md](docs/archive/REFERENCE_UPDATE_SUMMARY.md)
- [docs/archive/SCHEMA_ISOLATION_IMPLEMENTATION_COMPLETE.md](docs/archive/SCHEMA_ISOLATION_IMPLEMENTATION_COMPLETE.md)
- [docs/archive/schema_analysis_report.md](docs/archive/schema_analysis_report.md)
- [docs/archive/supabase-multi-tenant-audit-report.md](docs/archive/supabase-multi-tenant-audit-report.md)

### Other documentation

- [docs/AI_PROMPT.md](docs/AI_PROMPT.md) - prompt for rebuilding `TRITY_CONTEXT.md`
- [supabase/migrations/](supabase/migrations/) - canonical SQL migration directory

---

## Recommended Starting Points

### New to the project

1. Start with [README.md](README.md)
2. Use [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for architecture
3. Use [TRITY_CONTEXT.md](TRITY_CONTEXT.md) for conventions and current context

### Working on permissions or UI behavior

1. Read [docs/reference/IMPLEMENTATION_GUIDE.md](docs/reference/IMPLEMENTATION_GUIDE.md)
2. Keep [docs/reference/QUICK_REFERENCE.md](docs/reference/QUICK_REFERENCE.md) nearby
3. Review [docs/reference/PAGE_HEADERS_COLOR_THEME.md](docs/reference/PAGE_HEADERS_COLOR_THEME.md) for styling conventions

### Working on Supabase or schema changes

1. Review [docs/database/SUPABASE_INTEGRATION_STATUS.md](docs/database/SUPABASE_INTEGRATION_STATUS.md)
2. Check [docs/database/TYPE_GENERATION.md](docs/database/TYPE_GENERATION.md)
3. Apply or inspect migrations in [supabase/migrations/](supabase/migrations/)

### Looking for older context

Use `docs/archive/` for historical summaries that explain previous cleanup passes, implementation milestones, or audit notes. Those files are retained for reference, but they should not be treated as the primary source of truth over the current docs and code.

---

## Notes

- SQL files intentionally remain under `supabase/migrations/` because that is the standard Supabase migration location.
- The root documentation is intentionally minimal so the main app directories are easier to find.
- If you add a new long-form guide, place it under the most relevant `docs/` subdirectory and update this index.
