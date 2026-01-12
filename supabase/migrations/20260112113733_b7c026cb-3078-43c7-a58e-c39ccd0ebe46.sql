-- =====================================================
-- INDUSTRY 6.0 SHOP FLOOR & SUPPLY CHAIN MANAGEMENT
-- =====================================================

-- ENUMS
DO $$ BEGIN
  CREATE TYPE inventory_category AS ENUM ('substrate', 'ink', 'finishing_material', 'consumable', 'packaging', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inventory_unit AS ENUM ('kg', 'units', 'rolls', 'liters', 'sheets', 'boxes');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('purchase', 'usage', 'adjustment', 'return', 'transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE issue_type AS ENUM ('machine_breakdown', 'material_defect', 'quality_issue', 'shortage', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE issue_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE production_status AS ENUM ('in_progress', 'completed', 'paused', 'stopped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE po_status AS ENUM ('draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE material_status AS ENUM ('pending', 'allocated', 'partially_consumed', 'consumed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_type AS ENUM ('low_stock', 'out_of_stock', 'expiring_soon', 'overstock');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- SUPPLIERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  payment_terms TEXT,
  lead_time_days INTEGER,
  rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- INVENTORY ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT UNIQUE,
  qr_code TEXT UNIQUE,
  name TEXT NOT NULL,
  category inventory_category DEFAULT 'other',
  unit_of_measure inventory_unit DEFAULT 'units',
  current_stock DECIMAL(10,2) DEFAULT 0,
  minimum_stock DECIMAL(10,2),
  maximum_stock DECIMAL(10,2),
  reorder_point DECIMAL(10,2),
  location TEXT,
  supplier_id UUID REFERENCES public.suppliers(id),
  unit_cost DECIMAL(10,2),
  last_purchase_date DATE,
  last_purchase_price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- PRODUCTION REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.production_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES public.work_orders(id),
  operation_code TEXT REFERENCES public.operations_catalog(code),
  operator_id UUID,
  machine_id UUID REFERENCES public.machines(id),
  units_produced INTEGER NOT NULL CHECK (units_produced > 0),
  units_rejected INTEGER DEFAULT 0,
  time_started TIMESTAMP WITH TIME ZONE,
  time_ended TIMESTAMP WITH TIME ZONE,
  time_elapsed_minutes INTEGER,
  status production_status DEFAULT 'in_progress',
  notes TEXT,
  reported_via TEXT DEFAULT 'web',
  whatsapp_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- PRODUCTION ISSUES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.production_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_report_id UUID REFERENCES public.production_reports(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id),
  issue_type issue_type NOT NULL,
  severity issue_severity DEFAULT 'medium',
  description TEXT NOT NULL,
  reported_by UUID,
  resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- PURCHASE ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number SERIAL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id) NOT NULL,
  status po_status DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  total_amount DECIMAL(10,2),
  notes TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- PURCHASE ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  quantity_ordered DECIMAL(10,2) NOT NULL,
  quantity_received DECIMAL(10,2) DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
  notes TEXT
);

-- =====================================================
-- INVENTORY TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  transaction_type transaction_type NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2),
  reference_type TEXT,
  reference_id UUID,
  work_order_id UUID REFERENCES public.work_orders(id),
  production_report_id UUID REFERENCES public.production_reports(id),
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  performed_by UUID,
  notes TEXT,
  scanned_via TEXT DEFAULT 'manual',
  whatsapp_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- INVENTORY ALERTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  alert_type alert_type NOT NULL,
  message TEXT,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- MATERIAL REQUIREMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.material_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES public.work_orders(id) NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  quantity_required DECIMAL(10,2) NOT NULL,
  quantity_allocated DECIMAL(10,2) DEFAULT 0,
  quantity_consumed DECIMAL(10,2) DEFAULT 0,
  status material_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- WHATSAPP USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  worker_id UUID REFERENCES public.workers(id),
  phone_number TEXT UNIQUE NOT NULL,
  whatsapp_name TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_code TEXT,
  last_interaction TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  preferred_language TEXT DEFAULT 'es',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- WHATSAPP MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_user_id UUID REFERENCES public.whatsapp_users(id),
  message_id TEXT UNIQUE,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT DEFAULT 'text',
  content TEXT,
  metadata JSONB,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Suppliers policies
CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers
  FOR SELECT USING (true);

CREATE POLICY "Admins managers can manage suppliers" ON public.suppliers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Inventory items policies
CREATE POLICY "Authenticated users can view inventory" ON public.inventory_items
  FOR SELECT USING (true);

CREATE POLICY "Supervisors admins can manage inventory" ON public.inventory_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Production reports policies
CREATE POLICY "Authenticated users can view production reports" ON public.production_reports
  FOR SELECT USING (true);

CREATE POLICY "Supervisors technicians can insert production reports" ON public.production_reports
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'technician'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors admins can update production reports" ON public.production_reports
  FOR UPDATE USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Production issues policies
CREATE POLICY "Authenticated users can view production issues" ON public.production_issues
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert production issues" ON public.production_issues
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Supervisors admins can update production issues" ON public.production_issues
  FOR UPDATE USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Purchase orders policies
CREATE POLICY "Managers admins can view purchase orders" ON public.purchase_orders
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Managers admins can manage purchase orders" ON public.purchase_orders
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Purchase order items policies
CREATE POLICY "View purchase order items" ON public.purchase_order_items
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Manage purchase order items" ON public.purchase_order_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Inventory transactions policies
CREATE POLICY "View inventory transactions" ON public.inventory_transactions
  FOR SELECT USING (true);

CREATE POLICY "Insert inventory transactions" ON public.inventory_transactions
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'technician'::app_role));

-- Inventory alerts policies
CREATE POLICY "View inventory alerts" ON public.inventory_alerts
  FOR SELECT USING (true);

CREATE POLICY "Manage inventory alerts" ON public.inventory_alerts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Material requirements policies
CREATE POLICY "View material requirements" ON public.material_requirements
  FOR SELECT USING (true);

