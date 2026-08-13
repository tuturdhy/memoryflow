import crypto from 'crypto';

export function getUUIDFromEmail(email: string): string {
  // Create deterministic UUID from email
  // Same email always produces same UUID
  const hash = crypto.createHash('sha256').update(email).digest('hex');
  
  // Format as UUID (8-4-4-4-12)
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}