-- Add missing 'gift' value to notification_type enum so combo gifts and tips can create notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'gift'
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'gift';
  END IF;
END$$;