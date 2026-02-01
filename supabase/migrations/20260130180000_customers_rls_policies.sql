-- Ensure RLS policies exist for customers table INSERT operations
-- This fixes "new row violates row-level security policy" errors

-- Enable RLS on customers table (if not already enabled)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert customers in their tenant" ON customers;

-- Create INSERT policy: users can insert customers for their tenant
CREATE POLICY "Users can insert customers in their tenant"
  ON customers
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Ensure SELECT policy exists (for the trigger to query existing codes)
DROP POLICY IF EXISTS "Users can view customers in their tenant" ON customers;

CREATE POLICY "Users can view customers in their tenant"
  ON customers
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Ensure UPDATE policy exists
DROP POLICY IF EXISTS "Users can update customers in their tenant" ON customers;

CREATE POLICY "Users can update customers in their tenant"
  ON customers
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Ensure DELETE policy exists
DROP POLICY IF EXISTS "Users can delete customers in their tenant" ON customers;

CREATE POLICY "Users can delete customers in their tenant"
  ON customers
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );
