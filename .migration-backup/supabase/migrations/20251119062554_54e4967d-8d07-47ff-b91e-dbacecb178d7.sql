-- Add unique constraint to prevent duplicate affiliate requests
ALTER TABLE public.affiliate_requests
ADD CONSTRAINT affiliate_requests_user_business_unique 
UNIQUE (user_id, business_id);

-- Add comment
COMMENT ON CONSTRAINT affiliate_requests_user_business_unique ON public.affiliate_requests 
IS 'Ensures a user can only have one request per business';
