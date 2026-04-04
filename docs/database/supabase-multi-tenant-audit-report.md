# Supabase Multi-Tenant Backend Audit Report

**Date:** 2026-01-25  
**Source:** Supabase Snippet Public Schema Column Catalog.csv  
**Status:** Complete Analysis with SQL Fixes Provided  
**Note:** References to `sql/*.sql` fix scripts below are historical recommendations. Actual migrations are in `supabase/migrations/`.

---

## Executive Summary

This audit identified **4 critical issues** and **4 recommended improvements** for the multi-tenant SaaS architecture. All issues have SQL fixes provided in separate files.

### Critical Issues Found:
1. ❌ **Missing `tenants` table** - No referential integrity for tenant_id
2. ❌ **`user_profiles` table may not exist** - Core table missing from CSV export
3. ❌ **`calendar.tenant_id` is nullable** - Security vulnerability
4. ❌ **Missing RLS policies for 16+ tables** - Incomplete tenant isolation

### Recommended Improvements:
1. ⚠️ Missing trigger for auto-creating user profiles
2. ⚠️ Missing foreign key from user_profiles to tenants
3. ⚠️ Missing validation functions
4. ⚠️ Missing indexes verification

---

## A. CRITICAL ISSUES (Must Fix)

### A1. Missing Tenants Table

**Status:** ❌ **CRITICAL**  
**Issue:** No `public.tenants` table exists in the database schema.

**Impact:**
- No referential integrity for tenant_id values
- Cannot store tenant metadata (name, company_name, etc.)
- Cannot enforce tenant existence at database level
- Login page cannot display tenant names from database
- No way to validate tenant_id values

**Evidence:**
- CSV search for "tenants" returned no matches
- All `tenant_id` columns have `foreign_table=null` in CSV

**SQL Fix:** `sql/create-tenants-table.sql`
- Creates `public.tenants` table with: id, name, company_name, slug, is_active
- Enables RLS with SELECT policy
- Creates indexes for performance
- Adds updated_at trigger

---

### A2. User Profiles Table May Not Exist

**Status:** ❌ **CRITICAL**  
**Issue:** `public.user_profiles` table is defined in SQL files but NOT present in schema CSV export.

**Impact:**
- Table may not exist in actual database
- Users cannot be linked to tenants
- `get_user_tenant_id()` function will fail
- RLS policies will not work (they depend on this table)
- Authentication flow will break

**Evidence:**
- SQL file `sql/multi-tenant-setup.sql` defines the table (lines 15-21)
- CSV search for "user_profiles" returned no matches
- Function `get_user_tenant_id()` queries this table

**SQL Fix:** `sql/verify-user-profiles.sql`
- Creates table if missing: id, user_id (UNIQUE), tenant_id (NOT NULL)
- Adds foreign key to tenants table (if tenants exists)
- Creates indexes
- Enables RLS with SELECT, UPDATE, INSERT policies

---

### A3. Calendar tenant_id is Nullable

**Status:** ❌ **CRITICAL**  
**Issue:** `calendar.tenant_id` allows NULL values, breaking tenant isolation.

**Location:** CSV line 74: `calendar,tenant_id,uuid,YES,null,NO,null,null,null`

**Impact:**
- Users could insert calendar entries without tenant_id
- Breaks tenant isolation security
- RLS policies may not work correctly
- Data integrity issue

**SQL Fix:** `sql/fix-calendar-tenant-id.sql`
- Updates NULL values (requires manual intervention first)
- Sets tenant_id to NOT NULL
- Adds check constraint

**Note:** Must handle existing NULL values before running fix.

---

### A4. Missing RLS Policies for 16+ Tables

**Status:** ❌ **CRITICAL**  
**Issue:** Only 7 tables have RLS policies, but 23+ tenant-scoped tables exist.

**Tables with RLS policies (from SQL):**
- products
- categories
- product_barcodes
- product_categories
- workstreams
- projects
- navigation

**Tables missing RLS policies:**
- attribute_definitions
- bom_headers
- bom_lines
- calendar
- demand_forecasts
- packing_configurations
- price_list_items
- price_lists
- product_activity_log
- product_cost_history
- product_metrics
- product_variants
- production_plans
- retailer_weeks
- stock_levels
- stock_transactions
- unit_conversions
- units

**SQL Fix:** `sql/create-missing-rls-policies.sql`
- Uses helper function to create SELECT, INSERT, UPDATE, DELETE policies
- All policies enforce: `tenant_id = public.get_user_tenant_id()`
- Creates policies for all 18 confirmed tables

---

## B. RECOMMENDED IMPROVEMENTS (Should Fix)

### B1. Missing Trigger for Auto-Creating User Profiles

**Status:** ⚠️ **RECOMMENDED**  
**Issue:** No automatic creation of `user_profiles` entry when user signs up.

**Impact:**
- Manual profile creation is error-prone
- Users may be created without profiles
- RLS policies will deny access if profile doesn't exist
- Poor user experience

**SQL Fix:** `sql/create-user-profile-trigger.sql`
- Creates `handle_new_user()` function
- Provides 4 implementation options:
  1. Database trigger (via Supabase Dashboard)
  2. Application-level logic
  3. Supabase Edge Function webhook
  4. Manual creation

