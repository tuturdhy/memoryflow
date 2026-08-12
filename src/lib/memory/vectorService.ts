import { query } from '@/lib/db/connection';

export class VectorService {
  static async generateEmbedding(text: string): Promise<number[]> {
    const hash = this.hashString(text);
    return Array(1536)
      .fill(0)
      .map((_, i) => {
        const val = Math.sin(hash * (i + 1)) * 0.5;
        return parseFloat(val.toFixed(4));
      });
  }

  static async storeEmbedding(memoryId: string, embedding: number[]): Promise<void> {
    try {
      const embeddingString = `[${embedding.join(',')}]`;
      await query(
        `UPDATE memories SET embedding = $1::vector WHERE id = $2`,
        [embeddingString, memoryId]
      );
      console.log(`✅ Embedding stored`);
    } catch (error) {
      console.error('Error storing embedding:', error);
    }
  }

  static async semanticSearch(
    userId: string,
    queryText: string,
    limit: number = 5
  ): Promise<any[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(queryText);
      const embeddingString = `[${queryEmbedding.join(',')}]`;

      const result = await query(
        `SELECT id, user_id, type, content, importance, created_at, updated_at
         FROM memories 
         WHERE user_id = $1 AND status = 'active' AND embedding IS NOT NULL
         ORDER BY embedding <-> $2::vector
         LIMIT $3`,
        [userId, embeddingString, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Vector search error:', error);
      return await this.keywordSearch(userId, queryText, limit);
    }
  }

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
         AND (content ILIKE $2 OR type ILIKE $2)
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

  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
    }
    return Math.abs(hash);
  }
}