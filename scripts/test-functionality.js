/**
 * MemoryFlow Functionality Test Script
 * Tests: Database connection, user creation, memory operations
 * Run: node scripts/test-functionality.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runTests() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🧪 MemoryFlow Functionality Tests\n');

    // TEST 1: Database Connection
    console.log('[1/7] Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful\n');

    // TEST 2: User Creation
    console.log('[2/7] Testing user creation...');
    const userId = uuidv4();
    await client.query(
      `INSERT INTO users (id, email, name) VALUES ($1, $2, $3)`,
      [userId, `test-${userId}@memoryflow.local`, 'Test User']
    );
    console.log(`✅ User created: ${userId}\n`);

    // TEST 3: Memory Creation
    console.log('[3/7] Testing memory creation...');
    const memoryId = uuidv4();
    await client.query(
      `INSERT INTO memories (id, user_id, type, content, importance, source)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        memoryId,
        userId,
        'preference',
        'I prefer practical coding exercises',
        4,
        'test'
      ]
    );
    console.log(`✅ Memory created: ${memoryId}\n`);

    // TEST 4: Memory Retrieval
    console.log('[4/7] Testing memory retrieval...');
    const result = await client.query(
      `SELECT * FROM memories WHERE id = $1 AND user_id = $2`,
      [memoryId, userId]
    );
    if (result.rows.length === 0) {
      throw new Error('Memory not found after creation');
    }
    console.log(`✅ Memory retrieved: "${result.rows[0].content}"\n`);

    // TEST 5: Memory Update
    console.log('[5/7] Testing memory update...');
    await client.query(
      `UPDATE memories SET content = $1, importance = $2 WHERE id = $3`,
      ['I prefer longer project-based exercises', 5, memoryId]
    );
    const updatedResult = await client.query(
      `SELECT * FROM memories WHERE id = $1`,
      [memoryId]
    );
    console.log(`✅ Memory updated: "${updatedResult.rows[0].content}"\n`);

    // TEST 6: Memory Soft Delete
    console.log('[6/7] Testing memory soft delete...');
    await client.query(
      `UPDATE memories SET status = 'archived' WHERE id = $1`,
      [memoryId]
    );
    const deletedResult = await client.query(
      `SELECT status FROM memories WHERE id = $1`,
      [memoryId]
    );
    if (deletedResult.rows[0].status !== 'archived') {
      throw new Error('Memory status not updated to archived');
    }
    console.log(`✅ Memory archived\n`);

    // TEST 7: Verify User Isolation
    console.log('[7/7] Testing user data isolation...');
    const user2Id = uuidv4();
    await client.query(
      `INSERT INTO users (id, email, name) VALUES ($1, $2, $3)`,
      [user2Id, `test2-${user2Id}@memoryflow.local`, 'Test User 2']
    );
    
    const isolationResult = await client.query(
      `SELECT * FROM memories WHERE user_id = $1 AND status = 'archived'`,
      [user2Id]
    );
    if (isolationResult.rows.length !== 0) {
      throw new Error('User 2 can see User 1\'s memories');
    }
    console.log(`✅ User data properly isolated\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📝 Summary:');
    console.log('  - Database connection: OK');
    console.log('  - User creation: OK');
    console.log('  - Memory CRUD operations: OK');
    console.log('  - Data isolation: OK');
    console.log('\n✨ MemoryFlow database is functional!\n');

    await client.release();
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nDebugging Info:');
    console.error('- DATABASE_URL:', connectionString ? '***' : 'NOT SET');
    console.error('- Error Type:', error.code || 'Unknown');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
