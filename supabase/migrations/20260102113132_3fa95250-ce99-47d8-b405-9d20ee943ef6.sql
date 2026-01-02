-- Create enum for submission types
CREATE TYPE progress_type AS ENUM ('production', 'maintenance', 'idle');

-- Create enum for submission status
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected', 'edited');

-- Create progress_submissions table for WhatsApp worker reports
CREATE TABLE public.progress_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Worker identification (phone lookup or code)
  worker_phone TEXT NOT NULL,
  worker_id UUID REFERENCES public.workers(id),
  worker_code TEXT,
  
  -- Work context
  ot_id UUID REFERENCES public.ots(id),
  workstation_id UUID REFERENCES public.workstations(id),
  machine_id UUID REFERENCES public.machines(id),
  shift_id UUID REFERENCES public.shifts(id),
  
  -- Reported data
  submission_type progress_type NOT NULL DEFAULT 'production',
  units_reported INTEGER NOT NULL DEFAULT 0,
  time_reported_minutes INTEGER NOT NULL DEFAULT 0,
  quality_notes TEXT,
  
  -- For maintenance/idle
  idle_reason TEXT,
  maintenance_description TEXT,
  
  -- Raw message for audit
  raw_message TEXT NOT NULL,
  whatsapp_group TEXT,
  
  -- Review workflow
  status submission_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  supervisor_notes TEXT,
  rejection_reason TEXT,
  
  -- Edited values (for traceability)
  edited_units INTEGER,
  edited_time_minutes INTEGER,
  edited_ot_id UUID REFERENCES public.ots(id),
  
  -- Timestamps
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.progress_submissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Supervisors and admins can view all submissions"
ON public.progress_submissions FOR SELECT
USING (
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Public insert for webhook"
ON public.progress_submissions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Supervisors can update submissions"
ON public.progress_submissions FOR UPDATE
USING (
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add phone number to workers table
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS worker_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_progress_submissions_status ON public.progress_submissions(status);
CREATE INDEX idx_progress_submissions_worker ON public.progress_submissions(worker_id);
CREATE INDEX idx_progress_submissions_phone ON public.progress_submissions(worker_phone);
CREATE INDEX idx_workers_phone ON public.workers(phone);
CREATE INDEX idx_workers_code ON public.workers(worker_code);

-- Update trigger for updated_at
CREATE TRIGGER update_progress_submissions_updated_at
BEFORE UPDATE ON public.progress_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.progress_submissions;