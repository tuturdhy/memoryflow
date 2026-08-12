// src/aws/lambda.ts
import { Handler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

interface ChatRequest {
  message: string;
  conversationId: string;
  userId: string;
}

interface ChatResponse {
  message: string;
  conversationId: string;
  memoriesRetrieved: number;
  memoriesCreated: string[];
}

export const chatHandler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  event,
  context
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}') as ChatRequest;
    const { message, conversationId, userId } = body;

    if (!message || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Message and userId are required' }),
      };
    }

    // Step 1: Retrieve relevant memories
    const memoriesResult = await pool.query(
      `SELECT * FROM memories 
       WHERE user_id = $1 AND status = 'active'
       ORDER BY updated_at DESC
       LIMIT 5`,
      [userId]
    );

    const memories = memoriesResult.rows;
    const memoryContext = memories
      .map((m) => `${m.type}: ${m.content}`)
      .join('\n');

    // Step 2: Call LLM via Groq
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are MemoryFlow, an intelligent AI assistant with persistent memory. 
User context:\n${memoryContext}
Be helpful and personalized based on the user's history.`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    const groqData = await groqResponse.json();
    const aiMessage = groqData.choices[0]?.message?.content || 'Unable to generate response';

    // Step 3: Store conversation message
    await pool.query(
      `INSERT INTO messages (id, conversation_id, user_id, role, content)
       VALUES (gen_random_uuid(), $1, $2, 'user', $3)`,
      [conversationId, userId, message]
    );

    await pool.query(
      `INSERT INTO messages (id, conversation_id, user_id, role, content)
       VALUES (gen_random_uuid(), $1, $2, 'assistant', $3)`,
      [conversationId, userId, aiMessage]
    );

    // Step 4: Update conversation timestamp
    await pool.query(
      `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [conversationId]
    );

    // Step 5: Extract and save new memories
    const newMemories: string[] = [];
    if (message.length > 30) {
      const memoryId = await pool.query(
        `INSERT INTO memories (id, user_id, type, content, importance, status)
         VALUES (gen_random_uuid(), $1, 'knowledge', $2, 3, 'active')
         RETURNING id`,
        [userId, message.substring(0, 100)]
      );
      newMemories.push(memoryId.rows[0].id);
    }

    const response: ChatResponse = {
      message: aiMessage,
      conversationId,
      memoriesRetrieved: memories.length,
      memoriesCreated: newMemories,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};