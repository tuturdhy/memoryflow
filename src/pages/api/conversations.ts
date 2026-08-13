import { getUUIDFromEmail } from '@/lib/auth-utils';
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

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = getUUIDFromEmail(session.user.email);

  try {
    if (req.method === 'GET') {
      // Get all conversations for user - ordered by updated_at DESC
      const result = await query(
        `SELECT * FROM conversations 
         WHERE user_id = $1 
         ORDER BY updated_at DESC`,
        [userId]
      );

      return res.status(200).json({ conversations: result.rows });
    }

    if (req.method === 'POST') {
      // Create new conversation
      const conversationId = uuidv4();
      const title = 'New Conversation';

      const result = await query(
        `INSERT INTO conversations (id, user_id, title, created_at, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [conversationId, userId, title]
      );

      return res.status(201).json({
        conversation: result.rows[0],
      });
    }

    if (req.method === 'PUT') {
      // Update conversation title and timestamp
      const { conversationId, title } = req.body;

      if (!conversationId || !title) {
        return res.status(400).json({
          error: 'Conversation ID and title are required',
        });
      }

      const result = await query(
        `UPDATE conversations 
         SET title = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3 
         RETURNING *`,
        [title, conversationId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      return res.status(200).json({ conversation: result.rows[0] });
    }

    if (req.method === 'DELETE') {
      // Delete conversation and its messages
      const { conversationId } = req.body;

      if (!conversationId) {
        return res.status(400).json({
          error: 'Conversation ID is required',
        });
      }

      // Verify conversation belongs to user
      const convResult = await query(
        `SELECT * FROM conversations WHERE id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

      if (convResult.rows.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Delete messages first
      await query(
        `DELETE FROM messages WHERE conversation_id = $1`,
        [conversationId]
      );

      // Delete conversation
      await query(
        `DELETE FROM conversations WHERE id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Conversations error:', error);
    return res.status(500).json({
      error: 'Failed to process conversation',
      details: error.message,
    });
  }
}