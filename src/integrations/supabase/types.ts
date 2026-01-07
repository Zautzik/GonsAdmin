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
      ot_specifications: {
        Row: {
          back_colors: number | null
          closed_height_cm: number | null
          closed_width_cm: number | null
          created_at: string | null
          ctp_plates_needed: number | null
          cut_cost_per_unit: number | null
          die_boca_count: number | null
          die_cutting_hours: number | null
          die_cutting_hours_est: number | null
          die_mold_cost: number | null
          die_mold_exists: boolean | null
          final_cuts: number | null
          final_height_cm: number | null
          final_width_cm: number | null
          finishing_hours: number | null
          finishing_processes: string[] | null
          front_colors: number | null
          id: string
          initial_cuts: number | null
          ink_cost_per_liter: number | null
          ink_coverage_percent: number | null
          ink_density_g_per_sqm: number | null
          ink_liters_needed: number | null
          layout_cols: number | null
          layout_rows: number | null
          montaje_type: string | null
          ot_id: string
          outsourced_services: Json | null
          packaging_boxes: number | null
          pages_count: number | null
          pliego_height_cm: number | null
          pliego_width_cm: number | null
          pliegos_per_sheet: number | null
          pliegos_to_print: number | null
          prepress_hours: number | null
          printing_hours: number | null
          printing_method: string | null
          product_name: string | null
          product_type: string | null
          production_notes: string | null
          requires_die_cutting: boolean | null
          requires_folding: boolean | null
          requires_gluing: boolean | null
          requires_stapling: boolean | null
          sheet_height_cm: number | null
          sheet_width_cm: number | null
          sheets_leftover: number | null
          sheets_needed: number | null
          sheets_per_base: number | null
          special_colors: string[] | null
          special_instructions: string | null
          substrate_cost_per_kg: number | null
          substrate_kg_needed: number | null
          substrate_type: string | null
          substrate_weight_grs: number | null
          units_per_box: number | null
          updated_at: string | null
        }
        Insert: {
          back_colors?: number | null
          closed_height_cm?: number | null
          closed_width_cm?: number | null
          created_at?: string | null
          ctp_plates_needed?: number | null
          cut_cost_per_unit?: number | null
          die_boca_count?: number | null
          die_cutting_hours?: number | null
          die_cutting_hours_est?: number | null
          die_mold_cost?: number | null
          die_mold_exists?: boolean | null
          final_cuts?: number | null
          final_height_cm?: number | null
          final_width_cm?: number | null
          finishing_hours?: number | null
          finishing_processes?: string[] | null
          front_colors?: number | null
          id?: string
          initial_cuts?: number | null
          ink_cost_per_liter?: number | null
          ink_coverage_percent?: number | null
          ink_density_g_per_sqm?: number | null
          ink_liters_needed?: number | null
          layout_cols?: number | null
          layout_rows?: number | null
          montaje_type?: string | null
          ot_id: string
          outsourced_services?: Json | null
          packaging_boxes?: number | null
          pages_count?: number | null
          pliego_height_cm?: number | null
          pliego_width_cm?: number | null
          pliegos_per_sheet?: number | null
          pliegos_to_print?: number | null
          prepress_hours?: number | null
          printing_hours?: number | null
          printing_method?: string | null
          product_name?: string | null
          product_type?: string | null
          production_notes?: string | null
          requires_die_cutting?: boolean | null
          requires_folding?: boolean | null
          requires_gluing?: boolean | null
          requires_stapling?: boolean | null
          sheet_height_cm?: number | null
          sheet_width_cm?: number | null
          sheets_leftover?: number | null
          sheets_needed?: number | null
          sheets_per_base?: number | null
          special_colors?: string[] | null
          special_instructions?: string | null
          substrate_cost_per_kg?: number | null
          substrate_kg_needed?: number | null
          substrate_type?: string | null
          substrate_weight_grs?: number | null
          units_per_box?: number | null
          updated_at?: string | null
        }
        Update: {
          back_colors?: number | null
          closed_height_cm?: number | null
          closed_width_cm?: number | null
          created_at?: string | null
          ctp_plates_needed?: number | null
          cut_cost_per_unit?: number | null
          die_boca_count?: number | null
          die_cutting_hours?: number | null
          die_cutting_hours_est?: number | null
          die_mold_cost?: number | null
          die_mold_exists?: boolean | null
          final_cuts?: number | null
          final_height_cm?: number | null
          final_width_cm?: number | null
          finishing_hours?: number | null
          finishing_processes?: string[] | null
          front_colors?: number | null
          id?: string
          initial_cuts?: number | null
          ink_cost_per_liter?: number | null
          ink_coverage_percent?: number | null
          ink_density_g_per_sqm?: number | null
          ink_liters_needed?: number | null
          layout_cols?: number | null
          layout_rows?: number | null
          montaje_type?: string | null
          ot_id?: string
          outsourced_services?: Json | null
          packaging_boxes?: number | null
          pages_count?: number | null
          pliego_height_cm?: number | null
          pliego_width_cm?: number | null
          pliegos_per_sheet?: number | null
          pliegos_to_print?: number | null
          prepress_hours?: number | null
          printing_hours?: number | null
          printing_method?: string | null
          product_name?: string | null
          product_type?: string | null
          production_notes?: string | null
          requires_die_cutting?: boolean | null
          requires_folding?: boolean | null
          requires_gluing?: boolean | null
          requires_stapling?: boolean | null
          sheet_height_cm?: number | null
          sheet_width_cm?: number | null
          sheets_leftover?: number | null
          sheets_needed?: number | null
          sheets_per_base?: number | null
          special_colors?: string[] | null
          special_instructions?: string | null
          substrate_cost_per_kg?: number | null
          substrate_kg_needed?: number | null
          substrate_type?: string | null
          substrate_weight_grs?: number | null
          units_per_box?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ot_specifications_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ots"
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
    },
  },
} as const