CREATE POLICY "Manage material requirements" ON public.material_requirements
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- WhatsApp users policies
CREATE POLICY "Supervisors admins can view whatsapp users" ON public.whatsapp_users
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Admins can manage whatsapp users" ON public.whatsapp_users
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- WhatsApp messages policies
CREATE POLICY "Supervisors admins can view whatsapp messages" ON public.whatsapp_messages
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "System can insert whatsapp messages" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON public.inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON public.inventory_items(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_items_qr_code ON public.inventory_items(qr_code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier ON public.inventory_items(supplier_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON public.inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_work_order ON public.inventory_transactions(work_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created ON public.inventory_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_production_reports_work_order ON public.production_reports(work_order_id);
CREATE INDEX IF NOT EXISTS idx_production_reports_operator ON public.production_reports(operator_id);
CREATE INDEX IF NOT EXISTS idx_production_reports_machine ON public.production_reports(machine_id);
CREATE INDEX IF NOT EXISTS idx_production_reports_created ON public.production_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_production_issues_work_order ON public.production_issues(work_order_id);
CREATE INDEX IF NOT EXISTS idx_production_issues_report ON public.production_issues(production_report_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);

CREATE INDEX IF NOT EXISTS idx_material_requirements_work_order ON public.material_requirements(work_order_id);
CREATE INDEX IF NOT EXISTS idx_material_requirements_item ON public.material_requirements(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_users_phone ON public.whatsapp_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user ON public.whatsapp_messages(whatsapp_user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update inventory stock on transactions
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'purchase' THEN
    UPDATE public.inventory_items SET 
      current_stock = current_stock + NEW.quantity,
      updated_at = now()
    WHERE id = NEW.inventory_item_id;
  ELSIF NEW.transaction_type = 'usage' THEN
    UPDATE public.inventory_items SET 
      current_stock = current_stock - NEW.quantity,
      updated_at = now()
    WHERE id = NEW.inventory_item_id;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    UPDATE public.inventory_items SET 
      current_stock = current_stock + NEW.quantity,
      updated_at = now()
    WHERE id = NEW.inventory_item_id;
  ELSIF NEW.transaction_type = 'return' THEN
    UPDATE public.inventory_items SET 
      current_stock = current_stock + NEW.quantity,
      updated_at = now()
    WHERE id = NEW.inventory_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_inventory_stock ON public.inventory_transactions;
CREATE TRIGGER trigger_update_inventory_stock
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_stock();

-- Auto-create inventory alerts on low stock
CREATE OR REPLACE FUNCTION check_inventory_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for low stock
  IF NEW.current_stock <= COALESCE(NEW.reorder_point, 0) AND NEW.current_stock > 0 THEN
    INSERT INTO public.inventory_alerts (inventory_item_id, alert_type, message)
    VALUES (NEW.id, 'low_stock', 'Stock is below reorder point: ' || NEW.current_stock || ' ' || NEW.unit_of_measure)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Check for out of stock
  IF NEW.current_stock <= 0 THEN
    INSERT INTO public.inventory_alerts (inventory_item_id, alert_type, message)
    VALUES (NEW.id, 'out_of_stock', 'Item is out of stock')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Check for overstock
  IF NEW.maximum_stock IS NOT NULL AND NEW.current_stock > NEW.maximum_stock THEN
    INSERT INTO public.inventory_alerts (inventory_item_id, alert_type, message)
    VALUES (NEW.id, 'overstock', 'Stock exceeds maximum: ' || NEW.current_stock || ' / ' || NEW.maximum_stock)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_check_inventory_alerts ON public.inventory_items;
CREATE TRIGGER trigger_check_inventory_alerts
  AFTER UPDATE OF current_stock ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION check_inventory_alerts();

-- Auto-calculate time elapsed on production reports
CREATE OR REPLACE FUNCTION calculate_production_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.time_started IS NOT NULL AND NEW.time_ended IS NOT NULL THEN
    NEW.time_elapsed_minutes := EXTRACT(EPOCH FROM (NEW.time_ended - NEW.time_started)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_calculate_production_time ON public.production_reports;
CREATE TRIGGER trigger_calculate_production_time
  BEFORE INSERT OR UPDATE ON public.production_reports
  FOR EACH ROW
  EXECUTE FUNCTION calculate_production_time();

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Calculate material requirements for a work order
CREATE OR REPLACE FUNCTION calculate_material_requirements(p_work_order_id UUID)
RETURNS TABLE (
  inventory_item_id UUID,
  item_name TEXT,
  quantity_required DECIMAL,
  current_stock DECIMAL,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.inventory_item_id,
    ii.name AS item_name,
    mr.quantity_required,
    ii.current_stock,
    (ii.current_stock >= mr.quantity_required) AS is_available
  FROM public.material_requirements mr
  JOIN public.inventory_items ii ON ii.id = mr.inventory_item_id
  WHERE mr.work_order_id = p_work_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check inventory availability for a work order
CREATE OR REPLACE FUNCTION check_inventory_availability(p_work_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_available BOOLEAN;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1 
    FROM public.material_requirements mr
    JOIN public.inventory_items ii ON ii.id = mr.inventory_item_id
    WHERE mr.work_order_id = p_work_order_id
    AND ii.current_stock < mr.quantity_required
  ) INTO v_available;
  
  RETURN v_available;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Generate purchase suggestions for items below reorder point
CREATE OR REPLACE FUNCTION generate_purchase_suggestions()
RETURNS TABLE (
  inventory_item_id UUID,
  sku TEXT,
  item_name TEXT,
  current_stock DECIMAL,
  reorder_point DECIMAL,
  suggested_quantity DECIMAL,
  supplier_id UUID,
  supplier_name TEXT,
  estimated_cost DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ii.id AS inventory_item_id,
    ii.sku,
    ii.name AS item_name,
    ii.current_stock,
    ii.reorder_point,
    COALESCE(ii.maximum_stock, ii.reorder_point * 2) - ii.current_stock AS suggested_quantity,
    ii.supplier_id,
    s.name AS supplier_name,
    (COALESCE(ii.maximum_stock, ii.reorder_point * 2) - ii.current_stock) * COALESCE(ii.unit_cost, 0) AS estimated_cost
  FROM public.inventory_items ii
  LEFT JOIN public.suppliers s ON s.id = ii.supplier_id
  WHERE ii.is_active = true
  AND ii.current_stock <= COALESCE(ii.reorder_point, 0)
  ORDER BY (ii.reorder_point - ii.current_stock) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_issues;