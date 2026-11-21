import { z } from 'zod';

export const bufferChannelSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  service: z.string(),
  avatar: z.string().optional(),
  organizationId: z.string().optional(),
  isQueuePaused: z.boolean().default(false),
  timezone: z.string().default('UTC'),
});

export type BufferChannel = z.infer<typeof bufferChannelSchema>;

export const bufferPostInputSchema = z.object({
  channelId: z.string().min(1),
  text: z.string().min(1).max(10000),
  schedulingType: z.enum(['addToQueue', 'scheduled', 'publishNow']).default('addToQueue'),
  dueAt: z.string().datetime().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  threadParts: z.array(z.string()).optional(),
  idempotencyKey: z.string().min(1),
});

export type BufferPostInput = z.infer<typeof bufferPostInputSchema>;

export const bufferPostResponseSchema = z.object({
  success: z.boolean(),
  id: z.string().optional(),
  providerStatus: z.enum(['queued', 'scheduled', 'published', 'failed', 'unknown']).default('queued'),
  scheduledAt: z.string().datetime().optional(),
  message: z.string().optional(),
  correlationId: z.string().optional(),
});

export type BufferPostResponse = z.infer<typeof bufferPostResponseSchema>;

export const bufferSubmissionRecordSchema = z.object({
  id: z.string().min(1),
  contentItemId: z.string().min(1),
  channelId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  providerPostId: z.string().optional(),
  status: z.enum(['pending', 'submitted', 'queued', 'published', 'failed', 'unknown']),
  requestPayload: z.record(z.unknown()),
  responsePayload: z.record(z.unknown()).optional(),
  attemptCount: z.number().int().default(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BufferSubmissionRecord = z.infer<typeof bufferSubmissionRecordSchema>;
