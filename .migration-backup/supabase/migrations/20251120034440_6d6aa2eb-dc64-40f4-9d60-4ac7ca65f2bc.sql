-- Allow anyone to view approved affiliate requests
CREATE POLICY "Anyone can view approved affiliate requests"
ON public.affiliate_requests
FOR SELECT
USING (status = 'approved');