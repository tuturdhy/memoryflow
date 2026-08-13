const { Client } = require('pg');

async function fixUserIds() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Trouve l'email du user avec memories NULL
    const result = await client.query(`
      SELECT DISTINCT m.user_id FROM memories m
      WHERE m.user_id IS NULL OR m.user_id = ''
    `);
    
    console.log('Memories with NULL user_id:', result.rows.length);
    
    // À faire manuellement en production
    
    await client.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixUserIds();