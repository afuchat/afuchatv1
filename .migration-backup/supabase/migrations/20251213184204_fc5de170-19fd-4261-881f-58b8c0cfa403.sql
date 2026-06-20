-- Set all existing merchant products as available
UPDATE merchant_products SET is_available = true WHERE is_available = false;