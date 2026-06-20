-- Enable full row data for real-time updates on post_acknowledgments
-- This ensures DELETE events include the old data (user_id and post_id)
ALTER TABLE post_acknowledgments REPLICA IDENTITY FULL;