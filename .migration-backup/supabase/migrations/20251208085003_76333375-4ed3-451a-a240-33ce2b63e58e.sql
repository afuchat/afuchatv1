-- Update handle_new_user function to capture country from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_display_name TEXT;
  v_handle TEXT;
  v_country TEXT;
  v_is_business_mode BOOLEAN;
BEGIN
  -- Get display_name from metadata or generate from email/id
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'User'
  );
  
  -- Get handle from metadata or generate unique one
  v_handle := COALESCE(
    NEW.raw_user_meta_data->>'handle',
    NEW.raw_user_meta_data->>'preferred_username',
    'user_' || substr(NEW.id::text, 1, 8)
  );
  
  -- Get country from metadata (set during signup)
  v_country := NEW.raw_user_meta_data->>'country';
  
  -- Get business mode from metadata
  v_is_business_mode := COALESCE((NEW.raw_user_meta_data->>'is_business_mode')::boolean, false);
  
  INSERT INTO public.profiles (id, display_name, handle, country, is_business_mode)
  VALUES (NEW.id, v_display_name, v_handle, v_country, v_is_business_mode);
  
  RETURN NEW;
END;
$$;