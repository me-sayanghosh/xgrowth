import { describe, it, expect } from 'vitest';
import { HookGeneratorService } from './hook-generator.service.js';
import { CtaRecommenderService } from './cta-recommender.js';

describe('Hook Generator & CTA Recommender Unit Tests', () => {
  describe('HookGeneratorService', () => {
    it('generates deterministic English hooks adhering to character boundaries', () => {
      const hooks = HookGeneratorService.generateDeterministic(
        {
          topic: 'Event-Driven Microservices',
          pillar: 'Distributed Systems',
          keyTakeaway: 'Outbox pattern solves dual-write distributed failures',
        },
        'en',
        4,
      );

      expect(hooks.length).toBe(4);
      hooks.forEach((h) => {
        expect(h.charCount).toBeLessThanOrEqual(140);
        expect(h.hook.length).toBeGreaterThan(10);
        expect(['problem_first', 'contrarian_observation', 'metric_benchmark', 'question_curiosity', 'teardown_lesson']).toContain(h.style);
      });
    });

    it('generates authentic Bengali hooks for bn target language', () => {
      const hooks = HookGeneratorService.generateDeterministic(
        {
          topic: 'Distributed Transactions',
          keyTakeaway: '2PC has major blocking issues',
        },
        'bn',
        3,
      );

      expect(hooks.length).toBe(3);
      expect(hooks[0]?.hook).toContain('Distributed Transactions');
      hooks.forEach((h) => {
        expect(h.charCount).toBeLessThanOrEqual(140);
      });
    });

    it('generates mixed English-Bengali tech hooks for mixed target language', () => {
      const hooks = HookGeneratorService.generateDeterministic(
        {
          topic: 'Database Sharding',
          keyTakeaway: 'Consistent hashing avoids huge resharding overhead',
        },
        'mixed',
        5,
      );

      expect(hooks.length).toBe(5);
      expect(hooks[0]?.hook).toContain('Production-এ Database Sharding');
    });
  });

  describe('CtaRecommenderService', () => {
    it('suggests authentic developer-oriented CTAs with zero clickbait', () => {
      const ctas = CtaRecommenderService.generateDeterministic(
        {
          topic: 'Redis Cache Stampede',
        },
        'en',
        4,
      );

      expect(ctas.length).toBe(4);
      ctas.forEach((c) => {
        expect(c.charCount).toBeLessThanOrEqual(120);
        // Ensure no engagement bait phrases
        expect(c.cta.toLowerCase()).not.toContain('repost if');
        expect(c.cta.toLowerCase()).not.toContain('drop a comment for');
        expect(c.cta.toLowerCase()).not.toContain('secret trick');
      });
    });

    it('suggests Bengali technical discussion CTAs', () => {
      const ctas = CtaRecommenderService.generateDeterministic(
        {
          topic: 'Kafka Consumer Lag',
        },
        'bn',
        3,
      );

      expect(ctas.length).toBe(3);
      expect(ctas[0]?.cta).toContain('Kafka Consumer Lag');
      ctas.forEach((c) => {
        expect(c.charCount).toBeLessThanOrEqual(120);
      });
    });

    it('suggests mixed language technical discussion CTAs', () => {
      const ctas = CtaRecommenderService.generateDeterministic(
        {
          topic: 'GraphQL vs REST',
        },
        'mixed',
        4,
      );

      expect(ctas.length).toBe(4);
      expect(ctas[0]?.cta).toContain('GraphQL vs REST');
      ctas.forEach((c) => {
        expect(c.charCount).toBeLessThanOrEqual(120);
      });
    });
  });
});
