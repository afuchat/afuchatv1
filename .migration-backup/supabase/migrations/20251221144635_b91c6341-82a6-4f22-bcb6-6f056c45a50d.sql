-- Make Christmas gifts available for the current season
UPDATE gifts 
SET 
  season = 'christmas',
  available_from = '2024-12-01',
  available_until = '2025-01-06'
WHERE name ILIKE '%christmas%' OR name ILIKE '%xmas%' OR emoji = '🎄';

-- Update any existing winter seasonal gifts to be available now
UPDATE gifts 
SET 
  available_from = '2024-12-01',
  available_until = '2025-01-06'
WHERE season = 'winter' OR season = 'christmas';