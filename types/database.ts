// Auto-generated types from Supabase
// Generated on: 2026-01-30T13:14:45.182Z
// Note: Using fallback method - types may be incomplete

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      // Core tables
      tenants: {
        Row: {
          id: string;
          name: string;
          company_name: string | null;
          slug: string | null;
          is_active: boolean;
          logo_url: string | null;
          settings: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          company_name?: string | null;
          slug?: string | null;
          is_active?: boolean;
          logo_url?: string | null;
          settings?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          company_name?: string | null;
          slug?: string | null;
          is_active?: boolean;
          logo_url?: string | null;
          settings?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string;
          full_name: string | null;
          email: string | null;
          role: 'member' | 'admin' | 'super_admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_id: string;
          full_name?: string | null;
          email?: string | null;
          role?: 'member' | 'admin' | 'super_admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tenant_id?: string;
          full_name?: string | null;
          email?: string | null;
          role?: 'member' | 'admin' | 'super_admin';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      calendar: {
        Row: {
          id: number;
          date: string;
          year: number;
          month: number;
          day: number;
          day_of_week: number;
          week_iso: number;
          bank_holiday: string | null;
          events: string | null;
          notes: string | null;
          tenant_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          date: string;
          year: number;
          month: number;
          day: number;
          day_of_week: number;
          week_iso: number;
          bank_holiday?: string | null;
          events?: string | null;
          notes?: string | null;
          tenant_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          date?: string;
          year?: number;
          month?: number;
          day?: number;
          day_of_week?: number;
          week_iso?: number;
          bank_holiday?: string | null;
          events?: string | null;
          notes?: string | null;
          tenant_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workstreams: {
        Row: {
          id: string;
          project_id: string | null;
          name: string;
          workstream: string | null;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          status: string;
          progress_percentage: number;
          owner_id: string | null;
          order_index: number;
          tenant_id: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          is_deleted: boolean;
          planned_hours: number | null;
          actual_hours: number | null;
          actual_end_date: string | null;
          definition_of_done: string | null;
          notes: string | null;
          depends_on_workstream_id: string | null;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          name: string;
          workstream?: string | null;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          progress_percentage?: number;
          owner_id?: string | null;
          order_index?: number;
          tenant_id: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          is_deleted?: boolean;
          planned_hours?: number | null;
          actual_hours?: number | null;
          actual_end_date?: string | null;
          definition_of_done?: string | null;
          notes?: string | null;
          depends_on_workstream_id?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          name?: string;
          workstream?: string | null;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          progress_percentage?: number;
          owner_id?: string | null;
          order_index?: number;
          tenant_id?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          is_deleted?: boolean;
          planned_hours?: number | null;
          actual_hours?: number | null;
          actual_end_date?: string | null;
          definition_of_done?: string | null;
          notes?: string | null;
          depends_on_workstream_id?: string | null;
        };
        Relationships: [];
      };
      workstream_tasks: {
        Row: {
          id: string;
          workstream_id: string;
          name: string;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          status: string;
          progress_percentage: number;
          depends_on_task_id: string | null;
          order_index: number;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          planned_hours: number | null;
          actual_hours: number | null;
          actual_end_date: string | null;
          definition_of_done: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          workstream_id: string;
          name: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          progress_percentage?: number;
          depends_on_task_id?: string | null;
          order_index?: number;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          planned_hours?: number | null;
          actual_hours?: number | null;
          actual_end_date?: string | null;
          definition_of_done?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          workstream_id?: string;
          name?: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          progress_percentage?: number;
          depends_on_task_id?: string | null;
          order_index?: number;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
          planned_hours?: number | null;
          actual_hours?: number | null;
          actual_end_date?: string | null;
          definition_of_done?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string;
          changes: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          action: string;
          resource_type: string;
          resource_id: string;
          changes?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string;
          changes?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tenant_impersonation_audit: {
        Row: {
          id: string;
          actor_user_id: string;
          target_tenant_id: string;
          action: string;
          read_only: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id: string;
          target_tenant_id: string;
          action: string;
          read_only?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string;
          target_tenant_id?: string;
          action?: string;
          read_only?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      cached_timezones: {
        Row: {
          name: string;
          abbrev: string;
          utc_offset: string;
          is_dst: boolean;
        };
        Insert: never; // Read-only materialized view
        Update: never; // Read-only materialized view
        Relationships: [];
      };
      // Add other tables as needed...
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_tenant_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      refresh_cached_timezones: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
