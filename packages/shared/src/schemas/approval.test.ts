import { describe, it, expect } from 'vitest';
import { canonicalHashInputSchema } from './approval.js';

describe('canonicalHashInputSchema', () => {
  it('parses valid input and applies defaults', () => {
    const raw = {
      text: 'Sample approved post',
    };

    const parsed = canonicalHashInputSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.threadParts).toEqual([]);
      expect(parsed.data.channelId).toBe('');
      expect(parsed.data.mediaUrls).toEqual([]);
    }
  });

  it('preserves array elements in order', () => {
    const raw = {
      text: 'Main thread header',
      threadParts: ['part 1', 'part 2', 'part 3'],
      channelId: 'chan-x-123',
      mediaUrls: ['https://example.com/image.png'],
    };

    const parsed = canonicalHashInputSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.threadParts).toHaveLength(3);
      expect(parsed.data.threadParts[0]).toBe('part 1');
    }
  });

  it('rejects invalid mediaUrls', () => {
    const raw = {
      text: 'Main post',
      mediaUrls: ['not-a-url'],
    };

    const parsed = canonicalHashInputSchema.safeParse(raw);
    expect(parsed.success).toBe(false);
  });
});
