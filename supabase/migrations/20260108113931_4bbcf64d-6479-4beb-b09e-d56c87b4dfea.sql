-- Create enum for work order status
CREATE TYPE public.work_order_status AS ENUM ('draft', 'approved', 'in_production', 'completed', 'delivered', 'cancelled');

-- Create enum for operation categories
CREATE TYPE public.operation_category AS ENUM ('PREPRESS', 'PRINTING', 'FINISHING', 'MATERIALS', 'THIRD_PARTY', 'OTHER');

-- Create enum for cost types
CREATE TYPE public.cost_type AS ENUM ('per_unit', 'per_hour', 'fixed', 'percentage');

-- Create enum for OT operation status
CREATE TYPE public.ot_operation_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Create clients table if not exists (for reference)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rut TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create sequence for OT numbers
CREATE SEQUENCE IF NOT EXISTS public.ot_number_seq START 1000;

-- Create work_orders table
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_number INTEGER UNIQUE NOT NULL DEFAULT nextval('public.ot_number_seq'),
  client_id UUID REFERENCES public.clients(id),
  client_name TEXT NOT NULL,
  status public.work_order_status NOT NULL DEFAULT 'draft',
  product_name TEXT NOT NULL,
  product_description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) DEFAULT 0,
  total_price NUMERIC(12, 2) DEFAULT 0,
  delivery_date TIMESTAMPTZ,
  budget_code TEXT,
  sales_rep_id UUID,
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create new ot_specifications table (replacing previous one)
DROP TABLE IF EXISTS public.ot_specifications CASCADE;
CREATE TABLE public.ot_specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  product_type TEXT,
  finished_width_cm NUMERIC(8, 2),
  finished_height_cm NUMERIC(8, 2),
  substrate_type TEXT,
  substrate_weight_gsm INTEGER,
  substrate_brand TEXT,
  colors_front INTEGER DEFAULT 4,
  colors_back INTEGER DEFAULT 0,
  pantone_colors JSONB DEFAULT '[]',
  finishing_operations JSONB DEFAULT '[]',
  packaging_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(work_order_id)
);

-- Create operations_catalog table
CREATE TABLE public.operations_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category public.operation_category NOT NULL,
  unit_of_measure TEXT NOT NULL,
  cost_type public.cost_type NOT NULL,
  default_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ot_operations table
CREATE TABLE public.ot_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  operation_code TEXT NOT NULL REFERENCES public.operations_catalog(code),
  sequence_order INTEGER NOT NULL DEFAULT 1,
  quantity_budgeted NUMERIC(12, 4) DEFAULT 0,
  quantity_actual NUMERIC(12, 4),
  unit_cost_budgeted NUMERIC(12, 2) DEFAULT 0,
  unit_cost_actual NUMERIC(12, 2),
  total_cost_budgeted NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_budgeted * unit_cost_budgeted) STORED,
  total_cost_actual NUMERIC(12, 2) GENERATED ALWAYS AS (COALESCE(quantity_actual, 0) * COALESCE(unit_cost_actual, 0)) STORED,
  unit_of_measure TEXT,
  status public.ot_operation_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ot_calculations table
CREATE TABLE public.ot_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  sheet_format TEXT,
  sheet_width_cm NUMERIC(8, 2),
  sheet_height_cm NUMERIC(8, 2),
  bocas_per_sheet INTEGER DEFAULT 1,
  total_sheets INTEGER,
  setup_sheets INTEGER DEFAULT 500,
  substrate_kg NUMERIC(12, 4),
  waste_factor_percent NUMERIC(5, 2) DEFAULT 5.00,
  ink_calculations JSONB DEFAULT '{}',
  ctp_plates INTEGER,
  imposition_layout JSONB DEFAULT '{}',
  printing_hours_estimated NUMERIC(8, 2),
  finishing_hours_estimated NUMERIC(8, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(work_order_id)
);

-- Create ot_pricing table for pricing breakdown
CREATE TABLE public.ot_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  materials_cost NUMERIC(12, 2) DEFAULT 0,
  labor_cost NUMERIC(12, 2) DEFAULT 0,
  third_party_cost NUMERIC(12, 2) DEFAULT 0,
  other_cost NUMERIC(12, 2) DEFAULT 0,
  subtotal NUMERIC(12, 2) DEFAULT 0,
  margin_percent NUMERIC(5, 2) DEFAULT 10.00,
  margin_amount NUMERIC(12, 2) DEFAULT 0,
  increment_percent NUMERIC(5, 2) DEFAULT 10.00,
  increment_amount NUMERIC(12, 2) DEFAULT 0,
  commission1_percent NUMERIC(5, 2) DEFAULT 1.00,
  commission1_amount NUMERIC(12, 2) DEFAULT 0,
  commission2_percent NUMERIC(5, 2) DEFAULT 0,
  commission2_amount NUMERIC(12, 2) DEFAULT 0,
  commission3_percent NUMERIC(5, 2) DEFAULT 0,
  commission3_amount NUMERIC(12, 2) DEFAULT 0,
  total_price NUMERIC(12, 2) DEFAULT 0,
  unit_price NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(work_order_id)
);

-- Create indexes
CREATE INDEX idx_work_orders_client_id ON public.work_orders(client_id);
CREATE INDEX idx_work_orders_status ON public.work_orders(status);
CREATE INDEX idx_work_orders_created_at ON public.work_orders(created_at DESC);
CREATE INDEX idx_work_orders_delivery_date ON public.work_orders(delivery_date);
CREATE INDEX idx_work_orders_ot_number ON public.work_orders(ot_number);
CREATE INDEX idx_ot_operations_work_order_id ON public.ot_operations(work_order_id);
CREATE INDEX idx_ot_operations_operation_code ON public.ot_operations(operation_code);
CREATE INDEX idx_operations_catalog_category ON public.operations_catalog(category);
CREATE INDEX idx_operations_catalog_code ON public.operations_catalog(code);

