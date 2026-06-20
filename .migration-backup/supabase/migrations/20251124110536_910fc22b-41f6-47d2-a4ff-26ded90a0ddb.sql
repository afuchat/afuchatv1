-- Update conversion fee to 5.99%
UPDATE currency_settings
SET conversion_fee_percent = 5.99
WHERE id = (SELECT id FROM currency_settings LIMIT 1);

-- Insert default settings if none exist
INSERT INTO currency_settings (nexa_to_acoin_rate, conversion_fee_percent, p2p_fee_percent)
SELECT 100, 5.99, 2.00
WHERE NOT EXISTS (SELECT 1 FROM currency_settings);