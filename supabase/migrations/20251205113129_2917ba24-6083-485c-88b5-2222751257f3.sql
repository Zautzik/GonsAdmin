-- Add specialty and role columns to workers table
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS specialty text[] DEFAULT '{}';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS worker_role text DEFAULT 'operator';

-- Create dispatch workstation type in workstations
INSERT INTO public.workstations (name, type, status, max_workers) VALUES
  ('Vehicle 1', 'dispatch', 'active', 2),
  ('Vehicle 2', 'dispatch', 'active', 2),
  ('Vehicle 3', 'dispatch', 'active', 2),
  ('Guillotine 2', 'guillotine', 'active', 1),
  ('Guillotine 3', 'guillotine', 'active', 1);

-- Update existing offset printers capacity
UPDATE public.workstations SET max_workers = 3 WHERE type = 'offset_printer';

-- Update workers with specialties and roles
-- Die Cutter specialists (2)
UPDATE public.workers SET specialty = ARRAY['die_cutter'], worker_role = 'technician' 
WHERE name IN ('Carlos Mendoza', 'Sofia Ramirez');

-- Guillotine specialists (3)
UPDATE public.workers SET specialty = ARRAY['guillotine'], worker_role = 'technician' 
WHERE name IN ('Juan Martinez', 'Ana Lopez', 'Pedro Gonzalez');

-- Offset Masters (5)
UPDATE public.workers SET specialty = ARRAY['offset_printer'], worker_role = 'master' 
WHERE name IN ('Miguel Torres', 'Laura Hernandez', 'Roberto Sanchez', 'Maria Garcia', 'Diego Castro');

-- Offset Assistants (4)
UPDATE public.workers SET specialty = ARRAY['offset_printer'], worker_role = 'assistant' 
WHERE name IN ('Carmen Ruiz', 'Fernando Diaz', 'Isabel Flores', 'Andres Vargas');

-- Dispatch Drivers (3)
UPDATE public.workers SET specialty = ARRAY['dispatch'], worker_role = 'driver', department = 'deliveries' 
WHERE name IN ('Marcos Cuevas', 'Francisco Vega', 'Sandra Moreno');

-- Dispatch Assistants (4)
UPDATE public.workers SET specialty = ARRAY['dispatch'], worker_role = 'assistant', department = 'deliveries' 
WHERE name IN ('Guillermo Molina', 'Liliana Acosta', 'Ricardo Paredes', 'Monica Gutierrez');

-- Workshop workers (remaining)
UPDATE public.workers SET specialty = ARRAY['workshop'], worker_role = 'operator' 
WHERE specialty = '{}' OR specialty IS NULL;