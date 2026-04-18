export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_threads: {
        Row: {
          created_at: string
          id: string
          tenant_id: string
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tenant_id: string
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tenant_id?: string
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          id: string
          message_count: number
          model: string
          route: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_count: number
          model: string
          route: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_count?: number
          model?: string
          route?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attribute_definitions: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          data_type: string
          display_order: number | null
          help_text: string | null
          id: string
          industry_type: Database["public"]["Enums"]["industry_type"] | null
          is_deleted: boolean
          is_required: boolean | null
          key: string
          metadata: Json
          name: string
          tenant_id: string
          unit_id: string | null
          updated_at: string
          updated_by: string | null
          validation_rules: Json | null
          version: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          data_type: string
          display_order?: number | null
          help_text?: string | null
          id?: string
          industry_type?: Database["public"]["Enums"]["industry_type"] | null
          is_deleted?: boolean
          is_required?: boolean | null
          key: string
          metadata?: Json
          name: string
          tenant_id: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          validation_rules?: Json | null
          version?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          data_type?: string
          display_order?: number | null
          help_text?: string | null
          id?: string
          industry_type?: Database["public"]["Enums"]["industry_type"] | null
          is_deleted?: boolean
          is_required?: boolean | null
          key?: string
          metadata?: Json
          name?: string
          tenant_id?: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          validation_rules?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "attribute_definitions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribute_definitions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attribute_definitions_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          id: string
          ip_address: unknown
          resource_id: string
          resource_type: string
          tenant_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          resource_id: string
          resource_type: string
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          resource_id?: string
          resource_type?: string
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_headers: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_from: string | null
          effective_to: string | null
          external_id: string | null
          external_system: string | null
          id: string
          integration_metadata: Json
          is_active: boolean | null
          is_deleted: boolean
          last_synced_at: string | null
          metadata: Json
          name: string | null
          notes: string | null
          output_quantity: number
          output_unit_id: string | null
          product_id: string
          standard_cost: number | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          external_id?: string | null
          external_system?: string | null
          id?: string
          integration_metadata?: Json
          is_active?: boolean | null
          is_deleted?: boolean
          last_synced_at?: string | null
          metadata?: Json
          name?: string | null
          notes?: string | null
          output_quantity?: number
          output_unit_id?: string | null
          product_id: string
          standard_cost?: number | null
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
          version?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          external_id?: string | null
          external_system?: string | null
          id?: string
          integration_metadata?: Json
          is_active?: boolean | null
          is_deleted?: boolean
          last_synced_at?: string | null
          metadata?: Json
          name?: string | null
          notes?: string | null
          output_quantity?: number
          output_unit_id?: string | null
          product_id?: string
          standard_cost?: number | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_headers_output_unit_id_fkey"
            columns: ["output_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_headers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_headers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bom_headers_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_lines: {
        Row: {
          bom_header_id: string
          component_product_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_deleted: boolean
          is_optional: boolean | null
          metadata: Json
          notes: string | null
          quantity: number
          sequence: number
          substitute_group: number | null
          tenant_id: string
          unit_id: string | null
          updated_at: string
          updated_by: string | null
          version: number
          waste_percentage: number | null
        }
        Insert: {
          bom_header_id: string
          component_product_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_deleted?: boolean
          is_optional?: boolean | null
          metadata?: Json
          notes?: string | null
          quantity: number
          sequence: number
          substitute_group?: number | null
          tenant_id: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          waste_percentage?: number | null
        }
        Update: {
          bom_header_id?: string
          component_product_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_deleted?: boolean
          is_optional?: boolean | null
          metadata?: Json
          notes?: string | null
          quantity?: number
          sequence?: number
          substitute_group?: number | null
          tenant_id?: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          waste_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_lines_bom_header_id_fkey"
            columns: ["bom_header_id"]
            isOneToOne: false
            referencedRelation: "bom_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_lines_bom_header_id_fkey"
            columns: ["bom_header_id"]
            isOneToOne: false
            referencedRelation: "vw_bom_costing"
            referencedColumns: ["bom_id"]
          },
          {
            foreignKeyName: "bom_lines_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_lines_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_lines_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bom_lines_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar: {
        Row: {
          bank_holiday: string | null
          created_at: string
          created_by: string | null
          date: string
          day: number
          day_name: string
          day_of_week: number
          events: string | null
          id: number
          is_deleted: boolean
          julian_day: number
          metadata: Json
          month: number
          month_name: string
          notes: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
          week_iso: number
          week_monday: number
          week_sunday: number
          year: number
        }
        Insert: {
          bank_holiday?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          day: number
          day_name: string
          day_of_week: number
          events?: string | null
          id?: never
          is_deleted?: boolean
          julian_day: number
          metadata?: Json
          month: number
          month_name: string
          notes?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          week_iso: number
          week_monday: number
          week_sunday: number
          year: number
        }
        Update: {
          bank_holiday?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          day?: number
          day_name?: string
          day_of_week?: number
          events?: string | null
          id?: never
          is_deleted?: boolean
          julian_day?: number
          metadata?: Json
          month?: number
          month_name?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          week_iso?: number
          week_monday?: number
          week_sunday?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "calendar_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_calendar_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          code: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          external_id: string | null
          external_system: string | null
          icon: string | null
          id: string
          image_url: string | null
          industry_type: Database["public"]["Enums"]["industry_type"]
          integration_metadata: Json
          is_active: boolean | null
          is_deleted: boolean
          last_synced_at: string | null
          metadata: Json
          name: string
          parent_id: string | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
          version: number
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          external_id?: string | null
          external_system?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          industry_type: Database["public"]["Enums"]["industry_type"]
          integration_metadata?: Json
          is_active?: boolean | null
          is_deleted?: boolean
          last_synced_at?: string | null
          metadata?: Json
          name: string
          parent_id?: string | null
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Update: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          external_id?: string | null
          external_system?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          industry_type?: Database["public"]["Enums"]["industry_type"]
          integration_metadata?: Json
          is_active?: boolean | null
          is_deleted?: boolean
          last_synced_at?: string | null
          metadata?: Json
          name?: string
          parent_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_categories_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_type: string
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_default: boolean | null
          line1: string | null
          line2: string | null
          postcode: string | null
          state: string | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address_type: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_default?: boolean | null
          line1?: string | null
          line2?: string | null
          postcode?: string | null
          state?: string | null
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address_type?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_default?: boolean | null
          line1?: string | null
          line2?: string | null
          postcode?: string | null
          state?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_attachments: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          deleted_by: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          deleted_by?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          deleted_by?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_attachments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          first_name: string | null
          id: string
          is_primary: boolean | null
          last_name: string | null
          mobile: string | null
          phone: string | null
          role: string | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean | null
          last_name?: string | null
          mobile?: string | null
          phone?: string | null
          role?: string | null
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean | null
          last_name?: string | null
          mobile?: string | null
          phone?: string | null
          role?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          note_text: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          note_text: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          note_text?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          channel: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          credit_hold: boolean | null
          credit_limit: number | null
          credit_rating: string | null
          currency: string | null
          customer_code: string | null
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          default_warehouse_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          delivery_instructions: string | null
          demand_profile: string | null
          discount_rate: number | null
          email: string
          forecast_group: string | null
          id: string
          incoterms: string | null
          legal_name: string | null
          logo_url: string | null
          metadata: Json
          payment_terms: string | null
          phone: string | null
          postcode: string | null
          preferred_carrier: string | null
          price_list_id: string | null
          region: string | null
          registration_number: string | null
          risk_category: string | null
          sales_rep_id: string | null
          shipping_account_number: string | null
          state: string | null
          status: Database["public"]["Enums"]["customer_status"]
          tax_inclusive: boolean | null
          tax_scheme: string | null
          tenant_id: string
          trading_name: string | null
          updated_at: string
          updated_by: string | null
          vat_number: string | null
          version: number
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          channel?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_hold?: boolean | null
          credit_limit?: number | null
          credit_rating?: string | null
          currency?: string | null
          customer_code?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          default_warehouse_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_instructions?: string | null
          demand_profile?: string | null
          discount_rate?: number | null
          email: string
          forecast_group?: string | null
          id?: string
          incoterms?: string | null
          legal_name?: string | null
          logo_url?: string | null
          metadata?: Json
          payment_terms?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_carrier?: string | null
          price_list_id?: string | null
          region?: string | null
          registration_number?: string | null
          risk_category?: string | null
          sales_rep_id?: string | null
          shipping_account_number?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tax_inclusive?: boolean | null
          tax_scheme?: string | null
          tenant_id: string
          trading_name?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_number?: string | null
          version?: number
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          channel?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_hold?: boolean | null
          credit_limit?: number | null
          credit_rating?: string | null
          currency?: string | null
          customer_code?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          default_warehouse_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_instructions?: string | null
          demand_profile?: string | null
          discount_rate?: number | null
          email?: string
          forecast_group?: string | null
          id?: string
          incoterms?: string | null
          legal_name?: string | null
          logo_url?: string | null
          metadata?: Json
          payment_terms?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_carrier?: string | null
          price_list_id?: string | null
          region?: string | null
          registration_number?: string | null
          risk_category?: string | null
          sales_rep_id?: string | null
          shipping_account_number?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tax_inclusive?: boolean | null
          tax_scheme?: string | null
          tenant_id?: string
          trading_name?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_number?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_customers_default_warehouse_id"
            columns: ["default_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_forecasts: {
        Row: {
          actual_quantity: number | null
          confidence_level: number | null
          created_at: string | null
          created_by: string | null
          customer_ref: string | null
          forecast_method: string | null
          forecast_quantity: number
          forecast_scenario_id: string | null
          id: string
          is_deleted: boolean
          location_ref: string | null
          metadata: Json
          notes: string | null
          period_end: string
          period_start: string
          product_id: string
          scenario_code: string
          status: string
          supersedes_forecast_id: string | null
          tenant_id: string
          time_grain: string
          unit_id: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          actual_quantity?: number | null
          confidence_level?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_ref?: string | null
          forecast_method?: string | null
          forecast_quantity: number
          forecast_scenario_id?: string | null
          id?: string
          is_deleted?: boolean
          location_ref?: string | null
          metadata?: Json
          notes?: string | null
          period_end: string
          period_start: string
          product_id: string
          scenario_code?: string
          status?: string
          supersedes_forecast_id?: string | null
          tenant_id: string
          time_grain?: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          actual_quantity?: number | null
          confidence_level?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_ref?: string | null
          forecast_method?: string | null
          forecast_quantity?: number
          forecast_scenario_id?: string | null
          id?: string
          is_deleted?: boolean
          location_ref?: string | null
          metadata?: Json
          notes?: string | null
          period_end?: string
          period_start?: string
          product_id?: string
          scenario_code?: string
          status?: string
          supersedes_forecast_id?: string | null
          tenant_id?: string
          time_grain?: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "demand_forecasts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_forecasts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_demand_forecasts_forecast_scenario_id"
            columns: ["forecast_scenario_id"]
            isOneToOne: false
            referencedRelation: "forecast_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_demand_forecasts_supersedes"
            columns: ["supersedes_forecast_id"]
            isOneToOne: false
            referencedRelation: "demand_forecasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_demand_forecasts_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_demand_forecasts_unit_id"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_provisioning_log: {
        Row: {
          created_at: string | null
          feature_name: string
          id: string
          notes: string | null
          provisioned_at: string | null
          provisioned_by: string | null
          schema_name: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          feature_name: string
          id?: string
          notes?: string | null
          provisioned_at?: string | null
          provisioned_by?: string | null
          schema_name: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          feature_name?: string
          id?: string
          notes?: string | null
          provisioned_at?: string | null
          provisioned_by?: string | null
          schema_name?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_provisioning_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_scenarios: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          is_deleted: boolean
          metadata: Json
          name: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          is_deleted?: boolean
          metadata?: Json
          name: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          is_deleted?: boolean
          metadata?: Json
          name?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_forecast_scenarios_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt_lines: {
        Row: {
          created_at: string
          goods_receipt_id: string
          id: string
          metadata: Json
          purchase_order_line_id: string
          quantity_received: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          goods_receipt_id: string
          id?: string
          metadata?: Json
          purchase_order_line_id: string
          quantity_received: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          goods_receipt_id?: string
          id?: string
          metadata?: Json
          purchase_order_line_id?: string
          quantity_received?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_lines_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_purchase_order_line_id_fkey"
            columns: ["purchase_order_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          created_at: string
          created_by: string | null
          gr_number: string
          id: string
          metadata: Json
          notes: string | null
          purchase_order_id: string
          received_at: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          gr_number: string
          id?: string
          metadata?: Json
          notes?: string | null
          purchase_order_id: string
          received_at?: string
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          gr_number?: string
          id?: string
          metadata?: Json
          notes?: string | null
          purchase_order_id?: string
          received_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          added_at: string | null
          added_by: string | null
          group_id: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          group_id: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          group_id?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_module_access: {
        Row: {
          created_at: string | null
          group_id: string
          has_access: boolean
          id: string
          is_readonly: boolean
          module_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          has_access?: boolean
          id?: string
          is_readonly?: boolean
          module_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          has_access?: boolean
          id?: string
          is_readonly?: boolean
          module_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_module_access_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_resource_grants: {
        Row: {
          allowed_actions: string[]
          created_at: string
          effect: string
          group_id: string
          resource_id: string
          updated_at: string
        }
        Insert: {
          allowed_actions?: string[]
          created_at?: string
          effect?: string
          group_id: string
          resource_id: string
          updated_at?: string
        }
        Update: {
          allowed_actions?: string[]
          created_at?: string
          effect?: string
          group_id?: string
          resource_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_resource_grants_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_resource_grants_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "permission_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation: {
        Row: {
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          is_deleted: boolean
          is_enabled: boolean | null
          label: string | null
          metadata: Json
          path: string | null
          position: string | null
          role: string | null
          stable_key: string | null
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          is_deleted?: boolean
          is_enabled?: boolean | null
          label?: string | null
          metadata?: Json
          path?: string | null
          position?: string | null
          role?: string | null
          stable_key?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          is_deleted?: boolean
          is_enabled?: boolean | null
          label?: string | null
          metadata?: Json
          path?: string | null
          position?: string | null
          role?: string | null
          stable_key?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_navigation_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_configurations: {
        Row: {
          barcode: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          dimension_unit_id: string | null
          external_id: string | null
          external_system: string | null
          gtin: string | null
          height: number | null
          id: string
          integration_metadata: Json
          is_default: boolean | null
          is_deleted: boolean
          last_synced_at: string | null
          length: number | null
          level: Database["public"]["Enums"]["packing_level"]
          metadata: Json
          previous_level: Database["public"]["Enums"]["packing_level"] | null
          product_id: string
          quantity: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
          weight: number | null
          weight_unit_id: string | null
          width: number | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dimension_unit_id?: string | null
          external_id?: string | null
          external_system?: string | null
          gtin?: string | null
          height?: number | null
          id?: string
          integration_metadata?: Json
          is_default?: boolean | null
          is_deleted?: boolean
          last_synced_at?: string | null
          length?: number | null
          level: Database["public"]["Enums"]["packing_level"]
          metadata?: Json
          previous_level?: Database["public"]["Enums"]["packing_level"] | null
          product_id: string
          quantity: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          weight?: number | null
          weight_unit_id?: string | null
          width?: number | null
        }
        Update: {
          barcode?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dimension_unit_id?: string | null
          external_id?: string | null
          external_system?: string | null
          gtin?: string | null
          height?: number | null
          id?: string
          integration_metadata?: Json
          is_default?: boolean | null
          is_deleted?: boolean
          last_synced_at?: string | null
          length?: number | null
          level?: Database["public"]["Enums"]["packing_level"]
          metadata?: Json
          previous_level?: Database["public"]["Enums"]["packing_level"] | null
          product_id?: string
          quantity?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          weight?: number | null
          weight_unit_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_packing_configurations_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_configurations_dimension_unit_id_fkey"
            columns: ["dimension_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_configurations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_configurations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_configurations_weight_unit_id_fkey"
            columns: ["weight_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_actions: {
        Row: {
          action_key: string
          created_at: string
          id: string
          resource_id: string
        }
        Insert: {
          action_key: string
          created_at?: string
          id?: string
          resource_id: string
        }
        Update: {
          action_key?: string
          created_at?: string
          id?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_actions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "permission_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_resources: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          metadata: Json
          navigation_id: string | null
          resource_key: string
          resource_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          metadata?: Json
          navigation_id?: string | null
          resource_key: string
          resource_type?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          metadata?: Json
          navigation_id?: string | null
          resource_key?: string
          resource_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_resources_navigation_id_fkey"
            columns: ["navigation_id"]
            isOneToOne: false
            referencedRelation: "navigation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list_items: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          is_deleted: boolean
          max_quantity: number | null
          metadata: Json
          min_quantity: number | null
          price_list_id: string
          product_id: string
          tenant_id: string
          unit_price: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          is_deleted?: boolean
          max_quantity?: number | null
          metadata?: Json
          min_quantity?: number | null
          price_list_id: string
          product_id: string
          tenant_id: string
          unit_price: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          is_deleted?: boolean
          max_quantity?: number | null
          metadata?: Json
          min_quantity?: number | null
          price_list_id?: string
          product_id?: string
          tenant_id?: string
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_price_list_items_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_deleted: boolean
          metadata: Json
          name: string
          rounding_mode: string | null
          tax_inclusive: boolean
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_deleted?: boolean
          metadata?: Json
          name: string
          rounding_mode?: string | null
          tax_inclusive?: boolean
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_deleted?: boolean
          metadata?: Json
          name?: string
          rounding_mode?: string | null
          tax_inclusive?: boolean
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_price_lists_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_activity_log: {
        Row: {
          action: string
          changed_fields: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          ip_address: unknown
          is_deleted: boolean
          metadata: Json
          new_values: Json | null
          old_values: Json | null
          product_id: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          user_agent: string | null
          user_id: string | null
          version: number
        }
        Insert: {
          action: string
          changed_fields?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          ip_address?: unknown
          is_deleted?: boolean
          metadata?: Json
          new_values?: Json | null
          old_values?: Json | null
          product_id: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          user_agent?: string | null
          user_id?: string | null
          version?: number
        }
        Update: {
          action?: string
          changed_fields?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          ip_address?: unknown
          is_deleted?: boolean
          metadata?: Json
          new_values?: Json | null
          old_values?: Json | null
          product_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          user_agent?: string | null
          user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_activity_log_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_activity_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_activity_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
        ]
      }
      product_barcodes: {
        Row: {
          barcode: string
          barcode_type: Database["public"]["Enums"]["barcode_type"]
          created_at: string | null
          created_by: string | null
          description: string | null
          external_id: string | null
          external_system: string | null
          id: string
          integration_metadata: Json
          is_active: boolean | null
          is_deleted: boolean
          is_primary: boolean | null
          last_synced_at: string | null
          metadata: Json
          packing_level: Database["public"]["Enums"]["packing_level"] | null
          product_id: string
          quantity: number | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          barcode: string
          barcode_type?: Database["public"]["Enums"]["barcode_type"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          external_id?: string | null
          external_system?: string | null
          id?: string
          integration_metadata?: Json
          is_active?: boolean | null
          is_deleted?: boolean
          is_primary?: boolean | null
          last_synced_at?: string | null
          metadata?: Json
          packing_level?: Database["public"]["Enums"]["packing_level"] | null
          product_id: string
          quantity?: number | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          barcode?: string
          barcode_type?: Database["public"]["Enums"]["barcode_type"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          external_id?: string | null
          external_system?: string | null
          id?: string
          integration_metadata?: Json
          is_active?: boolean | null
          is_deleted?: boolean
          is_primary?: boolean | null
          last_synced_at?: string | null
          metadata?: Json
          packing_level?: Database["public"]["Enums"]["packing_level"] | null
          product_id?: string
          quantity?: number | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_barcodes_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_barcodes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_barcodes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_deleted: boolean
          metadata: Json
          product_id: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          category_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_deleted?: boolean
          metadata?: Json
          product_id: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_deleted?: boolean
          metadata?: Json
          product_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_categories_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cost_history: {
        Row: {
          cost_method: string | null
          cost_price: number
          created_at: string | null
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          is_deleted: boolean
          metadata: Json
          notes: string | null
          product_id: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          cost_method?: string | null
          cost_price: number
          created_at?: string | null
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          is_deleted?: boolean
          metadata?: Json
          notes?: string | null
          product_id: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          cost_method?: string | null
          cost_price?: number
          created_at?: string | null
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_deleted?: boolean
          metadata?: Json
          notes?: string | null
          product_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_cost_history_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cost_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cost_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
        ]
      }
      product_groups: {
        Row: {
          attribute_dimensions: Json | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_deleted: boolean
          name: string
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attribute_dimensions?: Json | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_deleted?: boolean
          name: string
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attribute_dimensions?: Json | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_deleted?: boolean
          name?: string
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_metrics: {
        Row: {
          average_stock: number | null
          closing_stock: number | null
          created_at: string | null
          created_by: string | null
          days_of_stock: number | null
          id: string
          is_deleted: boolean
          metadata: Json
          metric_date: string
          opening_stock: number | null
          period_type: string
          produced_quantity: number | null
          product_id: string
          production_cost: number | null
          sales_count: number | null
          sales_quantity: number | null
          sales_revenue: number | null
          stock_out_days: number | null
          stock_value: number | null
          tenant_id: string
          turnover_rate: number | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          average_stock?: number | null
          closing_stock?: number | null
          created_at?: string | null
          created_by?: string | null
          days_of_stock?: number | null
          id?: string
          is_deleted?: boolean
          metadata?: Json
          metric_date: string
          opening_stock?: number | null
          period_type: string
          produced_quantity?: number | null
          product_id: string
          production_cost?: number | null
          sales_count?: number | null
          sales_quantity?: number | null
          sales_revenue?: number | null
          stock_out_days?: number | null
          stock_value?: number | null
          tenant_id: string
          turnover_rate?: number | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          average_stock?: number | null
          closing_stock?: number | null
          created_at?: string | null
          created_by?: string | null
          days_of_stock?: number | null
          id?: string
          is_deleted?: boolean
          metadata?: Json
          metric_date?: string
          opening_stock?: number | null
          period_type?: string
          produced_quantity?: number | null
          product_id?: string
          production_cost?: number | null
          sales_count?: number | null
          sales_quantity?: number | null
          sales_revenue?: number | null
          stock_out_days?: number | null
          stock_value?: number | null
          tenant_id?: string
          turnover_rate?: number | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_metrics_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_metrics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_metrics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
        ]
      }
      production_plans: {
        Row: {
          actual_end_date: string | null
          actual_quantity: number | null
          actual_start_date: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          bom_header_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_deleted: boolean
          metadata: Json
          notes: string | null
          planned_end_date: string
          planned_quantity: number
          planned_start_date: string
          priority: number | null
          product_id: string
          status: string | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
          version: number
        }
        Insert: {
          actual_end_date?: string | null
          actual_quantity?: number | null
          actual_start_date?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          bom_header_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_deleted?: boolean
          metadata?: Json
          notes?: string | null
          planned_end_date: string
          planned_quantity: number
          planned_start_date: string
          priority?: number | null
          product_id: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Update: {
          actual_end_date?: string | null
          actual_quantity?: number | null
          actual_start_date?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          bom_header_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_deleted?: boolean
          metadata?: Json
          notes?: string | null
          planned_end_date?: string
          planned_quantity?: number
          planned_start_date?: string
          priority?: number | null
          product_id?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_production_plans_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_bom_header_id_fkey"
            columns: ["bom_header_id"]
            isOneToOne: false
            referencedRelation: "bom_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_bom_header_id_fkey"
            columns: ["bom_header_id"]
            isOneToOne: false
            referencedRelation: "vw_bom_costing"
            referencedColumns: ["bom_id"]
          },
          {
            foreignKeyName: "production_plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allergens: string[] | null
          attributes: Json | null
          base_unit_id: string | null
          batch_tracked: boolean | null
          category_id: string | null
          certifications: string[] | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          default_supplier_id: string | null
          description: string | null
          dimension_unit_id: string | null
          documents: Json | null
          external_id: string | null
          external_system: string | null
          height: number | null
          id: string
          image_url: string | null
          images: Json | null
          industry_type: Database["public"]["Enums"]["industry_type"]
          integration_metadata: Json
          is_active: boolean | null
          is_deleted: boolean
          last_synced_at: string | null
          lead_time_days: number | null
          length: number | null
          lot_controlled: boolean | null
          manufacturer_part_number: string | null
          max_stock_level: number | null
          metadata: Json | null
          min_stock_level: number | null
          name: string
          product_group_id: string | null
          product_type: Database["public"]["Enums"]["product_type"]
          reorder_point: number | null
          reorder_quantity: number | null
          safety_rating: string | null
          sell_price: number | null
          serial_tracked: boolean | null
          shelf_life_days: number | null
          short_description: string | null
          sku: string
          specifications_url: string | null
          status: Database["public"]["Enums"]["status_type"] | null
          storage_conditions: string | null
          tags: string[] | null
          tenant_id: string
          tracks_inventory: boolean
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          variant_attributes: Json | null
          version: number
          volume: number | null
          volume_unit_id: string | null
          weight: number | null
          weight_unit_id: string | null
          weighted_avg_unit_cost: number | null
          width: number | null
        }
        Insert: {
          allergens?: string[] | null
          attributes?: Json | null
          base_unit_id?: string | null
          batch_tracked?: boolean | null
          category_id?: string | null
          certifications?: string[] | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          default_supplier_id?: string | null
          description?: string | null
          dimension_unit_id?: string | null
          documents?: Json | null
          external_id?: string | null
          external_system?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          images?: Json | null
          industry_type: Database["public"]["Enums"]["industry_type"]
          integration_metadata?: Json
          is_active?: boolean | null
          is_deleted?: boolean
          last_synced_at?: string | null
          lead_time_days?: number | null
          length?: number | null
          lot_controlled?: boolean | null
          manufacturer_part_number?: string | null
          max_stock_level?: number | null
          metadata?: Json | null
          min_stock_level?: number | null
          name: string
          product_group_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"]
          reorder_point?: number | null
          reorder_quantity?: number | null
          safety_rating?: string | null
          sell_price?: number | null
          serial_tracked?: boolean | null
          shelf_life_days?: number | null
          short_description?: string | null
          sku: string
          specifications_url?: string | null
          status?: Database["public"]["Enums"]["status_type"] | null
          storage_conditions?: string | null
          tags?: string[] | null
          tenant_id: string
          tracks_inventory?: boolean
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          variant_attributes?: Json | null
          version?: number
          volume?: number | null
          volume_unit_id?: string | null
          weight?: number | null
          weight_unit_id?: string | null
          weighted_avg_unit_cost?: number | null
          width?: number | null
        }
        Update: {
          allergens?: string[] | null
          attributes?: Json | null
          base_unit_id?: string | null
          batch_tracked?: boolean | null
          category_id?: string | null
          certifications?: string[] | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          default_supplier_id?: string | null
          description?: string | null
          dimension_unit_id?: string | null
          documents?: Json | null
          external_id?: string | null
          external_system?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          images?: Json | null
          industry_type?: Database["public"]["Enums"]["industry_type"]
          integration_metadata?: Json
          is_active?: boolean | null
          is_deleted?: boolean
          last_synced_at?: string | null
          lead_time_days?: number | null
          length?: number | null
          lot_controlled?: boolean | null
          manufacturer_part_number?: string | null
          max_stock_level?: number | null
          metadata?: Json | null
          min_stock_level?: number | null
          name?: string
          product_group_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"]
          reorder_point?: number | null
          reorder_quantity?: number | null
          safety_rating?: string | null
          sell_price?: number | null
          serial_tracked?: boolean | null
          shelf_life_days?: number | null
          short_description?: string | null
          sku?: string
          specifications_url?: string | null
          status?: Database["public"]["Enums"]["status_type"] | null
          storage_conditions?: string | null
          tags?: string[] | null
          tenant_id?: string
          tracks_inventory?: boolean
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          variant_attributes?: Json | null
          version?: number
          volume?: number | null
          volume_unit_id?: string | null
          weight?: number | null
          weight_unit_id?: string | null
          weighted_avg_unit_cost?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_dimension_unit_id_fkey"
            columns: ["dimension_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_product_group_id_fkey"
            columns: ["product_group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_volume_unit_id_fkey"
            columns: ["volume_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_weight_unit_id_fkey"
            columns: ["weight_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          discount_amount: number
          discount_pct: number
          id: string
          line_net_extended: number | null
          line_no: number
          metadata: Json
          product_id: string
          purchase_order_id: string
          quantity_ordered: number
          tax_rate_pct: number
          tenant_id: string
          unit_price: number
          uom: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number
          discount_pct?: number
          id?: string
          line_net_extended?: number | null
          line_no: number
          metadata?: Json
          product_id: string
          purchase_order_id: string
          quantity_ordered: number
          tax_rate_pct?: number
          tenant_id: string
          unit_price?: number
          uom?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number
          discount_pct?: number
          id?: string
          line_net_extended?: number | null
          line_no?: number
          metadata?: Json
          product_id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          tax_rate_pct?: number
          tenant_id?: string
          unit_price?: number
          uom?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          expected_date: string | null
          id: string
          metadata: Json
          notes: string | null
          order_date: string
          po_number: string
          status: string
          supplier_id: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_date?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          order_date?: string
          po_number: string
          status?: string
          supplier_id: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_date?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          order_date?: string
          po_number?: string
          status?: string
          supplier_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      retailer_weeks: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string
          external_customer_code: string | null
          id: number
          is_deleted: boolean
          metadata: Json
          retail_year: number
          retailer_name: string
          sales_channel: string | null
          start_date: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date: string
          external_customer_code?: string | null
          id?: number
          is_deleted?: boolean
          metadata?: Json
          retail_year: number
          retailer_name: string
          sales_channel?: string | null
          start_date: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          external_customer_code?: string | null
          id?: number
          is_deleted?: boolean
          metadata?: Json
          retail_year?: number
          retailer_name?: string
          sales_channel?: string | null
          start_date?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_retailer_weeks_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_resource_grants: {
        Row: {
          allowed_actions: string[]
          created_at: string
          id: string
          resource_id: string
          role: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allowed_actions?: string[]
          created_at?: string
          id?: string
          resource_id: string
          role: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allowed_actions?: string[]
          created_at?: string
          id?: string
          resource_id?: string
          role?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_resource_grants_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "permission_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_resource_grants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          available_quantity: number | null
          batch_number: string | null
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          is_deleted: boolean
          last_counted_by: string | null
          last_counted_date: string | null
          location_id: string | null
          lot_number: string | null
          metadata: Json
          product_id: string
          quantity: number
          reserved_quantity: number | null
          serial_number: string | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
          version: number
        }
        Insert: {
          available_quantity?: number | null
          batch_number?: string | null
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          is_deleted?: boolean
          last_counted_by?: string | null
          last_counted_date?: string | null
          location_id?: string | null
          lot_number?: string | null
          metadata?: Json
          product_id: string
          quantity?: number
          reserved_quantity?: number | null
          serial_number?: string | null
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Update: {
          available_quantity?: number | null
          batch_number?: string | null
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          is_deleted?: boolean
          last_counted_by?: string | null
          last_counted_date?: string | null
          location_id?: string | null
          lot_number?: string | null
          metadata?: Json
          product_id?: string
          quantity?: number
          reserved_quantity?: number | null
          serial_number?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_levels_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          allocation_id: string | null
          batch_number: string | null
          cost_per_unit: number | null
          created_at: string | null
          created_by: string | null
          from_location_id: string | null
          id: string
          is_deleted: boolean
          lot_number: string | null
          metadata: Json
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          tenant_id: string
          to_location_id: string | null
          total_cost: number | null
          transaction_date: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          unit_id: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          allocation_id?: string | null
          batch_number?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          from_location_id?: string | null
          id?: string
          is_deleted?: boolean
          lot_number?: string | null
          metadata?: Json
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          tenant_id: string
          to_location_id?: string | null
          total_cost?: number | null
          transaction_date?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          allocation_id?: string | null
          batch_number?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          from_location_id?: string | null
          id?: string
          is_deleted?: boolean
          lot_number?: string | null
          metadata?: Json
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          tenant_id?: string
          to_location_id?: string | null
          total_cost?: number | null
          transaction_date?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_transactions_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_packages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          mapped_tier: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          mapped_tier: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          mapped_tier?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      supplier_invoice_lines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          line_no: number
          line_total: number | null
          match_computed_at: string | null
          match_status: string
          metadata: Json
          po_unit_price_snapshot: number | null
          product_id: string
          purchase_order_line_id: string | null
          qty_ordered_snapshot: number | null
          qty_received_snapshot: number | null
          quantity_invoiced: number
          supplier_invoice_id: string
          tax_amount: number
          tenant_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          line_no: number
          line_total?: number | null
          match_computed_at?: string | null
          match_status?: string
          metadata?: Json
          po_unit_price_snapshot?: number | null
          product_id: string
          purchase_order_line_id?: string | null
          qty_ordered_snapshot?: number | null
          qty_received_snapshot?: number | null
          quantity_invoiced: number
          supplier_invoice_id: string
          tax_amount?: number
          tenant_id: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          line_no?: number
          line_total?: number | null
          match_computed_at?: string | null
          match_status?: string
          metadata?: Json
          po_unit_price_snapshot?: number | null
          product_id?: string
          purchase_order_line_id?: string | null
          qty_ordered_snapshot?: number | null
          qty_received_snapshot?: number | null
          quantity_invoiced?: number
          supplier_invoice_id?: string
          tax_amount?: number
          tenant_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_purchase_order_line_id_fkey"
            columns: ["purchase_order_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invoices: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          invoice_date: string
          invoice_number: string
          metadata: Json
          notes: string | null
          purchase_order_id: string | null
          status: string
          supplier_id: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          invoice_date?: string
          invoice_number: string
          metadata?: Json
          notes?: string | null
          purchase_order_id?: string | null
          status?: string
          supplier_id: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          metadata?: Json
          notes?: string | null
          purchase_order_id?: string | null
          status?: string
          supplier_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_product_prices: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string | null
          id: string
          metadata: Json
          min_order_qty: number
          notes: string | null
          product_id: string
          supplier_id: string
          supplier_sku: string | null
          tenant_id: string
          unit_price: number
          uom: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          metadata?: Json
          min_order_qty?: number
          notes?: string | null
          product_id: string
          supplier_id: string
          supplier_sku?: string | null
          tenant_id: string
          unit_price?: number
          uom?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          metadata?: Json
          min_order_qty?: number
          notes?: string | null
          product_id?: string
          supplier_id?: string
          supplier_sku?: string | null
          tenant_id?: string
          unit_price?: number
          uom?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_product_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_product_prices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          external_id: string | null
          external_system: string | null
          id: string
          integration_metadata: Json
          last_synced_at: string | null
          legal_name: string
          logo_url: string | null
          metadata: Json
          notes: string | null
          payment_terms: string | null
          phone: string | null
          postcode: string | null
          state: string | null
          status: string
          supplier_code: string | null
          supplier_type: string
          tax_id: string | null
          tenant_id: string
          trading_name: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          external_id?: string | null
          external_system?: string | null
          id?: string
          integration_metadata?: Json
          last_synced_at?: string | null
          legal_name: string
          logo_url?: string | null
          metadata?: Json
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          postcode?: string | null
          state?: string | null
          status?: string
          supplier_code?: string | null
          supplier_type?: string
          tax_id?: string | null
          tenant_id: string
          trading_name?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          external_id?: string | null
          external_system?: string | null
          id?: string
          integration_metadata?: Json
          last_synced_at?: string | null
          legal_name?: string
          logo_url?: string | null
          metadata?: Json
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          postcode?: string | null
          state?: string | null
          status?: string
          supplier_code?: string | null
          supplier_type?: string
          tax_id?: string | null
          tenant_id?: string
          trading_name?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_impersonation_audit: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          read_only: boolean
          target_tenant_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          read_only?: boolean
          target_tenant_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          read_only?: boolean
          target_tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_impersonation_audit_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          group_id: string | null
          id: string
          invited_by: string | null
          role: string
          tenant_id: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          group_id?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          tenant_id: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          group_id?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_schemas: {
        Row: {
          created_at: string | null
          id: string
          provisioned_at: string | null
          schema_name: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          provisioned_at?: string | null
          schema_name: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          provisioned_at?: string | null
          schema_name?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_schemas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          catalogue_mode: string
          company_name: string | null
          contact_email: string | null
          contact_phone: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          id: string
          industry: string | null
          is_active: boolean
          is_template: boolean
          logo_url: string | null
          max_users: number | null
          name: string
          notes: string | null
          settings: Json | null
          slug: string | null
          subscription_package_id: string | null
          subscription_tier: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          catalogue_mode?: string
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          is_active?: boolean
          is_template?: boolean
          logo_url?: string | null
          max_users?: number | null
          name: string
          notes?: string | null
          settings?: Json | null
          slug?: string | null
          subscription_package_id?: string | null
          subscription_tier?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          catalogue_mode?: string
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          is_active?: boolean
          is_template?: boolean
          logo_url?: string | null
          max_users?: number | null
          name?: string
          notes?: string | null
          settings?: Json | null
          slug?: string | null
          subscription_package_id?: string | null
          subscription_tier?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_subscription_package_id_fkey"
            columns: ["subscription_package_id"]
            isOneToOne: false
            referencedRelation: "subscription_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_conversions: {
        Row: {
          conversion_factor: number
          created_at: string | null
          created_by: string | null
          from_unit_id: string
          id: string
          is_deleted: boolean
          is_reversible: boolean | null
          metadata: Json
          notes: string | null
          tenant_id: string
          to_unit_id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          conversion_factor: number
          created_at?: string | null
          created_by?: string | null
          from_unit_id: string
          id?: string
          is_deleted?: boolean
          is_reversible?: boolean | null
          metadata?: Json
          notes?: string | null
          tenant_id: string
          to_unit_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          conversion_factor?: number
          created_at?: string | null
          created_by?: string | null
          from_unit_id?: string
          id?: string
          is_deleted?: boolean
          is_reversible?: boolean | null
          metadata?: Json
          notes?: string | null
          tenant_id?: string
          to_unit_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_unit_conversions_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_conversions_from_unit_id_fkey"
            columns: ["from_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_conversions_to_unit_id_fkey"
            columns: ["to_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          base_conversion_factor: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_base_unit: boolean | null
          is_deleted: boolean
          metadata: Json
          name: string
          symbol: string
          tenant_id: string
          unit_type: Database["public"]["Enums"]["unit_type"]
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          base_conversion_factor?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_base_unit?: boolean | null
          is_deleted?: boolean
          metadata?: Json
          name: string
          symbol: string
          tenant_id: string
          unit_type: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          base_conversion_factor?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_base_unit?: boolean | null
          is_deleted?: boolean
          metadata?: Json
          name?: string
          symbol?: string
          tenant_id?: string
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_units_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_deleted: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      user_module_access: {
        Row: {
          created_at: string | null
          has_access: boolean
          id: string
          is_readonly: boolean
          module_id: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          has_access?: boolean
          id?: string
          is_readonly?: boolean
          module_id: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          has_access?: boolean
          id?: string
          is_readonly?: boolean
          module_id?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          primary_group_id: string | null
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          primary_group_id?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          primary_group_id?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_profiles_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_primary_group_id_fkey"
            columns: ["primary_group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_resource_grants: {
        Row: {
          allowed_actions: string[]
          created_at: string
          effect: string
          resource_id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_actions?: string[]
          created_at?: string
          effect?: string
          resource_id: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_actions?: string[]
          created_at?: string
          effect?: string
          resource_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_resource_grants_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "permission_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_resource_grants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_resource_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_tenants: {
        Row: {
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          external_id: string | null
          external_system: string | null
          id: string
          integration_metadata: Json
          is_default: boolean
          last_synced_at: string | null
          logo_url: string | null
          metadata: Json
          name: string
          notes: string | null
          postcode: string | null
          state: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
          warehouse_code: string | null
          warehouse_type: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          external_id?: string | null
          external_system?: string | null
          id?: string
          integration_metadata?: Json
          is_default?: boolean
          last_synced_at?: string | null
          logo_url?: string | null
          metadata?: Json
          name: string
          notes?: string | null
          postcode?: string | null
          state?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          warehouse_code?: string | null
          warehouse_type?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          external_id?: string | null
          external_system?: string | null
          id?: string
          integration_metadata?: Json
          is_default?: boolean
          last_synced_at?: string | null
          logo_url?: string | null
          metadata?: Json
          name?: string
          notes?: string | null
          postcode?: string | null
          state?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          warehouse_code?: string | null
          warehouse_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cached_timezones: {
        Row: {
          abbrev: string | null
          is_dst: boolean | null
          name: string | null
          utc_offset: string | null
        }
        Relationships: []
      }
      vw_bom_costing: {
        Row: {
          bom_id: string | null
          component_count: number | null
          cost_per_unit: number | null
          output_quantity: number | null
          product_id: string | null
          product_name: string | null
          product_sku: string | null
          total_component_cost: number | null
          version: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_headers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_headers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_products_full"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_products_full: {
        Row: {
          allergens: string[] | null
          attributes: Json | null
          barcodes: Json | null
          base_unit_id: string | null
          base_unit_symbol: string | null
          batch_tracked: boolean | null
          category_code: string | null
          category_id: string | null
          category_name: string | null
          category_names: string[] | null
          certifications: string[] | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          default_supplier_id: string | null
          description: string | null
          dimension_unit_id: string | null
          dimension_unit_symbol: string | null
          documents: Json | null
          external_id: string | null
          external_system: string | null
          height: number | null
          id: string | null
          image_url: string | null
          images: Json | null
          industry_type: Database["public"]["Enums"]["industry_type"] | null
          integration_metadata: Json | null
          is_active: boolean | null
          is_deleted: boolean | null
          last_synced_at: string | null
          lead_time_days: number | null
          length: number | null
          lot_controlled: boolean | null
          manufacturer_part_number: string | null
          max_stock_level: number | null
          metadata: Json | null
          min_stock_level: number | null
          name: string | null
          product_group_attribute_dimensions: Json | null
          product_group_id: string | null
          product_group_name: string | null
          product_type: Database["public"]["Enums"]["product_type"] | null
          reorder_point: number | null
          reorder_quantity: number | null
          safety_rating: string | null
          sell_price: number | null
          serial_tracked: boolean | null
          shelf_life_days: number | null
          short_description: string | null
          sku: string | null
          specifications_url: string | null
          status: Database["public"]["Enums"]["status_type"] | null
          storage_conditions: string | null
          tags: string[] | null
          tenant_id: string | null
          total_stock: number | null
          tracks_inventory: boolean | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          variant_attributes: Json | null
          volume: number | null
          volume_unit_id: string | null
          volume_unit_symbol: string | null
          weight: number | null
          weight_unit_id: string | null
          weight_unit_symbol: string | null
          weighted_avg_unit_cost: number | null
          width: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_dimension_unit_id_fkey"
            columns: ["dimension_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_product_group_id_fkey"
            columns: ["product_group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_volume_unit_id_fkey"
            columns: ["volume_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_weight_unit_id_fkey"
            columns: ["weight_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      app_effective_tenant_id: { Args: never; Returns: string }
      app_impersonate_tenant_id: { Args: never; Returns: string }
      app_impersonation_is_active: { Args: never; Returns: boolean }
      app_impersonation_write_blocked: { Args: never; Returns: boolean }
      count_tenant_records: {
        Args: { table_name: string; tenant_uuid: string }
        Returns: number
      }
      create_tenant_rls_policies: {
        Args: { table_name: string; tenant_id: string }
        Returns: undefined
      }
      create_tenant_schema: {
        Args: { p_tenant_id: string; p_tenant_name?: string }
        Returns: string
      }
      effective_resource_actions: {
        Args: { p_resource_key: string; p_tenant_id: string; p_user_id: string }
        Returns: string[]
      }
      ensure_tenant_id: { Args: { table_id: string }; Returns: string }
      generate_customer_code: { Args: { p_tenant_id: string }; Returns: string }
      generate_goods_receipt_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      generate_purchase_order_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      generate_supplier_code: { Args: { p_tenant_id: string }; Returns: string }
      generate_warehouse_code: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      get_tenant_company_name: {
        Args: { tenant_uuid: string }
        Returns: string
      }
      get_tenant_name: { Args: { tenant_uuid: string }; Returns: string }
      get_tenant_usage_stats: {
        Args: { tenant_uuid: string }
        Returns: {
          calendars: number
          created_at: string
          products: number
          users: number
          workstreams: number
        }[]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      get_user_tenants: {
        Args: never
        Returns: {
          company_name: string
          is_active: boolean
          tenant_id: string
          tenant_name: string
        }[]
      }
      is_tenant_admin: { Args: { user_id: string }; Returns: boolean }
      is_tenants_platform_super_admin: { Args: never; Returns: boolean }
      provision_tenant_from_template: {
        Args: { p_new_tenant: string; p_template_tenant: string }
        Returns: Json
      }
      refresh_cached_timezones: { Args: never; Returns: undefined }
      seed_tenant_default_navigation: {
        Args: { p_tenant_id: string }
        Returns: number
      }
      seed_tenant_navigation_rows: {
        Args: { p_target_tenant_id: string }
        Returns: number
      }
      user_has_tenant_access: {
        Args: { tenant_uuid: string }
        Returns: boolean
      }
      user_in_tenant: { Args: { _tenant_id: string }; Returns: boolean }
      validate_tenant_id: { Args: { tenant_uuid: string }; Returns: boolean }
      validate_user_exists: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      barcode_type:
        | "ean13"
        | "ean8"
        | "upc"
        | "code128"
        | "qr"
        | "datamatrix"
        | "internal"
      customer_status: "active" | "inactive" | "archived"
      customer_type: "individual" | "business" | "distributor" | "internal"
      industry_type:
        | "bakery"
        | "ready_meals"
        | "pizza"
        | "construction"
        | "manufacturing"
        | "retail"
        | "other"
      packing_level: "unit" | "inner" | "case" | "pallet" | "container"
      product_type:
        | "raw_material"
        | "semi_finished"
        | "finished_good"
        | "service"
        | "assembly"
        | "packaging"
      status_type:
        | "active"
        | "inactive"
        | "discontinued"
        | "planned"
        | "development"
      tenant_role: "member" | "admin" | "platform_admin" | "super_admin"
      transaction_type:
        | "purchase"
        | "sale"
        | "production"
        | "adjustment"
        | "transfer"
        | "waste"
      unit_type:
        | "weight"
        | "volume"
        | "length"
        | "area"
        | "count"
        | "time"
        | "temperature"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      barcode_type: [
        "ean13",
        "ean8",
        "upc",
        "code128",
        "qr",
        "datamatrix",
        "internal",
      ],
      customer_status: ["active", "inactive", "archived"],
      customer_type: ["individual", "business", "distributor", "internal"],
      industry_type: [
        "bakery",
        "ready_meals",
        "pizza",
        "construction",
        "manufacturing",
        "retail",
        "other",
      ],
      packing_level: ["unit", "inner", "case", "pallet", "container"],
      product_type: [
        "raw_material",
        "semi_finished",
        "finished_good",
        "service",
        "assembly",
        "packaging",
      ],
      status_type: [
        "active",
        "inactive",
        "discontinued",
        "planned",
        "development",
      ],
      tenant_role: ["member", "admin", "platform_admin", "super_admin"],
      transaction_type: [
        "purchase",
        "sale",
        "production",
        "adjustment",
        "transfer",
        "waste",
      ],
      unit_type: [
        "weight",
        "volume",
        "length",
        "area",
        "count",
        "time",
        "temperature",
      ],
    },
  },
} as const
