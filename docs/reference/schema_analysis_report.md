# Multi-Tenant Schema Analysis Report

**Analysis Date:** 2026-01-25  
**Source:** Supabase Snippet Public Schema Column Catalog.csv

---

## A. CRITICAL ISSUES (Must Fix)

### 1. Missing tenant_id on Calendar Table

**Issue:** The `calendar` table has `tenant_id` as **nullable** (`is_nullable=YES`), which violates multi-tenant security requirements.

**Location:** Line 74 in CSV

```
calendar,tenant_id,uuid,YES,null,NO,null,null,null
```

**Risk:** Users could potentially insert calendar entries without tenant_id, breaking tenant isolation.

**SQL Fix:**

```sql
-- Make tenant_id NOT NULL on calendar table
ALTER TABLE public.calendar
  ALTER COLUMN tenant_id SET NOT NULL;

-- Add constraint to prevent NULL values
ALTER TABLE public.calendar
  ADD CONSTRAINT calendar_tenant_id_not_null
  CHECK (tenant_id IS NOT NULL);
```

---

### 2. Missing RLS Policies on Multiple Tables

**Issue:** The following tables have `tenant_id` columns but may not have RLS policies enabled or properly configured. Based on the SQL setup file, these tables should have RLS, but verification is needed:

**Tables Requiring RLS Verification:**

- `attribute_definitions` ✓ (has tenant_id, RLS mentioned in SQL)
- `bom_headers` ✓ (has tenant_id, RLS mentioned in SQL)
- `bom_lines` ✓ (has tenant_id, RLS mentioned in SQL)
- `demand_forecasts` ✓ (has tenant_id, RLS mentioned in SQL)
- `packing_configurations` ✓ (has tenant_id, RLS mentioned in SQL)
- `price_list_items` ✓ (has tenant_id, RLS mentioned in SQL)
- `price_lists` ✓ (has tenant_id, RLS mentioned in SQL)
- `product_activity_log` ✓ (has tenant_id, RLS mentioned in SQL)
- `product_cost_history` ✓ (has tenant_id, RLS mentioned in SQL)
- `product_metrics` ✓ (has tenant_id, RLS mentioned in SQL)
- `product_variants` ✓ (has tenant_id, RLS mentioned in SQL)
- `production_plans` ✓ (has tenant_id, RLS mentioned in SQL)
- `retailer_weeks` ✓ (has tenant_id, RLS mentioned in SQL)
- `stock_levels` ✓ (has tenant_id, RLS mentioned in SQL)
- `stock_transactions` ✓ (has tenant_id, RLS mentioned in SQL)
- `unit_conversions` ✓ (has tenant_id, RLS mentioned in SQL)
- `units` ✓ (has tenant_id, RLS mentioned in SQL)

**Note:** The SQL setup file shows RLS should be enabled, but the CSV doesn't contain RLS policy information. **Manual verification required.**

**SQL Fix (Example for one table - apply pattern to all):**

```sql
-- Enable RLS if not already enabled
ALTER TABLE public.attribute_definitions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
DROP POLICY IF EXISTS "Users can view own tenant attribute_definitions" ON public.attribute_definitions;
CREATE POLICY "Users can view own tenant attribute_definitions"
  ON public.attribute_definitions
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "Users can insert own tenant attribute_definitions" ON public.attribute_definitions;
CREATE POLICY "Users can insert own tenant attribute_definitions"
  ON public.attribute_definitions
  FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "Users can update own tenant attribute_definitions" ON public.attribute_definitions;
CREATE POLICY "Users can update own tenant attribute_definitions"
  ON public.attribute_definitions
  FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "Users can delete own tenant attribute_definitions" ON public.attribute_definitions;
CREATE POLICY "Users can delete own tenant attribute_definitions"
  ON public.attribute_definitions
  FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());
```

---

### 3. Duplicate Foreign Key Relationships

**Issue:** Several tables have duplicate foreign key relationships listed in the CSV, suggesting potential data quality issues or duplicate constraint definitions.

**Tables with Duplicate FK Entries:**

- `bom_headers`: `product_id` appears twice (lines 22-23)
- `demand_forecasts`: `product_id` appears twice (lines 101-102)
- `packing_configurations`: `product_id` appears twice (lines 134-135)
- `price_list_items`: `price_list_id` and `product_id` each appear twice (lines 158-161)
- `product_categories`: `product_id` and `category_id` each appear twice (lines 224-227)
- `product_metrics`: `product_id` appears twice (lines 251-252)
- `unit_conversions`: `from_unit_id` and `to_unit_id` each appear twice (lines 421-424)

