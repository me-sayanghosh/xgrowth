import { describe, it, expect } from 'vitest';
import {
  localSettingsSchema,
  referenceAccountSchema,
  localTopicSchema,
  CharacterValidator,
  ToneLinter,
} from '../index.js';

describe('Local Agent Schemas & Shared Validators', () => {
  it('applies safe defaults on localSettingsSchema (globalPause true)', () => {
    const parsed = localSettingsSchema.parse({});
    expect(parsed.globalPause).toBe(true);
    expect(parsed.maxPostsPerDay).toBe(3);
    expect(parsed.timezone).toBe('Asia/Kolkata');
    expect(parsed.brandPillars.length).toBeGreaterThan(0);
  });

  it('validates reference account profile structure', () => {
    const now = new Date().toISOString();
    const ref = referenceAccountSchema.parse({
      id: 'ref-1',
      handle: '@levelsio',
      styleTraits: ['short punchy sentences', 'transparent revenue numbers'],
      postArchetypes: ['build_in_public', 'single_post'],
      samplePosts: ['Launched a small feature in 2 hours without overengineering.'],
      topics: ['indie hacking', 'shipping fast'],
      addedAt: now,
      updatedAt: now,
    });
    expect(ref.handle).toBe('@levelsio');
    expect(ref.styleTraits).toHaveLength(2);
  });

  it('validates local topic schema', () => {
    const topic = localTopicSchema.parse({
      id: 'topic-1',
      title: 'Node 24 native test runner improvements',
      sourceUrl: 'https://nodejs.org/en/blog',
      createdAt: new Date().toISOString(),
    });
    expect(topic.status).toBe('discovered');
  });

  it('validates X 280-char limits and tone lints via shared utilities', () => {
    const okLen = CharacterValidator.validate('Short engineering insight with https://example.com/a-very-long-url-slug');
    expect(okLen.isValid).toBe(true);
    expect(okLen.charCount).toBeLessThan(80);

    const lint = ToneLinter.lintDraft('This game-changer will revolutionize your stack!');
    expect(lint.passed).toBe(false);
    expect(lint.riskFlags.length).toBeGreaterThan(0);
  });
});
