-- Migration: Fix account_number field length
-- Date: 2025-06-13
-- Description: Increase account_number field from VARCHAR(20) to VARCHAR(30) to accommodate longer temporary account numbers

-- Alter the account table to increase account_number field length
ALTER TABLE account ALTER COLUMN account_number TYPE VARCHAR(30);

-- Verify the change (optional - this will show the updated column info)
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'account' AND column_name = 'account_number';
