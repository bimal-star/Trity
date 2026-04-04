# Reference Files Index

**Last Updated:** April 4, 2026  
**Status:** Complete and Current

---

## 📋 Quick Navigation

This document serves as a master index for all reference documentation in the Trity project. Use this to find the right file for your needs.

---

## 📁 Documentation Structure

All documentation (except this index, README, and TRITY_CONTEXT) lives under `docs/`:

```
docs/
├── architecture/        # Core architecture, RBAC, and system design
├── database/            # Supabase schema, migrations, and performance
├── schema-isolation/    # Multi-tenant schema isolation feature
├── design/              # UI/UX design guidelines and color themes
├── guides/              # Developer guides, AI prompts, type generation
└── history/             # Changelogs, audits, and cleanup summaries
```

**SQL migrations** live in `supabase/migrations/` (timestamped Supabase migration files).

---

## 🏠 Core Documentation

### [TRITY_CONTEXT.md](TRITY_CONTEXT.md)
- **Version:** 0.2.0 (Updated Jan 31, 2026)
- **Purpose:** Complete AI & developer context
- **Contains:** Project overview, architecture, coding conventions, database conventions, multi-tenant architecture, module system, file structure, development workflow
- **Best for:** Understanding the complete project structure and conventions

### [README.md](README.md)
- **Purpose:** Quick start guide and feature overview
- **Contains:** Prerequisites, installation steps, environment setup, features list, project structure
- **Best for:** Getting started with the project quickly

### [docs/architecture/PROJECT_DOCUMENTATION.md](docs/architecture/PROJECT_DOCUMENTATION.md)
- **Version:** 1.1 (Updated Jan 31, 2026)
- **Purpose:** Comprehensive technical documentation
- **Contains:** System architecture, core features, database schema, security implementation, API documentation
- **Best for:** Deep technical understanding of the platform

---

## 🔐 Access Control & Security

### [docs/architecture/IMPLEMENTATION_GUIDE.md](docs/architecture/IMPLEMENTATION_GUIDE.md)
- **Last Updated:** January 31, 2026
- **Purpose:** Access Control System implementation details
- **Contains:** 
  - What was implemented (3-tier RBAC)
  - 15 granular permissions
  - Role hierarchy (Member → Admin → Super Admin)
  - Files created for access control
  - Security features and privilege escalation prevention
- **Best for:** Understanding the RBAC system and how to use it

### [docs/architecture/ACCESS_CONTROL_IMPLEMENTATION.md](docs/architecture/ACCESS_CONTROL_IMPLEMENTATION.md)
- **Last Updated:** January 31, 2026
- **Purpose:** Detailed implementation summary of access control
- **Contains:**
  - Core components built
  - Permission types and hierarchy
  - Permission checking system
  - Audit logging implementation
  - Feature flags system
  - Team groups management
  - Type safety and security features
- **Best for:** Implementation details and integration patterns

### [docs/architecture/QUICK_REFERENCE.md](docs/architecture/QUICK_REFERENCE.md)
- **Last Updated:** January 31, 2026
- **Purpose:** Quick reference for access control features
- **Contains:**
  - New pages and enhanced pages
  - Files added summary
  - Three-role system overview
  - Quick start examples
  - All 15 permissions listed
  - Security rules
  - Role capabilities
  - Common tasks with code examples
  - Testing checklist
  - Deployment checklist
- **Best for:** Quick lookup and code examples

---

## 🗄️ Database & Schema

### [docs/database/SUPABASE_INTEGRATION_STATUS.md](docs/database/SUPABASE_INTEGRATION_STATUS.md)
- **Last Updated:** January 31, 2026
- **Purpose:** Supabase integration and optimization status
- **Contains:**
  - Database optimizations (25 migrations)
  - Performance improvements (99.99% query improvement)
  - TypeScript types integration
  - Materialized views setup
  - Index optimization details
- **Best for:** Understanding database setup and optimizations

### [docs/database/MIGRATION_GUIDE_depends_on_workstream_id.md](docs/database/MIGRATION_GUIDE_depends_on_workstream_id.md)
- **Purpose:** Migration guide for converting depends_on_workstream_id
- **Contains:** Schema migration steps, backup procedures, conversion details
- **Best for:** Performing specific schema migrations

