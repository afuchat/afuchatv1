-- Fix search_path for update_chat_preferences_updated_at function
DROP TRIGGER IF EXISTS update_chat_preferences_updated_at_trigger ON public.chat_preferences;
DROP FUNCTION IF EXISTS public.update_chat_preferences_updated_at();

CREATE OR REPLACE FUNCTION public.update_chat_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_chat_preferences_updated_at_trigger
  BEFORE UPDATE ON public.chat_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_preferences_updated_at();