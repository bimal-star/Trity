# Migration Guide: Converting depends_on_workstream_id to Free Text

## Overview

This migration changes the `depends_on_workstream_id` column in the `workstreams` table from a UUID foreign key reference to a free-text field.

## Current State

- **Column Type**: UUID (foreign key to `workstreams.id`)
- **Form Input**: Dropdown select with workstream options
- **Purpose**: Reference another workstream by ID

## Target State

- **Column Type**: TEXT (free text)
- **Form Input**: Text input field
- **Purpose**: Allow free-text dependency descriptions

## Migration Steps

### 1. Check Current Schema

Run the SQL in `supabase/migrations/check_workstream_dependency_schema.sql` to verify:

- Current column data type
- Existing foreign key constraints
- Current values in the database

### 2. Backup Database

**IMPORTANT**: Backup your database before proceeding!

### 3. Run Migration

Execute the SQL in `supabase/migrations/change_depends_on_to_text.sql` which will:

1. Drop the foreign key constraint (if it exists)
2. Convert the column from UUID to TEXT
3. Preserve existing UUID values as text strings
4. Add documentation comment

### 4. Verify Migration

After running the migration, verify:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'workstreams'
  AND column_name = 'depends_on_workstream_id';
```

Expected result: `data_type` should be `text`

### 5. Code Changes (Already Applied)

- ✅ Form changed from `<select>` to `<input type="text">`
- ✅ TypeScript types updated with comment
- ✅ Removed unused `dependencyOptions` variable
- ✅ Database hook already handles text values (no changes needed)

## Notes

- Existing UUID values will be preserved as text strings
- The `depends_on_workstream` computed field in the TypeScript interface has been removed since it's no longer a foreign key relationship
- The form now accepts any text input for dependencies

## Rollback (if needed)

If you need to rollback:

1. Restore from backup, OR
2. Convert TEXT back to UUID and recreate foreign key constraint (requires valid UUID values)
