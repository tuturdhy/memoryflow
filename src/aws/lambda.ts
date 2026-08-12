import { Handler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import Groq from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const chatHandler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  event
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { message, conversationId, userId } = body;

    if (!message || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Retrieve memories
    const memoriesResult = await pool.query(
      `SELECT * FROM memories WHERE user_id = $1 AND status = 'active' LIMIT 5`,
      [userId]
    );

    const memoryContext = memoriesResult.rows
      .map((m) => `${m.type}: ${m.content}`)
      .join('\n');

    // Call Groq
    const llmResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are MemoryFlow AI. User context:\n${memoryContext}`,
        },
        { role: 'user', content: message },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });

    const aiMessage = llmResponse.choices[0]?.message?.content || 'Error generating response';

    // Store messages
    await pool.query(
      `INSERT INTO messages (id, conversation_id, user_id, role, content)
       VALUES ($1, $2, $3, 'user', $4)`,
      [uuidv4(), conversationId, userId, message]
    );

    await pool.query(
      `INSERT INTO messages (id, conversation_id, user_id, role, content)
       VALUES ($1, $2, $3, 'assistant', $4)`,
      [uuidv4(), conversationId, userId, aiMessage]
    );

    // Update conversation
    await pool.query(
      `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [conversationId]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: aiMessage,
        memoriesRetrieved: memoriesResult.rows.length,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};