-- Create updated_at triggers
CREATE TRIGGER update_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ot_specifications_updated_at
  BEFORE UPDATE ON public.ot_specifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_operations_catalog_updated_at
  BEFORE UPDATE ON public.operations_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ot_operations_updated_at
  BEFORE UPDATE ON public.ot_operations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ot_calculations_updated_at
  BEFORE UPDATE ON public.ot_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ot_pricing_updated_at
  BEFORE UPDATE ON public.ot_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_orders
CREATE POLICY "Supervisors admins managers can view work orders" 
ON public.work_orders FOR SELECT 
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Supervisors admins can manage work orders" 
ON public.work_orders FOR ALL 
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for ot_specifications
CREATE POLICY "Supervisors admins managers can view ot specs" 
ON public.ot_specifications FOR SELECT 
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Supervisors admins can manage ot specs" 
ON public.ot_specifications FOR ALL 
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for operations_catalog (read for all authenticated, write for admins)
CREATE POLICY "Authenticated users can view operations catalog" 
ON public.operations_catalog FOR SELECT USING (true);

CREATE POLICY "Admins can manage operations catalog" 
ON public.operations_catalog FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for ot_operations
CREATE POLICY "Supervisors admins managers can view ot operations" 
ON public.ot_operations FOR SELECT 
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Supervisors admins can manage ot operations" 
ON public.ot_operations FOR ALL 
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for ot_calculations
CREATE POLICY "Supervisors admins managers can view ot calculations" 
ON public.ot_calculations FOR SELECT 
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Supervisors admins can manage ot calculations" 
ON public.ot_calculations FOR ALL 
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for ot_pricing
CREATE POLICY "Supervisors admins managers can view ot pricing" 
ON public.ot_pricing FOR SELECT 
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Supervisors admins can manage ot pricing" 
ON public.ot_pricing FOR ALL 
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for clients
CREATE POLICY "Authenticated users can view clients" 
ON public.clients FOR SELECT USING (true);

CREATE POLICY "Supervisors admins can manage clients" 
ON public.clients FOR ALL 
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

-- Seed operations_catalog
INSERT INTO public.operations_catalog (code, name, category, unit_of_measure, cost_type, default_cost, description) VALUES
-- PREPRESS
('00061', 'Matricería electrónica', 'PREPRESS', 'hours', 'per_hour', 7000.00, 'Diseño y preparación de archivos'),
('00002', 'CTP', 'PREPRESS', 'plates', 'per_unit', 13600.00, 'Planchas de impresión'),
('00057', 'Corte inicial', 'PREPRESS', 'cuts', 'per_unit', 120.00, 'Corte de pliegos antes de impresión'),
-- PRINTING
('00005', 'Impresión Offset', 'PRINTING', 'hours', 'per_hour', 78000.00, 'Horas de máquina offset'),
('00006', 'Digital Color', 'PRINTING', 'clicks', 'per_unit', 595.00, 'Impresión digital por click'),
-- FINISHING
('00009', 'Troquelado', 'FINISHING', 'hours', 'per_hour', 19250.00, 'Horas de troqueladora'),
('00065', 'Arreglo troquel', 'FINISHING', 'hours', 'per_hour', 6950.00, 'Preparación de troquel'),
('00034', 'Molde troquel', 'FINISHING', 'units', 'fixed', 5000.00, 'Fabricación de molde'),
('00012', 'Barniz', 'FINISHING', 'kg', 'per_unit', 34090.00, 'Barniz por kilogramo'),
('00032', 'Pegado', 'FINISHING', 'hours', 'per_hour', 3500.00, 'Horas de pegado manual'),
('00056', 'Corte final', 'FINISHING', 'cuts', 'per_unit', 230.00, 'Corte guillotina final'),
-- MATERIALS
('00001', 'Sustrato', 'MATERIALS', 'kg', 'per_unit', 1500.00, 'Papel/cartón por kg'),
('00003', 'Tintas', 'MATERIALS', 'kg', 'per_unit', 31915.00, 'Tintas por kg'),
('00060', 'Cinta', 'MATERIALS', 'rolls', 'per_unit', 748.00, 'Rollos de cinta'),
('00020', 'Cajas', 'MATERIALS', 'units', 'per_unit', 551.00, 'Cajas de embalaje'),
-- THIRD_PARTY
('00021', 'Flete', 'THIRD_PARTY', 'trips', 'per_unit', 29000.00, 'Servicio de transporte'),
-- OTHER
('00058', 'Financiamiento', 'OTHER', 'percent', 'percentage', 2.00, 'Costo financiero'),
('00100', 'Varios', 'OTHER', 'units', 'per_unit', 0.00, 'Gastos varios')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit_of_measure = EXCLUDED.unit_of_measure,
  cost_type = EXCLUDED.cost_type,
  default_cost = EXCLUDED.default_cost,
  description = EXCLUDED.description;

-- Seed some sample clients
INSERT INTO public.clients (name, rut, email) VALUES
('Cliente Demo', '12.345.678-9', 'demo@cliente.cl'),
('Empresa ABC', '98.765.432-1', 'contacto@abc.cl'),
('Corporación XYZ', '11.222.333-4', 'ventas@xyz.cl')
ON CONFLICT DO NOTHING;

-- Enable realtime for work_orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;