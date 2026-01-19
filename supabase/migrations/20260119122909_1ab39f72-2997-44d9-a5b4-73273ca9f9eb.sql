-- =====================================================
-- LEAN DATABASE REDESIGN: Consolidate to 7 Core Tables
-- =====================================================

-- First, drop all old tables that will be consolidated
-- (Using CASCADE to handle foreign key dependencies)

-- Drop OT-related tables (consolidating into work_orders)
DROP TABLE IF EXISTS ot_cost_items CASCADE;
DROP TABLE IF EXISTS ot_deviations CASCADE;
DROP TABLE IF EXISTS ot_financials CASCADE;
DROP TABLE IF EXISTS ot_history CASCADE;
DROP TABLE IF EXISTS ot_operations CASCADE;
DROP TABLE IF EXISTS ot_pricing CASCADE;
DROP TABLE IF EXISTS ot_specifications CASCADE;
DROP TABLE IF EXISTS ot_calculations CASCADE;
DROP TABLE IF EXISTS ot_templates CASCADE;
DROP TABLE IF EXISTS ots CASCADE;

-- Drop production-related tables (consolidating into production_activity)
DROP TABLE IF EXISTS production_reports CASCADE;
DROP TABLE IF EXISTS production_issues CASCADE;
DROP TABLE IF EXISTS progress_submissions CASCADE;

-- Drop inventory-related tables (consolidating into inventory + inventory_transactions)
DROP TABLE IF EXISTS inventory_alerts CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS material_requirements CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;

-- Drop messaging tables
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS whatsapp_users CASCADE;

-- Drop work_orders to recreate with new structure
DROP TABLE IF EXISTS work_orders CASCADE;

-- Drop operations_catalog to recreate
DROP TABLE IF EXISTS operations_catalog CASCADE;

-- Drop other tables being consolidated
DROP TABLE IF EXISTS task_logs CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS worker_assignments CASCADE;
DROP TABLE IF EXISTS roster_workers CASCADE;
DROP TABLE IF EXISTS rosters CASCADE;
DROP TABLE IF EXISTS maintenance_task_completions CASCADE;
DROP TABLE IF EXISTS maintenance_work_orders CASCADE;
DROP TABLE IF EXISTS maintenance_tasks CASCADE;
DROP TABLE IF EXISTS maintenance_checklists CASCADE;
DROP TABLE IF EXISTS equipment_investments CASCADE;
DROP TABLE IF EXISTS machine_costs CASCADE;
DROP TABLE IF EXISTS die_molds CASCADE;

-- =====================================================
-- CREATE NEW CONSOLIDATED TABLES
-- =====================================================

-- 1. WORK ORDERS (all-in-one, denormalized for simplicity)
CREATE TABLE work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_number serial UNIQUE,
  
  -- Basic Info
  client_id uuid REFERENCES clients,
  client_name text NOT NULL,
  status text CHECK (status IN ('draft', 'approved', 'in_production', 'completed', 'delivered', 'cancelled')) DEFAULT 'draft',
  
  -- Product Details (consolidated from ot_specifications)
  product_name text NOT NULL,
  product_description text,
  quantity integer NOT NULL CHECK (quantity > 0),
  
  -- Specifications (JSONB - flexible)
  specifications jsonb DEFAULT '{
    "dimensions": {"width_cm": 0, "height_cm": 0},
    "substrate": {"type": "", "weight_gsm": 0, "brand": ""},
    "colors": {"front": 0, "back": 0, "pantones": []},
    "finishing": []
  }'::jsonb,
  
  -- Calculations (JSONB - all in one place)
  calculations jsonb DEFAULT '{
    "sheet_format": "",
    "bocas_per_sheet": 0,
    "total_sheets": 0,
    "substrate_kg": 0,
    "ink_kg": 0,
    "ctp_plates": 0
  }'::jsonb,
  
  -- Pricing
  unit_price decimal(10,2),
  total_price decimal(10,2),
  cost_budgeted decimal(10,2),
  cost_actual decimal(10,2),
  
  -- Dates
  delivery_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  
  -- Metadata
  created_by uuid,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes text,
  
  -- Production tracking
  current_workstation_id uuid REFERENCES workstations
);

CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_delivery ON work_orders(delivery_date);
CREATE INDEX idx_work_orders_client ON work_orders(client_id);
CREATE INDEX idx_work_orders_ot_number ON work_orders(ot_number);

