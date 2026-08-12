require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function seedDB() {
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('Connecting to CockroachDB...');
    const client = await pool.connect();

    console.log('Creating sample user...');

    // Create sample user
    const userId = uuidv4();
    await client.query(
      `INSERT INTO users (id, email, name) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [userId, 'demo@memoryflow.dev', 'Demo User']
    );

    console.log('Creating sample memories...');

    // Sample memories
    const memories = [
      {
        id: uuidv4(),
        type: 'user_profile',
        content: 'My name is Alex and I work as a software engineer',
        importance: 5,
        confidence: 1.0,
      },
      {
        id: uuidv4(),
        type: 'goal',
        content: 'Learn Python and become proficient in data science',
        importance: 5,
        confidence: 1.0,
      },
      {
        id: uuidv4(),
        type: 'preference',
        content: 'I prefer learning through practical coding exercises and real projects',
        importance: 4,
        confidence: 0.95,
      },
      {
        id: uuidv4(),
        type: 'preference',
        content: 'I prefer concise, technical explanations with code examples',
        importance: 4,
        confidence: 0.9,
      },
      {
        id: uuidv4(),
        type: 'progress',
        content: 'Completed Python basics module including variables, loops, and functions',
        importance: 3,
        confidence: 1.0,
      },
      {
        id: uuidv4(),
        type: 'progress',
        content: 'Struggled with understanding decorators and closures',
        importance: 4,
        confidence: 0.85,
      },
      {
        id: uuidv4(),
        type: 'task',
        content: 'Currently working on a machine learning project using scikit-learn',
        importance: 4,
        confidence: 1.0,
      },
      {
        id: uuidv4(),
        type: 'episodic',
        content: 'In previous conversation, mentioned wanting to contribute to open source projects',
        importance: 3,
        confidence: 0.8,
      },
      {
        id: uuidv4(),
        type: 'semantic',
        content: 'Python is a dynamically typed, high-level programming language known for readability',
        importance: 2,
        confidence: 1.0,
      },
      {
        id: uuidv4(),
        type: 'semantic',
        content: 'Machine learning requires understanding of linear algebra, calculus, and statistics',
        importance: 3,
        confidence: 0.95,
      },
    ];

    // Insert memories
    for (const memory of memories) {
      await client.query(
        `INSERT INTO memories (id, user_id, type, content, importance, confidence, source, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          memory.id,
          userId,
          memory.type,
          memory.content,
          memory.importance,
          memory.confidence,
          'seed_data',
          [],
        ]
      );
    }

    console.log('✓ Database seeded with sample data');
    console.log(`User ID: ${userId}`);
    console.log(`Email: demo@memoryflow.dev`);
    console.log(`Memories created: ${memories.length}`);

    await client.release();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDB();
