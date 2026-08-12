import { query } from '@/lib/db/connection';
import { v4 as uuidv4 } from 'uuid';

export class EmbeddingService {
  /**
   * Generate embedding - disabled due to API unavailability
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    // Return null vector - using keyword search instead
    return new Array(768).fill(0);
  }

  /**
   * Semantic search - disabled, using keyword search instead
   */
  static async semanticSearch(
    userId: string,
    queryText: string,
    limit: number = 5
  ): Promise<any[]> {
    return this.keywordSearch(userId, queryText, limit);
  }

  /**
   * Keyword search for memories
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
   * Store embedding - disabled
   */
  static async storeEmbedding(
    memoryId: string,
    embedding: number[]
  ): Promise<void> {
    try {
      console.log('Embedding storage skipped (API unavailable)');
    } catch (error) {
      console.error('Error storing embedding:', error);
    }
  }

  /**
   * Retrieve embedding - disabled
   */
  static async retrieveEmbedding(memoryId: string): Promise<number[] | null> {
    return null;
  }
}