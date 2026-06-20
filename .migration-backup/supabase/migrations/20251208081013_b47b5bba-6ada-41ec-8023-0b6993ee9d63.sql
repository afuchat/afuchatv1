-- Update handle_new_user trigger to handle missing metadata gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_display_name TEXT;
  v_handle TEXT;
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
  
  INSERT INTO public.profiles (id, display_name, handle)
  VALUES (NEW.id, v_display_name, v_handle);
  
  RETURN NEW;
END;
$$;