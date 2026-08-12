import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

/**
 * AWS Lambda handler wrapper for MemoryFlow API
 * Converts Lambda events to standard HTTP requests for Next.js
 */

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    // Parse request
    const method = event.requestContext.http.method;
    const path = event.rawPath;
    const headers = event.headers || {};
    const body = event.body || '';

    // Log request
    console.log(`[${method}] ${path}`, {
      headers,
      bodyLength: body.length,
    });

    // Route to appropriate handler
    let response: any;

    if (path.startsWith('/api/chat')) {
      response = await handleChat(method, body);
    } else if (path.startsWith('/api/memories')) {
      response = await handleMemories(method, body);
    } else if (path.startsWith('/api/conversations')) {
      response = await handleConversations(method, body);
    } else {
      response = {
        statusCode: 404,
        body: JSON.stringify({ error: 'Endpoint not found' }),
      };
    }

    return {
      statusCode: response.statusCode,
      body: response.body,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  } catch (error) {
    console.error('Lambda handler error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
}

async function handleChat(method: string, body: string): Promise<any> {
  if (method !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Parse request body
  const { userId, message, conversationId } = JSON.parse(body);

  if (!userId || !message) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Missing required fields: userId, message',
      }),
    };
  }

  // Process with agent
  // This would call AgentService.processMessage()
  // For now, return a placeholder
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Chat endpoint active',
      conversationId,
    }),
  };
}

async function handleMemories(method: string, body: string): Promise<any> {
  // Parse request body for non-GET requests
  let data: any = {};
  if (method !== 'GET' && body) {
    data = JSON.parse(body);
  }

  const { userId } = data;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing userId' }),
    };
  }

  switch (method) {
    case 'GET':
      return {
        statusCode: 200,
        body: JSON.stringify({ memories: [] }),
      };

    case 'POST':
      return {
        statusCode: 201,
        body: JSON.stringify({ memory: { id: 'new_memory_id' } }),
      };

    case 'PUT':
      return {
        statusCode: 200,
        body: JSON.stringify({ memory: { id: data.id } }),
      };

    case 'DELETE':
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };

    default:
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
  }
}

async function handleConversations(method: string, body: string): Promise<any> {
  // Parse request body for non-GET requests
  let data: any = {};
  if (body) {
    data = JSON.parse(body);
  }

  const { userId } = data;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing userId' }),
    };
  }

  switch (method) {
    case 'GET':
      return {
        statusCode: 200,
        body: JSON.stringify({ conversations: [] }),
      };

    case 'POST':
      return {
        statusCode: 201,
        body: JSON.stringify({ conversationId: 'new_conversation_id' }),
      };

    case 'PUT':
      return {
        statusCode: 200,
        body: JSON.stringify({ messages: [] }),
      };

    case 'DELETE':
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };

    default:
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
  }
}

// Export for use in SAM/CloudFormation
export const memoryflowHandler = handler;
