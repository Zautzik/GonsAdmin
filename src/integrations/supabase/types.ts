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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          rut: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          rut?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          rut?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inks: {
        Row: {
          color: string
          cost_per_liter: number | null
          created_at: string | null
          current_stock_liters: number | null
          density_g_per_ml: number | null
          id: string
          in_stock: boolean | null
          name: string
          type: string
        }
        Insert: {
          color: string
          cost_per_liter?: number | null
          created_at?: string | null
          current_stock_liters?: number | null
          density_g_per_ml?: number | null
          id?: string
          in_stock?: boolean | null
          name: string
          type: string
        }
        Update: {
          color?: string
          cost_per_liter?: number | null
          created_at?: string | null
          current_stock_liters?: number | null
          density_g_per_ml?: number | null
          id?: string
          in_stock?: boolean | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          alert_acknowledged: boolean | null
          alert_status: string | null
          barcode: string | null
          category: string
          created_at: string | null
          current_stock: number | null
          id: string
          is_active: boolean | null
          last_purchase_date: string | null
          last_purchase_price: number | null
          last_restocked: string | null
          location: string | null
          maximum_stock: number | null
          minimum_stock: number | null
          name: string
          qr_code: string | null
          reorder_point: number | null
          sku: string
          supplier_id: string | null
          unit_cost: number | null
          unit_of_measure: string
          updated_at: string | null
        }
        Insert: {
          alert_acknowledged?: boolean | null
          alert_status?: string | null
          barcode?: string | null
          category: string
          created_at?: string | null
          current_stock?: number | null
          id?: string
          is_active?: boolean | null
          last_purchase_date?: string | null
          last_purchase_price?: number | null
          last_restocked?: string | null
          location?: string | null
          maximum_stock?: number | null
          minimum_stock?: number | null
          name: string
          qr_code?: string | null
          reorder_point?: number | null
          sku: string
          supplier_id?: string | null
          unit_cost?: number | null
          unit_of_measure: string
          updated_at?: string | null
        }
        Update: {
          alert_acknowledged?: boolean | null
          alert_status?: string | null
          barcode?: string | null
          category?: string
          created_at?: string | null
          current_stock?: number | null
          id?: string
          is_active?: boolean | null
          last_purchase_date?: string | null
          last_purchase_price?: number | null
          last_restocked?: string | null
          location?: string | null
          maximum_stock?: number | null
          minimum_stock?: number | null
          name?: string
          qr_code?: string | null
          reorder_point?: number | null
          sku?: string
          supplier_id?: string | null
          unit_cost?: number | null
          unit_of_measure?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          id: string
          inventory_id: string
          notes: string | null
          performed_by: string | null
          purchase_order_id: string | null
          quantity: number
          scanned_via: string | null
          transaction_type: string
          unit_cost: number | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_id: string
          notes?: string | null
          performed_by?: string | null
          purchase_order_id?: string | null
          quantity: number
          scanned_via?: string | null
          transaction_type: string
          unit_cost?: number | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_id?: string
          notes?: string | null
          performed_by?: string | null
          purchase_order_id?: string | null
          quantity?: number
          scanned_via?: string | null
          transaction_type?: string
          unit_cost?: number | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          created_at: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["machine_status"]
          type: Database["public"]["Enums"]["machine_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["machine_status"]
          type: Database["public"]["Enums"]["machine_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["machine_status"]
          type?: Database["public"]["Enums"]["machine_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean | null
          is_read: boolean | null
          link_text: string | null
          link_url: string | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          link_text?: string | null
          link_url?: string | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          link_text?: string | null
          link_url?: string | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      operations: {
        Row: {
          category: string
          created_at: string | null
          id: string
          notes: string | null
          operation_code: string
          operation_name: string
          quantity_actual: number | null
          quantity_budgeted: number
          sequence_order: number | null
          status: string | null
          total_cost_actual: number | null
          total_cost_budgeted: number
          unit_cost_actual: number | null
          unit_cost_budgeted: number
          unit_of_measure: string
          work_order_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          notes?: string | null
          operation_code: string
          operation_name: string
          quantity_actual?: number | null
          quantity_budgeted: number
          sequence_order?: number | null
          status?: string | null
          total_cost_actual?: number | null
          total_cost_budgeted: number
          unit_cost_actual?: number | null
          unit_cost_budgeted: number
          unit_of_measure: string
          work_order_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          operation_code?: string
          operation_name?: string
          quantity_actual?: number | null
          quantity_budgeted?: number
          sequence_order?: number | null
          status?: string | null
          total_cost_actual?: number | null
          total_cost_budgeted?: number
          unit_cost_actual?: number | null
          unit_cost_budgeted?: number
          unit_of_measure?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_operation_code_fkey"
            columns: ["operation_code"]
            isOneToOne: false
            referencedRelation: "operations_catalog"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "operations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_catalog: {
        Row: {
          category: string
          code: string
          created_at: string | null
          default_cost: number | null
          description: string | null
          is_active: boolean | null
          name: string
          unit_of_measure: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          default_cost?: number | null
          description?: string | null
          is_active?: boolean | null
          name: string
          unit_of_measure: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          default_cost?: number | null
          description?: string | null
          is_active?: boolean | null
          name?: string
          unit_of_measure?: string
        }
        Relationships: []
      }
      production_activity: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          is_resolved: boolean | null
          issue_type: string | null
          machine_id: string | null
          notes: string | null
          operation_id: string | null
          operator_id: string | null
          reported_via: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          time_elapsed_minutes: number | null
          time_ended: string | null
          time_started: string | null
          units_produced: number | null
          units_rejected: number | null
          work_order_id: string | null
        }
        Insert: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          issue_type?: string | null
          machine_id?: string | null
          notes?: string | null
          operation_id?: string | null
          operator_id?: string | null
          reported_via?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          time_elapsed_minutes?: number | null
          time_ended?: string | null
          time_started?: string | null
          units_produced?: number | null
          units_rejected?: number | null
          work_order_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          issue_type?: string | null
          machine_id?: string | null
          notes?: string | null
          operation_id?: string | null
          operator_id?: string | null
          reported_via?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          time_elapsed_minutes?: number | null
          time_ended?: string | null
          time_started?: string | null
          units_produced?: number | null
          units_rejected?: number | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_activity_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_activity_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_activity_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_activity_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          items: Json | null
          notes: string | null
          order_date: string | null
          po_number: number
          status: string | null
          supplier_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_date?: string | null
          po_number?: number
          status?: string | null
          supplier_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_date?: string | null
          po_number?: number
          status?: string | null
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          name: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          name: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          name?: string
          start_time?: string
        }
        Relationships: []
      }
      substrates: {
        Row: {
          available_sizes: string[] | null
          cost_per_kg: number | null
          created_at: string | null
          current_stock_kg: number | null
          id: string
          in_stock: boolean | null
          min_stock_kg: number | null
          name: string
          type: string
          weight_grs: number
        }
        Insert: {
          available_sizes?: string[] | null
          cost_per_kg?: number | null
          created_at?: string | null
          current_stock_kg?: number | null
          id?: string
          in_stock?: boolean | null
          min_stock_kg?: number | null
          name: string
          type: string
          weight_grs: number
        }
        Update: {
          available_sizes?: string[] | null
          cost_per_kg?: number | null
          created_at?: string | null
          current_stock_kg?: number | null
          id?: string
          in_stock?: boolean | null
          min_stock_kg?: number | null
          name?: string
          type?: string
          weight_grs?: number
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          rating: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          calculations: Json | null
          client_id: string | null
          client_name: string
          completed_at: string | null
          cost_actual: number | null
          cost_budgeted: number | null
          created_at: string | null
          created_by: string | null
          current_workstation_id: string | null
          delivery_date: string | null
          id: string
          notes: string | null
          ot_number: number
          priority: string | null
          product_description: string | null
          product_name: string
          quantity: number
          specifications: Json | null
          status: string | null
          total_price: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          calculations?: Json | null
          client_id?: string | null
          client_name: string
          completed_at?: string | null
          cost_actual?: number | null
          cost_budgeted?: number | null
          created_at?: string | null
          created_by?: string | null
          current_workstation_id?: string | null
          delivery_date?: string | null
          id?: string
          notes?: string | null
          ot_number?: number
          priority?: string | null
          product_description?: string | null
          product_name: string
          quantity: number
          specifications?: Json | null
          status?: string | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          calculations?: Json | null
          client_id?: string | null
          client_name?: string
          completed_at?: string | null
          cost_actual?: number | null
          cost_budgeted?: number | null
          created_at?: string | null
          created_by?: string | null
          current_workstation_id?: string | null
          delivery_date?: string | null
          id?: string
          notes?: string | null
          ot_number?: number
          priority?: string | null
          product_description?: string | null
          product_name?: string
          quantity?: number
          specifications?: Json | null
          status?: string | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_current_workstation_id_fkey"
            columns: ["current_workstation_id"]
            isOneToOne: false
            referencedRelation: "workstations"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          attendance_score: number | null
          created_at: string | null
          department: string
          hourly_salary: number | null
          id: string
          lateness_minutes: number | null
          name: string
          overall_rating: number | null
          overtime_availability: boolean | null
          phone: string | null
          quality_score: number | null
          sheets_per_hour: number | null
          specialty: string[] | null
          speed_score: number | null
          teamwork_rating: number | null
          updated_at: string | null
          worker_code: string | null
          worker_role: string | null
        }
        Insert: {
          attendance_score?: number | null
          created_at?: string | null
          department: string
          hourly_salary?: number | null
          id?: string
          lateness_minutes?: number | null
          name: string
          overall_rating?: number | null
          overtime_availability?: boolean | null
          phone?: string | null
          quality_score?: number | null
          sheets_per_hour?: number | null
          specialty?: string[] | null
          speed_score?: number | null
          teamwork_rating?: number | null
          updated_at?: string | null
          worker_code?: string | null
          worker_role?: string | null
        }
        Update: {
          attendance_score?: number | null
          created_at?: string | null
          department?: string
          hourly_salary?: number | null
          id?: string
          lateness_minutes?: number | null
          name?: string
          overall_rating?: number | null
          overtime_availability?: boolean | null
          phone?: string | null
          quality_score?: number | null
          sheets_per_hour?: number | null
          specialty?: string[] | null
          speed_score?: number | null
          teamwork_rating?: number | null
          updated_at?: string | null
          worker_code?: string | null
          worker_role?: string | null
        }
        Relationships: []
      }
      workstations: {
        Row: {
          created_at: string | null
          id: string
          max_workers: number
          name: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_workers?: number
          name: string
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_workers?: number
          name?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_material_requirements: {
        Args: { p_work_order_id: string }
        Returns: {
          current_stock: number
          inventory_item_id: string
          is_available: boolean
          item_name: string
          quantity_required: number
        }[]
      }
      check_inventory_availability: {
        Args: { p_work_order_id: string }
        Returns: boolean
      }
      generate_purchase_suggestions: {
        Args: never
        Returns: {
          current_stock: number
          estimated_cost: number
          inventory_item_id: string
          item_name: string
          reorder_point: number
          sku: string
          suggested_quantity: number
          supplier_id: string
          supplier_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_own_worker_record: { Args: { _worker_id: string }; Returns: boolean }
    }
    Enums: {
      alert_type: "low_stock" | "out_of_stock" | "expiring_soon" | "overstock"
      app_role: "supervisor" | "manager" | "admin" | "technician"
      cost_type: "per_unit" | "per_hour" | "fixed" | "percentage"
      inventory_category:
        | "substrate"
        | "ink"
        | "finishing_material"
        | "consumable"
        | "packaging"
        | "other"
      inventory_unit: "kg" | "units" | "rolls" | "liters" | "sheets" | "boxes"
      issue_severity: "low" | "medium" | "high" | "critical"
      issue_type:
        | "machine_breakdown"
        | "material_defect"
        | "quality_issue"
        | "shortage"
        | "other"
      job_status: "pending" | "in_progress" | "completed" | "delivered"
      machine_status: "idle" | "running" | "maintenance" | "offline"
      machine_type:
        | "offset_printer"
        | "die_cutter"
        | "guillotine"
        | "digital_printer"
        | "pre_press"
        | "manual_workshop"
        | "delivery"
      material_status:
        | "pending"
        | "allocated"
        | "partially_consumed"
        | "consumed"
      operation_category:
        | "PREPRESS"
        | "PRINTING"
        | "FINISHING"
        | "MATERIALS"
        | "THIRD_PARTY"
        | "OTHER"
      ot_operation_status: "pending" | "in_progress" | "completed" | "cancelled"
      ot_status:
        | "pre_press"
        | "visto_bueno"
        | "paper_purchase"
        | "paper_received"
        | "in_storage"
        | "guillotine_first_cut"
        | "offset_printing"
        | "die_cutting"
        | "guillotine_final_cut"
        | "workshop_revision"
        | "ready_for_delivery"
        | "in_delivery"
        | "completed"
      po_status:
        | "draft"
        | "sent"
        | "confirmed"
        | "partially_received"
        | "received"
        | "cancelled"
      production_status: "in_progress" | "completed" | "paused" | "stopped"
      progress_type: "production" | "maintenance" | "idle"
      submission_status: "pending" | "approved" | "rejected" | "edited"
      task_type:
        | "detachment"
        | "revision"
        | "packaging"
        | "printing"
        | "cutting"
        | "delivery"
      transaction_type:
        | "purchase"
        | "usage"
        | "adjustment"
        | "return"
        | "transfer"
      work_order_status:
        | "draft"
        | "approved"
        | "in_production"
        | "completed"
        | "delivered"
        | "cancelled"
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
  public: {
    Enums: {
      alert_type: ["low_stock", "out_of_stock", "expiring_soon", "overstock"],
      app_role: ["supervisor", "manager", "admin", "technician"],
      cost_type: ["per_unit", "per_hour", "fixed", "percentage"],
      inventory_category: [
        "substrate",
        "ink",
        "finishing_material",
        "consumable",
        "packaging",
        "other",
      ],
      inventory_unit: ["kg", "units", "rolls", "liters", "sheets", "boxes"],
      issue_severity: ["low", "medium", "high", "critical"],
      issue_type: [
        "machine_breakdown",
        "material_defect",
        "quality_issue",
        "shortage",
        "other",
      ],
      job_status: ["pending", "in_progress", "completed", "delivered"],
      machine_status: ["idle", "running", "maintenance", "offline"],
      machine_type: [
        "offset_printer",
        "die_cutter",
        "guillotine",
        "digital_printer",
        "pre_press",
        "manual_workshop",
        "delivery",
      ],
      material_status: [
        "pending",
        "allocated",
        "partially_consumed",
        "consumed",
      ],
      operation_category: [
        "PREPRESS",
        "PRINTING",
        "FINISHING",
        "MATERIALS",
        "THIRD_PARTY",
        "OTHER",
      ],
      ot_operation_status: ["pending", "in_progress", "completed", "cancelled"],
      ot_status: [
        "pre_press",
        "visto_bueno",
        "paper_purchase",
        "paper_received",
        "in_storage",
        "guillotine_first_cut",
        "offset_printing",
        "die_cutting",
        "guillotine_final_cut",
        "workshop_revision",
        "ready_for_delivery",
        "in_delivery",
        "completed",
      ],
      po_status: [
        "draft",
        "sent",
        "confirmed",
        "partially_received",
        "received",
        "cancelled",
      ],
      production_status: ["in_progress", "completed", "paused", "stopped"],
      progress_type: ["production", "maintenance", "idle"],
      submission_status: ["pending", "approved", "rejected", "edited"],
      task_type: [
        "detachment",
        "revision",
        "packaging",
        "printing",
        "cutting",
        "delivery",
      ],
      transaction_type: [
        "purchase",
        "usage",
        "adjustment",
        "return",
        "transfer",
      ],
      work_order_status: [
        "draft",
        "approved",
        "in_production",
        "completed",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