**Risk:** This may indicate:

1. Duplicate constraint definitions in the database
2. CSV export issues
3. Composite foreign keys not properly represented

**SQL Fix (Verification):**

```sql
-- Check for duplicate foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  COUNT(*) as constraint_count
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, kcu.column_name, ccu.table_name, ccu.column_name
HAVING COUNT(*) > 1;
```

---

### 4. Missing Primary Keys on Views

**Issue:** Views (`vw_bom_costing`, `vw_products_full`) are included in the CSV but views don't have primary keys by definition. This is expected but should be noted.

**Tables/Views:**

- `vw_bom_costing` (lines 452-460) - View, no primary key expected
- `vw_products_full` (lines 461-517) - View, no primary key expected

**Note:** Views are read-only and don't require primary keys or RLS (RLS is inherited from underlying tables).

---

## B. WARNINGS (Should Fix)

### 1. tenant_id Without Default Values

**Issue:** All `tenant_id` columns have `column_default=null`, meaning they must be explicitly provided on INSERT. While this is secure, it requires application code to always include tenant_id.

**Tables Affected:** All tenant-scoped tables

**Recommendation:** Consider adding a trigger or application-level enforcement to ensure tenant_id is always set. The current approach (requiring explicit tenant_id) is actually more secure, but ensure application code always provides it.

**SQL Fix (Optional - Application-level is preferred):**

```sql
-- Example trigger to ensure tenant_id is set (NOT RECOMMENDED - use application logic instead)
CREATE OR REPLACE FUNCTION public.ensure_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_user_tenant_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 2. Missing Foreign Key to Tenants Table

**Issue:** No `tenants` table is present in the CSV, and `tenant_id` columns don't have foreign key relationships to a tenants table.

**Current State:** All `tenant_id` columns have `foreign_table=null` and `foreign_column=null`

**Risk:**

- No referential integrity for tenant_id values
- Orphaned tenant_id values possible
- No cascade delete behavior

**SQL Fix (If tenants table exists):**

```sql
-- If a tenants table exists, add foreign key constraints
-- WARNING: Only run if tenants table exists and has id column
ALTER TABLE public.products
  ADD CONSTRAINT fk_products_tenant_id
  FOREIGN KEY (tenant_id)
  REFERENCES public.tenants(id)
  ON DELETE CASCADE;

