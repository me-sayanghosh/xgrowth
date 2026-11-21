import { describe, it, expect } from 'vitest';
import { ResearchEvaluator } from './evaluator.js';

describe('ResearchEvaluator', () => {
  it('calculates freshness accurately according to age', () => {
    const now = new Date();
    expect(ResearchEvaluator.calculateFreshness(now)).toBe(5);

    const yesterday = new Date(Date.now() - 20 * 60 * 60 * 1000);
    expect(ResearchEvaluator.calculateFreshness(yesterday)).toBe(4);

    const oldDate = new Date(Date.now() - 100 * 60 * 60 * 1000);
    expect(ResearchEvaluator.calculateFreshness(oldDate)).toBe(1);
  });

  it('calculates high credibility for allowlisted and docs domains', () => {
    const credGithub = ResearchEvaluator.calculateCredibility('https://github.com/nodejs/node');
    expect(credGithub).toBe(5);

    const credDocs = ResearchEvaluator.calculateCredibility('https://developer.mozilla.org/en-US/');
    expect(credDocs).toBe(5);

    const credAllowlist = ResearchEvaluator.calculateCredibility('https://mytechblog.io/post', ['mytechblog.io']);
    expect(credAllowlist).toBe(5);

    const credUnknown = ResearchEvaluator.calculateCredibility('https://random-rumor-site.biz');
    expect(credUnknown).toBe(3);
  });

  it('calculates relevance against brand pillars', () => {
    const relevance = ResearchEvaluator.calculateRelevance(
      'Building scalable TypeScript services with Node.js',
      'A deep architectural guide into asynchronous pipelines.',
      ['Software Engineering', 'Node.js, JavaScript and TypeScript'],
    );

    expect(relevance).toBeGreaterThanOrEqual(4);
  });
});
