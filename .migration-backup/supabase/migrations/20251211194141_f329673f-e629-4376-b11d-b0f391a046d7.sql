-- Reset incorrectly credited balance (old system credited immediately, new system waits 24h)
UPDATE profiles 
SET available_balance_ugx = 0 
WHERE available_balance_ugx > 0;