### [docs/database/schema_analysis_report.md](docs/database/schema_analysis_report.md)
- **Purpose:** Database schema analysis and documentation
- **Best for:** Understanding the database structure

### [docs/database/supabase-multi-tenant-audit-report.md](docs/database/supabase-multi-tenant-audit-report.md)
- **Purpose:** Multi-tenant architecture audit report
- **Best for:** Understanding multi-tenant implementation details

### [docs/database/SUPABASE_PERFORMANCE_FIXES.md](docs/database/SUPABASE_PERFORMANCE_FIXES.md)
- **Purpose:** RLS auth call optimization and duplicate index removal
- **Best for:** Understanding performance-related migrations

### [docs/database/SUPABASE_SECURITY_FIXES.md](docs/database/SUPABASE_SECURITY_FIXES.md)
- **Purpose:** Security warning fixes (function search paths, materialized view access)
- **Best for:** Understanding security-related migrations

### [docs/database/SUPABASE_OPTIMIZATION_SUMMARY.md](docs/database/SUPABASE_OPTIMIZATION_SUMMARY.md)
- **Purpose:** Executive summary of security/performance migrations and phases
- **Best for:** High-level overview of optimization journey

### [docs/database/SCHEMA_RESEARCH_SUMMARY.md](docs/database/SCHEMA_RESEARCH_SUMMARY.md)
- **Purpose:** Users/groups/access schema analysis vs types/CSV
- **Best for:** Understanding schema gaps between TypeScript types and actual database

### [docs/database/CUSTOMER_SCHEMA_FIX.md](docs/database/CUSTOMER_SCHEMA_FIX.md)
- **Purpose:** Why first_name/last_name were removed from customers table
- **Best for:** Understanding customer module schema changes

### Schema Source of Truth
- **File:** [`docs/database/Supabase Snippet Public Schema Column Catalog.csv`](docs/database/Supabase%20Snippet%20Public%20Schema%20Column%20Catalog.csv)
- **Purpose:** Authoritative column-level schema export from Supabase
- **Best for:** Verifying database column types, constraints, and structure

---

## 🏗️ Schema Isolation (Multi-Tenant)

### [docs/schema-isolation/SCHEMA_ISOLATION_IMPLEMENTATION.md](docs/schema-isolation/SCHEMA_ISOLATION_IMPLEMENTATION.md)
- **Purpose:** Complete implementation guide for schema-per-tenant
- **Best for:** Deep technical understanding of schema isolation architecture

### [docs/schema-isolation/SCHEMA_ISOLATION_SETUP.md](docs/schema-isolation/SCHEMA_ISOLATION_SETUP.md)
- **Purpose:** Step-by-step setup guide for creating tenant schemas
- **Best for:** Manual SQL setup steps in Supabase dashboard

### [docs/schema-isolation/SCHEMA_ISOLATION_IMPLEMENTATION_COMPLETE.md](docs/schema-isolation/SCHEMA_ISOLATION_IMPLEMENTATION_COMPLETE.md)
- **Purpose:** Executive summary of what was implemented
- **Best for:** Quick overview of schema isolation changes

### [docs/schema-isolation/SCHEMA_ISOLATION_NEXT_STEPS.md](docs/schema-isolation/SCHEMA_ISOLATION_NEXT_STEPS.md)
- **Purpose:** What's done and what manual steps remain
- **Best for:** Knowing what to do next after implementation

### [docs/schema-isolation/FILES_MODIFIED_SUMMARY.md](docs/schema-isolation/FILES_MODIFIED_SUMMARY.md)
- **Purpose:** Line-by-line list of all files changed for schema isolation
- **Best for:** Code review of schema isolation changes

---

## 🎨 UI & Design

### [docs/design/PAGE_HEADERS_COLOR_THEME.md](docs/design/PAGE_HEADERS_COLOR_THEME.md)
- **Purpose:** Color theme configuration for page headers
- **Contains:** Color scheme definitions and usage guidelines
- **Best for:** UI styling and color consistency

---

## 📚 Guides & Tools

### [docs/guides/AI_PROMPT.md](docs/guides/AI_PROMPT.md)
- **Purpose:** Prompt template to regenerate TRITY_CONTEXT.md
- **Best for:** AI assistant configuration

### [docs/guides/TYPE_GENERATION.md](docs/guides/TYPE_GENERATION.md)
- **Purpose:** How `npm run generate:types` works (fallback vs CLI)
- **Best for:** Understanding and running type generation

---

## 📊 Project Status & History

### [docs/history/CLEANUP_SUMMARY.md](docs/history/CLEANUP_SUMMARY.md)
- **Date:** January 26, 2026 (Last Reviewed: Jan 31, 2026)
- **Purpose:** Project cleanup summary
- **Contains:**
  - 20 files deleted
  - Cleanup strategy and rationale
  - Impact analysis
- **Best for:** Understanding what was removed and why

### [docs/history/HOUSEKEEPING_AUDIT_SUMMARY.md](docs/history/HOUSEKEEPING_AUDIT_SUMMARY.md)
- **Date:** January 26, 2025 (Last Updated: Jan 31, 2026)
- **Purpose:** Code housekeeping audit
- **Contains:**
  - Architecture verification
  - Removed unused files
  - Verified conventions
- **Best for:** Code quality assurance overview

### [docs/history/REFERENCE_UPDATE_COMPLETE.md](docs/history/REFERENCE_UPDATE_COMPLETE.md)
- **Purpose:** Detailed changelog of January 31, 2026 reference file update
- **Best for:** Understanding what documentation was updated and when

### [docs/history/REFERENCE_UPDATE_SUMMARY.md](docs/history/REFERENCE_UPDATE_SUMMARY.md)
- **Purpose:** Summary of reference file updates
- **Best for:** Quick overview of documentation update scope

---

## 🗃️ SQL Migrations

All SQL migration files live in `supabase/migrations/` as timestamped Supabase migrations:

| Migration | Purpose |
|-----------|---------|
| `20260130150000_extend_customers_erp.sql` | Extend customers with ERP-style enums and columns |
| `20260130160000_remove_customer_first_last_name.sql` | Remove first_name/last_name from customers |
| `20260130170000_add_customer_code_generator.sql` | Sequence + trigger for CUS-YYYY-XXXXXX codes |
| `20260130180000_customers_rls_policies.sql` | RLS policies for customers |
| `20260130190000_fix_audit_trigger_for_customers.sql` | Reconcile triggers after column removal |
| `20260131000000_optimize_rls_auth_calls.sql` | Wrap auth.uid() in subqueries for RLS performance |
| `20260131100000_fix_duplicate_indexes.sql` | Drop duplicate index on workstream_tasks |
| `20260131110000_consolidate_duplicate_policies.sql` | Consolidate permissive RLS policies |
| `20260131120000_fix_security_warnings.sql` | Disabled stub; points to v2 migration |
| `20260131130000_fix_security_warnings_v2.sql` | Harden function search_path |
| `20260131140000_drop_workstreams_tables.sql` | Drop workstreams/workstream_tasks tables |
| `20260131150000_create_user_module_access.sql` | Create user_module_access + RLS |
| `20260131160000_restructure_access_control.sql` | Groups, module access, profile columns |
| `20260201000000_schema_isolation_infrastructure.sql` | Tenant schema tracking, provisioning log |

---

## 🎯 How to Use This Index

### For New Developers:
1. Start with [README.md](README.md) for quick start
2. Read [TRITY_CONTEXT.md](TRITY_CONTEXT.md) for architecture overview
3. Check [docs/architecture/QUICK_REFERENCE.md](docs/architecture/QUICK_REFERENCE.md) for feature overview

### For Access Control/Security:
1. Read [docs/architecture/IMPLEMENTATION_GUIDE.md](docs/architecture/IMPLEMENTATION_GUIDE.md) first
2. Reference [docs/architecture/ACCESS_CONTROL_IMPLEMENTATION.md](docs/architecture/ACCESS_CONTROL_IMPLEMENTATION.md) for details
3. Use [docs/architecture/QUICK_REFERENCE.md](docs/architecture/QUICK_REFERENCE.md) for code examples

### For Database Work:
1. Check [docs/database/SUPABASE_INTEGRATION_STATUS.md](docs/database/SUPABASE_INTEGRATION_STATUS.md) for current state
2. Review [docs/guides/TYPE_GENERATION.md](docs/guides/TYPE_GENERATION.md) for type updates
3. Use migration guides as needed

