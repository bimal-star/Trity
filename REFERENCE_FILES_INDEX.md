# Reference Files Index

**Last Updated:** April 4, 2026

This is the documentation map for the repository after the cleanup that moved
supporting material out of the project root.

## Start here

- [README.md](README.md) - setup, quick start, and project overview
- [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) - broad technical guide
- [TRITY_CONTEXT.md](TRITY_CONTEXT.md) - deep architecture and conventions
- [docs/README.md](docs/README.md) - documentation directory map

## Documentation layout

### Root

These files stay at the repository root because they are the main entry points:

- [README.md](README.md)
- [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)
- [TRITY_CONTEXT.md](TRITY_CONTEXT.md)
- [REFERENCE_FILES_INDEX.md](REFERENCE_FILES_INDEX.md)

### `docs/`

Active long-form documentation that is still part of the current working set:

- [docs/AI_PROMPT.md](docs/AI_PROMPT.md)
- [docs/SCHEMA_ISOLATION_IMPLEMENTATION.md](docs/SCHEMA_ISOLATION_IMPLEMENTATION.md)
- [docs/SCHEMA_ISOLATION_SETUP.md](docs/SCHEMA_ISOLATION_SETUP.md)
- [docs/SUPABASE_OPTIMIZATION_SUMMARY.md](docs/SUPABASE_OPTIMIZATION_SUMMARY.md)
- [docs/TYPE_GENERATION.md](docs/TYPE_GENERATION.md)

### `docs/reference/`

Reference material and implementation notes that support day-to-day work:

- [docs/reference/ACCESS_CONTROL_IMPLEMENTATION.md](docs/reference/ACCESS_CONTROL_IMPLEMENTATION.md)
- [docs/reference/CUSTOMER_SCHEMA_FIX.md](docs/reference/CUSTOMER_SCHEMA_FIX.md)
- [docs/reference/IMPLEMENTATION_GUIDE.md](docs/reference/IMPLEMENTATION_GUIDE.md)
- [docs/reference/MIGRATION_GUIDE_depends_on_workstream_id.md](docs/reference/MIGRATION_GUIDE_depends_on_workstream_id.md)
- [docs/reference/PAGE_HEADERS_COLOR_THEME.md](docs/reference/PAGE_HEADERS_COLOR_THEME.md)
- [docs/reference/QUICK_REFERENCE.md](docs/reference/QUICK_REFERENCE.md)
- [docs/reference/SUPABASE_INTEGRATION_STATUS.md](docs/reference/SUPABASE_INTEGRATION_STATUS.md)
- [docs/reference/SUPABASE_PERFORMANCE_FIXES.md](docs/reference/SUPABASE_PERFORMANCE_FIXES.md)
- [docs/reference/SUPABASE_SECURITY_FIXES.md](docs/reference/SUPABASE_SECURITY_FIXES.md)

### `docs/reports/`

Point-in-time analysis and audit outputs:

- [docs/reports/schema_analysis_report.md](docs/reports/schema_analysis_report.md)
- [docs/reports/supabase-multi-tenant-audit-report.md](docs/reports/supabase-multi-tenant-audit-report.md)
- [SCHEMA_RESEARCH_SUMMARY.md](SCHEMA_RESEARCH_SUMMARY.md)

### `docs/archive/`

Historical summaries and status snapshots that are useful for context, but are
not primary entry points anymore:

- [docs/archive/CLEANUP_SUMMARY.md](docs/archive/CLEANUP_SUMMARY.md)
- [docs/archive/FILES_MODIFIED_SUMMARY.md](docs/archive/FILES_MODIFIED_SUMMARY.md)
- [docs/archive/HOUSEKEEPING_AUDIT_SUMMARY.md](docs/archive/HOUSEKEEPING_AUDIT_SUMMARY.md)
- [docs/archive/REFERENCE_UPDATE_COMPLETE.md](docs/archive/REFERENCE_UPDATE_COMPLETE.md)
- [docs/archive/REFERENCE_UPDATE_SUMMARY.md](docs/archive/REFERENCE_UPDATE_SUMMARY.md)
- [docs/archive/SCHEMA_ISOLATION_IMPLEMENTATION_COMPLETE.md](docs/archive/SCHEMA_ISOLATION_IMPLEMENTATION_COMPLETE.md)
- [docs/archive/SCHEMA_ISOLATION_NEXT_STEPS.md](docs/archive/SCHEMA_ISOLATION_NEXT_STEPS.md)

## Recommended reading by task

### New to the project

1. [README.md](README.md)
2. [TRITY_CONTEXT.md](TRITY_CONTEXT.md)
3. [docs/README.md](docs/README.md)

### Access control work

1. [docs/reference/IMPLEMENTATION_GUIDE.md](docs/reference/IMPLEMENTATION_GUIDE.md)
2. [docs/reference/ACCESS_CONTROL_IMPLEMENTATION.md](docs/reference/ACCESS_CONTROL_IMPLEMENTATION.md)
3. [docs/reference/QUICK_REFERENCE.md](docs/reference/QUICK_REFERENCE.md)

### Supabase and schema work

1. [docs/reference/SUPABASE_INTEGRATION_STATUS.md](docs/reference/SUPABASE_INTEGRATION_STATUS.md)
2. [docs/TYPE_GENERATION.md](docs/TYPE_GENERATION.md)
3. [`supabase/migrations/`](supabase/migrations/)
4. [docs/reports/schema_analysis_report.md](docs/reports/schema_analysis_report.md)

### Reviewing older decisions

1. [docs/archive/HOUSEKEEPING_AUDIT_SUMMARY.md](docs/archive/HOUSEKEEPING_AUDIT_SUMMARY.md)
2. [docs/archive/CLEANUP_SUMMARY.md](docs/archive/CLEANUP_SUMMARY.md)
3. [docs/archive/REFERENCE_UPDATE_SUMMARY.md](docs/archive/REFERENCE_UPDATE_SUMMARY.md)

## Notes

- SQL migrations are kept under `supabase/migrations/`; there is no active top-level `sql/` directory.
- The project root is intentionally limited to the main entry-point docs.
- Historical summaries remain in the repo, but live under `docs/archive/`.
