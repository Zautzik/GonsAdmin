-- Add hourly_salary column to workers table for cost calculations
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS hourly_salary numeric DEFAULT 0;

-- Add a comment explaining overtime calculation
COMMENT ON COLUMN public.workers.hourly_salary IS 'Base hourly salary. Overtime (>40hrs/week) is paid at 1.5x rate';