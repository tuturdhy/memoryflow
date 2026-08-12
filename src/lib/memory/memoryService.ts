import { query } from '@/lib/db/connection';
import { v4 as uuidv4 } from 'uuid';
import { EmbeddingService } from './embeddingService';

export class MemoryService {
  /**
   * Save memory without embeddings
   */
  static async saveMemory(
    userId: string,
    type: string,
    content: string,
    metadata?: {
      importance?: number;
      confidence?: number;
      source?: string;
      tags?: string[];
    }
  ): Promise<any> {
    try {
      const memoryId = uuidv4();
      const importance = metadata?.importance || 3;
      const tags = metadata?.tags || [];

      const result = await query(
        `INSERT INTO memories 
         (id, user_id, type, content, importance, status, tags, metadata)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
         RETURNING *`,
        [
          memoryId,
          userId,
          type,
          content,
          importance,
          tags,
          JSON.stringify(metadata || {}),
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error saving memory:', error);
      throw error;
    }
  }

  /**
   * Retrieve specific memory
   */
  static async retrieveMemory(memoryId: string): Promise<any> {
    try {
      const result = await query(
        `SELECT * FROM memories WHERE id = $1`,
        [memoryId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error retrieving memory:', error);
      return null;
    }
  }

  /**
   * List memories with filters
   */
  static async listMemories(
    userId: string,
    filters?: { importance?: number; limit?: number }
  ): Promise<any[]> {
    try {
      const limit = filters?.limit || 10;
      const importance = filters?.importance || 0;

      const result = await query(
        `SELECT * FROM memories 
         WHERE user_id = $1 AND status = 'active' AND importance >= $2
         ORDER BY updated_at DESC
         LIMIT $3`,
        [userId, importance, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error listing memories:', error);
      return [];
    }
  }

  /**
   * Keyword search in memories
   */
  static async keywordSearch(
    userId: string,
    searchQuery: string,
    limit: number = 5
  ): Promise<any[]> {
    try {
      const words = searchQuery.toLowerCase().split(/\s+/);
      const searchPattern = `%${words.join('%')}%`;

      const result = await query(
        `SELECT * FROM memories 
         WHERE user_id = $1 AND status = 'active'
         AND (content ILIKE $2 OR tags::text ILIKE $2)
         ORDER BY updated_at DESC
         LIMIT $3`,
        [userId, searchPattern, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Keyword search error:', error);
      return [];
    }
  }

  /**
   * Update memory
   */
  static async updateMemory(
    memoryId: string,
    updates: { content?: string; importance?: number; confidence?: number }
  ): Promise<any> {
    try {
      const fields = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.content !== undefined) {
        fields.push(`content = $${paramCount++}`);
        values.push(updates.content);
      }

      if (updates.importance !== undefined) {
        fields.push(`importance = $${paramCount++}`);
        values.push(updates.importance);
      }

      if (updates.confidence !== undefined) {
        fields.push(`metadata = jsonb_set(metadata, '{confidence}', $${paramCount++}::jsonb)`);
        values.push(JSON.stringify(updates.confidence));
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(memoryId);

      const query_str = `UPDATE memories SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

      const result = await query(query_str, values);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating memory:', error);
      throw error;
    }
  }

  /**
   * Delete memory (soft delete)
   */
  static async deleteMemory(memoryId: string): Promise<void> {
    try {
      await query(
        `UPDATE memories SET status = 'archived' WHERE id = $1`,
        [memoryId]
      );
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  }
}