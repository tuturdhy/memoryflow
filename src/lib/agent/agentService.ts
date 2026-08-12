import Groq from 'groq-sdk';
import { query } from '@/lib/db/connection';
import { VectorService } from '@/lib/memory/vectorService';
import { v4 as uuidv4 } from 'uuid';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface AgentResponse {
  message: string;
  memoriesRetrieved: any[];
  memoriesCreated: string[];
  memoriesUpdated: string[];
  reasoning: string;
}

export class AgentService {
  /**
   * Process user message and generate response with memory
   */
  static async processMessage(
    userId: string,
    userMessage: string,
    conversationId: string
  ): Promise<AgentResponse> {
    const response: AgentResponse = {
      message: '',
      memoriesRetrieved: [],
      memoriesCreated: [],
      memoriesUpdated: [],
      reasoning: '',
    };

    try {
      // Step 1: Retrieve relevant memories (keyword search)
      const relevantMemories = await this.retrieveRelevantMemories(
        userId,
        userMessage
      );
      response.memoriesRetrieved = relevantMemories;

      // Step 2: Build context from memories
      const memoryContext = this.buildMemoryContext(relevantMemories);

      // Step 3: Call LLM to generate response
      const llmResponse = await this.callLLM(userMessage, memoryContext);

      response.message = llmResponse.message;
      response.reasoning = llmResponse.reasoning;

      // Step 4: Extract potential memories from user message
      const extractedMemories = await this.extractMemories(
        userId,
        userMessage
      );

      response.memoriesCreated = extractedMemories.created;
      response.memoriesUpdated = extractedMemories.updated;

      // Step 5: Store message in conversation
      await this.storeMessage(conversationId, userId, 'user', userMessage);
      await this.storeMessage(
        conversationId,
        userId,
        'assistant',
        response.message
      );

      // Step 6: Update agent state
      await this.updateAgentState(userId, conversationId, relevantMemories);

      return response;
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant memories for current context
   */
  private static async retrieveRelevantMemories(
    userId: string,
    userMessage: string
  ): Promise<any[]> {
    try {
      const maxContexts = parseInt(process.env.MAX_MEMORY_CONTEXTS || '5');

      // Use keyword search instead of semantic search
      const keywordResults = await VectorService.keywordSearch(
        userId,
        userMessage,
        maxContexts
      );

      // Also get high-importance memories
      const importantResult = await query(
        `SELECT * FROM memories 
         WHERE user_id = $1 AND status = 'active' AND importance >= 4
         ORDER BY updated_at DESC
         LIMIT 3`,
        [userId]
      );

      // Combine and deduplicate
      const memoryMap = new Map<string, any>();

      keywordResults.forEach((m) => {
        if (m && m.id) memoryMap.set(m.id, m);
      });

      importantResult.rows.forEach((m: any) => {
        if (m && m.id) memoryMap.set(m.id, m);
      });

      return Array.from(memoryMap.values()).slice(0, maxContexts);
    } catch (error) {
      console.error('Error retrieving memories:', error);
      return [];
    }
  }

  /**
   * Build context string from memories
   */
  private static buildMemoryContext(memories: any[]): string {
    if (memories.length === 0) {
      return 'No previous memories found about this user.';
    }

    const groupedByType = new Map<string, any[]>();

    memories.forEach((memory) => {
      if (!groupedByType.has(memory.type)) {
        groupedByType.set(memory.type, []);
      }
      groupedByType.get(memory.type)!.push(memory);
    });

    let context = 'User Context from Previous Memories:\n\n';

    Array.from(groupedByType.entries()).forEach(([type, mems]) => {
      context += `${type.toUpperCase()}:\n`;
      mems.forEach((m) => {
        context += `- ${m.content} (importance: ${m.importance}/5)\n`;
      });
      context += '\n';
    });

    return context;
  }

  /**
   * Call LLM with memory context
   */
  private static async callLLM(
    userMessage: string,
    memoryContext: string
  ): Promise<{ message: string; reasoning: string }> {
    const systemPrompt = `You are MemoryFlow, an AI assistant with persistent memory.

${memoryContext}

Your responsibilities:
1. Answer the user's question or respond to their statement
2. Use previous memories to personalize your response
3. Maintain consistency with what you know about the user
4. Ask clarifying questions if needed
5. Be helpful, friendly, and professional

When you use information from the user's memories, acknowledge it naturally in your response.
For example: "Based on what I know about your preference for practical exercises..."

Always be truthful about what you remember and do not remember.`;

    try {
      const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        model,
        temperature: 0.7,
        max_tokens: 1024,
      });

      const message =
        completion.choices[0]?.message?.content ||
        'I encountered an error processing your message.';

      return {
        message,
        reasoning: 'Processed with memory context awareness',
      };
    } catch (error) {
      console.error('Error calling LLM:', error);
      throw error;
    }
  }

