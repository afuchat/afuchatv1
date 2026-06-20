-- Drop the old check constraint
ALTER TABLE creator_withdrawals DROP CONSTRAINT IF EXISTS creator_withdrawals_status_check;

-- Add new check constraint with correct status values
ALTER TABLE creator_withdrawals ADD CONSTRAINT creator_withdrawals_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'processing'::text, 'completed'::text, 'failed'::text]));