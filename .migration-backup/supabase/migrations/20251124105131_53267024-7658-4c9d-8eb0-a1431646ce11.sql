-- Recalculate all users' grades based on new thresholds
UPDATE profiles
SET current_grade = calculate_grade(xp)
WHERE current_grade IS NOT NULL;