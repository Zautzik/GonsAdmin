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
      die_molds: {
        Row: {
          boca_count: number | null
          client_id: string | null
          created_at: string | null
          creation_cost: number | null
          description: string | null
          id: string
          last_used_at: string | null
          location: string | null
          name: string
          size_height_cm: number | null
          size_width_cm: number | null
        }
        Insert: {
          boca_count?: number | null
          client_id?: string | null
          created_at?: string | null
          creation_cost?: number | null
          description?: string | null
          id?: string
          last_used_at?: string | null
          location?: string | null
          name: string
          size_height_cm?: number | null
          size_width_cm?: number | null
        }
        Update: {
          boca_count?: number | null
          client_id?: string | null
          created_at?: string | null
          creation_cost?: number | null
          description?: string | null
          id?: string
          last_used_at?: string | null
          location?: string | null
          name?: string
          size_height_cm?: number | null
          size_width_cm?: number | null
        }
        Relationships: []
      }
      equipment_investments: {
        Row: {
          created_at: string | null
          equipment_name: string
          estimated_annual_savings: number | null
          estimated_roi_months: number | null
          id: string
          machine_id: string | null
          notes: string | null
          payback_period_months: number | null
          purchase_cost: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          equipment_name: string
          estimated_annual_savings?: number | null
          estimated_roi_months?: number | null
          id?: string
          machine_id?: string | null
          notes?: string | null
          payback_period_months?: number | null
          purchase_cost: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          equipment_name?: string
          estimated_annual_savings?: number | null
          estimated_roi_months?: number | null
          id?: string
          machine_id?: string | null
          notes?: string | null
          payback_period_months?: number | null
          purchase_cost?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_investments_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
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
      jobs: {
        Row: {
          assigned_machine_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string | null
        }
        Insert: {
          assigned_machine_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string | null
        }
        Update: {
          assigned_machine_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_assigned_machine_id_fkey"
            columns: ["assigned_machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_costs: {
        Row: {
          created_at: string | null
          energy_cost: number | null
          id: string
          labor_cost: number | null
          machine_id: string
          maintenance_cost: number | null
          month: string
          notes: string | null
          outsourcing_cost: number | null
          revenue_generated: number | null
          spare_parts_cost: number | null
          total_operating_cost: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          energy_cost?: number | null
          id?: string
          labor_cost?: number | null
          machine_id: string
          maintenance_cost?: number | null
          month: string
          notes?: string | null
          outsourcing_cost?: number | null
          revenue_generated?: number | null
          spare_parts_cost?: number | null
          total_operating_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          energy_cost?: number | null
          id?: string
          labor_cost?: number | null
          machine_id?: string
          maintenance_cost?: number | null
          month?: string
          notes?: string | null
          outsourcing_cost?: number | null
          revenue_generated?: number | null
          spare_parts_cost?: number | null
          total_operating_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_costs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
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
      maintenance_checklists: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          frequency: string
          id: string
          machine_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          frequency: string
          id?: string
          machine_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          frequency?: string
          id?: string
          machine_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_checklists_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_task_completions: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          task_id: string
          time_spent_minutes: number | null
          work_order_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          task_id: string
          time_spent_minutes?: number | null
          work_order_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          task_id?: string
          time_spent_minutes?: number | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_task_completions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "maintenance_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tasks: {
        Row: {
          checklist_id: string
          created_at: string | null
          description: string
          estimated_minutes: number | null
          id: string
          notes: string | null
          requires_parts: boolean | null
          task_number: number
        }
        Insert: {
          checklist_id: string
          created_at?: string | null
          description: string
          estimated_minutes?: number | null
          id?: string
          notes?: string | null
          requires_parts?: boolean | null
          task_number: number
        }
        Update: {
          checklist_id?: string
          created_at?: string | null
          description?: string
          estimated_minutes?: number | null
          id?: string
          notes?: string | null
          requires_parts?: boolean | null
          task_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "maintenance_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_work_orders: {
        Row: {
          assigned_to: string | null
          checklist_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          machine_id: string
          notes: string | null
          ot_id: string | null
          priority: number | null
          scheduled_date: string
          started_at: string | null
          status: string
          total_time_minutes: number | null
        }
        Insert: {
          assigned_to?: string | null
          checklist_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          machine_id: string
          notes?: string | null
          ot_id?: string | null
          priority?: number | null
          scheduled_date: string
          started_at?: string | null
          status?: string
          total_time_minutes?: number | null
        }
        Update: {
          assigned_to?: string | null
          checklist_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          machine_id?: string
          notes?: string | null
          ot_id?: string | null
          priority?: number | null
          scheduled_date?: string
          started_at?: string | null
          status?: string
          total_time_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_work_orders_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "maintenance_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_work_orders_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_work_orders_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ots"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_catalog: {
        Row: {
          category: Database["public"]["Enums"]["operation_category"]
          code: string
          cost_type: Database["public"]["Enums"]["cost_type"]
          created_at: string | null
          default_cost: number
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          unit_of_measure: string
          updated_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["operation_category"]
          code: string
          cost_type: Database["public"]["Enums"]["cost_type"]
          created_at?: string | null
          default_cost?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          unit_of_measure: string
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["operation_category"]
          code?: string
          cost_type?: Database["public"]["Enums"]["cost_type"]
          created_at?: string | null
          default_cost?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          unit_of_measure?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ot_calculations: {
        Row: {
          bocas_per_sheet: number | null
          created_at: string | null
          ctp_plates: number | null
          finishing_hours_estimated: number | null
          id: string
          imposition_layout: Json | null
          ink_calculations: Json | null
          printing_hours_estimated: number | null
          setup_sheets: number | null
          sheet_format: string | null
          sheet_height_cm: number | null
          sheet_width_cm: number | null
          substrate_kg: number | null
          total_sheets: number | null
          updated_at: string | null
          waste_factor_percent: number | null
          work_order_id: string
        }
        Insert: {
          bocas_per_sheet?: number | null
          created_at?: string | null
          ctp_plates?: number | null
          finishing_hours_estimated?: number | null
          id?: string
          imposition_layout?: Json | null
          ink_calculations?: Json | null
          printing_hours_estimated?: number | null
          setup_sheets?: number | null
          sheet_format?: string | null
          sheet_height_cm?: number | null
          sheet_width_cm?: number | null
          substrate_kg?: number | null
          total_sheets?: number | null
          updated_at?: string | null
          waste_factor_percent?: number | null
          work_order_id: string
        }
        Update: {
          bocas_per_sheet?: number | null
          created_at?: string | null
          ctp_plates?: number | null
          finishing_hours_estimated?: number | null
          id?: string
          imposition_layout?: Json | null
          ink_calculations?: Json | null
          printing_hours_estimated?: number | null
          setup_sheets?: number | null
          sheet_format?: string | null
          sheet_height_cm?: number | null
          sheet_width_cm?: number | null
          substrate_kg?: number | null
          total_sheets?: number | null
          updated_at?: string | null
          waste_factor_percent?: number | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ot_calculations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: true
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ot_cost_items: {
        Row: {
          category: string | null
          cost_actual: number | null
          cost_estimated: number | null
          created_at: string | null
          description: string
          deviation_percent: number | null
          deviation_reason: string | null
          id: string
          item_code: string
          ot_id: string
          quantity_actual: number | null
          quantity_estimated: number | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          category?: string | null
          cost_actual?: number | null
          cost_estimated?: number | null
          created_at?: string | null
          description: string
          deviation_percent?: number | null
          deviation_reason?: string | null
          id?: string
          item_code: string
          ot_id: string
          quantity_actual?: number | null
          quantity_estimated?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          category?: string | null
          cost_actual?: number | null
          cost_estimated?: number | null
          created_at?: string | null
          description?: string
          deviation_percent?: number | null
          deviation_reason?: string | null
          id?: string
          item_code?: string
          ot_id?: string
          quantity_actual?: number | null
          quantity_estimated?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ot_cost_items_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ots"
            referencedColumns: ["id"]
          },
        ]
      }
      ot_financials: {
        Row: {
          created_at: string | null
          energy_cost: number | null
          hours_spent: number | null
          id: string
          labor_cost: number | null
          machine_cost: number | null
          material_cost: number | null
          notes: string | null
          ot_id: string
          outsourcing_cost: number | null
          overhead_cost: number | null
          profit: number | null
          revenue: number | null
          total_cost: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          energy_cost?: number | null
          hours_spent?: number | null
          id?: string
          labor_cost?: number | null
          machine_cost?: number | null
          material_cost?: number | null
          notes?: string | null
          ot_id: string
          outsourcing_cost?: number | null
          overhead_cost?: number | null
          profit?: number | null
          revenue?: number | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          energy_cost?: number | null
          hours_spent?: number | null
          id?: string
          labor_cost?: number | null
          machine_cost?: number | null
          material_cost?: number | null
          notes?: string | null
          ot_id?: string
          outsourcing_cost?: number | null
          overhead_cost?: number | null
          profit?: number | null
          revenue?: number | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ot_financials_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: true
            referencedRelation: "ots"
            referencedColumns: ["id"]
          },
        ]
      }
      ot_operations: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          operation_code: string
          quantity_actual: number | null
          quantity_budgeted: number | null
          sequence_order: number
          status: Database["public"]["Enums"]["ot_operation_status"] | null
          total_cost_actual: number | null
          total_cost_budgeted: number | null
          unit_cost_actual: number | null
          unit_cost_budgeted: number | null
          unit_of_measure: string | null
          updated_at: string | null
          work_order_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          operation_code: string
          quantity_actual?: number | null
          quantity_budgeted?: number | null
          sequence_order?: number
          status?: Database["public"]["Enums"]["ot_operation_status"] | null
          total_cost_actual?: number | null
          total_cost_budgeted?: number | null
          unit_cost_actual?: number | null
          unit_cost_budgeted?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
          work_order_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          operation_code?: string
          quantity_actual?: number | null
          quantity_budgeted?: number | null
          sequence_order?: number
          status?: Database["public"]["Enums"]["ot_operation_status"] | null
          total_cost_actual?: number | null
          total_cost_budgeted?: number | null
          unit_cost_actual?: number | null
          unit_cost_budgeted?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ot_operations_operation_code_fkey"
            columns: ["operation_code"]
            isOneToOne: false
            referencedRelation: "operations_catalog"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "ot_operations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ot_pricing: {
        Row: {
          commission1_amount: number | null
          commission1_percent: number | null
          commission2_amount: number | null
          commission2_percent: number | null
          commission3_amount: number | null
          commission3_percent: number | null
          created_at: string | null
          id: string
          increment_amount: number | null
          increment_percent: number | null
          labor_cost: number | null
          margin_amount: number | null
          margin_percent: number | null
          materials_cost: number | null
          other_cost: number | null
          subtotal: number | null
          third_party_cost: number | null
          total_price: number | null
          unit_price: number | null
          updated_at: string | null
          work_order_id: string
        }
        Insert: {
          commission1_amount?: number | null
          commission1_percent?: number | null
          commission2_amount?: number | null
          commission2_percent?: number | null
          commission3_amount?: number | null
          commission3_percent?: number | null
          created_at?: string | null
          id?: string
          increment_amount?: number | null
          increment_percent?: number | null
          labor_cost?: number | null
          margin_amount?: number | null
          margin_percent?: number | null
          materials_cost?: number | null
          other_cost?: number | null
          subtotal?: number | null
          third_party_cost?: number | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string | null
          work_order_id: string
        }
        Update: {
          commission1_amount?: number | null
          commission1_percent?: number | null
          commission2_amount?: number | null
          commission2_percent?: number | null
          commission3_amount?: number | null
          commission3_percent?: number | null
          created_at?: string | null
          id?: string
          increment_amount?: number | null
          increment_percent?: number | null
          labor_cost?: number | null
          margin_amount?: number | null
          margin_percent?: number | null
          materials_cost?: number | null
          other_cost?: number | null
          subtotal?: number | null
          third_party_cost?: number | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ot_pricing_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: true
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ot_specifications: {
        Row: {
          colors_back: number | null
          colors_front: number | null
          created_at: string | null
          finished_height_cm: number | null
          finished_width_cm: number | null
          finishing_operations: Json | null
          id: string
          packaging_notes: string | null
          pantone_colors: Json | null
          product_type: string | null
          substrate_brand: string | null
          substrate_type: string | null
          substrate_weight_gsm: number | null
          updated_at: string | null
          work_order_id: string
        }
        Insert: {
          colors_back?: number | null
          colors_front?: number | null
          created_at?: string | null
          finished_height_cm?: number | null
          finished_width_cm?: number | null
          finishing_operations?: Json | null
          id?: string
          packaging_notes?: string | null
          pantone_colors?: Json | null
          product_type?: string | null
          substrate_brand?: string | null
          substrate_type?: string | null
          substrate_weight_gsm?: number | null
          updated_at?: string | null
          work_order_id: string
        }
        Update: {
          colors_back?: number | null
          colors_front?: number | null
          created_at?: string | null
          finished_height_cm?: number | null
          finished_width_cm?: number | null
          finishing_operations?: Json | null
          id?: string
          packaging_notes?: string | null
          pantone_colors?: Json | null
          product_type?: string | null
          substrate_brand?: string | null
          substrate_type?: string | null
          substrate_weight_gsm?: number | null
          updated_at?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ot_specifications_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: true
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ots: {
        Row: {
          client_name: string
          completed_at: string | null
          created_at: string
          current_workstation_id: string | null
          deadline: string | null
          description: string | null
          id: string
          ot_number: string
          priority: number
          quantity: number
          status: Database["public"]["Enums"]["ot_status"]
          updated_at: string
        }
        Insert: {
          client_name: string
          completed_at?: string | null
          created_at?: string
          current_workstation_id?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          ot_number: string
          priority?: number
          quantity?: number
          status?: Database["public"]["Enums"]["ot_status"]
          updated_at?: string
        }
        Update: {
          client_name?: string
          completed_at?: string | null
          created_at?: string
          current_workstation_id?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          ot_number?: string
          priority?: number
          quantity?: number
          status?: Database["public"]["Enums"]["ot_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ots_current_workstation_id_fkey"
            columns: ["current_workstation_id"]
            isOneToOne: false
            referencedRelation: "workstations"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_submissions: {
        Row: {
          created_at: string
          edited_ot_id: string | null
          edited_time_minutes: number | null
          edited_units: number | null
          id: string
          idle_reason: string | null
          machine_id: string | null
          maintenance_description: string | null
          ot_id: string | null
          quality_notes: string | null
          raw_message: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shift_id: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submission_type: Database["public"]["Enums"]["progress_type"]
          submitted_at: string
          supervisor_notes: string | null
          time_reported_minutes: number
          units_reported: number
          updated_at: string
          whatsapp_group: string | null
          worker_code: string | null
          worker_id: string | null
          worker_phone: string
          workstation_id: string | null
        }
        Insert: {
          created_at?: string
          edited_ot_id?: string | null
          edited_time_minutes?: number | null
          edited_units?: number | null
          id?: string
          idle_reason?: string | null
          machine_id?: string | null
          maintenance_description?: string | null
          ot_id?: string | null
          quality_notes?: string | null
          raw_message: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submission_type?: Database["public"]["Enums"]["progress_type"]
          submitted_at?: string
          supervisor_notes?: string | null
          time_reported_minutes?: number
          units_reported?: number
          updated_at?: string
          whatsapp_group?: string | null
          worker_code?: string | null
          worker_id?: string | null
          worker_phone: string
          workstation_id?: string | null
        }
        Update: {
          created_at?: string
          edited_ot_id?: string | null
          edited_time_minutes?: number | null
          edited_units?: number | null
          id?: string
          idle_reason?: string | null
          machine_id?: string | null
          maintenance_description?: string | null
          ot_id?: string | null
          quality_notes?: string | null
          raw_message?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submission_type?: Database["public"]["Enums"]["progress_type"]
          submitted_at?: string
          supervisor_notes?: string | null
          time_reported_minutes?: number
          units_reported?: number
          updated_at?: string
          whatsapp_group?: string | null
          worker_code?: string | null
          worker_id?: string | null
          worker_phone?: string
          workstation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_submissions_edited_ot_id_fkey"
            columns: ["edited_ot_id"]
            isOneToOne: false
            referencedRelation: "ots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_submissions_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_submissions_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_submissions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_submissions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_submissions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_submissions_workstation_id_fkey"
            columns: ["workstation_id"]
            isOneToOne: false
            referencedRelation: "workstations"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_workers: {
        Row: {
          created_at: string | null
          id: string
          roster_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          roster_id: string
          worker_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          roster_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_workers_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_workers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_workers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      rosters: {
        Row: {
          created_at: string | null
          created_by: string | null
          department: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
      task_logs: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          notes: string | null
          ot_id: string | null
          performance_rating: number
          task_type: Database["public"]["Enums"]["task_type"]
          time_spent_minutes: number
          worker_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          ot_id?: string | null
          performance_rating?: number
          task_type: Database["public"]["Enums"]["task_type"]
          time_spent_minutes?: number
          worker_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          ot_id?: string | null
          performance_rating?: number
          task_type?: Database["public"]["Enums"]["task_type"]
          time_spent_minutes?: number
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
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
          budget_code: string | null
          client_id: string | null
          client_name: string
          created_at: string
          created_by: string | null
          delivery_date: string | null
          id: string
          notes: string | null
          ot_number: number
          priority: number | null
          product_description: string | null
          product_name: string
          quantity: number
          sales_rep_id: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          total_price: number | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          budget_code?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          id?: string
          notes?: string | null
          ot_number?: number
          priority?: number | null
          product_description?: string | null
          product_name: string
          quantity?: number
          sales_rep_id?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          budget_code?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          id?: string
          notes?: string | null
          ot_number?: number
          priority?: number | null
          product_description?: string | null
          product_name?: string
          quantity?: number
          sales_rep_id?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_assignments: {
        Row: {
          created_at: string | null
          date: string
          id: string
          ot_id: string | null
          role: string
          shift_id: string
          updated_at: string | null
          worker_id: string
          workstation_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          ot_id?: string | null
          role: string
          shift_id: string
          updated_at?: string | null
          worker_id: string
          workstation_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          ot_id?: string | null
          role?: string
          shift_id?: string
          updated_at?: string | null
          worker_id?: string
          workstation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_assignments_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_assignments_workstation_id_fkey"
            columns: ["workstation_id"]
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
      worker_stats: {
        Row: {
          avg_rating: number | null
          avg_time_minutes: number | null
          department: string | null
          efficiency_score: number | null
          id: string | null
          name: string | null
          total_tasks: number | null
        }
        Relationships: []
      }
    }
    Functions: {
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
      app_role: "supervisor" | "manager" | "admin" | "technician"
      cost_type: "per_unit" | "per_hour" | "fixed" | "percentage"
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
      progress_type: "production" | "maintenance" | "idle"
      submission_status: "pending" | "approved" | "rejected" | "edited"
      task_type:
        | "detachment"
        | "revision"
        | "packaging"
        | "printing"
        | "cutting"
        | "delivery"
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
      app_role: ["supervisor", "manager", "admin", "technician"],
      cost_type: ["per_unit", "per_hour", "fixed", "percentage"],
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
