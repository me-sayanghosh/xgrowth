import { z } from 'zod';
import { contentItemSchema } from './content-item.js';

export const referenceAccountSchema = z.object({
  id: z.string().min(1),
  handle: z.string().min(1),
  displayName: z.string().optional(),
  profileUrl: z.string().url().optional(),
  notes: z.string().default(''),
  styleTraits: z.array(z.string()).default([]),
  postArchetypes: z.array(z.string()).default([]),
  samplePosts: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  addedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const localSettingsSchema = z.object({
  appName: z.string().default('XGrowth AI'),
  globalPause: z.boolean().default(true),
  defaultChannelId: z.string().optional(),
  timezone: z.string().default('Asia/Kolkata'),
  maxPostsPerDay: z.number().int().min(1).max(20).default(3),
  language: z.enum(['en', 'bn', 'mixed']).default('en'),
  brandPillars: z.array(z.string()).default([
    'Software engineering',
    'TypeScript & Node.js',
    'System Architecture & Resilience',
    'AI Engineering & Agentic Systems',
  ]),
  voiceTraits: z.array(z.string()).default([
    'Engineering rigor',
    'No hype or buzzwords',
    'Specific metrics over generalizations',
    'Clear code examples and trade-offs',
  ]),
  voiceAvoid: z.array(z.string()).default([
    'game-changer',
    'mind-blowing',
    'revolutionize',
    'secret sauce',
    '10x developer',
  ]),
  preferredWindows: z.array(z.string()).default(['09:00', '13:00', '19:00']),
});

export const localTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceName: z.string().default('Manual / Web Research'),
  sourceUrl: z.string().url(),
  summary: z.string().default(''),
  topicPillar: z.string().default('Software engineering'),
  freshnessScore: z.number().min(1).max(5).default(5),
  status: z.enum(['discovered', 'briefed', 'archived']).default('discovered'),
  createdAt: z.string().datetime(),
});

export const localContentItemSchema = contentItemSchema.extend({
  mediaUrls: z.array(z.string().url()).optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  rejectionReason: z.string().optional(),
});

export const localQuotaSchema = z.object({
  monthlyLimit: z.number().int().positive().default(1000),
  usageCount: z.number().int().nonnegative().default(0),
  cycleStartDate: z.string().datetime(),
  cycleResetDate: z.string().datetime(),
});

export type ReferenceAccount = z.infer<typeof referenceAccountSchema>;
export type LocalSettings = z.infer<typeof localSettingsSchema>;
export type LocalTopic = z.infer<typeof localTopicSchema>;
export type LocalContentItem = z.infer<typeof localContentItemSchema>;
export type LocalQuota = z.infer<typeof localQuotaSchema>;
