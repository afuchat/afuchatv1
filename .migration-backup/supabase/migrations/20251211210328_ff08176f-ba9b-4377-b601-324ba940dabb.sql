-- Fix credit_daily_creator_earnings to properly handle the jsonb return from check_creator_eligibility
CREATE OR REPLACE FUNCTION public.credit_daily_creator_earnings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credited_count integer := 0;
  v_missed_count integer := 0;
  v_total_distributed integer := 0;
  v_participant record;
  v_eligibility_result jsonb;
  v_is_eligible boolean;
BEGIN
  -- Get all participants from today's leaderboard
  FOR v_participant IN 
    SELECT * FROM get_daily_engagement_leaderboard()
    WHERE potential_earnings > 0
  LOOP
    -- Check if user is eligible (returns jsonb)
    SELECT check_creator_eligibility(v_participant.user_id) INTO v_eligibility_result;
    
    v_is_eligible := (v_eligibility_result->>'eligible')::boolean;
    
    IF v_is_eligible THEN
      -- Credit earnings to user's balance
      UPDATE profiles
      SET available_balance_ugx = available_balance_ugx + v_participant.potential_earnings
      WHERE id = v_participant.user_id;
      
      -- Record in creator_earnings table
      INSERT INTO creator_earnings (
        user_id,
        amount_ugx,
        earned_date,
        engagement_score,
        views_count,
        likes_count
      ) VALUES (
        v_participant.user_id,
        v_participant.potential_earnings,
        CURRENT_DATE,
        v_participant.engagement_score,
        v_participant.views_count,
        v_participant.likes_count
      )
      ON CONFLICT (user_id, earned_date) 
      DO UPDATE SET
        amount_ugx = EXCLUDED.amount_ugx,
        engagement_score = EXCLUDED.engagement_score,
        views_count = EXCLUDED.views_count,
        likes_count = EXCLUDED.likes_count;
      
      v_credited_count := v_credited_count + 1;
      v_total_distributed := v_total_distributed + v_participant.potential_earnings;
    ELSE
      -- User not eligible - add to missed earnings
      UPDATE profiles
      SET missed_earnings_total = COALESCE(missed_earnings_total, 0) + v_participant.potential_earnings
      WHERE id = v_participant.user_id;
      
      v_missed_count := v_missed_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'credited_count', v_credited_count,
    'missed_count', v_missed_count,
    'total_distributed', v_total_distributed,
    'credited_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_daily_creator_earnings() TO authenticated;