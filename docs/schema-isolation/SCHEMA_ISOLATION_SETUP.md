<!-- docs/SCHEMA_ISOLATION_SETUP.md -->

# Schema Isolation Setup - Manual Steps

**Date:** February 1, 2026
**Status:** Implementation Complete - Manual Setup Needed

---

## Overview

The schema isolation code has been fully implemented and deployed. You now need to run 2 manual SQL commands to:
1. Create the tenant schema in your database
2. Copy existing data to the tenant schema

These commands must be run in **Supabase SQL Editor** (Dashboard → SQL Editor).

---

## Step 1: Get Your Tenant ID

First, find your default tenant ID.

### Option A: Via Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor"
4. Run this query:

```sql
SELECT id, name FROM tenants LIMIT 1;
```

Note the `id` value - you'll need it for the next steps.

### Option B: Via Application
1. Start the app: `npm run dev`
2. Login with your test user
3. Open browser DevTools → Console
4. Run:
```javascript
// Get from URL or localStorage
const tenantId = localStorage.getItem('trity_tenant_cache');
console.log(JSON.parse(tenantId).tenant_id);
```

---

## Step 2: Create Tenant Schema

In **Supabase SQL Editor**, run:

```sql
-- Create schema for your tenant (replace YOUR_TENANT_ID)
SELECT create_tenant_schema('YOUR_TENANT_ID', 'Your Tenant Name');

-- Example:
-- SELECT create_tenant_schema('12345678-1234-1234-1234-123456789abc', 'Default Tenant');
```

This will:
- ✅ Create schema: `tenant_12345678_1234_1234_1234_123456789abc`
- ✅ Record in `tenant_schemas` table
- ✅ Log in `feature_provisioning_log` table

**Verify it worked:**
```sql
SELECT * FROM public.tenant_schemas;
-- Should show your schema with status='active'
```

---

## Step 3: Copy Existing Data to Tenant Schema

Get your schema name from the previous step, then run these commands:

### Copy Calendar Table

```sql
-- Replace SCHEMA_NAME with your actual schema name from Step 2
-- E.g., tenant_12345678_1234_1234_1234_123456789abc

CREATE TABLE IF NOT EXISTS SCHEMA_NAME.calendar AS
SELECT * FROM public.calendar 
WHERE tenant_id = 'YOUR_TENANT_ID';

-- Create index for performance
CREATE INDEX idx_calendar_year_month ON SCHEMA_NAME.calendar(year, month);
```

**Verify:**
```sql
SELECT COUNT(*) FROM SCHEMA_NAME.calendar;
-- Should match: SELECT COUNT(*) FROM public.calendar WHERE tenant_id = 'YOUR_TENANT_ID';
```

### Copy Navigation Table

```sql
CREATE TABLE IF NOT EXISTS SCHEMA_NAME.navigation AS
SELECT * FROM public.navigation 
WHERE tenant_id = 'YOUR_TENANT_ID';

-- Create index
CREATE INDEX idx_navigation_tenant ON SCHEMA_NAME.navigation(tenant_id);
```

**Verify:**
```sql
SELECT COUNT(*) FROM SCHEMA_NAME.navigation;
-- Should show your navigation items
```

---

## Step 4: Verify Everything Works

### Test 1: Check Schema Structure

```sql
-- List all tables in your tenant schema
SELECT tablename FROM pg_tables 
WHERE schemaname = 'SCHEMA_NAME'
ORDER BY tablename;

-- Should show: calendar, navigation
```

### Test 2: Check Data Isolation

```sql
-- Data should ONLY be in tenant schema, not public
SELECT COUNT(*) FROM public.calendar WHERE tenant_id = 'YOUR_TENANT_ID';
-- Returns: the count

SELECT COUNT(*) FROM SCHEMA_NAME.calendar;
-- Should return: same count as above
```

### Test 3: Test App

1. Start app: `npm run dev`
2. Login with test user
3. Navigate to Calendar
4. Verify calendar entries appear
5. Check browser console - no errors

---

## Complete Example

Here's a full example with real values:

```sql
-- Assume tenant_id = 'f8f4a6d2-2f8b-4e5c-8c2a-9d1b6e7c3a4f'

-- Step 1: Create schema
SELECT create_tenant_schema('f8f4a6d2-2f8b-4e5c-8c2a-9d1b6e7c3a4f', 'Default Tenant');

-- Step 2: Copy calendar
CREATE TABLE IF NOT EXISTS tenant_f8f4a6d2_2f8b_4e5c_8c2a_9d1b6e7c3a4f.calendar AS
SELECT * FROM public.calendar 
WHERE tenant_id = 'f8f4a6d2-2f8b-4e5c-8c2a-9d1b6e7c3a4f';

CREATE INDEX idx_calendar_year_month 
ON tenant_f8f4a6d2_2f8b_4e5c_8c2a_9d1b6e7c3a4f.calendar(year, month);

-- Step 3: Copy navigation
CREATE TABLE IF NOT EXISTS tenant_f8f4a6d2_2f8b_4e5c_8c2a_9d1b6e7c3a4f.navigation AS
SELECT * FROM public.navigation 
WHERE tenant_id = 'f8f4a6d2-2f8b-4e5c-8c2a-9d1b6e7c3a4f';

CREATE INDEX idx_navigation_tenant 
ON tenant_f8f4a6d2_2f8b_4e5c_8c2a_9d1b6e7c3a4f.navigation(tenant_id);

-- Verify
SELECT * FROM public.tenant_schemas;
SELECT COUNT(*) FROM tenant_f8f4a6d2_2f8b_4e5c_8c2a_9d1b6e7c3a4f.calendar;
```

---

## Troubleshooting

### Issue: "Function create_tenant_schema doesn't exist"

**Cause:** Migration not applied

**Fix:** Run in terminal:
```bash
supabase migration list
# Should show 20260201000000 as applied
# If not, run: supabase migration repair --status applied 20260201000000
```

### Issue: "Schema already exists"

**Cause:** Schema was already created

**Solution:** That's fine! Just continue to Step 3 to copy the tables.

### Issue: "Permission denied"

**Cause:** Using anon key instead of service role key

**Fix:** Make sure you're using the Supabase Dashboard SQL Editor (it uses admin access automatically)

### Issue: Calendar Page Still Blank

**Cause:** Tables weren't copied to tenant schema

**Fix:** Verify tables exist:
```sql
SELECT * FROM pg_tables 
WHERE schemaname = 'tenant_YOUR_ID';
-- Should show calendar and navigation
```

---

## Next Steps

After completing the manual setup:

1. ✅ Run the SQL commands above
2. ✅ Verify schema and tables created
3. ⏳ Test calendar page loads data
4. ⏳ Test navigation appears
5. ⏳ Run full test suite
6. ⏳ Commit changes: `git add . && git commit -m "Setup schema isolation for default tenant - v1.1.0"`

---

## Help

If you get stuck:

1. Check the migration was applied: `supabase migration list`
2. Check schema exists: `SELECT * FROM public.tenant_schemas;`
3. Check tables exist: `SELECT * FROM pg_tables WHERE schemaname LIKE 'tenant_%';`
4. Review the full docs: See [SCHEMA_ISOLATION_IMPLEMENTATION.md](./SCHEMA_ISOLATION_IMPLEMENTATION.md)

---

## Questions?

Refer to:
- Implementation docs: [SCHEMA_ISOLATION_IMPLEMENTATION.md](./SCHEMA_ISOLATION_IMPLEMENTATION.md)
- Code: `lib/supabaseSchemaClient.ts`
- Context: `contexts/TenantContext.tsx`
