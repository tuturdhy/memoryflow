require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function resetDB() {
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('Connecting to CockroachDB...');
    const client = await pool.connect();

    console.log('Dropping all tables...');

    const dropStatements = [
      'DROP TABLE IF EXISTS agent_state CASCADE',
      'DROP TABLE IF EXISTS memory_events CASCADE',
      'DROP TABLE IF EXISTS messages CASCADE',
      'DROP TABLE IF EXISTS conversations CASCADE',
      'DROP TABLE IF EXISTS memory_embeddings CASCADE',
      'DROP TABLE IF EXISTS memories CASCADE',
      'DROP TABLE IF EXISTS users CASCADE',
    ];

    for (const statement of dropStatements) {
      await client.query(statement);
      console.log('✓ Dropped table');
    }

    console.log('✓ All tables dropped successfully');
    await client.release();
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDB();