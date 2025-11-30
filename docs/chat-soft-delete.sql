-- Add is_deleted column to chat_messages table
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Update existing rows to have is_deleted = false
UPDATE chat_messages SET is_deleted = FALSE WHERE is_deleted IS NULL;
