import crypto from 'crypto';

export class SubmissionIdempotency {
  public static generateKey(contentItemId: string, approvedHash: string, channelId: string): string {
    const raw = `${contentItemId}:${approvedHash}:${channelId}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}
