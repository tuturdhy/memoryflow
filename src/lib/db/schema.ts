export const SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Memories table - core memory storage
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'user_profile', 'goal', 'preference', 'progress', 'task', 'episodic', 'semantic'
  content TEXT NOT NULL,
  importance INT DEFAULT 3, -- 1-5 scale
  confidence FLOAT DEFAULT 1.0, -- 0.0-1.0
  source VARCHAR(255), -- 'user_input', 'agent_extraction', 'user_correction'
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived', 'superseded'
  tags VARCHAR(255)[] DEFAULT ARRAY[]::VARCHAR[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  INDEX idx_user_type (user_id, type),
  INDEX idx_importance (user_id, importance DESC),
  INDEX idx_created_at (user_id, created_at DESC)
);

-- Memory embeddings table - for semantic search (vectors)
CREATE TABLE IF NOT EXISTS memory_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL UNIQUE REFERENCES memories(id) ON DELETE CASCADE,
  embedding VECTOR(768) NOT NULL, -- pgvector extension
  model VARCHAR(100) DEFAULT 'nomic-embed-text-v1.5',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_memory_embedding (memory_id),
  INDEX idx_vector_similarity USING IVFFLAT (embedding)
);

-- Conversation sessions
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_conversations (user_id, created_at DESC)
);

-- Messages within conversations
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversation_messages (conversation_id, created_at),
  INDEX idx_user_messages (user_id, created_at DESC)
);

-- Memory events - audit trail and lifecycle tracking
CREATE TABLE IF NOT EXISTS memory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'accessed', 'deleted', 'retrieved'
  previous_value TEXT,
  new_value TEXT,
  confidence_change FLOAT DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_memory_events (memory_id, created_at DESC),
  INDEX idx_user_events (user_id, created_at DESC)
);

-- Agent state - track agent reasoning and decisions
CREATE TABLE IF NOT EXISTS agent_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  current_task VARCHAR(255),
  context_memories UUID[] DEFAULT ARRAY[]::UUID[],
  memory_operations JSONB DEFAULT '{}',
  agent_reasoning TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, conversation_id),
  INDEX idx_user_state (user_id)
);

-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector index for efficient similarity search
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_hnsw 
  ON memory_embeddings 
  USING hnsw (embedding vector_cosine_ops);
`;
