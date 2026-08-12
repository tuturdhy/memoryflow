require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function addPgVector() {
  try {
    console.log('🔧 Installing pgvector extension...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('✅ pgvector extension installed');

    console.log('🔧 Adding embedding column to memories table...');
    await pool.query(
      `ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding vector(1536)`
    );
    console.log('✅ Embedding column added');

    // Verify setup
    const result = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'memories' AND column_name = 'embedding'`
    );

    if (result.rows.length > 0) {
      console.log('\n✅ pgvector setup complete!');
      console.log('📊 Embedding column type:', result.rows[0].data_type);
      console.log('✨ Vector search ready! (Using <-> operator)\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addPgVector();