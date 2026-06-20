-- Create a function to get referrer name from referral code
CREATE OR REPLACE FUNCTION public.get_referrer_name(referral_code_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_name TEXT;
BEGIN
  SELECT display_name INTO v_referrer_name
  FROM public.profiles
  WHERE UPPER(REPLACE(id::text, '-', '')) LIKE UPPER(referral_code_input) || '%'
  LIMIT 1;
  
  RETURN v_referrer_name;
END;
$$;