**Note:** Supabase doesn't allow triggers on `auth.users` from public schema. Must use Dashboard or application logic.

---

### B2. Missing Foreign Key from user_profiles to tenants

**Status:** ⚠️ **RECOMMENDED** (Already handled in verify-user-profiles.sql)  
**Issue:** No referential integrity between `user_profiles.tenant_id` and `tenants.id`.

**Impact:**
- Orphaned tenant_id values possible
- No cascade delete behavior
- Cannot validate tenant_id at database level

**SQL Fix:** Already included in `sql/verify-user-profiles.sql`
- Adds foreign key constraint with ON DELETE RESTRICT
- Prevents deletion of tenants with active users

---

### B3. Missing Validation Functions

**Status:** ⚠️ **RECOMMENDED**  
**Issue:** No functions to validate tenant_id or get tenant information.

**SQL Fix:** `sql/create-tenant-validation-functions.sql`
- `validate_tenant_id(uuid)` - Checks if tenant exists and is active
- `get_tenant_name(uuid)` - Returns tenant name for display
- `get_tenant_company_name(uuid)` - Returns company name
- `ensure_tenant_id()` - Trigger function to auto-set tenant_id

---

### B4. Missing Indexes Verification

**Status:** ⚠️ **RECOMMENDED**  
**Issue:** Need to verify all tenant_id columns have indexes for RLS performance.

**SQL Fix:** `sql/verify-tenant-id-indexes.sql`
- Creates indexes on all 23 tenant-scoped tables
- Verifies indexes exist
- Reports missing indexes

**Note:** Indexes are critical for RLS policy performance.

---

## C. OPTIONAL ENHANCEMENTS

### C1. Add Tenant Metadata Fields
Enhance tenants table with: domain, logo_url, settings, subscription_tier, etc.

### C2. Add Audit Fields to user_profiles
Add: created_by, updated_by, is_deleted, metadata

### C3. Create Tenant Management Functions
Helper functions for tenant operations and lookups

---

## SQL Files Created

1. **`sql/create-tenants-table.sql`** - Creates tenants table with RLS
2. **`sql/verify-user-profiles.sql`** - Verifies/creates user_profiles with foreign key
3. **`sql/fix-calendar-tenant-id.sql`** - Fixes calendar.tenant_id nullability
4. **`sql/create-missing-rls-policies.sql`** - Creates RLS policies for all tables
5. **`sql/create-tenant-validation-functions.sql`** - Validation and helper functions
6. **`sql/verify-tenant-id-indexes.sql`** - Verifies and creates indexes
7. **`sql/create-user-profile-trigger.sql`** - User profile auto-creation options
8. **`sql/complete-multi-tenant-setup.sql`** - Master verification script

---

## Implementation Order

1. **IMMEDIATE:** Run `sql/create-tenants-table.sql`
2. **IMMEDIATE:** Run `sql/verify-user-profiles.sql`
3. **IMMEDIATE:** Run `sql/fix-calendar-tenant-id.sql` (after handling NULL values)
4. **IMMEDIATE:** Run `sql/create-missing-rls-policies.sql`
5. **HIGH:** Run `sql/create-tenant-validation-functions.sql`
6. **HIGH:** Run `sql/verify-tenant-id-indexes.sql`
7. **HIGH:** Set up user profile auto-creation (choose option from `sql/create-user-profile-trigger.sql`)
8. **VERIFY:** Run `sql/complete-multi-tenant-setup.sql` to verify everything

---

## Verification Queries

Run these in Supabase SQL Editor to verify current state:

```sql
-- 1. Check if tenants table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'tenants'
) AS tenants_table_exists;

-- 2. Check if user_profiles table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'user_profiles'
) AS user_profiles_table_exists;

-- 3. Check calendar.tenant_id nullability
SELECT is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'calendar' 
  AND column_name = 'tenant_id';

-- 4. Count RLS policies per table
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 5. List tables with RLS enabled but no policies
SELECT 
  t.tablename,
  c.relrowsecurity as rls_enabled
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
  AND c.relrowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.schemaname = 'public' 
      AND p.tablename = t.tablename
  )
ORDER BY t.tablename;
```

---

## Summary Statistics

- **Tables Analyzed:** 24 business tables + 2 views
- **Tables with tenant_id:** 24/24 (100%)
- **Tables with NOT NULL tenant_id:** 23/24 (96% - calendar is nullable)
- **Tables with RLS policies:** ~7/24 (29% - needs improvement)
- **Tables needing RLS policies:** 17+ tables
- **Missing core tables:** 2 (tenants, user_profiles may not exist)
- **Missing functions:** 4+ validation functions
- **Missing indexes:** Need verification

---

## Next Steps

1. **Create tenants table** - Required for referential integrity
2. **Verify user_profiles exists** - Core table for tenant assignment
3. **Fix calendar.tenant_id** - Security issue
4. **Create all RLS policies** - Security requirement
5. **Add validation functions** - Data integrity
6. **Verify indexes** - Performance
7. **Set up auto-creation** - User experience

All SQL fixes are provided in separate files and are idempotent (safe to run multiple times).

---

**Report Generated:** 2026-01-25  
**Analyst:** AI Backend Auditor  
**Source:** Supabase Snippet Public Schema Column Catalog.csv
