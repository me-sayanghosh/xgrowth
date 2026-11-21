import { z } from 'zod';

export const researchSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  type: z.enum(['rss', 'news', 'url', 'manual']).default('rss'),
  category: z.string().default('General'),
  enabled: z.boolean().default(true),
  credibilityScore: z.number().min(1).max(5).default(4),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ResearchSource = z.infer<typeof researchSourceSchema>;

export const candidateTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceName: z.string(),
  publishedAt: z.string().datetime().optional(),
  discoveredAt: z.string().datetime(),
  excerpt: z.string(),
  topicPillar: z.string().optional(),
  freshnessScore: z.number().min(1).max(5).default(3),
  credibilityScore: z.number().min(1).max(5).default(3),
  relevanceScore: z.number().min(1).max(5).default(3),
  status: z.enum(['discovered', 'briefed', 'archived']).default('discovered'),
});

export type CandidateTopic = z.infer<typeof candidateTopicSchema>;

export const researchBriefSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  topicPillar: z.string().min(1),
  whyItMatters: z.string().min(1),
  primarySourceUrl: z.string().url(),
  additionalSources: z.array(z.string().url()).default([]),
  publishedAt: z.string().datetime().optional(),
  retrievedAt: z.string().datetime(),
  verifiedFacts: z.array(z.string()).min(1),
  uncertainties: z.array(z.string()).default([]),
  suggestedAngle: z.string().min(1),
  suggestedFormat: z.string().default('single_post'),
  audienceRelevance: z.number().min(1).max(5).default(3),
  freshness: z.number().min(1).max(5).default(3),
  credibility: z.number().min(1).max(5).default(3),
  decision: z.enum(['draft', 'hold', 'reject']).default('draft'),
  createdAt: z.string().datetime(),
});

export type ResearchBrief = z.infer<typeof researchBriefSchema>;
