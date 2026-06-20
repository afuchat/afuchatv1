-- Drop the old avatar trigger that references the non-existent user_avatars table
DROP TRIGGER IF EXISTS on_profile_created_avatar ON public.profiles;

-- Drop the related function as well
DROP FUNCTION IF EXISTS public.handle_new_profile_avatar();