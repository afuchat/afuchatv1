-- Add featured item fields to shop_items
ALTER TABLE shop_items
ADD COLUMN is_featured boolean DEFAULT false,
ADD COLUMN discount_percentage integer DEFAULT 0,
ADD COLUMN featured_start_date timestamp with time zone,
ADD COLUMN featured_end_date timestamp with time zone;

-- Create index for featured items query
CREATE INDEX idx_shop_items_featured ON shop_items(is_featured, featured_start_date, featured_end_date) WHERE is_featured = true;

-- Function to rotate featured items weekly
CREATE OR REPLACE FUNCTION rotate_featured_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear expired featured items
  UPDATE shop_items
  SET is_featured = false,
      discount_percentage = 0,
      featured_start_date = NULL,
      featured_end_date = NULL
  WHERE is_featured = true
    AND featured_end_date < NOW();

  -- If no items are currently featured, select new ones
  IF NOT EXISTS (
    SELECT 1 FROM shop_items 
    WHERE is_featured = true 
      AND featured_start_date <= NOW() 
      AND featured_end_date > NOW()
  ) THEN
    -- Select 3 random items to feature (one from each type if possible)
    WITH random_items AS (
      SELECT DISTINCT ON (item_type) id
      FROM shop_items
      WHERE is_available = true
      ORDER BY item_type, RANDOM()
      LIMIT 3
    )
    UPDATE shop_items
    SET 
      is_featured = true,
      discount_percentage = 20 + (RANDOM() * 30)::integer, -- 20-50% discount
      featured_start_date = NOW(),
      featured_end_date = NOW() + INTERVAL '7 days'
    WHERE id IN (SELECT id FROM random_items);
  END IF;
END;
$$;

-- Insert some initial featured items for demonstration
INSERT INTO shop_items (name, description, item_type, xp_cost, emoji, config, is_featured, discount_percentage, featured_start_date, featured_end_date)
VALUES 
  ('Starlight Crown', 'Limited edition crown that sparkles with cosmic energy', 'accessory', 1000, '👑', '{"accessory": "crown", "effect": "sparkle"}', true, 30, NOW(), NOW() + INTERVAL '7 days'),
  ('Neon Dreams Theme', 'Vibrant cyberpunk-inspired color scheme', 'theme', 800, '🌈', '{"colors": {"primary": "#FF00FF", "secondary": "#00FFFF"}}', true, 25, NOW(), NOW() + INTERVAL '7 days'),
  ('Glitch Effect', 'Add a digital glitch animation to your profile', 'effect', 600, '⚡', '{"animation": "glitch", "duration": 2}', true, 40, NOW(), NOW() + INTERVAL '7 days')
ON CONFLICT DO NOTHING;