-- Create substrates catalog
CREATE TABLE public.substrates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  weight_grs INTEGER NOT NULL,
  cost_per_kg NUMERIC(10,2),
  available_sizes TEXT[],
  in_stock BOOLEAN DEFAULT true,
  min_stock_kg NUMERIC(10,2),
  current_stock_kg NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create inks catalog
CREATE TABLE public.inks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL,
  cost_per_liter NUMERIC(10,2),
  density_g_per_ml NUMERIC(6,4),
  in_stock BOOLEAN DEFAULT true,
  current_stock_liters NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create die molds catalog
CREATE TABLE public.die_molds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  client_id TEXT,
  size_width_cm NUMERIC(10,2),
  size_height_cm NUMERIC(10,2),
  boca_count INTEGER DEFAULT 1,
  creation_cost NUMERIC(10,2),
  location TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create OT Specifications table
CREATE TABLE public.ot_specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_id UUID NOT NULL REFERENCES public.ots(id) ON DELETE CASCADE,
  product_name TEXT,
  product_type TEXT,
  final_width_cm NUMERIC(10,2),
  final_height_cm NUMERIC(10,2),
  closed_width_cm NUMERIC(10,2),
  closed_height_cm NUMERIC(10,2),
  pages_count INTEGER DEFAULT 1,
  substrate_type TEXT,
  substrate_weight_grs INTEGER,
  sheet_width_cm NUMERIC(10,2),
  sheet_height_cm NUMERIC(10,2),
  sheets_needed INTEGER,
  sheets_per_base NUMERIC(10,2),
  sheets_leftover INTEGER,
  substrate_cost_per_kg NUMERIC(10,2),
  substrate_kg_needed NUMERIC(10,4),
  pliego_width_cm NUMERIC(10,2),
  pliego_height_cm NUMERIC(10,2),
  pliegos_to_print INTEGER,
  pliegos_per_sheet NUMERIC(10,2),
  front_colors INTEGER DEFAULT 4,
  back_colors INTEGER DEFAULT 0,
  special_colors TEXT[],
  printing_method TEXT,
  ctp_plates_needed INTEGER DEFAULT 0,
  ink_coverage_percent NUMERIC(5,2) DEFAULT 30,
  ink_density_g_per_sqm NUMERIC(10,4),
  ink_liters_needed NUMERIC(10,4),
  ink_cost_per_liter NUMERIC(10,2),
  initial_cuts INTEGER DEFAULT 0,
  final_cuts INTEGER DEFAULT 0,
  cut_cost_per_unit NUMERIC(10,2),
  requires_die_cutting BOOLEAN DEFAULT false,
  die_mold_exists BOOLEAN DEFAULT false,
  die_mold_cost NUMERIC(10,2),
  die_cutting_hours NUMERIC(10,2),
  die_boca_count INTEGER,
  finishing_processes TEXT[],
  requires_folding BOOLEAN DEFAULT false,
  requires_stapling BOOLEAN DEFAULT false,
  requires_gluing BOOLEAN DEFAULT false,
  packaging_boxes INTEGER DEFAULT 0,
  units_per_box INTEGER DEFAULT 500,
  prepress_hours NUMERIC(10,2) DEFAULT 0,
  printing_hours NUMERIC(10,2) DEFAULT 0,
  die_cutting_hours_est NUMERIC(10,2) DEFAULT 0,
  finishing_hours NUMERIC(10,2) DEFAULT 0,
  outsourced_services JSONB DEFAULT '[]'::jsonb,
  layout_rows INTEGER DEFAULT 1,
  layout_cols INTEGER DEFAULT 1,
  montaje_type TEXT,
  production_notes TEXT,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create cost items table
CREATE TABLE public.ot_cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_id UUID NOT NULL REFERENCES public.ots(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity_estimated NUMERIC(10,4),
  quantity_actual NUMERIC(10,4),
  unit TEXT,
  unit_cost NUMERIC(10,4),
  cost_estimated NUMERIC(12,2),
  cost_actual NUMERIC(12,2),
  category TEXT,
  deviation_percent NUMERIC(8,2),
  deviation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_ot_specifications_ot_id ON public.ot_specifications(ot_id);
CREATE INDEX idx_ot_cost_items_ot_id ON public.ot_cost_items(ot_id);

-- Enable RLS
ALTER TABLE public.ot_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substrates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.die_molds ENABLE ROW LEVEL SECURITY;