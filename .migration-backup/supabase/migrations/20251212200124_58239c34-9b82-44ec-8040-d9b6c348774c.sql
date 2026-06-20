-- Update subscription plans with tiered names and unique benefits

-- Silver Plan (Monthly - Basic tier)
UPDATE subscription_plans 
SET 
  name = 'Silver',
  description = 'Essential premium features for casual users',
  features = '["Verified badge", "Ad-free experience", "Pin 1 gift on profile", "1 red envelope claim per day", "Basic chat themes"]'::jsonb
WHERE id = '86a3f99d-d244-49d4-a228-bd5458c29dd5';

-- Gold Plan (Quarterly - Mid tier)
UPDATE subscription_plans 
SET 
  name = 'Gold',
  description = 'Enhanced features for active creators',
  features = '["Verified badge", "Ad-free experience", "Create stories", "Create groups", "Pin 2 gifts on profile", "5 red envelope claims per day", "AI Post Analysis", "Custom chat themes"]'::jsonb
WHERE id = '00840063-5cea-4b7c-8733-defe3dca4046';

-- Platinum Plan (Yearly - Elite tier)
UPDATE subscription_plans 
SET 
  name = 'Platinum',
  description = 'Ultimate access with all premium features',
  features = '["Verified badge", "Ad-free experience", "Create stories", "Create groups", "Create channels", "Pin 3 gifts on profile", "Unlimited red envelope claims", "Create red envelopes", "AI Post Analysis", "AI Chat Themes & Wallpapers", "Gift Marketplace access", "Leaderboard privacy", "AfuAI Chat Assistant", "Priority support"]'::jsonb
WHERE id = '22cdddbd-04fc-478c-a613-eb8525a9b749';

-- Add tier column to subscription_plans to identify tier level
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'silver';

UPDATE subscription_plans SET tier = 'silver' WHERE id = '86a3f99d-d244-49d4-a228-bd5458c29dd5';
UPDATE subscription_plans SET tier = 'gold' WHERE id = '00840063-5cea-4b7c-8733-defe3dca4046';
UPDATE subscription_plans SET tier = 'platinum' WHERE id = '22cdddbd-04fc-478c-a613-eb8525a9b749';