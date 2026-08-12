import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { query } from '@/lib/db/connection';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;

  try {
    if (req.method === 'GET') {
      // Get all memories for user
      const result = await query(
        `SELECT * FROM memories 
         WHERE user_id = $1 AND status = 'active'
         ORDER BY updated_at DESC`,
        [userId]
      );

      return res.status(200).json({ memories: result.rows });
    }

    if (req.method === 'POST') {
      // Create new memory
      const { type, content, importance, tags } = req.body;

      if (!type || !content) {
        return res.status(400).json({
          error: 'Type and content are required',
        });
      }

      const memoryId = uuidv4();

      const result = await query(
        `INSERT INTO memories (id, user_id, type, content, importance, tags, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING *`,
        [memoryId, userId, type, content, importance || 3, tags || []]
      );

      return res.status(201).json({
        memory: result.rows[0],
      });
    }

    if (req.method === 'PUT') {
      // Update memory
      const { memoryId, content, importance, tags } = req.body;

      const result = await query(
        `UPDATE memories 
         SET content = $1, importance = $2, tags = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [content, importance, tags || [], memoryId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Memory not found' });
      }

      return res.status(200).json({
        memory: result.rows[0],
      });
    }

    if (req.method === 'DELETE') {
      // Soft delete memory
      const { memoryId } = req.body;

      await query(
        `UPDATE memories SET status = 'archived' WHERE id = $1 AND user_id = $2`,
        [memoryId, userId]
      );

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Memories error:', error);
    return res.status(500).json({
      error: 'Failed to process memory request',
      details: error.message,
    });
  }
}