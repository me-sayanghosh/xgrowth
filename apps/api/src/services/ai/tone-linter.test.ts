import { describe, it, expect } from 'vitest';
import { ToneLinter } from './tone-linter.js';

describe('ToneLinter', () => {
  it('passes a clean, specific technical draft', () => {
    const text = 'Node.js 24 introduces native crypto performance enhancements for high-throughput microservices.';
    const res = ToneLinter.lintDraft(text);
    expect(res.passed).toBe(true);
    expect(res.riskFlags).toHaveLength(0);
    expect(res.qualityFlags).toContain('Clear and specific tone');
  });

  it('flags hype buzzwords', () => {
    const text = 'This new tool is a game-changer and will revolutionize your workflow!';
    const res = ToneLinter.lintDraft(text);
    expect(res.passed).toBe(false);
    expect(res.riskFlags.some((f) => f.includes('game-changer'))).toBe(true);
    expect(res.riskFlags.some((f) => f.includes('revolutionize'))).toBe(true);
  });

  it('flags hashtag stuffing (>2 hashtags)', () => {
    const text = 'Building cool things #coding #typescript #dev #javascript';
    const res = ToneLinter.lintDraft(text);
    expect(res.passed).toBe(false);
    expect(res.riskFlags.some((f) => f.includes('Hashtag stuffing'))).toBe(true);
  });
});
