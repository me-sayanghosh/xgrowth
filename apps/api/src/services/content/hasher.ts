import crypto from 'crypto';

export interface HashableContent {
  text: string;
  threadParts?: string[];
  channelId?: string;
  mediaUrls?: string[];
}

export class ContentHasher {
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

    const serialized = JSON.stringify(canonicalObject);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  public static verifyApprovalHash(input: HashableContent, expectedHash: string): boolean {
    const computed = this.computeApprovalHash(input);
    return computed === expectedHash;
  }
}