-- Repeat for all tenant-scoped tables
```

**Note:** The CSV doesn't show a `tenants` table. If it doesn't exist, consider creating it for referential integrity.

---

### 3. Inconsistent Column Ordering

**Issue:** `tenant_id` column position varies across tables. While not a functional issue, consistent ordering improves maintainability.

**Current Pattern:**

- Some tables: `tenant_id` appears early (after `id`, before business columns)
- Some tables: `tenant_id` appears late (after business columns, before audit fields)
- Some tables: `tenant_id` appears in audit section (with `created_by`, `updated_by`)

**Recommendation:** Standardize `tenant_id` position. Best practice: place `tenant_id` immediately after `id` (primary key).

**SQL Fix (Example):**

```sql
-- PostgreSQL doesn't support column reordering easily
-- This would require table recreation or using ALTER TABLE ... ALTER COLUMN ... SET STATISTICS
-- Consider this for future migrations only
```

---

### 4. Missing Indexes on tenant_id

**Issue:** The CSV doesn't show index information. `tenant_id` columns should have indexes for performance.

**Recommendation:** Ensure all `tenant_id` columns have indexes.

**SQL Fix:**

```sql
-- Create indexes on tenant_id for all tables (if not exists)
CREATE INDEX IF NOT EXISTS idx_attribute_definitions_tenant_id ON public.attribute_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bom_headers_tenant_id ON public.bom_headers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bom_lines_tenant_id ON public.bom_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_tenant_id ON public.calendar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON public.categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_tenant_id ON public.demand_forecasts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_navigation_tenant_id ON public.navigation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_packing_configurations_tenant_id ON public.packing_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_tenant_id ON public.price_list_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_lists_tenant_id ON public.price_lists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_activity_log_tenant_id ON public.product_activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_tenant_id ON public.product_barcodes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant_id ON public.product_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_cost_history_tenant_id ON public.product_cost_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_metrics_tenant_id ON public.product_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_tenant_id ON public.product_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_production_plans_tenant_id ON public.production_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_retailer_weeks_tenant_id ON public.retailer_weeks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_tenant_id ON public.stock_levels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_tenant_id ON public.stock_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_unit_conversions_tenant_id ON public.unit_conversions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_units_tenant_id ON public.units(tenant_id);
```

---

## C. OBSERVATIONS (Optional Improvements)

### 1. Views Don't Require tenant_id

**Observation:** Views (`vw_bom_costing`, `vw_products_full`) don't have `tenant_id` columns, which is correct since views are read-only aggregations. RLS on underlying tables will filter view results.

**Status:** ✅ Correct behavior

---

### 2. All Tenant-Scoped Tables Have tenant_id

**Observation:** All business tables (excluding views) have `tenant_id` columns with `is_nullable=NO` (except `calendar` which is nullable - see Critical Issue #1).

**Tables Verified:**

- ✅ `attribute_definitions` - tenant_id NOT NULL
- ✅ `bom_headers` - tenant_id NOT NULL
- ✅ `bom_lines` - tenant_id NOT NULL
- ⚠️ `calendar` - tenant_id NULLABLE (Critical Issue)
- ✅ `categories` - tenant_id NOT NULL
- ✅ `demand_forecasts` - tenant_id NOT NULL
- ✅ `navigation` - tenant_id NOT NULL
- ✅ `packing_configurations` - tenant_id NOT NULL
- ✅ `price_list_items` - tenant_id NOT NULL
- ✅ `price_lists` - tenant_id NOT NULL
- ✅ `product_activity_log` - tenant_id NOT NULL
- ✅ `product_barcodes` - tenant_id NOT NULL
- ✅ `product_categories` - tenant_id NOT NULL
- ✅ `product_cost_history` - tenant_id NOT NULL
- ✅ `product_metrics` - tenant_id NOT NULL
- ✅ `product_variants` - tenant_id NOT NULL
- ✅ `products` - tenant_id NOT NULL
- ✅ `production_plans` - tenant_id NOT NULL
- ✅ `retailer_weeks` - tenant_id NOT NULL
- ✅ `stock_levels` - tenant_id NOT NULL
- ✅ `stock_transactions` - tenant_id NOT NULL
- ✅ `unit_conversions` - tenant_id NOT NULL
- ✅ `units` - tenant_id NOT NULL

---

### 3. All Tables Have Primary Keys

**Observation:** All tables (excluding views) have primary keys defined.

**Status:** ✅ Correct

---

### 4. Consistent Audit Fields

**Observation:** Most tables follow a consistent audit pattern:

- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)
- `created_by` (uuid, nullable)
- `updated_by` (uuid, nullable)
- `is_deleted` (boolean, default false)
- `metadata` (jsonb, default '{}')
- `version` (integer, default 1)

**Status:** ✅ Good consistency

---

### 5. Foreign Key Relationships

**Observation:** Foreign keys are properly defined for business relationships (products → categories, bom_lines → bom_headers, etc.). No orphaned relationships detected in the CSV.

**Status:** ✅ Correct

---

## SUMMARY

### Critical Issues: 2

1. ❌ `calendar.tenant_id` is nullable (should be NOT NULL)
2. ⚠️ RLS policies need verification (CSV doesn't contain RLS info, but SQL setup file indicates they should exist)

### Warnings: 3

1. ⚠️ No foreign keys to a `tenants` table (if it exists)
2. ⚠️ Duplicate foreign key entries in CSV (may indicate data quality issues)
3. ⚠️ Missing index verification on `tenant_id` columns

### Observations: 5

1. ✅ Views correctly excluded from tenant_id requirements
2. ✅ All business tables have tenant_id (except calendar nullable issue)
3. ✅ All tables have primary keys
4. ✅ Consistent audit field patterns
5. ✅ Foreign keys properly defined

---

## RECOMMENDED ACTION PLAN

1. **IMMEDIATE:** Fix `calendar.tenant_id` to be NOT NULL
2. **IMMEDIATE:** Verify RLS policies are enabled and configured for all tenant-scoped tables
3. **HIGH PRIORITY:** Verify indexes exist on all `tenant_id` columns
4. **MEDIUM PRIORITY:** Investigate duplicate foreign key entries in CSV
5. **LOW PRIORITY:** Consider creating a `tenants` table if it doesn't exist for referential integrity

---

**Report Generated:** 2026-01-25  
**Analyst:** AI Schema Validator  
**Source:** Supabase Snippet Public Schema Column Catalog.csv
