import { getUUIDFromEmail } from '@/lib/auth-utils';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { query } from '@/lib/db/connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = getUUIDFromEmail(session.user.email);
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid conversation ID' });
  }

  try {
    if (req.method === 'GET') {
      // Get single conversation with messages
      const convResult = await query(
        `SELECT * FROM conversations WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (convResult.rows.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Get all messages for conversation
      const messagesResult = await query(
        `SELECT * FROM messages 
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [id]
      );

      return res.status(200).json({
        conversation: convResult.rows[0],
        messages: messagesResult.rows,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Conversation error:', error);
    return res.status(500).json({
      error: 'Failed to fetch conversation',
      details: error.message,
    });
  }
}