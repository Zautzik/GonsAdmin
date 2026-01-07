-- RLS Policies for ot_specifications
CREATE POLICY "Supervisors and admins can manage OT specifications" 
ON public.ot_specifications FOR ALL 
USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view OT specifications" 
ON public.ot_specifications FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for ot_cost_items
CREATE POLICY "Supervisors admins managers can manage OT cost items" 
ON public.ot_cost_items FOR ALL 
USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for substrates
CREATE POLICY "Authenticated users can view substrates" 
ON public.substrates FOR SELECT USING (true);

CREATE POLICY "Admins can manage substrates" 
ON public.substrates FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for inks
CREATE POLICY "Authenticated users can view inks" 
ON public.inks FOR SELECT USING (true);

CREATE POLICY "Admins can manage inks" 
ON public.inks FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for die molds
CREATE POLICY "Authenticated users can view die molds" 
ON public.die_molds FOR SELECT USING (true);

CREATE POLICY "Admins can manage die molds" 
ON public.die_molds FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at on ot_specifications
CREATE TRIGGER update_ot_specifications_updated_at
BEFORE UPDATE ON public.ot_specifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default substrates
INSERT INTO public.substrates (name, type, weight_grs, cost_per_kg, available_sizes) VALUES
  ('Bond 90', 'bond', 90, 1500, ARRAY['72x102', '65x90', '50x65']),
  ('Bond 140', 'bond', 140, 1500, ARRAY['72x102', '65x90']),
  ('Couche Opaco 300', 'couche_opaco', 300, 2200, ARRAY['72x102', '65x90']),
  ('Couche Brillante 250', 'couche_brillante', 250, 2100, ARRAY['72x102', '65x90']),
  ('Cartulina 180', 'cartulina', 180, 1800, ARRAY['72x102']);

-- Insert default inks
INSERT INTO public.inks (name, color, type, cost_per_liter, density_g_per_ml) VALUES
  ('Cyan Offset', 'cyan', 'offset', 45000, 1.05),
  ('Magenta Offset', 'magenta', 'offset', 45000, 1.05),
  ('Yellow Offset', 'yellow', 'offset', 42000, 1.03),
  ('Black Offset', 'black', 'offset', 38000, 1.08),
  ('Barniz Mate', 'barniz_mate', 'offset', 35000, 1.02),
  ('Barniz Brillante', 'barniz_brillante', 'offset', 36000, 1.02);