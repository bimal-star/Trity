/**
 * Generate TypeScript types from Supabase schema
 * 
 * Note: This script uses the Supabase CLI to generate types.
 * Make sure you have the Supabase CLI installed and configured.
 * 
 * To install: npm install -g supabase
 * To link project: supabase link --project-ref wvqlpcraxorchrtpatph
 * 
 * This approach bypasses RLS issues by using the service role key
 * that the CLI uses internally.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Output path for generated types
const outputPath = path.join(__dirname, '..', 'types', 'database.ts');

console.log('Generating types using Supabase CLI...');
console.log('This will query the database schema directly.\n');

try {
  // Use Supabase CLI to generate types
  // The CLI automatically uses your project credentials
  const output = execSync(
    'supabase gen types typescript --linked',
    { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }
  );
  
  // Write output to file
  fs.writeFileSync(outputPath, output, 'utf8');
  
  console.log(`✅ Types generated successfully: ${outputPath}`);
  console.log(`\nGenerated types for all tables, views, and functions.`);
} catch (error) {
  console.error('❌ Error generating types with Supabase CLI');
  console.error('Make sure you have:');
  console.error('1. Supabase CLI installed: npm install -g supabase');
  console.error('2. Project linked: supabase link --project-ref wvqlpcraxorchrtpatph');
  console.error('\nFalling back to manual type generation...\n');
  
  // Fallback: Generate basic types manually
  generateTypesManually();
}

function generateTypesManually() {
  const basicTypes = `// Auto-generated types from Supabase
// Generated on: ${new Date().toISOString()}
// Note: Using fallback method - types may be incomplete

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Core tables
      tenants: {
        Row: {
          id: string
          name: string
          company_name: string | null
          slug: string | null
          is_active: boolean
          logo_url: string | null
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          company_name?: string | null
          slug?: string | null
          is_active?: boolean
          logo_url?: string | null
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          company_name?: string | null
          slug?: string | null
          is_active?: boolean
          logo_url?: string | null
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          tenant_id: string
          full_name: string | null
          email: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id: string
          full_name?: string | null
          email?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          full_name?: string | null
          email?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar: {
        Row: {
          id: number
          date: string
          year: number
          month: number
          day: number
          day_of_week: number
          week_iso: number
          bank_holiday: string | null
          events: string | null
          notes: string | null
          tenant_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          date: string
          year: number
          month: number
          day: number
          day_of_week: number
          week_iso: number
          bank_holiday?: string | null
          events?: string | null
          notes?: string | null
          tenant_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          date?: string
          year?: number
          month?: number
          day?: number
          day_of_week?: number
          week_iso?: number
          bank_holiday?: string | null
          events?: string | null
          notes?: string | null
          tenant_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workstreams: {
        Row: {
          id: string
          project_id: string | null
          name: string
          workstream: string | null
          description: string | null
          start_date: string | null
          end_date: string | null
          status: string
          progress_percentage: number
          owner_id: string | null
          order_index: number
          tenant_id: string
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          is_deleted: boolean
          planned_hours: number | null
          actual_hours: number | null
          actual_end_date: string | null
          definition_of_done: string | null
          notes: string | null
          depends_on_workstream_id: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          name: string
          workstream?: string | null
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string
          progress_percentage?: number
          owner_id?: string | null
          order_index?: number
          tenant_id: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          is_deleted?: boolean
          planned_hours?: number | null
          actual_hours?: number | null
          actual_end_date?: string | null
          definition_of_done?: string | null
          notes?: string | null
          depends_on_workstream_id?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          name?: string
          workstream?: string | null
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string
          progress_percentage?: number
          owner_id?: string | null
          order_index?: number
          tenant_id?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          is_deleted?: boolean
          planned_hours?: number | null
          actual_hours?: number | null
          actual_end_date?: string | null
          definition_of_done?: string | null
          notes?: string | null
          depends_on_workstream_id?: string | null
        }
        Relationships: []
      }
      workstream_tasks: {
        Row: {
          id: string
          workstream_id: string
          name: string
          description: string | null
          start_date: string | null
          end_date: string | null
          status: string
          progress_percentage: number
          depends_on_task_id: string | null
          order_index: number
          owner_id: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          planned_hours: number | null
          actual_hours: number | null
          actual_end_date: string | null
          definition_of_done: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          workstream_id: string
          name: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string
          progress_percentage?: number
          depends_on_task_id?: string | null
          order_index?: number
          owner_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          planned_hours?: number | null
          actual_hours?: number | null
          actual_end_date?: string | null
          definition_of_done?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          workstream_id?: string
          name?: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string
          progress_percentage?: number
          depends_on_task_id?: string | null
          order_index?: number
          owner_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          planned_hours?: number | null
          actual_hours?: number | null
          actual_end_date?: string | null
          definition_of_done?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      cached_timezones: {
        Row: {
          name: string
          abbrev: string
          utc_offset: string
          is_dst: boolean
        }
        Insert: never // Read-only materialized view
        Update: never // Read-only materialized view
        Relationships: []
      }
      // Add other tables as needed...
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
      refresh_cached_timezones: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
`;

  fs.writeFileSync(outputPath, basicTypes, 'utf8');
  console.log(`✅ Basic types generated: ${outputPath}`);
  console.log('\nNote: Using fallback types. Run with Supabase CLI for complete types.');
}
