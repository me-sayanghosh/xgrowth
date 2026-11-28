import crypto from 'crypto';

export interface HashableContent {
  text: string;
  threadParts?: string[];
  channelId?: string;
  mediaUrls?: string[];
}

/**
 * Computes canonical SHA-256 approval hashes bound to exact post content and target channel.
 */
export class LocalContentHasher {
  public static normalizeWhitespace(str: string): string {
    return str.replace(/\r\n/g, '\n').trim();
  }

  public static computeApprovalHash(input: HashableContent): string {
    const canonicalObject = {
      text: this.normalizeWhitespace(input.text),
      threadParts: (input.threadParts || []).map((t) => this.normalizeWhitespace(t)),
      channelId: input.channelId || '',
      mediaUrls: [...(input.mediaUrls || [])].sort(),
    };

    return crypto.createHash('sha256').update(JSON.stringify(canonicalObject)).digest('hex');
  }
}