-- 2. OPERATIONS CATALOG (reference data)
CREATE TABLE operations_catalog (
  code text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('MATERIALS', 'PRINTING', 'FINISHING', 'SERVICES')),
  unit_of_measure text NOT NULL,
  default_cost decimal(10,2),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed essential operations
INSERT INTO operations_catalog (code, name, category, unit_of_measure, default_cost) VALUES
  ('MAT-SUBSTRATE', 'Sustrato/Papel', 'MATERIALS', 'kg', 1500),
  ('MAT-INK', 'Tintas', 'MATERIALS', 'kg', 31915),
  ('MAT-PLATES', 'Placas CTP', 'MATERIALS', 'unit', 8500),
  ('PRINT-OFFSET', 'Impresión Offset', 'PRINTING', 'hours', 78000),
  ('PRINT-DIGITAL', 'Impresión Digital', 'PRINTING', 'clicks', 595),
  ('FINISH-CUT', 'Corte y Guillotinado', 'FINISHING', 'hours', 2500),
  ('FINISH-FOLD', 'Plegado', 'FINISHING', 'hours', 3500),
  ('FINISH-BIND', 'Encuadernación', 'FINISHING', 'hours', 4500),
  ('FINISH-LAMINATE', 'Laminado', 'FINISHING', 'sqm', 2000),
  ('FINISH-DIE', 'Troquelado', 'FINISHING', 'hours', 5000),
  ('SERVICE-DESIGN', 'Diseño', 'SERVICES', 'hours', 25000),
  ('SERVICE-DELIVERY', 'Entrega/Flete', 'SERVICES', 'trips', 29000);

-- 3. OPERATIONS (work order operations)
CREATE TABLE operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders ON DELETE CASCADE NOT NULL,
  
  -- Operation details
  operation_code text REFERENCES operations_catalog(code) NOT NULL,
  operation_name text NOT NULL,
  category text NOT NULL,
  
  -- Quantities
  quantity_budgeted decimal(10,2) NOT NULL,
  quantity_actual decimal(10,2),
  unit_of_measure text NOT NULL,
  
  -- Costs
  unit_cost_budgeted decimal(10,2) NOT NULL,
  unit_cost_actual decimal(10,2),
  total_cost_budgeted decimal(10,2) NOT NULL,
  total_cost_actual decimal(10,2),
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  sequence_order integer DEFAULT 0,
  
  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_operations_work_order ON operations(work_order_id);
CREATE INDEX idx_operations_code ON operations(operation_code);

-- 4. PRODUCTION ACTIVITY (consolidated from production_reports + issues)
CREATE TABLE production_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders ON DELETE CASCADE,
  operation_id uuid REFERENCES operations ON DELETE SET NULL,
  machine_id uuid REFERENCES machines,
  
  -- Activity type
  activity_type text CHECK (activity_type IN ('report', 'issue', 'note')) DEFAULT 'report' NOT NULL,
  
  -- For production reports
  units_produced integer,
  units_rejected integer DEFAULT 0,
  time_started timestamptz,
  time_ended timestamptz,
  time_elapsed_minutes integer,
  
  -- For issues
  issue_type text CHECK (issue_type IN ('machine_breakdown', 'material_defect', 'quality', 'delay', 'other')),
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  
  -- Common fields
  operator_id uuid REFERENCES workers,
  description text,
  notes text,
  
  -- Metadata
  reported_via text DEFAULT 'web' CHECK (reported_via IN ('web', 'whatsapp', 'mobile')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_production_work_order ON production_activity(work_order_id);
CREATE INDEX idx_production_operator ON production_activity(operator_id);
CREATE INDEX idx_production_created ON production_activity(created_at);
CREATE INDEX idx_production_type ON production_activity(activity_type);
CREATE INDEX idx_production_unresolved ON production_activity(is_resolved) WHERE activity_type = 'issue' AND NOT is_resolved;

-- 5. INVENTORY (simplified)
CREATE TABLE inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Item details
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('substrate', 'ink', 'plates', 'finishing_material', 'consumable', 'spare_part')),
  
  -- Stock
  current_stock decimal(10,2) DEFAULT 0,
  minimum_stock decimal(10,2),
  maximum_stock decimal(10,2),
  reorder_point decimal(10,2),
  unit_of_measure text NOT NULL,
  
  -- Pricing
  unit_cost decimal(10,2),
  last_purchase_price decimal(10,2),
  last_purchase_date date,
  
  -- Supplier
  supplier_id uuid REFERENCES suppliers,
  
  -- Metadata
  barcode text UNIQUE,
  qr_code text,
  location text,
  is_active boolean DEFAULT true,
  last_restocked timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Alerts (denormalized for quick queries)
  alert_status text CHECK (alert_status IN ('low_stock', 'out_of_stock')),
  alert_acknowledged boolean DEFAULT false
);

CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_alert ON inventory(alert_status) WHERE alert_status IS NOT NULL;
CREATE INDEX idx_inventory_supplier ON inventory(supplier_id);

-- 6. INVENTORY TRANSACTIONS (simplified)
CREATE TABLE inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES inventory ON DELETE CASCADE NOT NULL,
  
  -- Transaction
  transaction_type text CHECK (transaction_type IN ('purchase', 'usage', 'adjustment', 'return')) NOT NULL,
  quantity decimal(10,2) NOT NULL,
  unit_cost decimal(10,2),
  
  -- Reference (what caused this transaction)
  work_order_id uuid REFERENCES work_orders ON DELETE SET NULL,
  purchase_order_id uuid,
  
  -- Metadata
  performed_by uuid,
  notes text,
  scanned_via text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_transactions_inventory ON inventory_transactions(inventory_id);
CREATE INDEX idx_transactions_work_order ON inventory_transactions(work_order_id);
CREATE INDEX idx_transactions_created ON inventory_transactions(created_at);

-- 7. NOTIFICATIONS (simple in-app notifications)
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  
  -- Notification
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  
  -- Link
  link_url text,
  link_text text,
  
  -- Status
  is_read boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;

-- 8. PURCHASE ORDERS (recreate simplified version)
CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number serial UNIQUE,
  supplier_id uuid REFERENCES suppliers NOT NULL,
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'received', 'cancelled')),
  
  -- Dates
  order_date date DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  actual_delivery_date date,
  
  -- Totals
  total_amount decimal(10,2),
  
  -- Items stored as JSONB for simplicity
  items jsonb DEFAULT '[]'::jsonb,
  
  -- Approval
  approved_by uuid,
  approved_at timestamptz,
  
  -- Metadata
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- 1. Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Auto-update inventory stock
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
DECLARE
  new_stock decimal(10,2);
  item_reorder_point decimal(10,2);
BEGIN
  -- Calculate new stock
  SELECT 
    current_stock + CASE 
      WHEN NEW.transaction_type = 'purchase' THEN NEW.quantity
      WHEN NEW.transaction_type = 'usage' THEN -NEW.quantity
      WHEN NEW.transaction_type = 'adjustment' THEN NEW.quantity
      WHEN NEW.transaction_type = 'return' THEN NEW.quantity
    END,
    reorder_point
  INTO new_stock, item_reorder_point
  FROM inventory 
  WHERE id = NEW.inventory_id;
  
  -- Update stock and alert status
  UPDATE inventory SET 
    current_stock = new_stock,
    alert_status = CASE 
      WHEN new_stock <= 0 THEN 'out_of_stock'
      WHEN item_reorder_point IS NOT NULL AND new_stock < item_reorder_point THEN 'low_stock'
      ELSE NULL
    END,
    alert_acknowledged = CASE 
      WHEN new_stock <= 0 OR (item_reorder_point IS NOT NULL AND new_stock < item_reorder_point) THEN false
      ELSE alert_acknowledged
    END,
    last_restocked = CASE 
      WHEN NEW.transaction_type = 'purchase' THEN now()
      ELSE last_restocked
    END
  WHERE id = NEW.inventory_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER inventory_stock_update
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION update_inventory_stock();

-- 3. Calculate time elapsed
CREATE OR REPLACE FUNCTION calculate_time_elapsed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.time_ended IS NOT NULL AND NEW.time_started IS NOT NULL THEN
    NEW.time_elapsed_minutes = EXTRACT(EPOCH FROM (NEW.time_ended - NEW.time_started)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER production_time_calc
  BEFORE INSERT OR UPDATE ON production_activity
  FOR EACH ROW EXECUTE FUNCTION calculate_time_elapsed();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations_catalog ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (can be refined later per role)
CREATE POLICY "Allow authenticated access" ON work_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access" ON operations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access" ON production_activity
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access" ON inventory
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access" ON inventory_transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access" ON notifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access" ON purchase_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read" ON operations_catalog
  FOR SELECT TO authenticated USING (true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE work_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE production_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;