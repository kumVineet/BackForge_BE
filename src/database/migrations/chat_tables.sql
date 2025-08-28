-- Chat System Tables Migration
-- This migration creates the necessary tables for the chat feature

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- conversations: 1:1 or group
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('private','group')),
  title text,
  metadata jsonb DEFAULT '{}',
  created_by bigint REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- members of a conversation (for 1:1, two rows)
CREATE TABLE conversation_members (
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  last_read_message_id uuid,   -- optionally track last read
  PRIMARY KEY (conversation_id, user_id)
);

-- messages
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id bigint REFERENCES users(id),
  content text,                    -- short text (could be JSON for rich content)
  content_type text DEFAULT 'text',-- 'text','image','file','system'
  attachments jsonb,               -- [{url, type, size}]
  edited boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- per-user delivery/read tracking (one row per recipient per message)
CREATE TABLE message_statuses (
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  delivered_at timestamptz,
  read_at timestamptz,
  PRIMARY KEY (message_id, user_id)
);

-- indexes for quick history load
CREATE INDEX idx_messages_convo_created ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_msgstatus_user_read ON message_statuses (user_id, read_at);
CREATE INDEX idx_conversations_created_by ON conversations (created_by);
CREATE INDEX idx_conversation_members_user ON conversation_members (user_id);
CREATE INDEX idx_messages_sender ON messages (sender_id);

-- Add comments for documentation
COMMENT ON TABLE conversations IS 'Stores conversation information for both private and group chats';
COMMENT ON TABLE conversation_members IS 'Tracks membership and roles in conversations';
COMMENT ON TABLE messages IS 'Stores all messages sent in conversations';
COMMENT ON TABLE message_statuses IS 'Tracks delivery and read status for each message per user';

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
