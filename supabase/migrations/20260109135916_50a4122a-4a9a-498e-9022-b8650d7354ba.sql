-- Create templates table for saving OT templates
CREATE TABLE public.ot_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  operations JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  use_count INTEGER DEFAULT 0
);

-- Create deviations table for tracking cost deviations
CREATE TABLE public.ot_deviations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES public.ot_operations(id) ON DELETE CASCADE,
  deviation_percent NUMERIC DEFAULT 0,
  deviation_amount NUMERIC DEFAULT 0,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Create history table for audit trail
CREATE TABLE public.ot_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value JSONB,
  new_value JSONB,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.ot_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates
CREATE POLICY "Authenticated users can view templates" ON public.ot_templates
  FOR SELECT USING (true);

CREATE POLICY "Supervisors admins can manage templates" ON public.ot_templates
  FOR ALL USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for deviations
CREATE POLICY "Supervisors admins managers can view deviations" ON public.ot_deviations
  FOR SELECT USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Supervisors admins can manage deviations" ON public.ot_deviations
  FOR ALL USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for history
CREATE POLICY "Supervisors admins managers can view history" ON public.ot_history
  FOR SELECT USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Supervisors admins can insert history" ON public.ot_history
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add indexes
CREATE INDEX idx_ot_deviations_work_order ON public.ot_deviations(work_order_id);
CREATE INDEX idx_ot_history_work_order ON public.ot_history(work_order_id);
CREATE INDEX idx_ot_templates_product_type ON public.ot_templates(product_type);

-- Seed default templates
INSERT INTO public.ot_templates (name, description, product_type, specifications, operations) VALUES
('Tarjetas Presentación', 'Tarjetas de presentación estándar 9x5cm', 'Tarjetas', 
  '{"finishedWidthCm": 9, "finishedHeightCm": 5, "substrateType": "Couche", "substrateWeightGsm": 300, "colorsFront": 4, "colorsBack": 4, "finishingOperations": ["corte"]}',
  '[{"code": "00061", "name": "Matricería electrónica"}, {"code": "00002", "name": "CTP"}, {"code": "00005", "name": "Impresión Offset"}, {"code": "00057", "name": "Corte inicial"}, {"code": "00056", "name": "Corte final"}]'
),
('Flyers A5', 'Volantes tamaño A5 148x210mm', 'Volantes',
  '{"finishedWidthCm": 14.8, "finishedHeightCm": 21, "substrateType": "Couche", "substrateWeightGsm": 150, "colorsFront": 4, "colorsBack": 0, "finishingOperations": ["corte"]}',
  '[{"code": "00061", "name": "Matricería electrónica"}, {"code": "00002", "name": "CTP"}, {"code": "00005", "name": "Impresión Offset"}, {"code": "00057", "name": "Corte inicial"}, {"code": "00056", "name": "Corte final"}]'
),
('Brochures Tríptico', 'Brochures trípticos tamaño carta', 'Brochures',
  '{"finishedWidthCm": 21.6, "finishedHeightCm": 27.9, "substrateType": "Couche", "substrateWeightGsm": 200, "colorsFront": 4, "colorsBack": 4, "finishingOperations": ["corte", "plegado"]}',
  '[{"code": "00061", "name": "Matricería electrónica"}, {"code": "00002", "name": "CTP"}, {"code": "00005", "name": "Impresión Offset"}, {"code": "00057", "name": "Corte inicial"}, {"code": "00056", "name": "Corte final"}]'
),
('Carpetas Corporativas', 'Carpetas con bolsillo interior', 'Carpetas',
  '{"finishedWidthCm": 45, "finishedHeightCm": 31, "substrateType": "Couche", "substrateWeightGsm": 300, "colorsFront": 4, "colorsBack": 0, "finishingOperations": ["troquelado", "plegado", "pegado"]}',
  '[{"code": "00061", "name": "Matricería electrónica"}, {"code": "00002", "name": "CTP"}, {"code": "00005", "name": "Impresión Offset"}, {"code": "00034", "name": "Molde troquel"}, {"code": "00009", "name": "Troquelado"}, {"code": "00032", "name": "Pegado"}]'
),
('Stickers Troquelados', 'Stickers con troquel a medida', 'Stickers',
  '{"finishedWidthCm": 5, "finishedHeightCm": 5, "substrateType": "Adhesivo", "substrateWeightGsm": 80, "colorsFront": 4, "colorsBack": 0, "finishingOperations": ["troquelado"]}',
  '[{"code": "00061", "name": "Matricería electrónica"}, {"code": "00002", "name": "CTP"}, {"code": "00005", "name": "Impresión Offset"}, {"code": "00034", "name": "Molde troquel"}, {"code": "00009", "name": "Troquelado"}]'
),
('Libros Encuadernados', 'Libros con encuadernación rústica', 'Libros',
  '{"finishedWidthCm": 15, "finishedHeightCm": 21, "substrateType": "Bond", "substrateWeightGsm": 90, "colorsFront": 4, "colorsBack": 4, "finishingOperations": ["corte", "plegado", "pegado", "laminado"]}',
  '[{"code": "00061", "name": "Matricería electrónica"}, {"code": "00002", "name": "CTP"}, {"code": "00005", "name": "Impresión Offset"}, {"code": "00057", "name": "Corte inicial"}, {"code": "00032", "name": "Pegado"}, {"code": "00012", "name": "Barniz"}]'
);