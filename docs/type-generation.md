# TypeScript Type Generation

## Current Status

✅ **Basic types generated using fallback method**
- Core tables: `tenants`, `user_profiles`, `calendar`, `workstreams`, `workstream_tasks`
- Materialized view: `cached_timezones` ✨ (read-only)
- Functions: `get_user_tenant_id()`, `refresh_cached_timezones()`

The fallback method generates types for the most commonly used tables. For complete type coverage of all product tables, follow the Supabase CLI setup below.

---

## Method 1: Fallback (Current)

The current script automatically falls back to manual type generation when the Supabase CLI is not available.

```bash
npm run generate:types
```

**Pros:**
- ✅ Works without additional setup
- ✅ Includes all core tables needed for the application
- ✅ Fast generation

**Cons:**
- ⚠️ Limited to core tables only
- ⚠️ Doesn't include all product-related tables

---

## Method 2: Supabase CLI (Recommended for Full Coverage)

For complete type generation including all product tables, use the Supabase CLI.

### Setup Instructions

#### 1. Install Supabase CLI

```bash
npm install -g supabase
```

Or with Scoop (Windows):
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### 2. Link Your Project

```bash
supabase link --project-ref wvqlpcraxorchrtpatph
```

When prompted:
- **Database password:** Your Supabase database password
- This is found in: Supabase Dashboard → Settings → Database → Connection String

#### 3. Generate Types

```bash
npm run generate:types
```

The script will automatically use the CLI if available, otherwise fall back to manual generation.

#### 4. Direct CLI Usage (Alternative)

You can also generate types directly with the CLI:

```bash
supabase gen types typescript --linked > types/database.ts
```

---

## Type Usage in Application

### Import Types

```typescript
import { Database } from '@/types/database';

type Workstream = Database['public']['Tables']['workstreams']['Row'];
type WorkstreamInsert = Database['public']['Tables']['workstreams']['Insert'];
type WorkstreamUpdate = Database['public']['Tables']['workstreams']['Update'];
```

### Typed Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Now all queries are fully typed!
const { data } = await supabase
  .from('cached_timezones') // ✅ Autocomplete
  .select('*'); // ✅ Returns typed data

// data is typed as: Array<{ name: string, abbrev: string, utc_offset: string, is_dst: boolean }>
```

### Using Materialized Views

```typescript
// Query the cached timezone data
const { data: timezones } = await supabase
  .from('cached_timezones')
  .select('*')
  .order('name');

// TypeScript knows the structure:
timezones?.forEach(tz => {
  console.log(tz.name); // ✅ Typed as string
  console.log(tz.abbrev); // ✅ Typed as string
  console.log(tz.is_dst); // ✅ Typed as boolean
});
```

---

## Troubleshooting

### "Stack depth limit exceeded" Errors

This occurs when trying to query tables with RLS enabled using the anon key. The fallback method handles this automatically.

**Solution:** Use the Supabase CLI which bypasses this issue by using the service role key.

### Missing Tables in Generated Types

If using the fallback method and need additional tables:

1. Edit `scripts/generate-types.js`
2. Add the table definition to the `basicTypes` template in the `generateTypesManually()` function
3. Run `npm run generate:types`

Or better yet, set up the Supabase CLI for automatic generation.

### CLI Link Fails

Make sure you have:
- ✅ Correct project reference: `wvqlpcraxorchrtpatph`
- ✅ Database password (from Supabase Dashboard)
- ✅ Internet connection

---

## When to Regenerate Types

Regenerate types after:
- ✅ Database schema changes (new tables, columns)
- ✅ Migration deployments
- ✅ Adding/modifying materialized views
- ✅ Creating new database functions

```bash
npm run generate:types
```

---

## Current Generated Types

### Core Tables
- `tenants` - Multi-tenant isolation
- `user_profiles` - User data with tenant relationships
- `calendar` - Calendar entries with bank holidays/events
- `workstreams` - Project workstreams with dependencies
- `workstream_tasks` - Tasks within workstreams

### Materialized Views
- `cached_timezones` - Optimized timezone data (read-only)

### Functions
- `get_user_tenant_id()` - Get current user's tenant ID
- `refresh_cached_timezones()` - Refresh timezone cache

### Additional Tables (with CLI)
When using the Supabase CLI, you'll also get types for:
- Product tables (products, variants, attributes, etc.)
- Inventory tables (stock_levels, stock_transactions)
- BOM tables (bom_headers, bom_lines)
- Pricing tables (price_lists, price_list_items)
- And more...

---

## Summary

- ✅ **Current:** Fallback method works for core functionality
- 🎯 **Recommended:** Install Supabase CLI for complete types
- 🔄 **Maintenance:** Regenerate after schema changes
- 📝 **Usage:** Fully typed Supabase client with autocomplete
