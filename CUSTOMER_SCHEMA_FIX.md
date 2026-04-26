# Customer Schema Fix: Remove first_name/last_name

## Issue

The customers table incorrectly had `first_name` and `last_name` columns, mixing individual and business entity data. In ERP systems like Unleashed:

- **customers** table = Business entities (companies) with `legal_name`, `trading_name`
- **customer_contacts** table = Individual people with `first_name`, `last_name`

## Migration SQL

File: `supabase/migrations/20260130160000_remove_customer_first_last_name.sql`

```sql
-- Remove first_name and last_name from customers table
-- These belong in customer_contacts table only
-- For individual customers, use legal_name field

DO $$
BEGIN
  -- Drop first_name if it exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'customers'
    AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.customers DROP COLUMN first_name;
  END IF;

  -- Drop last_name if it exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'customers'
    AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.customers DROP COLUMN last_name;
  END IF;
END $$;

-- Add comment to clarify the distinction
COMMENT ON TABLE public.customers IS 'Business entity master data. Use legal_name for company name or individual full name. Contact persons belong in customer_contacts table.';
COMMENT ON TABLE public.customer_contacts IS 'Individual contact persons associated with customer business entities.';
```

## Code Changes

### 1. TypeScript Types (types/customer.ts)

- ✅ Removed `first_name` and `last_name` from `Customer` interface
- ✅ Removed `first_name` and `last_name` from `CustomerFormData` interface
- ✅ Kept in `CustomerContact` interface (correct location)

### 2. Data Layer (hooks/useCustomers.ts)

- ✅ Removed from `createCustomer` insert
- ✅ Removed from `updateCustomer` update

### 3. Audit Logging (lib/auditLog.ts)

- ✅ Updated `logCustomerCreated` to accept `legalName` instead of `firstName`/`lastName`

### 4. UI (app/customers/page.tsx)

- ✅ Removed first_name/last_name inputs from create modal
- ✅ Updated validation to check `legal_name` and `email` only
- ✅ Updated table display: shows `legal_name || email`
- ✅ Updated detail panel header: shows `legal_name || email`
- ✅ Removed first_name/last_name inputs from edit form
- ✅ Updated audit logging calls

## How to Use

### For Business Customers (most common)

```typescript
{
  customer_type: 'business',
  legal_name: 'Acme Corporation Pty Ltd',  // Official registered name
  trading_name: 'ACME',                     // DBA/brand name
  email: 'accounts@acme.com'
}
```

### For Individual Customers (rare)

```typescript
{
  customer_type: 'individual',
  legal_name: 'John Smith',                 // Person's full name
  email: 'john.smith@example.com'
}
```

### For Contact Persons (use customer_contacts table)

```typescript
// In customer_contacts table:
{
  customer_id: '...',
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane.doe@acme.com',
  role: 'Procurement Manager',
  is_primary: true
}
```

## Apply Migration

```bash
cd C:\Cursor-Trity-LIVE
supabase db push
npm run generate:types
```
