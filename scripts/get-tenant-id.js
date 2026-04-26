// scripts/get-tenant-id.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTenantId() {
  const { data, error } = await supabase.from('tenants').select('id, name').limit(1).single();

  if (error) {
    console.error('Error fetching tenant:', error);
    process.exit(1);
  }

  console.log(`\nTenant ID: ${data.id}`);
  console.log(`Tenant Name: ${data.name}`);
  console.log(`\nSchema Name: tenant_${data.id.replace(/-/g, '_')}`);
  console.log(`\nNext step: Run the following in Supabase SQL Editor:\n`);
  console.log(`SELECT create_tenant_schema('${data.id}', '${data.name}');\n`);
}

getTenantId();
