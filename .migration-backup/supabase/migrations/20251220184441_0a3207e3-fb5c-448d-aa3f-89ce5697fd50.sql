-- Add status and developer_email columns to mini_programs table for app review
ALTER TABLE public.mini_programs 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS developer_email text;

-- Add constraint for status values
ALTER TABLE public.mini_programs 
ADD CONSTRAINT mini_programs_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_mini_programs_status ON public.mini_programs(status);

-- Update RLS policies for admin access
CREATE POLICY "Admins can manage all mini programs" 
ON public.mini_programs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Developers can view their own mini programs" 
ON public.mini_programs 
FOR SELECT 
USING (auth.uid() = developer_id);

CREATE POLICY "Developers can update their own pending programs" 
ON public.mini_programs 
FOR UPDATE 
USING (auth.uid() = developer_id AND status = 'pending');

CREATE POLICY "Anyone can view approved mini programs" 
ON public.mini_programs 
FOR SELECT 
USING (status = 'approved');