-- Fix handle_new_user function to correctly parse referral codes
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_code_prefix TEXT;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, display_name, handle)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'handle', 'user_' || substring(NEW.id::text, 1, 8))
  );

  -- Check for referral code in metadata
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  
  IF v_referral_code IS NOT NULL AND v_referral_code LIKE 'AFU-%' THEN
    -- Extract the code part after AFU- (8 characters)
    v_code_prefix := substring(v_referral_code from 5 for 8);
    
    -- Find the user whose ID starts with this prefix
    SELECT id INTO v_referrer_id
    FROM auth.users
    WHERE id::text LIKE v_code_prefix || '%'
    AND id != NEW.id
    LIMIT 1;
    
    -- Create referral record if referrer found
    IF v_referrer_id IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_id, referred_id, referral_code)
      VALUES (v_referrer_id, NEW.id, v_referral_code)
      ON CONFLICT DO NOTHING;
      
      -- Award XP to referrer using the award_xp function
      PERFORM award_xp(
        v_referrer_id,
        'referral_signup',
        20,
        jsonb_build_object('referred_user_id', NEW.id, 'referral_code', v_referral_code)
      );
      
      -- Mark referral as rewarded
      UPDATE public.referrals 
      SET rewarded = true 
      WHERE referrer_id = v_referrer_id 
        AND referred_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();