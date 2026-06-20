-- Create unlocked_accessories table
CREATE TABLE public.unlocked_accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accessory_type TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, accessory_type)
);

-- Enable RLS
ALTER TABLE public.unlocked_accessories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own unlocked accessories"
  ON public.unlocked_accessories
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlocked accessories"
  ON public.unlocked_accessories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to auto-unlock accessories based on XP
CREATE OR REPLACE FUNCTION public.check_and_unlock_accessories(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_xp INTEGER;
  v_newly_unlocked TEXT[] := '{}';
  v_accessory TEXT;
  v_xp_thresholds JSONB := '{"badge": 100, "glasses": 250, "scarf": 500, "mask": 1000, "hat": 1500, "crown": 5000}';
BEGIN
  -- Get user XP
  SELECT xp INTO v_user_xp
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Check each accessory threshold
  FOR v_accessory IN SELECT jsonb_object_keys(v_xp_thresholds)
  LOOP
    -- If user has enough XP and hasn't unlocked it yet
    IF v_user_xp >= (v_xp_thresholds->>v_accessory)::INTEGER 
       AND NOT EXISTS (
         SELECT 1 FROM public.unlocked_accessories 
         WHERE user_id = p_user_id AND accessory_type = v_accessory
       ) THEN
      -- Unlock it
      INSERT INTO public.unlocked_accessories (user_id, accessory_type)
      VALUES (p_user_id, v_accessory);
      
      v_newly_unlocked := array_append(v_newly_unlocked, v_accessory);
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'newly_unlocked', v_newly_unlocked,
    'user_xp', v_user_xp
  );
END;
$$;