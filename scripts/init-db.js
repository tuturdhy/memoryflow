require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function initDB() {
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('Connecting to CockroachDB...');
    const client = await pool.connect();

    console.log('Creating schema...');

    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        importance INT DEFAULT 3,
        confidence FLOAT DEFAULT 1.0,
        source VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        tags VARCHAR(255)[] DEFAULT ARRAY[]::VARCHAR[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        INDEX idx_user_type (user_id, type),
        INDEX idx_importance (user_id, importance DESC),
        INDEX idx_created_at (user_id, created_at DESC)
      );

      CREATE TABLE IF NOT EXISTS memory_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        memory_id UUID NOT NULL UNIQUE REFERENCES memories(id) ON DELETE CASCADE,
        embedding VECTOR(768),
        model VARCHAR(100) DEFAULT 'nomic-embed-text-v1.5',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_memory_embedding (memory_id)
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_conversations (user_id, created_at DESC)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_conversation_messages (conversation_id, created_at),
        INDEX idx_user_messages (user_id, created_at DESC)
      );

      CREATE TABLE IF NOT EXISTS memory_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        previous_value TEXT,
        new_value TEXT,
        confidence_change FLOAT DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_memory_events (memory_id, created_at DESC),
        INDEX idx_user_events (user_id, created_at DESC)
      );

      CREATE TABLE IF NOT EXISTS agent_state (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        current_task VARCHAR(255),
        context_memories JSONB DEFAULT '[]',
        memory_operations JSONB DEFAULT '{}',
        agent_reasoning TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, conversation_id),
        INDEX idx_user_state (user_id)
      );
    `;

    const statements = schema.split(';').filter((s) => s.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
        console.log('✓ Executed statement');
      }
    }

    console.log('✓ Schema created successfully');
    await client.release();
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDB();