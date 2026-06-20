-- Add policy to allow public viewing of approved affiliate requests
CREATE POLICY "Anyone can view approved affiliate requests"
ON public.affiliate_requests
FOR SELECT
USING (status = 'approved');