  /**
   * Extract memories from conversation for storage
   */
  private static async extractMemories(
    userId: string,
    userMessage: string
  ): Promise<{ created: string[]; updated: string[] }> {
    const created: string[] = [];
    const updated: string[] = [];
  
    try {
      console.log('\n=====================================');
      console.log('🔍 EXTRACT MEMORIES START');
      console.log('👤 userId:', userId, '| Type:', typeof userId);
      console.log('💬 Message length:', userMessage.length);
      console.log('💬 Message:', userMessage.substring(0, 100));
      
      if (!userId) {
        console.error('❌ ERROR: userId is NULL or UNDEFINED!');
        return { created, updated };
      }
  
      const patterns = [
        {
          type: 'goal',
          regex: /want to|aim to|goal|objective|interested in|learning|want|dream/i,
        },
        {
          type: 'preference',
          regex: /prefer|like|enjoy|love|favorite|enjoy working/i,
        },
        {
          type: 'skill',
          regex: /can|able to|know|learned|experience|proficient|skilled/i,
        },
      ];
  
      let memoryType = 'knowledge';
      for (const pattern of patterns) {
        if (pattern.regex.test(userMessage)) {
          memoryType = pattern.type;
          break;
        }
      }
  
      console.log('🏷️ Memory type:', memoryType);
  
      if (userMessage.length > 10) {
        const memoryId = uuidv4();
        console.log('💾 Saving memory with ID:', memoryId);
        console.log('📊 Parameters: [id, userId, type, content, importance]');
        console.log('   [', memoryId, ',', userId, ',', memoryType, ', "...text...", 4 ]');
  
        try {
          await query(
            `INSERT INTO memories (id, user_id, type, content, importance, status)
             VALUES ($1, $2, $3, $4, $5, 'active')`,
            [memoryId, userId, memoryType, userMessage, 4]
          );
  
          console.log('✅ Database INSERT SUCCESS!');
          created.push(memoryId);
        } catch (dbError: any) {
          console.error('❌ DATABASE ERROR in INSERT:');
          console.error('   Code:', dbError.code);
          console.error('   Message:', dbError.message);
          throw dbError;
        }
      } else {
        console.log('⚠️ Message too short (<30 chars), skipping');
      }
  
      console.log('✅ EXTRACT MEMORIES END - Created:', created.length);
      console.log('=====================================\n');
      return { created, updated };
    } catch (error: any) {
      console.error('❌ FINAL ERROR in extractMemories:');
      console.error('   Error:', error.message);
      console.error('   Stack:', error.stack);
      return { created, updated };
    }
  }
  /**
   * Store message in conversation
   */
  private static async storeMessage(
    conversationId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    try {
      const id = uuidv4();

      await query(
        `INSERT INTO messages (id, conversation_id, user_id, role, content)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, conversationId, userId, role, content]
      );
    } catch (error) {
      console.error('Error storing message:', error);
    }
  }

  /**
   * Update agent state for current interaction
   */
  private static async updateAgentState(
    userId: string,
    conversationId: string,
    _contextMemories: any[]
  ): Promise<void> {
    try {
      // Just update the conversation's updated_at timestamp
      // Don't try to store context_memories if the table doesn't have it
      await query(
        `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 AND user_id = $2`,
        [conversationId, userId]
      );
    } catch (error) {
      console.error('Error updating agent state:', error);
    }
  }
}