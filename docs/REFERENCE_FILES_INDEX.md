# Reference Files Index

**Last Updated:** April 2026  
**Status:** Current

---

## Quick Navigation

This document is the master index for all reference documentation in the Trity project.  
All documentation files live under `docs/` (or `docs/archive/` for historical records).

---

## Core Documentation

### [../README.md](../README.md)
- **Purpose:** Quick-start guide and feature overview
- **Contains:** Prerequisites, installation steps, environment setup, features list, project structure
- **Best for:** Getting started quickly

### [TRITY_CONTEXT.md](TRITY_CONTEXT.md)
- **Purpose:** Complete AI & developer context
- **Contains:** Project overview, architecture, coding conventions, database conventions, multi-tenant architecture, module system, file structure, development workflow
- **Best for:** Understanding the complete project structure and conventions

### [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)
- **Purpose:** Comprehensive technical documentation
- **Contains:** System architecture, core features, database schema, security implementation, API documentation
- **Best for:** Deep technical understanding of the platform

---

## Access Control & Security

### [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
- **Purpose:** Access Control System implementation details
- **Contains:** 3-tier RBAC, 15 granular permissions, role hierarchy (Member → Admin → Super Admin), files created, security features
- **Best for:** Understanding the RBAC system and how to use it

### [ACCESS_CONTROL_IMPLEMENTATION.md](ACCESS_CONTROL_IMPLEMENTATION.md)
- **Purpose:** Detailed implementation summary of access control
- **Contains:** Core components, permission types and hierarchy, permission checking, audit logging, feature flags, team groups, type safety
- **Best for:** Implementation details and integration patterns

### [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Purpose:** Quick reference for access control features
- **Contains:** New/enhanced pages, files added, 3-role system, quick-start examples, all 15 permissions, security rules, role capabilities, code examples, testing and deployment checklists
- **Best for:** Quick lookup and code examples

### [SUPABASE_SECURITY_FIXES.md](SUPABASE_SECURITY_FIXES.md)
- **Purpose:** Record of RLS and security fixes applied to Supabase
- **Best for:** Understanding what security issues were resolved and how

---

## Database & Schema

### [SUPABASE_INTEGRATION_STATUS.md](SUPABASE_INTEGRATION_STATUS.md)
- **Purpose:** Supabase integration and optimization status
- **Contains:** Database optimizations (14 migrations), performance improvements, TypeScript types integration, materialized views, index optimizations
- **Best for:** Understanding database setup and optimizations

### [SUPABASE_PERFORMANCE_FIXES.md](SUPABASE_PERFORMANCE_FIXES.md)
- **Purpose:** Record of query and index performance improvements applied to Supabase
- **Best for:** Understanding what performance issues were resolved and how

### [SCHEMA_RESEARCH_SUMMARY.md](SCHEMA_RESEARCH_SUMMARY.md)
- **Purpose:** Research notes on schema design decisions
- **Best for:** Understanding the rationale behind schema choices

### [SCHEMA_ISOLATION_NEXT_STEPS.md](SCHEMA_ISOLATION_NEXT_STEPS.md)
- **Purpose:** Planned next steps for schema isolation work
- **Best for:** Understanding outstanding schema isolation tasks

### [MIGRATION_GUIDE_depends_on_workstream_id.md](MIGRATION_GUIDE_depends_on_workstream_id.md)
- **Purpose:** Migration guide for converting `depends_on_workstream_id`
- **Contains:** Schema migration steps, backup procedures, conversion details
- **Best for:** Performing specific schema migrations

### [CUSTOMER_SCHEMA_FIX.md](CUSTOMER_SCHEMA_FIX.md)
- **Purpose:** Customer schema fixes and updates
- **Best for:** Understanding customer module schema changes

### [schema_analysis_report.md](schema_analysis_report.md)
- **Purpose:** Database schema analysis and documentation
- **Best for:** Understanding the overall database structure

### [supabase-multi-tenant-audit-report.md](supabase-multi-tenant-audit-report.md)
- **Purpose:** Multi-tenant architecture audit report
- **Best for:** Understanding multi-tenant implementation details

### [Supabase Schema Column Catalog.csv](Supabase%20Schema%20Column%20Catalog.csv)
- **Purpose:** Authoritative source of truth for the Supabase public schema — all tables, columns, and types
- **Best for:** Schema lookup and type verification

---

## Schema Isolation

### [SCHEMA_ISOLATION_IMPLEMENTATION.md](SCHEMA_ISOLATION_IMPLEMENTATION.md)
- **Purpose:** Implementation details for schema isolation infrastructure
- **Best for:** Understanding how tenant schema isolation is implemented

### [SCHEMA_ISOLATION_SETUP.md](SCHEMA_ISOLATION_SETUP.md)
- **Purpose:** Setup guide for schema isolation
- **Best for:** Configuring schema isolation in a new environment

---

## UI & Design

### [PAGE_HEADERS_COLOR_THEME.md](PAGE_HEADERS_COLOR_THEME.md)
- **Purpose:** Color theme configuration for page headers
- **Contains:** Color scheme definitions and usage guidelines
- **Best for:** UI styling and color consistency

---

## Supabase Tooling

### [SUPABASE_OPTIMIZATION_SUMMARY.md](SUPABASE_OPTIMIZATION_SUMMARY.md)
- **Purpose:** Complete optimization journey summary
- **Best for:** Understanding the full arc of Supabase optimizations

### [TYPE_GENERATION.md](TYPE_GENERATION.md)
- **Purpose:** Type generation setup and usage
- **Best for:** Running and maintaining the `npm run generate:types` workflow

### [AI_PROMPT.md](AI_PROMPT.md)
- **Purpose:** AI assistant prompt and guidelines for this project
- **Best for:** Priming an AI assistant with project context

---

## Historical Records (`archive/`)

The following documents capture point-in-time process summaries and are kept for audit/history purposes only. They are not maintained going forward.

| File | Description |
|------|-------------|
| [archive/CLEANUP_SUMMARY.md](archive/CLEANUP_SUMMARY.md) | Files deleted during the January 2026 cleanup, rationale, and impact analysis |
| [archive/FILES_MODIFIED_SUMMARY.md](archive/FILES_MODIFIED_SUMMARY.md) | Summary of files modified during a specific change batch |
| [archive/HOUSEKEEPING_AUDIT_SUMMARY.md](archive/HOUSEKEEPING_AUDIT_SUMMARY.md) | Code housekeeping audit — architecture verification, removed files, verified conventions |
| [archive/REFERENCE_UPDATE_COMPLETE.md](archive/REFERENCE_UPDATE_COMPLETE.md) | Confirmation record for a reference documentation update pass |
| [archive/REFERENCE_UPDATE_SUMMARY.md](archive/REFERENCE_UPDATE_SUMMARY.md) | Summary of changes made during a reference documentation update |
| [archive/SCHEMA_ISOLATION_IMPLEMENTATION_COMPLETE.md](archive/SCHEMA_ISOLATION_IMPLEMENTATION_COMPLETE.md) | Completion record for the schema isolation implementation |

---

## How to Use This Index

### For New Developers
1. Start with [../README.md](../README.md) for quick start
2. Read [TRITY_CONTEXT.md](TRITY_CONTEXT.md) for architecture overview
3. Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for feature overview

### For Access Control / Security
1. Read [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) first
2. Reference [ACCESS_CONTROL_IMPLEMENTATION.md](ACCESS_CONTROL_IMPLEMENTATION.md) for details
3. Use [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for code examples

### For Database Work
1. Check [SUPABASE_INTEGRATION_STATUS.md](SUPABASE_INTEGRATION_STATUS.md) for current state
2. Review [TYPE_GENERATION.md](TYPE_GENERATION.md) for type updates
3. Use migration guides as needed

### For Code Review
1. Verify against [TRITY_CONTEXT.md](TRITY_CONTEXT.md) conventions
2. Reference [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for architecture

---

## Quick Links

- **Type Definitions:** `types/access.ts`, `types/database.ts`
- **Permission Utils:** `lib/permissions.ts`
- **Audit System:** `lib/auditLog.ts`
- **Feature Flags:** `lib/featureFlags.ts`
- **Permission Hook:** `hooks/usePermissions.ts`
- **Access Pages:** `/users`, `/admin/tenants`
- **Migrations:** `supabase/migrations/`

---

**Document Version:** 2.0  
**Updated:** April 2026
