-- Migrate existing resource AI conversations to unified table
-- This migration copies resource_ai_conversations and resource_ai_messages 
-- into ai_conversations and ai_messages with surface='resource'

-- These indexes must be created after the migration that adds the enum value
-- has committed. PostgreSQL does not allow a new enum value in an index
-- predicate within the transaction that introduced it.
CREATE INDEX IF NOT EXISTS ai_conversations_resource_user_idx
  ON ai_conversations(entity_id, user_id, updated_at)
  WHERE surface = 'resource';

CREATE UNIQUE INDEX IF NOT EXISTS ai_conversations_resource_default_unique
  ON ai_conversations(user_id, org_id, surface, entity_id)
  WHERE surface = 'resource' AND is_default = true;

-- First, migrate conversations
-- Note: resource_ai_conversations has (resourceId, userId) unique constraint
-- We set isDefault=true and entityId=resourceId for the unified table
INSERT INTO ai_conversations (
  id,
  user_id,
  org_id,
  surface,
  entity_id,
  title,
  is_default,
  last_message_at,
  created_at,
  updated_at
)
SELECT 
  rac.id,
  rac.user_id,
  r.org_id,
  'resource'::ai_conversation_surface,
  rac.resource_id,
  'Resource chat' as title, -- Default title, will be auto-updated by the system
  true as is_default, -- Each resource has one default conversation per user
  (
    SELECT MAX(ram.created_at)
    FROM resource_ai_messages ram
    WHERE ram.conversation_id = rac.id
  ) as last_message_at,
  rac.created_at,
  rac.updated_at
FROM resource_ai_conversations rac
INNER JOIN resources r ON r.id = rac.resource_id
WHERE NOT EXISTS (
  -- Skip if already migrated
  SELECT 1 FROM ai_conversations ac 
  WHERE ac.user_id = rac.user_id 
    AND ac.surface = 'resource' 
    AND ac.entity_id = rac.resource_id
    AND ac.is_default = true
);

-- Migrate messages
-- Convert resource_ai_messages to ai_messages
INSERT INTO ai_messages (
  id,
  conversation_id,
  role,
  content,
  provider,
  model,
  status,
  metadata,
  client_message_id,
  created_at,
  updated_at
)
SELECT 
  ram.id,
  ram.conversation_id,
  ram.role::text::ai_message_role, -- Cast between distinct enum types via text
  ram.content,
  NULL as provider, -- Old resource messages didn't track provider
  NULL as model, -- Old resource messages didn't track model
  'completed'::ai_message_status as status, -- All old messages are completed
  '{}'::jsonb as metadata, -- Old resource messages didn't have metadata
  ram.client_message_id,
  ram.created_at,
  ram.created_at as updated_at -- Use created_at as updated_at for old messages
FROM resource_ai_messages ram
WHERE EXISTS (
  -- Only migrate messages whose conversations were migrated
  SELECT 1 FROM ai_conversations ac
  WHERE ac.id = ram.conversation_id
    AND ac.surface = 'resource'
)
AND NOT EXISTS (
  -- Skip if already migrated
  SELECT 1 FROM ai_messages am
  WHERE am.id = ram.id
);

-- After migration, the old tables can be kept for rollback safety
-- or dropped in a future migration after verification
-- For now, we'll leave them in place

-- Add a comment to document the migration
COMMENT ON TABLE resource_ai_conversations IS 
  'Deprecated: Resource AI conversations have been migrated to ai_conversations with surface=resource. This table is kept for rollback safety and will be removed in a future migration.';

COMMENT ON TABLE resource_ai_messages IS 
  'Deprecated: Resource AI messages have been migrated to ai_messages. This table is kept for rollback safety and will be removed in a future migration.';
