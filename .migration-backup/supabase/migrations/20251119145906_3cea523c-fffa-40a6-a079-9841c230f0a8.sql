-- Create function to increment mini program installs
CREATE OR REPLACE FUNCTION public.increment_mini_program_installs(
  program_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mini_programs
  SET install_count = install_count + 1
  WHERE id = program_id;
END;
$$;