/**
 * Discover all tables in Supabase database
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wvqlpcraxorchrtpatph.supabase.co';
const supabaseAnonKey = 'sb_publishable_DSUbUfO9Dsyg3v6FzKLnCg_oyIYJeCC';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function discoverTables() {
  console.log('Discovering all tables in Supabase...\n');
  
  // Try common table names
  const possibleTables = [
    'products', 'categories', 'navigation', 'calendar', 
    'product_categories', 'units', 'suppliers', 'customers', 
    'orders', 'order_items', 'inventory', 'warehouses', 
    'users', 'roles', 'permissions', 'settings',
    'transactions', 'payments', 'invoices', 'reports',
    'locations', 'branches', 'departments', 'employees',
    'assets', 'maintenance', 'projects', 'tasks',
    'contacts', 'leads', 'opportunities', 'accounts'
  ];
  
  const existingTables = [];
  
  for (const tableName of possibleTables) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
    
    if (!error) {
      existingTables.push(tableName);
      console.log(`✓ ${tableName}`);
    }
  }
  
  console.log(`\n📊 Total tables found: ${existingTables.length}`);
  console.log('\nTable list for scripts:');
  console.log(JSON.stringify(existingTables, null, 2));
  
  return existingTables;
}

discoverTables().catch(console.error);
