/**
 * Document the current database schema
 * This creates a detailed markdown file with all schema information
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://wvqlpcraxorchrtpatph.supabase.co';
const supabaseAnonKey = 'sb_publishable_DSUbUfO9Dsyg3v6FzKLnCg_oyIYJeCC';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function documentSchema() {
  console.log('Fetching database schema...\n');
  
  const tables = ['products', 'categories', 'navigation', 'calendar', 'product_categories', 'units'];
  
  let markdown = `# Database Schema Reference
*Auto-generated on: ${new Date().toLocaleString()}*

## Quick Overview

`;

  // Count tables
  let existingTables = 0;
  for (const tableName of tables) {
    const { error } = await supabase.from(tableName).select('*').limit(0);
    if (!error) existingTables++;
  }
  
  markdown += `- **Total Tables**: ${existingTables}\n`;
  markdown += `- **Database**: Supabase PostgreSQL\n`;
  markdown += `- **Type Safety**: Yes (via generated types)\n\n`;
  markdown += `---\n\n`;

  // Document each table
  for (const tableName of tables) {
    console.log(`Documenting ${tableName}...`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      markdown += `## ❌ ${tableName}\n\n`;
      markdown += `**Status**: Not accessible or doesn't exist\n`;
      markdown += `**Error**: ${error.message}\n\n`;
      markdown += `---\n\n`;
      continue;
    }
    
    markdown += `## ✅ ${tableName}\n\n`;
    
    if (data && data.length > 0) {
      const row = data[0];
      const columns = Object.keys(row);
      
      markdown += `**Column Count**: ${columns.length}\n\n`;
      markdown += `### Columns\n\n`;
      markdown += `| Column | Type | Sample Value |\n`;
      markdown += `|--------|------|-------------|\n`;
      
      columns.forEach(col => {
        const value = row[col];
        let type = typeof value;
        
        if (value === null) type = 'null';
        else if (value instanceof Date) type = 'date';
        else if (Array.isArray(value)) type = 'array';
        else if (typeof value === 'object') type = 'object';
        
        let sampleValue = JSON.stringify(value);
        if (sampleValue && sampleValue.length > 50) {
          sampleValue = sampleValue.substring(0, 47) + '...';
        }
        
        markdown += `| \`${col}\` | ${type} | ${sampleValue} |\n`;
      });
      
      markdown += `\n`;
      
      // TypeScript type reference
      markdown += `### TypeScript Type\n\n`;
      markdown += `\`\`\`typescript\n`;
      markdown += `import { Database } from '@/types/database';\n\n`;
      markdown += `type ${tableName.charAt(0).toUpperCase() + tableName.slice(1)}Row = Database['public']['Tables']['${tableName}']['Row'];\n`;
      markdown += `type ${tableName.charAt(0).toUpperCase() + tableName.slice(1)}Insert = Database['public']['Tables']['${tableName}']['Insert'];\n`;
      markdown += `type ${tableName.charAt(0).toUpperCase() + tableName.slice(1)}Update = Database['public']['Tables']['${tableName}']['Update'];\n`;
      markdown += `\`\`\`\n\n`;
      
      // Usage example
      markdown += `### Example Usage\n\n`;
      markdown += `\`\`\`typescript\n`;
      markdown += `import { supabase } from '@/lib/supabaseClient';\n\n`;
      markdown += `// SELECT\n`;
      markdown += `const { data, error } = await supabase\n`;
      markdown += `  .from('${tableName}')\n`;
      markdown += `  .select('*');\n\n`;
      markdown += `// INSERT\n`;
      markdown += `const { data, error } = await supabase\n`;
      markdown += `  .from('${tableName}')\n`;
      markdown += `  .insert({ /* your data */ });\n\n`;
      markdown += `// UPDATE\n`;
      markdown += `const { data, error } = await supabase\n`;
      markdown += `  .from('${tableName}')\n`;
      markdown += `  .update({ /* fields to update */ })\n`;
      markdown += `  .eq('id', 'some-id');\n\n`;
      markdown += `// DELETE\n`;
      markdown += `const { error } = await supabase\n`;
      markdown += `  .from('${tableName}')\n`;
      markdown += `  .delete()\n`;
      markdown += `  .eq('id', 'some-id');\n`;
      markdown += `\`\`\`\n\n`;
      
    } else {
      markdown += `**Status**: Table exists but is empty\n\n`;
    }
    
    markdown += `---\n\n`;
  }

  // Add footer
  markdown += `## How to Update This Documentation\n\n`;
  markdown += `Run the following command to regenerate this file:\n\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `node scripts/document-schema.js\n`;
  markdown += `\`\`\`\n\n`;
  markdown += `## Related Files\n\n`;
  markdown += `- [\`../types/database.ts\`](../types/database.ts) - Auto-generated TypeScript types\n`;
  markdown += `- [\`../lib/supabaseClient.ts\`](../lib/supabaseClient.ts) - Typed Supabase client\n`;
  markdown += `- [\`../supabase/migrations/\`](../supabase/migrations/) - Supabase SQL migrations\n`;
  markdown += `- [\`../REFERENCE_FILES_INDEX.md\`](../REFERENCE_FILES_INDEX.md) - Documentation index\n`;

  // Write to file
  const outputPath = path.join(__dirname, '..', 'docs', 'GENERATED_SCHEMA.md');
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, markdown, 'utf8');
  
  console.log(`\n✅ Schema documentation generated: ${outputPath}`);
}

documentSchema().catch(console.error);