### For Code Review:
1. Verify against [TRITY_CONTEXT.md](TRITY_CONTEXT.md) conventions
2. Check [docs/history/HOUSEKEEPING_AUDIT_SUMMARY.md](docs/history/HOUSEKEEPING_AUDIT_SUMMARY.md) for standards
3. Reference [docs/architecture/PROJECT_DOCUMENTATION.md](docs/architecture/PROJECT_DOCUMENTATION.md) for architecture

---

## ✅ What Has Been Built (As of January 31, 2026)

### Core Features
- ✅ Role-Based Access Control (RBAC) with 3-tier hierarchy
- ✅ 15 granular permissions system
- ✅ Permission matrix with validation
- ✅ Audit logging on all user actions
- ✅ Feature flags per tenant
- ✅ Team groups management
- ✅ Editable user access levels
- ✅ Dynamic navigation with Supabase

### Product Management
- ✅ Product CRUD with categories
- ✅ Product variants management
- ✅ Bills of Materials (BOMs)
- ✅ Barcode generation and tracking
- ✅ Pricing management

### Operations
- ✅ Calendar module with year views
- ✅ Workstream management
- ✅ OKR tracking
- ✅ Packing configurations

### Technical
- ✅ Type-safe Supabase integration
- ✅ Multi-tenant architecture
- ✅ RLS (Row Level Security) policies
- ✅ Audit trail system
- ✅ 99.99% query performance optimization
- ✅ Auto-generated TypeScript types

### Infrastructure
- ✅ Next.js 14 with App Router
- ✅ TypeScript 5.3.3
- ✅ Tailwind CSS 3.4
- ✅ Dark mode support
- ✅ Responsive design

---

## 🚀 Status Summary

| Category | Status | Last Updated |
|----------|--------|--------------|
| **Core Architecture** | ✅ Complete | Jan 31, 2026 |
| **Access Control** | ✅ Production Ready | Jan 31, 2026 |
| **Database** | ✅ Optimized | Jan 31, 2026 |
| **Documentation** | ✅ Reorganised | Apr 4, 2026 |
| **Type Safety** | ✅ Full Coverage | Jan 31, 2026 |
| **Security** | ✅ Hardened | Jan 31, 2026 |

---

## 📞 Quick Links

- **Type Definitions:** `types/access.ts`, `types/database.ts`
- **Permission Utils:** `lib/permissions.ts`
- **Audit System:** `lib/auditLog.ts`
- **Feature Flags:** `lib/featureFlags.ts`
- **Permission Hook:** `hooks/usePermissions.ts`
- **Access Pages:** `/users`, `/groups`, `/admin/tenants`
- **Schema CSV:** `docs/database/Supabase Snippet Public Schema Column Catalog.csv`

---

## 💡 Key Files by Role

### Product Manager
- [README.md](README.md) - Feature overview
- [docs/architecture/QUICK_REFERENCE.md](docs/architecture/QUICK_REFERENCE.md) - Capabilities list

### Developer
- [TRITY_CONTEXT.md](TRITY_CONTEXT.md) - Architecture & conventions
- [docs/architecture/PROJECT_DOCUMENTATION.md](docs/architecture/PROJECT_DOCUMENTATION.md) - Technical details
- [docs/architecture/IMPLEMENTATION_GUIDE.md](docs/architecture/IMPLEMENTATION_GUIDE.md) - Implementation patterns

### DevOps/Database Administrator
- [docs/database/SUPABASE_INTEGRATION_STATUS.md](docs/database/SUPABASE_INTEGRATION_STATUS.md) - DB status
- [docs/guides/TYPE_GENERATION.md](docs/guides/TYPE_GENERATION.md) - Type generation
- Migration guides as needed

### Security Reviewer
- [docs/architecture/ACCESS_CONTROL_IMPLEMENTATION.md](docs/architecture/ACCESS_CONTROL_IMPLEMENTATION.md) - RBAC details
- [docs/architecture/IMPLEMENTATION_GUIDE.md](docs/architecture/IMPLEMENTATION_GUIDE.md) - Security features
- [docs/architecture/QUICK_REFERENCE.md](docs/architecture/QUICK_REFERENCE.md) - Security rules

---

## 📝 Notes

- All documentation files are kept in sync with the actual codebase
- Version numbers are updated when significant changes are made
- "Last Updated" timestamps reflect when each file was last reviewed
- For the most current information on a specific feature, check both the documentation and the source code

**Document Version:** 2.0  
**Created:** January 31, 2026  
**Last Reorganised:** April 4, 2026
