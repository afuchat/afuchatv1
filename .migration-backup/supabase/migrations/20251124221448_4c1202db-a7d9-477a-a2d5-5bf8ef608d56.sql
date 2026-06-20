-- Clear all existing gift images to force regeneration with transparent backgrounds
UPDATE gifts SET image_url = NULL WHERE image_url IS NOT NULL;