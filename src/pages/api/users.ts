import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db/connection';

type ResponseData = any;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, email, name } = req.body;

    if (!id || !email) {
      return res.status(400).json({
        error: 'Missing required fields: id, email',
      });
    }

    // Try to create user, ignore if already exists
    await query(
      `INSERT INTO users (id, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [id, email, name || 'Demo User']
    );

    return res.status(201).json({
      id,
      email,
      name: name || 'Demo User',
      created: true
    });
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({
      error: 'Failed to create user',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
